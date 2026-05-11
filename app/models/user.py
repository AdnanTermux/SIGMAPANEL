"""
User Model
"""
from sqlalchemy import Column, Integer, String, Enum, DateTime, Numeric, Boolean, Text
from sqlalchemy.sql import func
from ..database import Base
import enum


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    RESELLER = "reseller"
    SUB_RESELLER = "sub_reseller"


class UserStatus(str, enum.Enum):
    ACTIVE = "active"
    BLOCKED = "blocked"
    PENDING = "pending"


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    password = Column(String(255), nullable=False)
    email = Column(String(100), unique=True, nullable=False, index=True)
    full_name = Column(String(100))
    role = Column(Enum(UserRole), default=UserRole.SUB_RESELLER, nullable=False)
    status = Column(Enum(UserStatus), default=UserStatus.ACTIVE, nullable=False)
    
    # Financial
    balance = Column(Numeric(10, 2), default=0.00)
    credit_limit = Column(Numeric(10, 2), default=0.00)
    
    # Hierarchy
    parent_id = Column(Integer, nullable=True)
    
    # API
    api_token = Column(String(64), unique=True, nullable=True, index=True)
    
    # Contact
    phone = Column(String(20), nullable=True)
    country = Column(String(2), nullable=True)
    
    # Settings
    timezone = Column(String(50), default="UTC")
    language = Column(String(5), default="en")
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)
    
    # Security
    failed_login_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime(timezone=True), nullable=True)
    
    def __repr__(self):
        return f"<User {self.username} ({self.role})>"
