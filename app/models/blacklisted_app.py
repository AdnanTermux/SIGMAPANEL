"""
Blacklisted App Model
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.sql import func
from ..database import Base


class BlacklistedApp(Base):
    __tablename__ = "blacklisted_apps"
    
    id = Column(Integer, primary_key=True, index=True)
    app_name = Column(String(100), unique=True, nullable=False)
    pattern = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_by = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    def __repr__(self):
        return f"<BlacklistedApp {self.app_name}>"
