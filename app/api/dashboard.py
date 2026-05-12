"""
Dashboard API Routes
Statistics, charts, and analytics
"""
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import datetime, timedelta
from typing import Dict, Any, List

from ..database import get_db
from ..models.user import User
from ..models.sms import SMSReceived
from ..models.number import Number
from ..models.payment_request import PaymentRequest
from ..schemas.dashboard import DashboardStats, DashboardCharts
from ..core.deps import get_current_user

router = APIRouter()


@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> DashboardStats:
    """
    Get dashboard statistics
    """
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=7)
    month_start = today_start - timedelta(days=30)
    
    # Base query filter (admin sees all, others see only their data)
    if current_user.role in ("admin", "super_admin"):
        sms_filter = True
        user_filter = True
    else:
        sms_filter = SMSReceived.assigned_to == current_user.username
        user_filter = User.parent_id == current_user.id
    
    # SMS counts
    today_sms = db.query(func.count(SMSReceived.id)).filter(
        and_(SMSReceived.received_at >= today_start, sms_filter)
    ).scalar() or 0
    
    week_sms = db.query(func.count(SMSReceived.id)).filter(
        and_(SMSReceived.received_at >= week_start, sms_filter)
    ).scalar() or 0
    
    month_sms = db.query(func.count(SMSReceived.id)).filter(
        and_(SMSReceived.received_at >= month_start, sms_filter)
    ).scalar() or 0
    
    # Profit calculations
    today_profit = db.query(func.sum(SMSReceived.profit)).filter(
        and_(SMSReceived.received_at >= today_start, sms_filter)
    ).scalar() or 0.0
    
    week_profit = db.query(func.sum(SMSReceived.profit)).filter(
        and_(SMSReceived.received_at >= week_start, sms_filter)
    ).scalar() or 0.0
    
    month_profit = db.query(func.sum(SMSReceived.profit)).filter(
        and_(SMSReceived.received_at >= month_start, sms_filter)
    ).scalar() or 0.0
    
    # Numbers count
    total_numbers = db.query(func.count(Number.id)).filter(
        Number.assigned_to == current_user.username if current_user.role not in ("admin", "super_admin") else True
    ).scalar() or 0
    
    active_numbers = db.query(func.count(Number.id)).filter(
        and_(
            Number.status == "active",
            Number.assigned_to == current_user.username if current_user.role not in ("admin", "super_admin") else True
        )
    ).scalar() or 0
    
    # Users count (admin only)
    if current_user.role in ("admin", "super_admin"):
        total_users = db.query(func.count(User.id)).scalar() or 0
        active_users = db.query(func.count(User.id)).filter(
            User.status == "active"
        ).scalar() or 0
    else:
        total_users = db.query(func.count(User.id)).filter(user_filter).scalar() or 0
        active_users = db.query(func.count(User.id)).filter(
            and_(User.status == "active", user_filter)
        ).scalar() or 0
    
    # Pending payments
    pending_payments = db.query(func.count(PaymentRequest.id)).filter(
        and_(
            PaymentRequest.status == "pending",
            PaymentRequest.user_id == current_user.id if current_user.role not in ("admin", "super_admin") else True
        )
    ).scalar() or 0
    
    pending_payments_amount = db.query(func.sum(PaymentRequest.amount)).filter(
        and_(
            PaymentRequest.status == "pending",
            PaymentRequest.user_id == current_user.id if current_user.role not in ("admin", "super_admin") else True
        )
    ).scalar() or 0.0
    
    return DashboardStats(
        today_sms=today_sms,
        week_sms=week_sms,
        month_sms=month_sms,
        today_profit=float(today_profit),
        week_profit=float(week_profit),
        month_profit=float(month_profit),
        total_numbers=total_numbers,
        active_numbers=active_numbers,
        total_users=total_users,
        active_users=active_users,
        pending_payments=pending_payments,
        pending_payments_amount=float(pending_payments_amount)
    )


@router.get("/charts", response_model=DashboardCharts)
async def get_dashboard_charts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> DashboardCharts:
    """
    Get dashboard charts data
    """
    # Base filter
    if current_user.role in ("admin", "super_admin"):
        sms_filter = True
    else:
        sms_filter = SMSReceived.assigned_to == current_user.username
    
    # SMS by service
    sms_by_service = {}
    service_data = db.query(
        SMSReceived.service,
        func.count(SMSReceived.id)
    ).filter(sms_filter).group_by(SMSReceived.service).all()
    
    for service, count in service_data:
        sms_by_service[service or "Unknown"] = count
    
    # SMS by country
    sms_by_country = {}
    country_data = db.query(
        SMSReceived.country,
        func.count(SMSReceived.id)
    ).filter(sms_filter).group_by(SMSReceived.country).all()
    
    for country, count in country_data:
        sms_by_country[country or "Unknown"] = count
    
    # SMS by hour (last 24 hours)
    now = datetime.utcnow()
    hours = []
    hour_counts = []
    
    for i in range(24):
        hour_start = now - timedelta(hours=23-i)
        hour_end = hour_start + timedelta(hours=1)
        
        count = db.query(func.count(SMSReceived.id)).filter(
            and_(
                SMSReceived.received_at >= hour_start,
                SMSReceived.received_at < hour_end,
                sms_filter
            )
        ).scalar() or 0
        
        hours.append(hour_start.strftime("%H:00"))
        hour_counts.append(count)
    
    # SMS by day (last 7 days)
    days = []
    day_counts = []
    
    for i in range(7):
        day_start = now.replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=6-i)
        day_end = day_start + timedelta(days=1)
        
        count = db.query(func.count(SMSReceived.id)).filter(
            and_(
                SMSReceived.received_at >= day_start,
                SMSReceived.received_at < day_end,
                sms_filter
            )
        ).scalar() or 0
        
        days.append(day_start.strftime("%b %d"))
        day_counts.append(count)
    
    # Profit by day (last 7 days)
    profit_days = []
    profit_amounts = []
    
    for i in range(7):
        day_start = now.replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=6-i)
        day_end = day_start + timedelta(days=1)
        
        profit = db.query(func.sum(SMSReceived.profit)).filter(
            and_(
                SMSReceived.received_at >= day_start,
                SMSReceived.received_at < day_end,
                sms_filter
            )
        ).scalar() or 0.0
        
        profit_days.append(day_start.strftime("%b %d"))
        profit_amounts.append(int(profit * 100) / 100)  # Round to 2 decimals
    
    return DashboardCharts(
        sms_by_service=sms_by_service,
        sms_by_country=sms_by_country,
        sms_by_hour={"labels": hours, "data": hour_counts},
        sms_by_day={"labels": days, "data": day_counts},
        profit_by_day={"labels": profit_days, "data": profit_amounts}
    )


@router.get("/recent-sms")
async def get_recent_sms(
    limit: int = 10,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    """
    Get recent SMS
    """
    # Base filter
    if current_user.role in ("admin", "super_admin"):
        sms_filter = True
    else:
        sms_filter = SMSReceived.assigned_to == current_user.username
    
    sms_list = db.query(SMSReceived).filter(sms_filter).order_by(
        SMSReceived.received_at.desc()
    ).limit(limit).all()
    
    return [
        {
            "id": sms.id,
            "number": sms.number,
            "service": sms.service,
            "country": sms.country,
            "otp": sms.otp,
            "message": sms.message[:50] + "..." if len(sms.message) > 50 else sms.message,
            "received_at": sms.received_at.isoformat(),
            "profit": float(sms.profit)
        }
        for sms in sms_list
    ]


@router.get("/http-settings")
async def get_http_settings(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get HTTP delivery settings.
    Auto-detects server IP and port from the request if not configured.
    """
    from sqlalchemy import text as sql_text
    import socket

    # Load saved settings from DB
    setting_keys = [
        'http_delivery_enabled', 'http_delivery_url', 'http_delivery_ip',
        'http_delivery_port', 'http_delivery_method', 'http_delivery_format'
    ]
    settings_map = {}
    try:
        placeholders = ",".join(f":k{i}" for i in range(len(setting_keys)))
        params = {f"k{i}": k for i, k in enumerate(setting_keys)}
        rows = db.execute(
            sql_text(f"SELECT setting_key, setting_value FROM settings WHERE setting_key IN ({placeholders})"),
            params
        ).fetchall()
        settings_map = {r[0]: r[1] for r in rows}
    except Exception:
        pass

    # Auto-detect server IP
    auto_ip = settings_map.get('http_delivery_ip', '')
    if not auto_ip:
        try:
            # Try to get actual outbound IP
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            auto_ip = s.getsockname()[0]
            s.close()
        except Exception:
            auto_ip = request.client.host if request.client else "127.0.0.1"

    # Auto-detect port from request
    auto_port = settings_map.get('http_delivery_port', '')
    if not auto_port:
        host_header = request.headers.get("host", "")
        if ":" in host_header:
            auto_port = host_header.split(":")[1]
        else:
            auto_port = "8000"

    # Build delivery URL
    saved_url = settings_map.get('http_delivery_url', '')
    if not saved_url:
        scheme = "https" if request.headers.get("x-forwarded-proto") == "https" else "http"
        saved_url = f"{scheme}://{auto_ip}:{auto_port}/api/webhook/sms"

    return {
        "enabled": settings_map.get('http_delivery_enabled', '0') == '1',
        "delivery_url": saved_url,
        "ip": auto_ip,
        "port": auto_port,
        "method": settings_map.get('http_delivery_method', 'POST'),
        "format": settings_map.get('http_delivery_format', 'json'),
        "webhook_url": f"/api/webhook/sms",
        "field_map": {
            "to": "destination number field",
            "from": "CLI / sender field",
            "msg": "message body field",
            "uuid": "unique message ID field"
        }
    }


@router.post("/http-settings")
async def save_http_settings(
    settings_data: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, str]:
    """Save HTTP delivery settings (admin only)"""
    if current_user.role.value not in ("admin", "super_admin"):
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")

    from sqlalchemy import text as sql_text

    mapping = {
        "enabled": ("http_delivery_enabled", lambda v: "1" if v else "0"),
        "delivery_url": ("http_delivery_url", str),
        "ip": ("http_delivery_ip", str),
        "port": ("http_delivery_port", str),
        "method": ("http_delivery_method", str),
        "format": ("http_delivery_format", str),
    }

    for field, (key, transform) in mapping.items():
        if field in settings_data:
            val = transform(settings_data[field])
            db.execute(
                sql_text("""
                    INSERT INTO settings (setting_key, setting_value) VALUES (:k, :v)
                    ON DUPLICATE KEY UPDATE setting_value = :v
                """),
                {"k": key, "v": val}
            )
    db.commit()
    return {"message": "HTTP delivery settings saved successfully"}
