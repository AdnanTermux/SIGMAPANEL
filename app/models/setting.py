"""
System Setting Model
"""
from sqlalchemy import Column, Integer, String, Text
from sqlalchemy.sql import func
from ..database import Base


class SystemSetting(Base):
    __tablename__ = "settings"
    
    id = Column(Integer, primary_key=True, index=True)
    setting_key = Column(String(100), nullable=False)
    setting_value = Column(Text, nullable=False)
    user_id = Column(Integer, nullable=True)
    
    def __repr__(self):
        return f"<Setting {self.setting_key}>"
