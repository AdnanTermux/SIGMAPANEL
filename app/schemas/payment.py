"""
Payment Request Schemas
"""
from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import datetime
from ..models.payment_request import PaymentStatus, PaymentMethod


class PaymentRequestCreate(BaseModel):
    amount: float = Field(..., gt=0, description="Amount must be greater than 0")
    payout_method: PaymentMethod
    payout_address: str = Field(..., min_length=10, max_length=255)
    
    @validator('amount')
    def validate_amount(cls, v, values):
        # Minimum payout validation will be done in the service layer
        # based on settings
        if v < 1:
            raise ValueError('Amount must be at least $1 USDT')
        return round(v, 2)


class PaymentRequestUpdate(BaseModel):
    status: PaymentStatus
    transaction_hash: Optional[str] = None
    admin_notes: Optional[str] = None
    rejection_reason: Optional[str] = None


class PaymentRequestResponse(BaseModel):
    id: int
    user_id: int
    amount: float
    currency: str
    payout_method: PaymentMethod
    payout_address: str
    transaction_hash: Optional[str]
    transaction_date: Optional[datetime]
    status: PaymentStatus
    admin_notes: Optional[str]
    rejection_reason: Optional[str]
    created_at: datetime
    processed_at: Optional[datetime]
    
    class Config:
        from_attributes = True
