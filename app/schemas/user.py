"""
User Schemas
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from ..models.user import UserRole, UserStatus


class UserLogin(BaseModel):
    username: str
    password: str
    captcha_answer: Optional[int] = None


class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)
    email: EmailStr
    full_name: Optional[str] = None
    role: UserRole = UserRole.SUB_RESELLER
    parent_id: Optional[int] = None


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    phone: Optional[str] = None
    country: Optional[str] = None
    timezone: Optional[str] = None
    language: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[str] = None
    commission_rate: Optional[float] = None
    profit_share: Optional[float] = None
    api_quota: Optional[int] = None


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: Optional[str]
    role: UserRole
    status: UserStatus
    balance: float
    created_at: datetime
    last_login: Optional[datetime]
    notes: Optional[str] = None
    tags: Optional[str] = None
    commission_rate: Optional[float] = None
    profit_share: Optional[float] = None
    api_quota: int = 1000
    
    class Config:
        from_attributes = True
