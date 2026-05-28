import asyncio
import logging
import struct
from datetime import datetime
from typing import Dict, Optional, List
from database import get_db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("smpp_client")

class RemoteSMPPSession:
    def __init__(self, server_config: dict):
        self.config = server_config
        self.reader: Optional[asyncio.StreamReader] = None
        self.writer: Optional[asyncio.StreamWriter] = None
        self.connected = False
        self.bound = False
        self.seq = 1

    async def connect(self):
        try:
            logger.info(f"Connecting to remote SMPP {self.config['host']}:{self.config['port']}...")
            self.reader, self.writer = await asyncio.open_connection(self.config['host'], self.config['port'])
            self.connected = True
            await self.bind()
            return True
        except Exception as e:
            logger.error(f"Failed to connect to {self.config['name']}: {e}")
            return False

    async def bind(self):
        # Bind Type Mapping
        bind_map = {
            "transceiver": 0x00000009,
            "transmitter": 0x00000001,
            "receiver": 0x00000002
        }
        cmd_id = bind_map.get(self.config['bind_type'], 0x00000009)

        # PDU Body: system_id\0 password\0 system_type\0 interface_version\0 addr_ton\0 addr_npi\0 address_range\0
        body = self.config['system_id'].encode() + b'\x00' + \
               self.config['password'].encode() + b'\x00' + \
               b'\x00' + b'\x34' + \
               struct.pack('!BB', self.config.get('src_ton', 1), self.config.get('src_npi', 1)) + \
               b'\x00'

        await self.send_pdu(cmd_id, 0, self.seq, body)
        self.seq += 1

    async def send_heartbeat(self):
        while self.connected:
            await asyncio.sleep(self.config.get('enquire_link_interval', 30))
            if self.bound:
                await self.send_pdu(0x00000015, 0, self.seq, b'')
                self.seq += 1

    async def send_pdu(self, cmd_id: int, status: int, seq: int, body: bytes):
        if not self.writer: return
        try:
            length = 16 + len(body)
            header = struct.pack('!IIII', length, cmd_id, status, seq)
            self.writer.write(header + body)
            await self.writer.drain()
        except Exception as e:
            logger.error(f"Error sending PDU to {self.config['name']}: {e}")
            self.connected = False

    async def submit_sm(self, source_addr: str, dest_addr: str, short_message: str):
        if not self.bound: return False

        # Encoding (UCS2 if non-ascii, otherwise ASCII)
        try:
            short_message.encode('ascii')
            msg_bytes = short_message.encode('ascii')
            coding = 0
        except UnicodeEncodeError:
            msg_bytes = short_message.encode('utf-16-be')
            coding = 8

        # PDU Body for SUBMIT_SM
        body = b'\x00' + \
               struct.pack('!BB', self.config.get('src_ton', 1), self.config.get('src_npi', 1)) + \
               source_addr.encode() + b'\x00' + \
               struct.pack('!BB', self.config.get('dst_ton', 1), self.config.get('dst_npi', 1)) + \
               dest_addr.encode() + b'\x00' + \
               struct.pack('!BBB', 0, 0, 0) + \
               b'\x00' + b'\x00' + \
               struct.pack('!BBB', 1, coding, len(msg_bytes)) + msg_bytes

        await self.send_pdu(0x00000004, 0, self.seq, body)
        self.seq += 1
        return True

    async def listen(self):
        if not self.reader: return
        try:
            while True:
                header = await self.reader.readexactly(16)
                cmd_len, cmd_id, status, seq = struct.unpack('!IIII', header)
                body = await self.reader.readexactly(cmd_len - 16) if cmd_len > 16 else b''

                if cmd_id & 0x80000000: # It's a response
                    if cmd_id in [0x80000001, 0x80000002, 0x80000009]:
                        if status == 0:
                            self.bound = True
                            logger.info(f"Successfully bound to {self.config['name']}")
                            self.update_status('connected')
                        else:
                            logger.error(f"Bind failed for {self.config['name']} status {status}")
                            self.update_status('failed', f"Bind Error: {status}")

                if cmd_id == 0x00000015: # Enquire Link
                    await self.send_pdu(0x80000015, 0, seq, b'')

                if cmd_id == 0x00000005: # DELIVER_SM (MO or DLR)
                    # Simple ack first
                    await self.send_pdu(0x80000005, 0, seq, b'\x00')

                    # Logic for parsing DLR/MO would go here, similar to smpp_server.py
                    logger.info(f"Received DELIVER_SM from {self.config['name']}")
                    from queue_manager import queue_manager
                    queue_manager.push("sms_queue", {
                        "type": "mo_sms",
                        "remote_server": self.config['name'],
                        "timestamp": datetime.utcnow().isoformat()
                    })

        except Exception as e:
            logger.error(f"Connection lost for {self.config['name']}: {e}")
            self.connected = False
            self.bound = False
            self.update_status('disconnected', str(e))

    def update_status(self, status: str, error: str = ""):
        with get_db() as conn:
            now = datetime.utcnow().isoformat()
            if status == 'connected':
                conn.execute("UPDATE smpp_remote_servers SET status=?, last_connected=?, last_error=NULL WHERE id=?",
                             (status, now, self.config['id']))
            else:
                conn.execute("UPDATE smpp_remote_servers SET status=?, last_disconnected=?, last_error=? WHERE id=?",
                             (status, now, error, self.config['id']))

class SMPPClientManager:
    def __init__(self):
        self.sessions: Dict[str, RemoteSMPPSession] = {}

    async def run(self):
        logger.info("Starting SMPP Client Manager...")
        while True:
            await self.check_connections()
            await asyncio.sleep(10)

    async def check_connections(self):
        with get_db() as conn:
            servers = conn.execute("SELECT * FROM smpp_remote_servers WHERE is_active=1").fetchall()

        for s in servers:
            sid = s['id']
            if sid not in self.sessions or not self.sessions[sid].connected:
                session = RemoteSMPPSession(dict(s))
                self.sessions[sid] = session
                asyncio.create_task(self.manage_session(session))

    async def manage_session(self, session: RemoteSMPPSession):
        if await session.connect():
            asyncio.create_task(session.send_heartbeat())
            await session.listen()

if __name__ == "__main__":
    manager = SMPPClientManager()
    asyncio.run(manager.run())
