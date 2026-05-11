"""
Crypto Wallet Schemas
"""
from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import datetime
from ..models.crypto_wallet import WalletType


class CryptoWalletCreate(BaseModel):
    wallet_type: WalletType
    wallet_address: str = Field(..., min_length=10, max_length=255)
    wallet_label: Optional[str] = Field(None, max_length=100)
    is_primary: bool = False
    
    @validator('wallet_address')
    def validate_wallet_address(cls, v, values):
        wallet_type = values.get('wallet_type')
        
        if wallet_type == WalletType.USDT_TRC20:
            # TRC-20 addresses start with 'T' and are 34 characters
            if not v.startswith('T') or len(v) != 34:
                raise ValueError('Invalid USDT TRC-20 address. Must start with T and be 34 characters.')
        
        elif wallet_type == WalletType.BINANCE_ID:
            # Binance ID can be email or numeric ID
            if '@' not in v and not v.isdigit():
                raise ValueError('Invalid Binance ID. Must be email or numeric ID.')
        
        return v


class CryptoWalletResponse(BaseModel):
    id: int
    user_id: int
    wallet_type: WalletType
    wallet_address: str
    wallet_label: Optional[str]
    is_primary: bool
    is_verified: bool
    created_at: datetime
    
    class Config:
        from_attributes = True
