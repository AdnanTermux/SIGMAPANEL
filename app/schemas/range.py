"""
Range Schemas
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class RangeCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    country_code: str = Field(..., min_length=2, max_length=2)
    country_name: Optional[str] = None
    rate: float = 0.0
    profit_margin: float = 50.0
    status: str = "active"


class RangeUpdate(BaseModel):
    name: Optional[str] = None
    country_code: Optional[str] = None
    country_name: Optional[str] = None
    rate: Optional[float] = None
    profit_margin: Optional[float] = None
    status: Optional[str] = None
    total_numbers: Optional[int] = None


class RangeResponse(BaseModel):
    id: int
    name: str
    country_code: str
    country_name: Optional[str]
    rate: float
    profit_margin: float
    status: str
    total_numbers: int
    allocated_numbers: int
    total_sms: int
    created_at: datetime

    class Config:
        from_attributes = True
