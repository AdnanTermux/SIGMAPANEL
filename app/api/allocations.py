"""
Number Allocation API Routes
Self-allocation, admin allocation, bulk import, return/cancel
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any, List
from pydantic import BaseModel
from datetime import datetime, timedelta
from decimal import Decimal
import re

from ..database import get_db
from ..core.deps import get_current_user, get_current_admin, has_permission, require_permission
from ..models.user import User, UserRole
from ..models.number import Number, NumberStatus
from ..models.allocation import NumberAllocation, AllocationPeriod, AllocationRequest
from ..models.range import Range, RangeStatus

router = APIRouter()


# ── Schemas ────────────────────────────────────────────────────────────────────

class BulkImportRequest(BaseModel):
    numbers_text: str  # One number per line
    country: str
    country_name: Optional[str] = None
    range_name: Optional[str] = None
    range_id: Optional[int] = None
    rate: Optional[float] = 0.0
    profit_margin: Optional[float] = 50.0


class AllocateToUserRequest(BaseModel):
    """Admin/manager allocates numbers to a specific user"""
    user_id: int
    range_name: str
    quantity: int


class SelfAllocateRequest(BaseModel):
    """Reseller self-allocates numbers from a range"""
    range_name: str
    quantity: int
    duration: str = "monthly"  # weekly, monthly, yearly, custom
    custom_days: Optional[int] = None


class ReturnAllocationRequest(BaseModel):
    """Return specific number allocations"""
    allocation_ids: List[int]


def _allocation_to_dict(a: NumberAllocation) -> Dict[str, Any]:
    """Convert NumberAllocation ORM object to dict"""
    return {
        "id": a.id,
        "user_id": a.user_id,
        "number_id": a.number_id,
        "period": a.period.value if a.period else None,
        "quantity": a.quantity,
        "is_active": a.is_active,
        "allocated_at": a.allocated_at.isoformat() if a.allocated_at else None,
        "expires_at": a.expires_at.isoformat() if a.expires_at else None,
        "renewal_date": a.renewal_date.isoformat() if a.renewal_date else None,
    }


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("")
async def list_allocations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    alloc_status: Optional[str] = Query(None, alias="status"),
    range_name: Optional[str] = Query(None),
) -> Dict[str, Any]:
    """List allocations. Admin sees all; users see own only."""
    query = db.query(NumberAllocation)
    if not has_permission(current_user, "manage_numbers"):
        query = query.filter(NumberAllocation.user_id == current_user.id)
    if alloc_status == "active":
        query = query.filter(NumberAllocation.is_active == True)
    elif alloc_status == "inactive":
        query = query.filter(NumberAllocation.is_active == False)
    allocations = query.order_by(NumberAllocation.allocated_at.desc()).all()
    return {"data": [_allocation_to_dict(a) for a in allocations]}


@router.post("")
async def allocate_numbers_to_user(
    body: AllocateToUserRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
) -> Dict[str, Any]:
    """Allocate numbers to a specific user (admin/manager only)"""
    target_user = db.query(User).filter(User.id == body.user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Find available numbers in range
    available = (
        db.query(Number)
        .filter(
            Number.range_name == body.range_name,
            Number.status == NumberStatus.ACTIVE,
            (Number.assigned_to.is_(None)) | (Number.assigned_to == ""),
        )
        .limit(body.quantity)
        .all()
    )

    if len(available) < body.quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only {len(available)} numbers available in range '{body.range_name}'"
        )

    now = datetime.utcnow()
    allocated = []
    for num in available:
        num.assigned_to = target_user.username
        num.assigned_at = now

        alloc = NumberAllocation(
            user_id=target_user.id,
            number_id=num.id,
            period=AllocationPeriod.MONTHLY,
            quantity=1,
            is_active=True,
            allocated_at=now,
            expires_at=now + timedelta(days=30),
        )
        db.add(alloc)
        allocated.append(num.number)

    db.commit()
    return {
        "message": f"Allocated {len(allocated)} numbers to {target_user.username}",
        "allocated_count": len(allocated),
        "numbers": allocated,
    }


@router.post("/self")
async def self_allocate(
    body: SelfAllocateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Self-allocate numbers from a range (reseller with self_allocate permission)"""
    if not has_permission(current_user, "self_allocate"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your role does not have self-allocation permission"
        )

    rng = db.query(Range).filter(Range.name == body.range_name).first()
    if not rng:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Range not found"
        )
    if rng.status != RangeStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Range is not active"
        )

    # Check allocation limits
    per_user_limit = rng.allocation_limit_per_user or 100
    global_limit = rng.allocation_limit_global or 10000
    allocated = rng.allocated_numbers or 0

    if body.quantity > per_user_limit:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Max {per_user_limit} numbers per request"
        )
    if allocated + body.quantity > global_limit:
        remaining = global_limit - allocated
        if remaining <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Self-allocation limit reached for this range. Contact support for additional numbers."
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only {remaining} allocation slots available. Contact support for more."
        )

    # Find available numbers
    available = (
        db.query(Number)
        .filter(
            Number.range_name == body.range_name,
            Number.status == NumberStatus.ACTIVE,
            (Number.assigned_to.is_(None)) | (Number.assigned_to == ""),
        )
        .limit(body.quantity)
        .all()
    )

    if len(available) < body.quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only {len(available)} numbers available in this range"
        )

    # Calculate expiry
    expires_map = {"weekly": 7, "monthly": 30, "yearly": 365}
    days = body.custom_days if body.duration == "custom" else expires_map.get(body.duration, 30)
    expires_at = datetime.utcnow() + timedelta(days=days)

    now = datetime.utcnow()
    numbers_allocated = []
    for num in available:
        num.assigned_to = current_user.username
        num.assigned_at = now
        numbers_allocated.append(num.number)

    # Update range counter
    rng.allocated_numbers = (rng.allocated_numbers or 0) + body.quantity
    db.commit()

    return {
        "allocated": body.quantity,
        "expires_at": expires_at.isoformat(),
        "numbers": numbers_allocated,
    }


@router.delete("/{allocation_id}")
async def cancel_allocation(
    allocation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, str]:
    """Return/cancel an allocation"""
    alloc = db.query(NumberAllocation).filter(NumberAllocation.id == allocation_id).first()
    if not alloc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Allocation not found"
        )

    # Authorization check
    if not has_permission(current_user, "manage_numbers") and alloc.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to cancel this allocation"
        )

    # Unassign the number
    number = db.query(Number).filter(Number.id == alloc.number_id).first()
    if number and number.assigned_to:
        number.assigned_to = None
        number.assigned_at = None

    # Update range counter
    if number and number.range_name:
        rng = db.query(Range).filter(Range.name == number.range_name).first()
        if rng and rng.allocated_numbers and rng.allocated_numbers > 0:
            rng.allocated_numbers = max(0, rng.allocated_numbers - 1)

    alloc.is_active = False
    db.commit()

    return {"message": "Allocation cancelled"}


@router.post("/bulk-import")
async def bulk_import_numbers(
    body: BulkImportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
) -> Dict[str, Any]:
    """Bulk import numbers (admin only)"""
    lines = [line.strip() for line in body.numbers_text.splitlines() if line.strip()]
    success, skipped, errors = 0, 0, []

    for line in lines:
        num = re.sub(r'[\s\-\(\)]', '', line)
        if not num:
            continue
        if not num.startswith('+'):
            num = '+' + num

        # Check for duplicates
        if db.query(Number).filter(Number.number == num).first():
            skipped += 1
            continue

        try:
            number = Number(
                number=num,
                country=body.country,
                country_name=body.country_name,
                range_name=body.range_name,
                range_id=str(body.range_id) if body.range_id else None,
                rate=Decimal(str(body.rate)),
                profit_margin=Decimal(str(body.profit_margin)),
                status=NumberStatus.ACTIVE,
                total_sms=0,
            )
            db.add(number)
            success += 1
        except Exception as e:
            errors.append(f"{num}: {str(e)}")

    # Update range total if range specified
    if body.range_id:
        rng = db.query(Range).filter(Range.id == body.range_id).first()
        if rng:
            rng.total_numbers = db.query(Number).filter(Number.range_id == str(body.range_id)).count()

    db.commit()

    return {
        "success": success,
        "skipped": skipped,
        "errors": errors[:20],
        "total": len(lines),
    }
