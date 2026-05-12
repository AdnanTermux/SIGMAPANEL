"""
Transaction Ledger Model - Double-entry accounting
"""
from sqlalchemy import Column, Integer, String, Enum, DateTime, Numeric, ForeignKey, Text
from sqlalchemy.dialects.mysql import JSON
from sqlalchemy.sql import func
from ..database import Base
import enum


class TransactionType(str, enum.Enum):
    CREDIT = "credit"
    DEBIT = "debit"
    COMMISSION = "commission"
    PAYOUT = "payout"
    REFUND = "refund"
    TRANSFER = "transfer"
    ADJUSTMENT = "adjustment"


class TransactionLedger(Base):
    __tablename__ = "transaction_ledger"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    transaction_type = Column(Enum(TransactionType), nullable=False)
    amount = Column(Numeric(12, 4), nullable=False)
    balance_before = Column(Numeric(12, 4), nullable=False)
    balance_after = Column(Numeric(12, 4), nullable=False)
    currency = Column(String(3), default="USD")
    reference_type = Column(String(50), nullable=True)
    reference_id = Column(Integer, nullable=True)
    description = Column(Text, nullable=True)
    created_by = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    def __repr__(self):
        return f"<Transaction {self.transaction_type} {self.amount} for user {self.user_id}>"
