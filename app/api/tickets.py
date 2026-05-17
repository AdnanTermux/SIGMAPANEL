"""
Support Tickets API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
from pydantic import BaseModel
from datetime import datetime

from ..database import get_db
from ..core.deps import get_current_user, get_current_admin, has_permission
from ..models.user import User
from ..models.support_ticket import SupportTicket

router = APIRouter()


# ── Schemas ────────────────────────────────────────────────────────────────────

class TicketCreate(BaseModel):
    subject: str
    message: str
    priority: Optional[str] = "medium"  # low, medium, high, urgent


class TicketReply(BaseModel):
    reply: str


class TicketStatusUpdate(BaseModel):
    status: str  # open, in_progress, resolved, closed


def _ticket_to_dict(t: SupportTicket) -> Dict[str, Any]:
    """Convert SupportTicket ORM object to dict"""
    return {
        "id": t.id,
        "user_id": t.user_id,
        "subject": t.subject,
        "message": t.message,
        "priority": t.priority,
        "status": t.status,
        "reply": t.reply,
        "replied_by": t.replied_by,
        "replied_at": t.replied_at.isoformat() if t.replied_at else None,
        "created_at": t.created_at.isoformat() if t.created_at else None,
        "updated_at": t.updated_at.isoformat() if t.updated_at else None,
    }


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("")
async def list_tickets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    ticket_status: Optional[str] = Query(None, alias="status"),
    priority: Optional[str] = Query(None),
) -> Dict[str, Any]:
    """List tickets. Admin sees all; users see own only."""
    query = db.query(SupportTicket)
    if not has_permission(current_user, "manage_support"):
        query = query.filter(SupportTicket.user_id == current_user.id)
    if ticket_status:
        query = query.filter(SupportTicket.status == ticket_status)
    if priority:
        query = query.filter(SupportTicket.priority == priority)
    tickets = query.order_by(SupportTicket.created_at.desc()).all()
    return {"data": [_ticket_to_dict(t) for t in tickets]}


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_ticket(
    body: TicketCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Create a support ticket"""
    if body.priority not in ("low", "medium", "high", "urgent"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid priority. Must be: low, medium, high, or urgent"
        )

    ticket = SupportTicket(
        user_id=current_user.id,
        subject=body.subject,
        message=body.message,
        priority=body.priority,
        status="open",
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return {"data": _ticket_to_dict(ticket)}


@router.put("/{ticket_id}/reply")
async def reply_to_ticket(
    ticket_id: int,
    body: TicketReply,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
) -> Dict[str, Any]:
    """Reply to a support ticket (admin only)"""
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found"
        )

    ticket.reply = body.reply
    ticket.replied_by = current_user.id
    ticket.replied_at = datetime.utcnow()
    ticket.status = "in_progress"  # Auto-advance status on reply
    db.commit()
    db.refresh(ticket)
    return {"data": _ticket_to_dict(ticket)}


@router.put("/{ticket_id}/status")
async def update_ticket_status(
    ticket_id: int,
    body: TicketStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Update ticket status"""
    if body.status not in ("open", "in_progress", "resolved", "closed"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid status. Must be: open, in_progress, resolved, or closed"
        )

    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found"
        )

    # Users can only update their own tickets; admins can update any
    if not has_permission(current_user, "manage_support") and ticket.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this ticket"
        )

    # Users can close their own tickets; other status changes require admin
    if not has_permission(current_user, "manage_support") and body.status not in ("closed",):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only close your own tickets"
        )

    ticket.status = body.status
    db.commit()
    db.refresh(ticket)
    return {"data": _ticket_to_dict(ticket)}
