"""
Test User Models
"""
from sqlalchemy import Column, Integer, String, Enum, DateTime, Boolean, ForeignKey
from sqlalchemy.sql import func
from ..database import Base
import enum


class TestUserStatus(str, enum.Enum):
    ACTIVE = "active"
    BLOCKED = "blocked"


class TestUser(Base):
    __tablename__ = "test_users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    password = Column(String(255), nullable=False)
    
    # Limits
    number_limit = Column(Integer, default=10)
    
    # Status
    status = Column(Enum(TestUserStatus), default=TestUserStatus.ACTIVE, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)
    
    def __repr__(self):
        return f"<TestUser {self.username}>"


class TestUserNumber(Base):
    __tablename__ = "test_user_numbers"
    
    id = Column(Integer, primary_key=True, index=True)
    test_username = Column(String(50), ForeignKey("test_users.username"), nullable=False, index=True)
    number_id = Column(Integer, ForeignKey("numbers.id"), nullable=False, index=True)
    
    # Timestamps
    allocated_at = Column(DateTime(timezone=True), server_default=func.now())
    
    def __repr__(self):
        return f"<TestUserNumber {self.test_username} - {self.number_id}>"
