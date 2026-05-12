"""
SMPP Connection Model
"""
from sqlalchemy import Column, Integer, String, Enum, DateTime
from sqlalchemy.sql import func
from ..database import Base
import enum


class SMPPStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"


class SMPPConnection(Base):
    __tablename__ = "smpp_connections"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    host = Column(String(255), nullable=False)
    port = Column(Integer, default=2775)
    system_id = Column(String(50), nullable=False)
    password = Column(String(255), nullable=False)
    system_type = Column(String(20), default="SMPP")
    interface_version = Column(String(10), default="3.4")
    status = Column(Enum(SMPPStatus), default=SMPPStatus.ACTIVE, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_activity_at = Column(DateTime(timezone=True), nullable=True)
    
    def __repr__(self):
        return f"<SMPPConnection {self.name} ({self.host}:{self.port})>"
