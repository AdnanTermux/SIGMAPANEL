"""
Payment Request API Routes
Create and manage payment requests
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from ..database import get_db
from ..models.user import User
from ..models.payment_request import PaymentRequest
from ..models.crypto_wallet import CryptoWallet
from ..schemas.payment import PaymentRequestCreate, PaymentRequestResponse, PaymentRequestUpdate
from ..core.deps import get_current_user, get_current_admin
from ..config import settings

router = APIRouter()


@router.get("/requests", response_model=List[PaymentRequestResponse])
async def list_payment_requests(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> List[PaymentRequest]:
    """
    List payment requests
    """
    query = db.query(PaymentRequest)
    
    # Filter by user (non-admin sees only their requests)
    if current_user.role != "admin":
        query = query.filter(PaymentRequest.user_id == current_user.id)
    
    # Apply status filter
    if status:
        query = query.filter(PaymentRequest.status == status)
    
    requests = query.order_by(PaymentRequest.created_at.desc()).offset(skip).limit(limit).all()
    return requests


@router.post("/requests", response_model=PaymentRequestResponse)
async def create_payment_request(
    request_data: PaymentRequestCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> PaymentRequest:
    """
    Create new payment request
    """
    # Check minimum payout
    min_payout = settings.USDT_TRC20_MIN_PAYOUT if request_data.payout_method == "USDT_TRC20" else settings.BINANCE_MIN_PAYOUT
    
    if request_data.amount < min_payout:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Minimum payout is ${min_payout} USDT"
        )
    
    # Check if user has sufficient balance
    if current_user.balance < request_data.amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Insufficient balance"
        )
    
    # Check if wallet exists
    wallet = db.query(CryptoWallet).filter(
        CryptoWallet.user_id == current_user.id,
        CryptoWallet.wallet_address == request_data.payout_address
    ).first()
    
    if not wallet:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Wallet not found. Please add the wallet first."
        )
    
    # Create payment request
    payment_request = PaymentRequest(
        user_id=current_user.id,
        amount=request_data.amount,
        currency="USDT",
        payout_method=request_data.payout_method,
        payout_address=request_data.payout_address,
        status="pending"
    )
    
    db.add(payment_request)
    db.commit()
    db.refresh(payment_request)
    
    return payment_request


@router.put("/requests/{request_id}/approve")
async def approve_payment_request(
    request_id: int,
    transaction_hash: Optional[str] = None,
    admin_notes: Optional[str] = None,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
) -> dict:
    """
    Approve payment request (Admin only)
    """
    payment_request = db.query(PaymentRequest).filter(
        PaymentRequest.id == request_id
    ).first()
    
    if not payment_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment request not found"
        )
    
    if payment_request.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment request is not pending"
        )
    
    # Update payment request
    payment_request.status = "approved"
    payment_request.transaction_hash = transaction_hash
    payment_request.transaction_date = datetime.utcnow()
    payment_request.admin_notes = admin_notes
    payment_request.processed_by = current_user.id
    payment_request.processed_at = datetime.utcnow()
    
    # Deduct from user balance
    user = db.query(User).filter(User.id == payment_request.user_id).first()
    if user:
        user.balance -= payment_request.amount
    
    db.commit()
    
    return {"message": "Payment request approved successfully"}


@router.put("/requests/{request_id}/reject")
async def reject_payment_request(
    request_id: int,
    rejection_reason: Optional[str] = None,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
) -> dict:
    """
    Reject payment request (Admin only)
    """
    payment_request = db.query(PaymentRequest).filter(
        PaymentRequest.id == request_id
    ).first()
    
    if not payment_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment request not found"
        )
    
    if payment_request.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment request is not pending"
        )
    
    # Update payment request
    payment_request.status = "rejected"
    payment_request.rejection_reason = rejection_reason
    payment_request.processed_by = current_user.id
    payment_request.processed_at = datetime.utcnow()
    
    db.commit()
    
    return {"message": "Payment request rejected successfully"}
