"""
Pricing Rule Model
"""
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text
from sqlalchemy.sql import func
from ..database import Base


class PricingRule(Base):
    __tablename__ = "pricing_rules"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    scope = Column(String(20), default="global")
    role = Column(String(50), nullable=True)
    range_name = Column(String(100), nullable=True)
    rate = Column(Float, default=0)
    profit_margin = Column(Float, default=50)
    is_active = Column(Boolean, default=True)
    created_by = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    def __repr__(self):
        return f"<PricingRule {self.name} ({self.scope})>"
