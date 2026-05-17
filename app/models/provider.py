"""
Provider Model
"""
from sqlalchemy import Column, Integer, String, Enum, DateTime, Text, Float, Boolean
from sqlalchemy.sql import func
from ..database import Base
import enum


class ProviderType(str, enum.Enum):
    HTTP = "http"
    SMPP = "smpp"


class ProviderStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"


class Provider(Base):
    __tablename__ = "providers"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    type = Column(Enum(ProviderType), default=ProviderType.HTTP, nullable=False)
    status = Column(Enum(ProviderStatus), default=ProviderStatus.ACTIVE, nullable=False)
    
    # HTTP API settings
    api_url = Column(String(500), nullable=True)
    api_token = Column(String(500), nullable=True)
    api_method = Column(String(10), default="POST")
    field_to = Column(String(50), default="to")
    field_from = Column(String(50), default="from")
    field_msg = Column(String(50), default="msg")
    field_uuid = Column(String(50), default="uuid")
    
    # SMPP settings
    smpp_host = Column(String(255), nullable=True)
    smpp_port = Column(Integer, default=2775)
    smpp_system_id = Column(String(100), nullable=True)
    smpp_password = Column(String(255), nullable=True)
    smpp_system_type = Column(String(50), default="")
    smpp_service_type = Column(String(50), nullable=True)
    smpp_source_ton = Column(Integer, default=1)
    smpp_source_npi = Column(Integer, default=1)
    smpp_dest_ton = Column(Integer, default=1)
    smpp_dest_npi = Column(Integer, default=1)
    smpp_data_coding = Column(Integer, default=0)
    
    # Stats
    total_sms_received = Column(Integer, default=0)
    last_active_at = Column(DateTime(timezone=True), nullable=True)
    
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        return f"<Provider {self.name} ({self.type})>"
