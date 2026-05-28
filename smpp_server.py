import asyncio
import logging
import struct
from datetime import datetime
from typing import Dict, Optional
from database import get_db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("smpp_server")

# SMPP Command IDs
BIND_TRANSMITTER = 0x00000001
BIND_RECEIVER = 0x00000002
BIND_TRANSCEIVER = 0x00000009
SUBMIT_SM = 0x00000004
DELIVER_SM = 0x00000005
ENQUIRE_LINK = 0x00000015
UNBIND = 0x00000006
GENERIC_NACK = 0x00000000

# SMPP Status Codes
ESME_ROK = 0x00000000
ESME_RINVBNDSTS = 0x00000001
ESME_RBINDFAIL = 0x0000000D

class SMPPSession:
    def __init__(self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter):
        self.reader = reader
        self.writer = writer
        self.system_id: Optional[str] = None
        self.authenticated = False
        self.peername = writer.get_extra_info('peername')
        self.session_id = None

    async def handle(self):
        logger.info(f"New SMPP connection from {self.peername}")
        try:
            while True:
                header = await self.reader.readexactly(16)
                if not header: break

                command_length, command_id, command_status, sequence_number = struct.unpack('!IIII', header)
                body_length = command_length - 16
                body = await self.reader.readexactly(body_length) if body_length > 0 else b''

                await self.process_pdu(command_id, sequence_number, body)
        except asyncio.IncompleteReadError:
            logger.info(f"Connection closed by ESME {self.peername}")
        except Exception as e:
            logger.error(f"Error in SMPP session: {e}")
        finally:
            await self.cleanup()

    async def cleanup(self):
        if self.session_id:
            with get_db() as conn:
                conn.execute("DELETE FROM smpp_server_sessions WHERE id=?", (self.session_id,))
        self.writer.close()
        try: await self.writer.wait_closed()
        except: pass

    async def process_pdu(self, command_id: int, seq: int, body: bytes):
        if command_id in [BIND_TRANSMITTER, BIND_RECEIVER, BIND_TRANSCEIVER]:
            await self.handle_bind(command_id, seq, body)
        elif command_id == SUBMIT_SM:
            await self.handle_submit_sm(seq, body)
        elif command_id == DELIVER_SM:
            await self.handle_deliver_sm(seq, body)
        elif command_id == ENQUIRE_LINK:
            await self.send_pdu(ENQUIRE_LINK | 0x80000000, ESME_ROK, seq, b'')
        elif command_id == UNBIND:
            await self.send_pdu(UNBIND | 0x80000000, ESME_ROK, seq, b'')
            self.writer.close()
        else:
            await self.send_pdu(GENERIC_NACK, 0x00000003, seq, b'') # Invalid Command ID

    async def handle_bind(self, command_id: int, seq: int, body: bytes):
        parts = body.split(b'\x00')
        self.system_id = parts[0].decode('utf-8') if len(parts) > 0 else ""
        password = parts[1].decode('utf-8') if len(parts) > 1 else ""

        with get_db() as conn:
            acc = conn.execute("SELECT * FROM smpp_server_accounts WHERE system_id = ? AND password = ? AND status = 'active'",
                               (self.system_id, password)).fetchone()
            if acc:
                self.authenticated = True
                from auth import generate_id
                self.session_id = generate_id()
                conn.execute("INSERT INTO smpp_server_sessions (id, system_id, ip_address, bind_type) VALUES (?,?,?,?)",
                             (self.session_id, self.system_id, str(self.peername[0]), hex(command_id)))
                logger.info(f"Bind successful: {self.system_id}")
            else:
                logger.warning(f"Bind failed: {self.system_id}")

        if not self.authenticated:
            await self.send_pdu(command_id | 0x80000000, ESME_RBINDFAIL, seq, b'')
            self.writer.close()
            return

        await self.send_pdu(command_id | 0x80000000, ESME_ROK, seq, parts[0] + b'\x00')

    async def handle_submit_sm(self, seq: int, body: bytes):
        if not self.authenticated:
            await self.send_pdu(0x80000004, ESME_RINVBNDSTS, seq, b'')
            return

        # Parsing SUBMIT_SM (Standard SMPP 3.4)
        try:
            offset = 0
            while body[offset] != 0: offset += 1 # service_type
            offset += 1
            src_ton, src_npi = body[offset], body[offset+1]
            offset += 2
            src_addr_start = offset
            while body[offset] != 0: offset += 1
            src_addr = body[src_addr_start:offset].decode('utf-8', 'ignore')
            offset += 1
            dst_ton, dst_npi = body[offset], body[offset+1]
            offset += 2
            dst_addr_start = offset
            while body[offset] != 0: offset += 1
            dst_addr = body[dst_addr_start:offset].decode('utf-8', 'ignore')
            offset += 1
            esm_class, proto, priority = body[offset:offset+3]
            offset += 5 # skip dates
            reg_delivery, replace_if, data_coding, default_msg_id, sm_len = body[offset:offset+5]
            offset += 5
            short_message = body[offset:offset+sm_len]

            # Alphanumeric CLI (TON=5) preservation
            is_alpha = (src_ton == 5)

            # Decoding based on Data Coding
            # 0: SMSC Default (GSM7), 8: UCS2 (Unicode)
            if data_coding == 8:
                message = short_message.decode('utf-16-be', 'ignore')
            else:
                message = short_message.decode('ascii', 'ignore') # Treat as GSM7/ASCII

            logger.info(f"SMPP SRV SUBMIT_SM: {src_addr} -> {dst_addr} [{message}]")

            # Routing/Processing logic
            from queue_manager import queue_manager
            await queue_manager.push("sms_queue", {
                "type": "sms_submit",
                "from": src_addr,
                "to": dst_addr,
                "msg": message,
                "is_alphanumeric_cli": is_alpha,
                "data_coding": data_coding,
                "system_id": self.system_id,
                "timestamp": datetime.utcnow().isoformat()
            })

            # Respond with Message ID
            msg_id = f"{seq}".encode() + b'\x00'
            await self.send_pdu(0x80000004, ESME_ROK, seq, msg_id)

        except Exception as e:
            logger.error(f"Submit SM parse error: {e}")
            await self.send_pdu(0x80000004, 0x00000008, seq, b'')

    async def handle_deliver_sm(self, seq: int, body: bytes):
        """
        Processes DELIVER_SM PDUs received from upstream providers.
        Typically used for MO (Mobile Originated) SMS or DLRs (Delivery Reports).
        """
        if not self.authenticated:
            await self.send_pdu(0x80000005, ESME_RINVBNDSTS, seq, b'')
            return

        try:
            offset = 0
            while body[offset] != 0: offset += 1 # service_type
            offset += 1
            src_ton, src_npi = body[offset], body[offset+1]
            offset += 2
            src_addr_start = offset
            while body[offset] != 0: offset += 1
            src_addr = body[src_addr_start:offset].decode('utf-8', 'ignore')
            offset += 1
            dst_ton, dst_npi = body[offset], body[offset+1]
            offset += 2
            dst_addr_start = offset
            while body[offset] != 0: offset += 1
            dst_addr = body[dst_addr_start:offset].decode('utf-8', 'ignore')
            offset += 1
            esm_class, proto, priority = body[offset:offset+3]
            offset += 5 # skip dates
            reg_delivery, replace_if, data_coding, default_msg_id, sm_len = body[offset:offset+5]
            offset += 5
            short_message = body[offset:offset+sm_len]

            # Check if this is a Delivery Receipt (DLR)
            is_dlr = (esm_class & 0x04) or (esm_class == 4)

            if is_dlr:
                dlr_text = short_message.decode('ascii', 'ignore')
                logger.info(f"SMPP SRV DLR: {dlr_text}")
                # ID:123 SUB:001 DLVRD:001 STAT:DELIVRD ERR:000
                from queue_manager import queue_manager
                await queue_manager.push("dlr_queue", {
                    "type": "dlr",
                    "raw": dlr_text,
                    "system_id": self.system_id,
                    "timestamp": datetime.utcnow().isoformat()
                })
            else:
                # Handle as MO (Mobile Originated) SMS
                if data_coding == 8:
                    message = short_message.decode('utf-16-be', 'ignore')
                else:
                    message = short_message.decode('ascii', 'ignore')

                logger.info(f"SMPP SRV MO_SMS: {src_addr} -> {dst_addr}")
                from queue_manager import queue_manager
                await queue_manager.push("sms_queue", {
                    "type": "mo_sms",
                    "from": src_addr,
                    "to": dst_addr,
                    "msg": message,
                    "data_coding": data_coding,
                    "system_id": self.system_id,
                    "timestamp": datetime.utcnow().isoformat()
                })

            # Respond with Message ID (usually empty string for DELIVER_SM_RESP)
            await self.send_pdu(0x80000005, ESME_ROK, seq, b'\x00')

        except Exception as e:
            logger.error(f"Deliver SM parse error: {e}")
            await self.send_pdu(0x80000005, 0x00000008, seq, b'')

    async def send_pdu(self, command_id: int, status: int, seq: int, body: bytes):
        try:
            length = 16 + len(body)
            header = struct.pack('!IIII', length, command_id, status, seq)
            self.writer.write(header + body)
            await self.writer.drain()
        except Exception as e:
            logger.error(f"PDU Send error: {e}")
            self.writer.close()

class SMPPServer:
    def __init__(self, host='0.0.0.0', port=2775):
        self.host = host
        self.port = port

    async def start(self):
        server = await asyncio.start_server(self.handle_client, self.host, self.port)
        logger.info(f"Production SMPP Server running on port {self.port}")
        async with server: await server.serve_forever()

    async def handle_client(self, reader, writer):
        session = SMPPSession(reader, writer)
        await session.handle()

if __name__ == "__main__":
    asyncio.run(SMPPServer().start())
