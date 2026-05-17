"""
Transaction Ledger API Routes
Transaction history, balance adjustments, CSV export
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime, timedelta
from decimal import Decimal
import csv
import io

from ..database import get_db
from ..core.deps import get_current_user, get_current_admin, has_permission
from ..models.user import User, UserRole
from ..models.transaction import TransactionLedger, TransactionType

router = APIRouter()


# ── Schemas ────────────────────────────────────────────────────────────────────

class TransactionCreate(BaseModel):
    """Admin-only manual balance adjustment"""
    user_id: int
    amount: float
    description: Optional[str] = "Manual adjustment"


class BalanceTransferRequest(BaseModel):
    from_user_id: int
    to_user_id: int
    amount: float
    description: Optional[str] = ""


def _tx_to_dict(tx: TransactionLedger) -> Dict[str, Any]:
    """Convert TransactionLedger ORM object to dict"""
    return {
        "id": tx.id,
        "user_id": tx.user_id,
        "transaction_type": tx.transaction_type.value if tx.transaction_type else None,
        "amount": float(tx.amount) if tx.amount else 0,
        "balance_before": float(tx.balance_before) if tx.balance_before else 0,
        "balance_after": float(tx.balance_after) if tx.balance_after else 0,
        "currency": tx.currency,
        "reference_type": tx.reference_type,
        "reference_id": tx.reference_id,
        "description": tx.description,
        "created_by": tx.created_by,
        "created_at": tx.created_at.isoformat() if tx.created_at else None,
    }


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("")
async def list_transactions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    days: int = Query(30, ge=1, le=365),
    tx_type: Optional[str] = Query(None),
    user_id: Optional[int] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> Dict[str, Any]:
    """List transactions with filters. Admin sees all; users see own only."""
    cutoff = datetime.utcnow() - timedelta(days=days)
    query = db.query(TransactionLedger).filter(TransactionLedger.created_at >= cutoff)

    # Non-admin users can only see their own transactions
    if not has_permission(current_user, "manage_finances"):
        query = query.filter(TransactionLedger.user_id == current_user.id)
    elif user_id:
        query = query.filter(TransactionLedger.user_id == user_id)

    if tx_type:
        try:
            query = query.filter(TransactionLedger.transaction_type == TransactionType(tx_type))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid transaction type: {tx_type}"
            )

    total = query.count()
    transactions = query.order_by(TransactionLedger.created_at.desc()).offset(offset).limit(limit).all()
    return {
        "data": [_tx_to_dict(tx) for tx in transactions],
        "total": total,
        "offset": offset,
        "limit": limit,
    }


@router.post("")
async def create_transaction(
    body: TransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
) -> Dict[str, Any]:
    """Create a manual transaction / balance adjustment (admin only)"""
    target_user = db.query(User).filter(User.id == body.user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    balance_before = float(target_user.balance or 0)
    balance_after = balance_before + body.amount

    # Determine transaction type
    if body.amount >= 0:
        tx_type = TransactionType.CREDIT
    else:
        tx_type = TransactionType.DEBIT

    # Update user balance
    target_user.balance = Decimal(str(balance_after))
    db.commit()

    # Create ledger entry
    transaction = TransactionLedger(
        user_id=target_user.id,
        transaction_type=tx_type,
        amount=Decimal(str(body.amount)),
        balance_before=Decimal(str(balance_before)),
        balance_after=Decimal(str(balance_after)),
        currency="USD",
        description=body.description or f"Manual {'credit' if body.amount >= 0 else 'debit'}",
        created_by=current_user.id,
    )
    db.add(transaction)
    db.commit()
    db.refresh(transaction)

    return {
        "message": "Balance adjusted",
        "new_balance": balance_after,
        "data": _tx_to_dict(transaction),
    }


@router.post("/balance-transfer")
async def balance_transfer(
    body: BalanceTransferRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Transfer balance between users"""
    if body.amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Amount must be positive"
        )

    src_user = db.query(User).filter(User.id == body.from_user_id).first()
    dst_user = db.query(User).filter(User.id == body.to_user_id).first()
    if not src_user or not dst_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Non-admin can only transfer from own account
    if not has_permission(current_user, "manage_finances") and src_user.id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to transfer from this account"
        )

    src_balance = float(src_user.balance or 0)
    dst_balance = float(dst_user.balance or 0)

    if src_balance < body.amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Insufficient balance"
        )

    new_src = src_balance - body.amount
    new_dst = dst_balance + body.amount

    src_user.balance = Decimal(str(new_src))
    dst_user.balance = Decimal(str(new_dst))
    db.commit()

    note = body.description or f"Transfer to {dst_user.username}"
    now = datetime.utcnow()

    # Source ledger entry
    tx_out = TransactionLedger(
        user_id=src_user.id,
        transaction_type=TransactionType.TRANSFER,
        amount=Decimal(str(-body.amount)),
        balance_before=Decimal(str(src_balance)),
        balance_after=Decimal(str(new_src)),
        currency="USD",
        description=note,
        created_by=current_user.id,
    )
    db.add(tx_out)

    # Destination ledger entry
    tx_in = TransactionLedger(
        user_id=dst_user.id,
        transaction_type=TransactionType.TRANSFER,
        amount=Decimal(str(body.amount)),
        balance_before=Decimal(str(dst_balance)),
        balance_after=Decimal(str(new_dst)),
        currency="USD",
        description=note,
        created_by=current_user.id,
    )
    db.add(tx_in)
    db.commit()
    db.refresh(tx_out)
    db.refresh(tx_in)

    return {
        "message": f"Transferred ${body.amount:.4f} from {src_user.username} to {dst_user.username}",
        "data": {
            "source": _tx_to_dict(tx_out),
            "destination": _tx_to_dict(tx_in),
        }
    }


@router.get("/export")
async def export_transactions_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
    days: int = Query(30, ge=1, le=365),
) -> StreamingResponse:
    """Export transactions as CSV (admin only)"""
    cutoff = datetime.utcnow() - timedelta(days=days)
    transactions = (
        db.query(TransactionLedger)
        .filter(TransactionLedger.created_at >= cutoff)
        .order_by(TransactionLedger.created_at.desc())
        .all()
    )

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow([
        "ID", "User ID", "Type", "Amount", "Balance Before",
        "Balance After", "Currency", "Description", "Created By", "Date"
    ])

    for tx in transactions:
        # Resolve username via user_id
        user = db.query(User).filter(User.id == tx.user_id).first()
        username = user.username if user else str(tx.user_id)
        creator = db.query(User).filter(User.id == tx.created_by).first() if tx.created_by else None
        creator_name = creator.username if creator else ""

        writer.writerow([
            tx.id,
            username,
            tx.transaction_type.value if tx.transaction_type else "",
            float(tx.amount) if tx.amount else 0,
            float(tx.balance_before) if tx.balance_before else 0,
            float(tx.balance_after) if tx.balance_after else 0,
            tx.currency or "USD",
            tx.description or "",
            creator_name,
            tx.created_at.isoformat() if tx.created_at else "",
        ])

    buf.seek(0)
    filename = f"transactions_{days}d.csv"
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
