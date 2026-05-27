import asyncio
import logging
from datetime import datetime
from typing import Dict, Optional
from database import get_db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("smpp_server")

class SMPPSession:
    def __init__(self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter):
        self.reader = reader
        self.writer = writer
        self.system_id: Optional[str] = None
        self.authenticated = False
        self.peername = writer.get_extra_info('peername')

    async def handle(self):
        logger.info(f"New SMPP connection from {self.peername}")
        try:
            while True:
                # Basic SMPP PDU header is 16 bytes
                header = await self.reader.readexactly(16)
                if not header:
                    break

                command_length = int.from_bytes(header[0:4], 'big')
                command_id = int.from_bytes(header[4:8], 'big')
                command_status = int.from_bytes(header[8:12], 'big')
                sequence_number = int.from_bytes(header[12:16], 'big')

                body_length = command_length - 16
                body = await self.reader.readexactly(body_length) if body_length > 0 else b''

                await self.process_pdu(command_id, sequence_number, body)
        except asyncio.IncompleteReadError:
            logger.info(f"Connection closed by {self.peername}")
        except Exception as e:
            logger.error(f"Error handling SMPP session: {e}")
        finally:
            self.writer.close()
            await self.writer.wait_closed()

    async def process_pdu(self, command_id: int, seq: int, body: bytes):
        # SMPP Command IDs
        BIND_TRANSMITTER = 0x00000001
        BIND_RECEIVER = 0x00000002
        BIND_TRANSCEIVER = 0x00000009
        SUBMIT_SM = 0x00000004
        DELIVER_SM = 0x00000005
        ENQUIRE_LINK = 0x00000015
        UNBIND = 0x00000006

        if command_id in [BIND_TRANSMITTER, BIND_RECEIVER, BIND_TRANSCEIVER]:
            await self.handle_bind(command_id, seq, body)
        elif command_id == SUBMIT_SM:
            await self.handle_submit_sm(seq, body)
        elif command_id == DELIVER_SM:
            await self.handle_deliver_sm(seq, body)
        elif command_id == ENQUIRE_LINK:
            await self.send_pdu(command_id | 0x80000000, 0, seq, b'')
        elif command_id == UNBIND:
            await self.send_pdu(UNBIND | 0x80000000, 0, seq, b'')
            self.writer.close()

    async def handle_bind(self, command_id: int, seq: int, body: bytes):
        # SMPP Bind PDU: system_id (C-String), password (C-String), system_type (C-String), ...
        parts = body.split(b'\x00')
        self.system_id = parts[0].decode('utf-8') if len(parts) > 0 else "unknown"
        password = parts[1].decode('utf-8') if len(parts) > 1 else ""

        logger.info(f"Bind request from {self.system_id} (Type: {hex(command_id)})")

        # Real authentication against database
        with get_db() as conn:
            acc = conn.execute("SELECT * FROM smpp_server_accounts WHERE system_id = ? AND password = ? AND status = 'active'",
                               (self.system_id, password)).fetchone()
            if acc:
                self.authenticated = True
                logger.info(f"Authentication successful for {self.system_id}")
            else:
                self.authenticated = False
                logger.warning(f"Authentication failed for {self.system_id}")

        # Bind Response
        if not self.authenticated:
            # ESME_RBINDFAIL = 0x0000000D
            await self.send_pdu(command_id | 0x80000000, 0x0000000D, seq, b'')
            self.writer.close()
            return

        resp_id = command_id | 0x80000000
        # system_id back to client
        await self.send_pdu(resp_id, 0, seq, parts[0] + b'\x00')

    async def handle_deliver_sm(self, seq: int, body: bytes):
        if not self.authenticated:
            await self.send_pdu(0x80000005, 0x00000008, seq, b'')
            return

        logger.info(f"Received DELIVER_SM from {self.system_id}")

        # Similar parsing to submit_sm
        offset = 0
        while body[offset] != 0: offset += 1 # skip service_type
        offset += 1
        source_addr_ton = body[offset]
        offset += 2 # ton + npi
        source_addr_start = offset
        while body[offset] != 0: offset += 1
        source_addr = body[source_addr_start:offset].decode('utf-8', 'ignore')
        offset += 1
        while body[offset] != 0: offset += 1 # skip dest_addr
        offset += 1

        esm_class = body[offset]
        offset += 3 # esm_class + protocol_id + priority_flag
        # skip dates
        while body[offset] != 0: offset += 1 # schedule
        offset += 1
        while body[offset] != 0: offset += 1 # expiry
        offset += 1

        offset += 2 # registered + replace
        data_coding = body[offset]
        offset += 2 # coding + default_msg
        sm_length = body[offset]
        offset += 1
        short_message = body[offset:offset+sm_length]

        # Check if DLR (ESM Class 4 or bit 2 set)
        is_dlr = (esm_class & 0x04) or (esm_class == 4)

        if is_dlr:
            dlr_text = short_message.decode('ascii', 'ignore')
            await self.process_dlr(dlr_text)
        else:
            # Handle as MO SMS
            # Alphanumeric check
            is_alphanumeric = (source_addr_ton == 5)
            message = short_message.decode('utf-16-be' if data_coding == 8 else 'ascii', 'ignore')

            normalized = {
                "type": "sms",
                "from": source_addr,
                "msg": message,
                "is_alphanumeric_cli": is_alphanumeric,
                "timestamp": datetime.utcnow().isoformat()
            }
            logger.info(f"MO SMS parsed: {normalized}")
            # TODO: Push to Redis

        # Deliver SM Resp
        await self.send_pdu(0x80000005, 0, seq, b'\x00')

    async def process_dlr(self, text: str):
        import re
        # id:12469 sub:001 dlvrd:001 submit date:2605090348 done date:2605090348 stat:DELIVRD err:0 text:American Express: AI
        pattern = r"id:(?P<id>.*?) sub:(?P<sub>.*?) dlvrd:(?P<dlvrd>.*?) submit date:(?P<sdate>.*?) done date:(?P<ddate>.*?) stat:(?P<stat>.*?) err:(?P<err>.*?) text:(?P<text>.*)"
        match = re.search(pattern, text)
        if match:
            data = match.groupdict()

            def parse_date(dstr):
                # YYMMDDHHMM
                try:
                    return f"20{dstr[0:2]}-{dstr[2:4]}-{dstr[4:6]} {dstr[6:8]}:{dstr[8:10]}:00"
                except: return datetime.utcnow().isoformat()

            normalized_dlr = {
                "type": "dlr",
                "msg_id": data['id'],
                "submitted": int(data['sub']),
                "delivered": int(data['dlvrd']),
                "submit_date": parse_date(data['sdate']),
                "done_date": parse_date(data['ddate']),
                "status": data['stat'],
                "error_code": data['err'],
                "text": data['text']
            }
            logger.info(f"DLR parsed: {normalized_dlr}")
            # TODO: Push to Redis

    async def handle_submit_sm(self, seq: int, body: bytes):
        if not self.authenticated:
            await self.send_pdu(0x80000004, 0x00000008, seq, b'') # ESME_RINVBNDSTS
            return

        logger.info(f"Received SUBMIT_SM from {self.system_id}")

        # SMPP 3.4 submit_sm parsing logic
        # service_type (C-String), source_addr_ton (1), source_addr_npi (1), source_addr (C-String), ...
        offset = 0
        while body[offset] != 0: offset += 1 # skip service_type
        offset += 1

        source_addr_ton = body[offset]
        source_addr_npi = body[offset+1]
        offset += 2

        source_addr_start = offset
        while body[offset] != 0: offset += 1
        source_addr = body[source_addr_start:offset].decode('utf-8', 'ignore')
        offset += 1

        dest_addr_ton = body[offset]
        dest_addr_npi = body[offset+1]
        offset += 2

        dest_addr_start = offset
        while body[offset] != 0: offset += 1
        dest_addr = body[dest_addr_start:offset].decode('utf-8', 'ignore')
        offset += 1

        esm_class = body[offset]
        protocol_id = body[offset+1]
        priority_flag = body[offset+2]
        # ... skip some fields
        offset += 5

        data_coding = body[offset]
        sm_default_msg_id = body[offset+1]
        sm_length = body[offset+2]
        offset += 3

        short_message = body[offset:offset+sm_length]

        # Alphanumeric Source Address (TON 5)
        cli = source_addr
        is_alphanumeric = (source_addr_ton == 5)

        # Encoding handling
        if data_coding == 8:
            message = short_message.decode('utf-16-be', 'ignore')
        else:
            message = short_message.decode('ascii', 'ignore') # or GSM7

        logger.info(f"SMS: From={cli} To={dest_addr} Msg={message} (Alphanumeric={is_alphanumeric})")

        # Normalized Payload
        normalized = {
            "type": "sms",
            "from": cli,
            "to": dest_addr,
            "msg": message,
            "is_alphanumeric_cli": is_alphanumeric,
            "data_coding": data_coding,
            "timestamp": datetime.utcnow().isoformat()
        }

        # TODO: Push to Redis

        # Submit SM Resp
        message_id = f"{seq}".encode('utf-8') + b'\x00'
        await self.send_pdu(0x80000004, 0, seq, message_id)

    async def send_pdu(self, command_id: int, status: int, seq: int, body: bytes):
        length = 16 + len(body)
        header = length.to_bytes(4, 'big') + \
                 command_id.to_bytes(4, 'big') + \
                 status.to_bytes(4, 'big') + \
                 seq.to_bytes(4, 'big')
        self.writer.write(header + body)
        await self.writer.drain()

class SMPPServer:
    def __init__(self, host='0.0.0.0', port=2775):
        self.host = host
        self.port = port
        self.sessions: Dict[str, SMPPSession] = {}

    async def start(self):
        server = await asyncio.start_server(self.handle_client, self.host, self.port)
        addr = server.sockets[0].getsockname()
        logger.info(f"SMPP Server listening on {addr}")
        async with server:
            await server.serve_forever()

    async def handle_client(self, reader, writer):
        session = SMPPSession(reader, writer)
        await session.handle()

if __name__ == "__main__":
    server = SMPPServer()
    asyncio.run(server.start())
