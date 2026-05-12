"""
Security Log Model
"""
from sqlalchemy import Column, Integer, String, DateTime, Text, Index
from sqlalchemy.sql import func
from ..database import Base


class SecurityLog(Base):
    __tablename__ = "security_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Event
    event_type = Column(String(50), nullable=False, index=True)
    severity = Column(String(20), default="info", index=True)
    
    # User
    username = Column(String(50), nullable=True, index=True)
    user_id = Column(Integer, nullable=True)
    
    # Request
    ip_address = Column(String(45), nullable=True, index=True)
    user_agent = Column(String(255), nullable=True)
    
    # Details
    message = Column(Text, nullable=False)
    details = Column(Text, nullable=True)
    
    # Timestamp
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_security_date_type', 'created_at', 'event_type'),
        Index('idx_security_date_severity', 'created_at', 'severity'),
    )
    
    def __repr__(self):
        return f"<SecurityLog {self.event_type} - {self.severity}>"
