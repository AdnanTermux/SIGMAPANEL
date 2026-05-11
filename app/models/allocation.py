"""
Number Allocation and OTP Limits Models
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from ..database import Base


class AllocationPeriod(str, enum.Enum):
    """Allocation period types"""
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"


class NumberAllocation(Base):
    """Number allocation tracking"""
    __tablename__ = "number_allocations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    number_id = Column(Integer, ForeignKey("numbers.id"), nullable=False, index=True)
    
    # Allocation details
    period = Column(SQLEnum(AllocationPeriod), default=AllocationPeriod.MONTHLY)
    quantity = Column(Integer, default=1)
    is_active = Column(Boolean, default=True)
    
    # Tracking
    allocated_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)
    renewal_date = Column(DateTime, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="allocations")
    number = relationship("Number", back_populates="allocations")

    def __repr__(self):
        return f"<NumberAllocation user={self.user_id} number={self.number_id} period={self.period}>"


class OTPLimit(Base):
    """OTP limits per range per day"""
    __tablename__ = "otp_limits"

    id = Column(Integer, primary_key=True, index=True)
    range_name = Column(String(100), nullable=False, unique=True, index=True)
    
    # Limits
    daily_limit = Column(Integer, default=1000)
    current_count = Column(Integer, default=0)
    reset_at = Column(DateTime, default=datetime.utcnow)
    
    # Pricing impact
    zero_payout_when_exceeded = Column(Boolean, default=True)
    
    # Admin settings
    enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<OTPLimit range={self.range_name} daily={self.daily_limit}>"


class AllocationSettings(Base):
    """Global allocation settings"""
    __tablename__ = "allocation_settings"

    id = Column(Integer, primary_key=True, index=True)
    
    # Global limits
    global_allocation_limit = Column(Integer, default=10000)
    current_global_allocation = Column(Integer, default=0)
    
    # Per user limits
    max_numbers_per_user = Column(Integer, default=100)
    max_daily_allocations = Column(Integer, default=10)
    
    # Allocation rules
    auto_renewal_enabled = Column(Boolean, default=True)
    require_approval = Column(Boolean, default=False)
    
    # Notifications
    notify_on_limit_reached = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<AllocationSettings global_limit={self.global_allocation_limit}>"


class AllocationRequest(Base):
    """Track allocation requests for approval"""
    __tablename__ = "allocation_requests"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Request details
    range_name = Column(String(100), nullable=False)
    quantity = Column(Integer, nullable=False)
    period = Column(SQLEnum(AllocationPeriod), default=AllocationPeriod.MONTHLY)
    
    # Status
    status = Column(String(20), default="pending")  # pending, approved, rejected, cancelled
    reason = Column(String(500), nullable=True)
    
    # Tracking
    requested_at = Column(DateTime, default=datetime.utcnow)
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    
    user = relationship("User", foreign_keys=[user_id])
    approver = relationship("User", foreign_keys=[approved_by])

    def __repr__(self):
        return f"<AllocationRequest user={self.user_id} range={self.range_name} status={self.status}>"
