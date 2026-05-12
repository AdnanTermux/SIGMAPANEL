"""
Crypto Wallet Model
"""
from sqlalchemy import Column, Integer, String, Enum, DateTime, Boolean, ForeignKey
from sqlalchemy.sql import func
from ..database import Base
import enum


class WalletType(str, enum.Enum):
    USDT_TRC20 = "USDT_TRC20"
    BINANCE_ID = "BINANCE_ID"


class CryptoWallet(Base):
    __tablename__ = "crypto_wallets"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Wallet info
    wallet_type = Column(Enum(WalletType), nullable=False)
    wallet_address = Column(String(255), nullable=False)
    wallet_label = Column(String(100), nullable=True)
    
    # Status
    is_primary = Column(Boolean, default=False)
    is_verified = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        return f"<CryptoWallet {self.wallet_type} - {self.wallet_address[:10]}...>"
