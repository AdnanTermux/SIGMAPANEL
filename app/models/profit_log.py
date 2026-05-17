"""
Profit Log Model
"""
from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.sql import func
from ..database import Base


class ProfitLog(Base):
    __tablename__ = "profit_log"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True)
    number_id = Column(Integer, nullable=True)
    sms_received_id = Column(Integer, nullable=True)
    rate_applied = Column(Float, default=0)
    profit_amount = Column(Float, default=0)
    currency = Column(String(10), default="USD")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    def __repr__(self):
        return f"<ProfitLog amount={self.profit_amount}>"
