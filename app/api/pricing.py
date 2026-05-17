"""
Pricing Rules API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
from pydantic import BaseModel
from decimal import Decimal

from ..database import get_db
from ..core.deps import get_current_user, get_current_admin, has_permission
from ..models.user import User
from ..models.pricing_rule import PricingRule

router = APIRouter()


# ── Schemas ────────────────────────────────────────────────────────────────────

class PricingCreate(BaseModel):
    name: str
    scope: Optional[str] = "global"  # global, role, range
    role: Optional[str] = None
    range_name: Optional[str] = None
    rate: Optional[float] = 0.0
    profit_margin: Optional[float] = 50.0


class PricingUpdate(BaseModel):
    name: Optional[str] = None
    scope: Optional[str] = None
    role: Optional[str] = None
    range_name: Optional[str] = None
    rate: Optional[float] = None
    profit_margin: Optional[float] = None


def _pricing_to_dict(p: PricingRule) -> Dict[str, Any]:
    """Convert PricingRule ORM object to dict"""
    return {
        "id": p.id,
        "name": p.name,
        "scope": p.scope,
        "role": p.role,
        "range_name": p.range_name,
        "rate": float(p.rate) if p.rate else 0,
        "profit_margin": float(p.profit_margin) if p.profit_margin else 0,
        "created_by": p.created_by,
        "created_at": p.created_at.isoformat() if p.created_at else None,
        "updated_at": p.updated_at.isoformat() if p.updated_at else None,
    }


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("")
async def list_pricing_rules(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """List all pricing rules"""
    rules = db.query(PricingRule).order_by(PricingRule.created_at.desc()).all()
    return {"data": [_pricing_to_dict(r) for r in rules]}


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_pricing_rule(
    body: PricingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
) -> Dict[str, Any]:
    """Create a pricing rule (admin only)"""
    rule = PricingRule(
        name=body.name,
        scope=body.scope,
        role=body.role,
        range_name=body.range_name,
        rate=Decimal(str(body.rate)),
        profit_margin=Decimal(str(body.profit_margin)),
        created_by=current_user.id,
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return {"data": _pricing_to_dict(rule)}


@router.put("/{rule_id}")
async def update_pricing_rule(
    rule_id: int,
    body: PricingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
) -> Dict[str, Any]:
    """Update a pricing rule (admin only)"""
    rule = db.query(PricingRule).filter(PricingRule.id == rule_id).first()
    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pricing rule not found"
        )

    update_data = body.model_dump(exclude_unset=True)
    if "rate" in update_data and update_data["rate"] is not None:
        update_data["rate"] = Decimal(str(update_data["rate"]))
    if "profit_margin" in update_data and update_data["profit_margin"] is not None:
        update_data["profit_margin"] = Decimal(str(update_data["profit_margin"]))

    for key, value in update_data.items():
        if value is not None:
            setattr(rule, key, value)

    db.commit()
    db.refresh(rule)
    return {"data": _pricing_to_dict(rule)}


@router.delete("/{rule_id}")
async def delete_pricing_rule(
    rule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
) -> Dict[str, str]:
    """Delete a pricing rule (admin only)"""
    rule = db.query(PricingRule).filter(PricingRule.id == rule_id).first()
    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pricing rule not found"
        )
    db.delete(rule)
    db.commit()
    return {"message": "Pricing rule deleted"}
