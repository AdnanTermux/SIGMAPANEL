"""
Number Model
"""
from sqlalchemy import Column, Integer, String, Enum, DateTime, Numeric, Boolean
from sqlalchemy.sql import func
from ..database import Base
import enum


class NumberStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    MAINTENANCE = "maintenance"


class Number(Base):
    __tablename__ = "numbers"
    
    id = Column(Integer, primary_key=True, index=True)
    number = Column(String(20), unique=True, nullable=False, index=True)
    country = Column(String(2), nullable=False, index=True)
    country_name = Column(String(50))
    
    # Range info
    range_name = Column(String(100))
    range_id = Column(String(50), index=True)
    
    # Service
    service = Column(String(50), nullable=True, index=True)
    
    # Status
    status = Column(Enum(NumberStatus), default=NumberStatus.ACTIVE, nullable=False, index=True)
    
    # Assignment
    assigned_to = Column(String(50), nullable=True, index=True)
    assigned_at = Column(DateTime(timezone=True), nullable=True)
    
    # Pricing
    rate = Column(Numeric(10, 6), default=0.000000)
    profit_margin = Column(Numeric(5, 2), default=50.00)  # Percentage
    
    # Statistics
    total_sms = Column(Integer, default=0)
    last_sms_at = Column(DateTime(timezone=True), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        return f"<Number {self.number} ({self.country})>"
