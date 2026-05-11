"""
Range Management API Routes
Full CRUD for number ranges
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime

from ..database import get_db
from ..models.user import User
from ..models.range import Range
from ..core.deps import get_current_user, get_current_admin

router = APIRouter()


@router.get("")
async def list_ranges(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    country: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """List ranges with filters"""
    query = db.query(Range)

    if country:
        query = query.filter(Range.country_code == country)
    if status:
        query = query.filter(Range.status == status)
    if search:
        term = f"%{search}%"
        query = query.filter(
            (Range.name.like(term)) | (Range.country_name.like(term)) | (Range.country_code.like(term))
        )

    total = query.count()
    ranges = query.order_by(Range.created_at.desc()).offset(skip).limit(limit).all()

    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "data": [
            {
                "id": r.id,
                "name": r.name,
                "country_code": r.country_code,
                "country_name": r.country_name,
                "rate": float(r.rate),
                "profit_margin": float(r.profit_margin),
                "status": r.status.value if hasattr(r.status, 'value') else r.status,
                "total_numbers": r.total_numbers,
                "allocated_numbers": r.allocated_numbers,
                "total_sms": r.total_sms,
                "created_at": r.created_at.isoformat() if r.created_at else None
            }
            for r in ranges
        ]
    }


@router.get("/{range_id}")
async def get_range(
    range_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """Get range by ID"""
    r = db.query(Range).filter(Range.id == range_id).first()
    if not r:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Range not found")
    return {
        "id": r.id,
        "name": r.name,
        "country_code": r.country_code,
        "country_name": r.country_name,
        "rate": float(r.rate),
        "profit_margin": float(r.profit_margin),
        "status": r.status.value if hasattr(r.status, 'value') else r.status,
        "total_numbers": r.total_numbers,
        "allocated_numbers": r.allocated_numbers,
        "total_sms": r.total_sms,
        "created_at": r.created_at.isoformat() if r.created_at else None
    }


@router.post("")
async def create_range(
    name: str,
    country_code: str,
    country_name: Optional[str] = None,
    rate: float = 0.0,
    profit_margin: float = 50.0,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
) -> dict:
    """Create new range (Admin only)"""
    if db.query(Range).filter(Range.name == name).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Range name already exists")

    new_range = Range(
        name=name,
        country_code=country_code,
        country_name=country_name,
        rate=rate,
        profit_margin=profit_margin,
        status="active"
    )
    db.add(new_range)
    db.commit()
    db.refresh(new_range)
    return {"id": new_range.id, "name": new_range.name, "message": "Range created successfully"}


@router.put("/{range_id}")
async def update_range(
    range_id: int,
    name: Optional[str] = None,
    country_code: Optional[str] = None,
    country_name: Optional[str] = None,
    rate: Optional[float] = None,
    profit_margin: Optional[float] = None,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
) -> dict:
    """Update range (Admin only)"""
    r = db.query(Range).filter(Range.id == range_id).first()
    if not r:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Range not found")

    if name is not None:
        r.name = name
    if country_code is not None:
        r.country_code = country_code
    if country_name is not None:
        r.country_name = country_name
    if rate is not None:
        r.rate = rate
    if profit_margin is not None:
        r.profit_margin = profit_margin
    if status is not None:
        r.status = status

    db.commit()
    db.refresh(r)
    return {"id": r.id, "message": "Range updated successfully"}


@router.delete("/{range_id}")
async def delete_range(
    range_id: int,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
) -> dict:
    """Delete range (Admin only)"""
    r = db.query(Range).filter(Range.id == range_id).first()
    if not r:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Range not found")
    db.delete(r)
    db.commit()
    return {"message": "Range deleted successfully"}
