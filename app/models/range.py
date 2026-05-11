"""
Range/Provider Model for managing number ranges
"""
from sqlalchemy import Column, Integer, String, Enum, DateTime, Numeric, Boolean, Text, ForeignKey
from sqlalchemy.sql import func
from ..database import Base
import enum


class RangeStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    MAINTENANCE = "maintenance"


class Range(Base):
    __tablename__ = "ranges"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    provider_id = Column(Integer, nullable=False, index=True)  # Provider/Manager who owns it
    
    # Range Configuration
    country_code = Column(String(2), nullable=False)
    country_name = Column(String(50))
    
    # Pricing
    rate = Column(Numeric(10, 6), default=0.000000)
    profit_margin = Column(Numeric(5, 2), default=50.00)
    
    # OTP Configuration
    otp_limit_per_day = Column(Integer, default=0)  # 0 = unlimited
    otp_daily_reset_hour = Column(Integer, default=0)  # Hour to reset OTP counter (UTC)
    
    # Allocation Configuration
    allocation_limit_global = Column(Integer, default=0)  # Total numbers available
    allocation_limit_per_user = Column(Integer, default=0)  # Max per user
    allocation_period = Column(String(20), default="monthly")  # weekly, monthly, etc
    
    # Status
    status = Column(Enum(RangeStatus), default=RangeStatus.ACTIVE, nullable=False, index=True)
    
    # Statistics
    total_numbers = Column(Integer, default=0)
    allocated_numbers = Column(Integer, default=0)
    total_sms = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        return f"<Range {self.name} ({self.country_code})>"
