"""
Crypto Wallet Management API Routes
CRUD operations for crypto wallets
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..models.user import User
from ..models.crypto_wallet import CryptoWallet
from ..schemas.crypto import CryptoWalletCreate, CryptoWalletResponse
from ..core.deps import get_current_user

router = APIRouter()


@router.get("/wallets", response_model=List[CryptoWalletResponse])
async def list_wallets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> List[CryptoWallet]:
    """
    List user's crypto wallets
    """
    wallets = db.query(CryptoWallet).filter(
        CryptoWallet.user_id == current_user.id
    ).order_by(CryptoWallet.is_primary.desc(), CryptoWallet.created_at.desc()).all()
    
    return wallets


@router.post("/wallets", response_model=CryptoWalletResponse)
async def create_wallet(
    wallet_data: CryptoWalletCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> CryptoWallet:
    """
    Create new crypto wallet
    """
    # If setting as primary, unset other primary wallets
    if wallet_data.is_primary:
        db.query(CryptoWallet).filter(
            CryptoWallet.user_id == current_user.id,
            CryptoWallet.is_primary == True
        ).update({"is_primary": False})
    
    # Create wallet
    wallet = CryptoWallet(
        user_id=current_user.id,
        wallet_type=wallet_data.wallet_type,
        wallet_address=wallet_data.wallet_address,
        wallet_label=wallet_data.wallet_label,
        is_primary=wallet_data.is_primary
    )
    
    db.add(wallet)
    db.commit()
    db.refresh(wallet)
    
    return wallet


@router.put("/wallets/{wallet_id}/primary")
async def set_primary_wallet(
    wallet_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """
    Set wallet as primary
    """
    wallet = db.query(CryptoWallet).filter(
        CryptoWallet.id == wallet_id,
        CryptoWallet.user_id == current_user.id
    ).first()
    
    if not wallet:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wallet not found"
        )
    
    # Unset other primary wallets
    db.query(CryptoWallet).filter(
        CryptoWallet.user_id == current_user.id,
        CryptoWallet.is_primary == True
    ).update({"is_primary": False})
    
    # Set this wallet as primary
    wallet.is_primary = True
    db.commit()
    
    return {"message": "Primary wallet updated successfully"}


@router.delete("/wallets/{wallet_id}")
async def delete_wallet(
    wallet_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """
    Delete crypto wallet
    """
    wallet = db.query(CryptoWallet).filter(
        CryptoWallet.id == wallet_id,
        CryptoWallet.user_id == current_user.id
    ).first()
    
    if not wallet:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wallet not found"
        )
    
    db.delete(wallet)
    db.commit()
    
    return {"message": "Wallet deleted successfully"}
