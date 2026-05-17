"""
Support Ticket Model
"""
from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.sql import func
from ..database import Base


class SupportTicket(Base):
    __tablename__ = "support_tickets"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    username = Column(String(100), nullable=False)
    subject = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    priority = Column(String(20), default="medium")
    status = Column(String(20), default="open")
    assigned_to = Column(String(100), nullable=True)
    reply = Column(Text, nullable=True)
    replied_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        return f"<SupportTicket {self.id}:{self.subject}>"
