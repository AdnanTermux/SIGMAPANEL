"""
SMS Received Model
"""
from sqlalchemy import Column, Integer, String, DateTime, Numeric, Text, Index
from sqlalchemy.sql import func
from ..database import Base


class SMSReceived(Base):
    __tablename__ = "sms_received"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Number info
    number = Column(String(20), nullable=False, index=True)
    country = Column(String(2), nullable=True, index=True)
    range_name = Column(String(100), nullable=True)
    
    # Service
    service = Column(String(50), nullable=True, index=True)
    
    # Message
    message = Column(Text, nullable=False)
    otp = Column(String(20), nullable=True, index=True)
    
    # Assignment
    assigned_to = Column(String(50), nullable=True, index=True)
    
    # Financial
    currency = Column(String(3), default="USD")
    rate = Column(Numeric(10, 6), default=0.000000)
    profit = Column(Numeric(10, 6), default=0.000000)
    
    # Provider info
    provider_id = Column(String(100), nullable=True)
    provider_timestamp = Column(DateTime(timezone=True), nullable=True)
    
    # Timestamps
    received_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    processed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_sms_date_service', 'received_at', 'service'),
        Index('idx_sms_date_country', 'received_at', 'country'),
        Index('idx_sms_assigned_date', 'assigned_to', 'received_at'),
    )
    
    def __repr__(self):
        return f"<SMS {self.number} - {self.service} - {self.otp}>"
