"""
Number Management API Routes
CRUD operations for phone numbers
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from ..database import get_db
from ..models.user import User
from ..models.number import Number
from ..core.deps import get_current_user, get_current_admin

router = APIRouter()


@router.get("")
async def list_numbers(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    country: Optional[str] = None,
    service: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """
    List numbers with filters
    """
    query = db.query(Number)
    
    # Filter by assignment (non-admin users see only their numbers)
    if current_user.role != "admin":
        query = query.filter(Number.assigned_to == current_user.username)
    
    # Apply filters
    if country:
        query = query.filter(Number.country == country)
    
    if service:
        query = query.filter(Number.service == service)
    
    if status:
        query = query.filter(Number.status == status)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Number.number.like(search_term)) |
            (Number.range_name.like(search_term))
        )
    
    total = query.count()
    numbers = query.offset(skip).limit(limit).all()
    
    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "data": [
            {
                "id": num.id,
                "number": num.number,
                "country": num.country,
                "country_name": num.country_name,
                "range_name": num.range_name,
                "service": num.service,
                "status": num.status.value,
                "assigned_to": num.assigned_to,
                "rate": float(num.rate),
                "profit_margin": float(num.profit_margin),
                "total_sms": num.total_sms,
                "last_sms_at": num.last_sms_at.isoformat() if num.last_sms_at else None,
                "created_at": num.created_at.isoformat()
            }
            for num in numbers
        ]
    }


@router.get("/{number_id}")
async def get_number(
    number_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """
    Get number by ID
    """
    number = db.query(Number).filter(Number.id == number_id).first()
    
    if not number:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Number not found"
        )
    
    # Check permissions
    if current_user.role != "admin" and number.assigned_to != current_user.username:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this number"
        )
    
    return {
        "id": number.id,
        "number": number.number,
        "country": number.country,
        "country_name": number.country_name,
        "range_name": number.range_name,
        "range_id": number.range_id,
        "service": number.service,
        "status": number.status.value,
        "assigned_to": number.assigned_to,
        "assigned_at": number.assigned_at.isoformat() if number.assigned_at else None,
        "rate": float(number.rate),
        "profit_margin": float(number.profit_margin),
        "total_sms": number.total_sms,
        "last_sms_at": number.last_sms_at.isoformat() if number.last_sms_at else None,
        "created_at": number.created_at.isoformat()
    }


@router.post("")
async def create_number(
    number: str,
    country: str,
    country_name: Optional[str] = None,
    range_name: Optional[str] = None,
    range_id: Optional[str] = None,
    service: Optional[str] = None,
    rate: float = 0.0,
    profit_margin: float = 50.0,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
) -> dict:
    """
    Create new number (Admin only)
    """
    # Check if number exists
    if db.query(Number).filter(Number.number == number).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Number already exists"
        )
    
    # Create number
    new_number = Number(
        number=number,
        country=country,
        country_name=country_name,
        range_name=range_name,
        range_id=range_id,
        service=service,
        rate=rate,
        profit_margin=profit_margin,
        status="active"
    )
    
    db.add(new_number)
    db.commit()
    db.refresh(new_number)
    
    return {
        "id": new_number.id,
        "number": new_number.number,
        "message": "Number created successfully"
    }


@router.put("/{number_id}")
async def update_number(
    number_id: int,
    rate: Optional[float] = None,
    profit_margin: Optional[float] = None,
    status: Optional[str] = None,
    assigned_to: Optional[str] = None,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
) -> dict:
    """
    Update number (Admin only)
    """
    number = db.query(Number).filter(Number.id == number_id).first()
    
    if not number:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Number not found"
        )
    
    # Update fields
    if rate is not None:
        number.rate = rate
    
    if profit_margin is not None:
        number.profit_margin = profit_margin
    
    if status is not None:
        number.status = status
    
    if assigned_to is not None:
        number.assigned_to = assigned_to
        number.assigned_at = datetime.utcnow()
    
    db.commit()
    db.refresh(number)
    
    return {
        "id": number.id,
        "message": "Number updated successfully"
    }


@router.delete("/{number_id}")
async def delete_number(
    number_id: int,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
) -> dict:
    """
    Delete number (Admin only)
    """
    number = db.query(Number).filter(Number.id == number_id).first()
    
    if not number:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Number not found"
        )
    
    db.delete(number)
    db.commit()
    
    return {"message": "Number deleted successfully"}


@router.post("/bulk-import")
async def bulk_import_numbers(
    numbers: List[dict],
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
) -> dict:
    """
    Bulk import numbers (Admin only)
    """
    success_count = 0
    error_count = 0
    errors = []
    
    for idx, num_data in enumerate(numbers):
        try:
            # Check if number exists
            if db.query(Number).filter(Number.number == num_data.get("number")).first():
                error_count += 1
                errors.append(f"Row {idx}: Number already exists")
                continue
            
            # Create number
            new_number = Number(
                number=num_data.get("number"),
                country=num_data.get("country"),
                country_name=num_data.get("country_name"),
                range_name=num_data.get("range_name"),
                range_id=num_data.get("range_id"),
                service=num_data.get("service"),
                rate=num_data.get("rate", 0.0),
                profit_margin=num_data.get("profit_margin", 50.0),
                status="active"
            )
            
            db.add(new_number)
            success_count += 1
            
        except Exception as e:
            error_count += 1
            errors.append(f"Row {idx}: {str(e)}")
    
    db.commit()
    
    return {
        "success_count": success_count,
        "error_count": error_count,
        "errors": errors[:10]  # Limit errors
    }
