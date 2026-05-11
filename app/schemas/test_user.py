"""
Test User Schemas
"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from ..models.test_user import TestUserStatus


class TestUserLogin(BaseModel):
    username: str
    password: str


class TestUserCreate(BaseModel):
    username: str
    password: str
    number_limit: int = 10


class TestUserResponse(BaseModel):
    id: int
    username: str
    number_limit: int
    status: TestUserStatus
    created_at: datetime
    last_login: Optional[datetime]
    
    class Config:
        from_attributes = True
