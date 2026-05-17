"""
Violation Log Model
"""
from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.sql import func
from ..database import Base


class ViolationLog(Base):
    __tablename__ = "violation_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    username = Column(String(100), nullable=False)
    app_name = Column(String(100), nullable=False)
    number = Column(String(50), nullable=True)
    message = Column(Text, nullable=True)
    violation_num = Column(Integer, nullable=False)
    severity = Column(String(20), nullable=True)
    suspended_for = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    def __repr__(self):
        return f"<ViolationLog {self.username}:{self.app_name}>"
