import asyncio
import logging
import struct
from datetime import datetime
from typing import Dict, Optional
from database import get_db, init_db

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
ESME_RTHROTTLED = 0x00000058

class SMPPSession:
    def __init__(self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter):
        self.reader = reader
        self.writer = writer
        self.system_id: Optional[str] = None
        self.authenticated = False
        self.peername = writer.get_extra_info('peername')
        self.ip_address = str(self.peername[0])
        self.session_id = None
        self.account_info = None
        self.msg_count_this_second = 0
        self.last_second = int(datetime.utcnow().timestamp())

    async def handle(self):
        logger.info(f"New SMPP connection from {self.ip_address}")
        try:
            while True:
                header = await self.reader.readexactly(16)
                if not header: break

                command_length, command_id, command_status, sequence_number = struct.unpack('!IIII', header)
                body_length = command_length - 16
                body = await self.reader.readexactly(body_length) if body_length > 0 else b''

                await self.process_pdu(command_id, sequence_number, body)
        except asyncio.IncompleteReadError:
            logger.info(f"Connection closed by {self.system_id or self.ip_address}")
        except Exception as e:
            logger.error(f"Error in SMPP session: {e}")
        finally:
            await self.cleanup()

    async def cleanup(self):
        if self.session_id:
            with get_db() as conn:
                conn.execute("DELETE FROM smpp_server_sessions WHERE id=?", (self.session_id,))
                conn.execute("INSERT INTO smpp_server_logs (id, system_id, ip_address, event_type, detail) VALUES (?,?,?,?,?)",
                             (self.session_id + "_exit", self.system_id, self.ip_address, "DISCONNECT", "Session terminated"))
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
            # Update last activity
            if self.session_id:
                with get_db() as conn:
                    conn.execute("UPDATE smpp_server_sessions SET last_activity=datetime('now') WHERE id=?", (self.session_id,))
        elif command_id == UNBIND:
            await self.send_pdu(UNBIND | 0x80000000, ESME_ROK, seq, b'')
            self.writer.close()
        else:
            await self.send_pdu(GENERIC_NACK, 0x00000003, seq, b'')

    async def handle_bind(self, command_id: int, seq: int, body: bytes):
        parts = body.split(b'\x00')
        self.system_id = parts[0].decode('utf-8') if len(parts) > 0 else ""
        password = parts[1].decode('utf-8') if len(parts) > 1 else ""

        with get_db() as conn:
            acc = conn.execute("SELECT * FROM smpp_server_accounts WHERE system_id = ? AND password = ? AND status = 'active'",
                               (self.system_id, password)).fetchone()

            if acc:
                # IP Whitelist check
                if acc['ip_whitelist'] and self.ip_address not in acc['ip_whitelist'].split(','):
                    logger.warning(f"Unauthorized IP {self.ip_address} for System ID {self.system_id}")
                    await self.send_pdu(command_id | 0x80000000, ESME_RBINDFAIL, seq, b'')
                    self.writer.close()
                    return

                self.authenticated = True
                self.account_info = dict(acc)
                from auth import generate_id
                self.session_id = generate_id()
                bind_type_str = {BIND_TRANSMITTER: "TX", BIND_RECEIVER: "RX", BIND_TRANSCEIVER: "TRX"}.get(command_id, "UNK")

                conn.execute("INSERT INTO smpp_server_sessions (id, system_id, ip_address, bind_type, status) VALUES (?,?,?,?,?)",
                             (self.session_id, self.system_id, self.ip_address, bind_type_str, "active"))

                conn.execute("INSERT INTO smpp_server_logs (id, system_id, ip_address, event_type, detail) VALUES (?,?,?,?,?)",
                             (self.session_id + "_bind", self.system_id, self.ip_address, "BIND_SUCCESS", f"Authenticated as {bind_type_str}"))

                logger.info(f"Bind successful: {self.system_id} ({bind_type_str})")
            else:
                logger.warning(f"Bind failed: {self.system_id} from {self.ip_address}")
                from auth import generate_id
                conn.execute("INSERT INTO smpp_server_logs (id, system_id, ip_address, event_type, detail) VALUES (?,?,?,?,?)",
                             (generate_id(), self.system_id, self.ip_address, "BIND_FAILURE", "Invalid credentials"))

        if not self.authenticated:
            await self.send_pdu(command_id | 0x80000000, ESME_RBINDFAIL, seq, b'')
            self.writer.close()
            return

        await self.send_pdu(command_id | 0x80000000, ESME_ROK, seq, parts[0] + b'\x00')

    def check_throughput(self) -> bool:
        if not self.account_info: return True
        limit = self.account_info.get('throughput_limit', 10)
        now = int(datetime.utcnow().timestamp())
        if now == self.last_second:
            self.msg_count_this_second += 1
        else:
            self.last_second = now
            self.msg_count_this_second = 1
        return self.msg_count_this_second <= limit

    async def handle_submit_sm(self, seq: int, body: bytes):
        if not self.authenticated:
            await self.send_pdu(0x80000004, ESME_RINVBNDSTS, seq, b'')
            return

        if not self.check_throughput():
            await self.send_pdu(0x80000004, ESME_RTHROTTLED, seq, b'')
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
            offset += 5
            reg_delivery, replace_if, data_coding, default_msg_id, sm_len = body[offset:offset+5]
            offset += 5
            short_message = body[offset:offset+sm_len]

            is_alpha = (src_ton == 5)
            if data_coding == 8:
                message = short_message.decode('utf-16-be', 'ignore')
            else:
                message = short_message.decode('ascii', 'ignore')

            logger.info(f"SMPP SUBMIT_SM from {self.system_id}: {src_addr} -> {dst_addr}")

            from queue_manager import queue_manager
            await queue_manager.push("sms_queue", {
                "from": src_addr,
                "to": dst_addr,
                "msg": message,
                "is_alphanumeric_cli": is_alpha,
                "system_id": self.system_id,
                "source": "SMPP_SERVER"
            })

            msg_id = f"{datetime.utcnow().timestamp()}".encode() + b'\x00'
            await self.send_pdu(0x80000004, ESME_ROK, seq, msg_id)

        except Exception as e:
            logger.error(f"Submit SM parse error: {e}")
            await self.send_pdu(0x80000004, 0x00000008, seq, b'')

    async def handle_deliver_sm(self, seq: int, body: bytes):
        if not self.authenticated:
            await self.send_pdu(0x80000005, ESME_RINVBNDSTS, seq, b'')
            return

        try:
            # We treat incoming deliver_sm as MO SMS or DLR
            # For simplicity, similar parsing as submit_sm
            offset = 0
            while body[offset] != 0: offset += 1 # skip service_type
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
            offset += 5
            reg_delivery, replace_if, data_coding, default_msg_id, sm_len = body[offset:offset+5]
            offset += 5
            short_message = body[offset:offset+sm_len]

            is_dlr = (esm_class & 0x04) or (esm_class == 4)

            if is_dlr:
                dlr_text = short_message.decode('ascii', 'ignore')
                from queue_manager import queue_manager
                await queue_manager.push("dlr_queue", {
                    "raw": dlr_text,
                    "system_id": self.system_id,
                    "timestamp": datetime.utcnow().isoformat()
                })
            else:
                if data_coding == 8: message = short_message.decode('utf-16-be', 'ignore')
                else: message = short_message.decode('ascii', 'ignore')

                from queue_manager import queue_manager
                await queue_manager.push("sms_queue", {
                    "from": src_addr,
                    "to": dst_addr,
                    "msg": message,
                    "system_id": self.system_id,
                    "source": "SMPP_SERVER_MO"
                })

            await self.send_pdu(0x80000005, ESME_ROK, seq, b'\x00')
        except Exception as e:
            logger.error(f"Deliver SM error: {e}")
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
        logger.info(f"Production SMPP Server listening on {self.host}:{self.port}")
        async with server: await server.serve_forever()

    async def handle_client(self, reader, writer):
        session = SMPPSession(reader, writer)
        await session.handle()

if __name__ == "__main__":
    init_db()
    asyncio.run(SMPPServer().start())
