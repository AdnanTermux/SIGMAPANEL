"""
Payment Request Model
"""
from sqlalchemy import Column, Integer, String, Enum, DateTime, Numeric, Text, ForeignKey
from sqlalchemy.sql import func
from ..database import Base
import enum


class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    PROCESSING = "processing"
    COMPLETED = "completed"


class PaymentMethod(str, enum.Enum):
    USDT_TRC20 = "USDT_TRC20"
    BINANCE_ID = "BINANCE_ID"


class PaymentRequest(Base):
    __tablename__ = "payment_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Amount
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), default="USDT")
    
    # Payout method
    payout_method = Column(Enum(PaymentMethod), nullable=False)
    payout_address = Column(String(255), nullable=False)
    
    # Transaction
    transaction_hash = Column(String(255), nullable=True)
    transaction_date = Column(DateTime(timezone=True), nullable=True)
    
    # Status
    status = Column(Enum(PaymentStatus), default=PaymentStatus.PENDING, nullable=False, index=True)
    
    # Admin notes
    admin_notes = Column(Text, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    
    # Processing
    processed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    processed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        return f"<PaymentRequest {self.id} - {self.amount} {self.currency} - {self.status}>"
