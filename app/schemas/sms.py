"""
SMS Schemas
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class SMSWebhook(BaseModel):
    """Flexible webhook request supporting multiple formats"""
    # Standard format
    number: Optional[str] = None
    phone: Optional[str] = None
    to: Optional[str] = None
    from_: Optional[str] = Field(None, alias="from")
    recipient: Optional[str] = None
    receiver: Optional[str] = None
    
    # Message
    message: Optional[str] = None
    text: Optional[str] = None
    sms: Optional[str] = None
    content: Optional[str] = None
    msg: Optional[str] = None
    
    # Optional fields
    service: Optional[str] = None
    country: Optional[str] = None
    otp: Optional[str] = None
    timestamp: Optional[str] = None
    api_key: Optional[str] = None
    
    # Message ID / Unique ID
    id: Optional[str] = None
    msgid: Optional[str] = None
    message_id: Optional[str] = None
    uuid: Optional[str] = None
    
    # DataTables format
    aaData: Optional[List[List]] = None
    sEcho: Optional[int] = None
    iTotalRecords: Optional[str] = None
    iTotalDisplayRecords: Optional[str] = None


class SMSResponse(BaseModel):
    id: int
    number: str
    service: Optional[str]
    country: Optional[str]
    otp: Optional[str]
    message: str
    received_at: datetime
    rate: float
    profit: float
    assigned_to: Optional[str]
    
    class Config:
        from_attributes = True


class SMSList(BaseModel):
    total: int
    page: int
    limit: int
    total_pages: int
    data: List[SMSResponse]
