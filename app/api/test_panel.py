"""
Test Panel API Routes
Separate test system for users to test numbers
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from typing import List, Dict, Any
from datetime import datetime

from ..database import get_db
from ..models.test_user import TestUser, TestUserNumber
from ..models.number import Number
from ..models.sms import SMSReceived
from ..schemas.test_user import TestUserLogin, TestUserResponse, TestUserCreate
from ..core.security import verify_password, hash_password, mask_service_name, mask_message
from ..core.deps import get_current_test_user, get_current_admin
from ..models.user import User

router = APIRouter()


@router.post("/login")
async def test_login(
    login_data: TestUserLogin,
    request: Request,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Test panel login
    """
    # Get test user
    test_user = db.query(TestUser).filter(
        TestUser.username == login_data.username
    ).first()
    
    if not test_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )
    
    # Verify password
    if not verify_password(login_data.password, test_user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )
    
    # Check if active
    if test_user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is blocked"
        )
    
    # Update last login
    test_user.last_login = datetime.utcnow()
    db.commit()
    
    # Set session
    request.session["test_username"] = test_user.username
    
    return {
        "message": "Login successful",
        "user": {
            "username": test_user.username,
            "number_limit": test_user.number_limit
        }
    }


@router.post("/logout")
async def test_logout(request: Request) -> Dict[str, str]:
    """
    Test panel logout
    """
    request.session.clear()
    return {"message": "Logged out successfully"}


@router.get("/numbers/available")
async def get_available_test_numbers(
    limit: int = 50,
    country: str = None,
    service: str = None,
    test_user: TestUser = Depends(get_current_test_user),
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    """
    Get available numbers for testing
    """
    # Get already allocated number IDs
    allocated_ids = db.query(TestUserNumber.number_id).filter(
        TestUserNumber.test_username == test_user.username
    ).all()
    allocated_ids = [id[0] for id in allocated_ids]
    
    # Query available numbers
    query = db.query(Number).filter(
        Number.status == "active",
        ~Number.id.in_(allocated_ids) if allocated_ids else True
    )
    
    if country:
        query = query.filter(Number.country == country)
    
    if service:
        query = query.filter(Number.service == service)
    
    # Get random numbers
    numbers = query.order_by(func.random()).limit(limit).all()
    
    return [
        {
            "id": num.id,
            "number": num.number,
            "country": num.country,
            "country_name": num.country_name,
            "service": num.service,
            "range_name": num.range_name
        }
        for num in numbers
    ]


@router.post("/numbers/allocate")
async def allocate_test_number(
    number_id: int,
    test_user: TestUser = Depends(get_current_test_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Allocate number for testing
    """
    # Check if user has reached limit
    current_count = db.query(func.count(TestUserNumber.id)).filter(
        TestUserNumber.test_username == test_user.username
    ).scalar()
    
    if current_count >= test_user.number_limit:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"You have reached your limit of {test_user.number_limit} numbers"
        )
    
    # Check if number exists
    number = db.query(Number).filter(Number.id == number_id).first()
    if not number:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Number not found"
        )
    
    # Check if already allocated
    existing = db.query(TestUserNumber).filter(
        TestUserNumber.test_username == test_user.username,
        TestUserNumber.number_id == number_id
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Number already allocated"
        )
    
    # Allocate number
    allocation = TestUserNumber(
        test_username=test_user.username,
        number_id=number_id
    )
    
    db.add(allocation)
    db.commit()
    
    return {
        "message": "Number allocated successfully",
        "number": number.number
    }


@router.post("/numbers/release")
async def release_test_number(
    number_id: int,
    test_user: TestUser = Depends(get_current_test_user),
    db: Session = Depends(get_db)
) -> Dict[str, str]:
    """
    Release allocated number
    """
    allocation = db.query(TestUserNumber).filter(
        TestUserNumber.test_username == test_user.username,
        TestUserNumber.number_id == number_id
    ).first()
    
    if not allocation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Number not allocated"
        )
    
    db.delete(allocation)
    db.commit()
    
    return {"message": "Number released successfully"}


@router.get("/otps")
async def get_test_user_otps(
    test_user: TestUser = Depends(get_current_test_user),
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    """
    Get OTPs for allocated numbers
    """
    # Get allocated numbers
    allocations = db.query(TestUserNumber).filter(
        TestUserNumber.test_username == test_user.username
    ).all()
    
    number_ids = [alloc.number_id for alloc in allocations]
    
    if not number_ids:
        return []
    
    # Get numbers
    numbers = db.query(Number).filter(Number.id.in_(number_ids)).all()
    number_map = {num.id: num.number for num in numbers}
    
    # Get recent OTPs
    otps = db.query(SMSReceived).filter(
        SMSReceived.number.in_([num.number for num in numbers])
    ).order_by(SMSReceived.received_at.desc()).limit(100).all()
    
    return [
        {
            "id": sms.id,
            "number": sms.number,
            "service": mask_service_name(sms.service) if sms.service else "Unknown",
            "service_full": sms.service,
            "otp": sms.otp,
            "message": mask_message(sms.message),
            "message_full": sms.message,
            "received_at": sms.received_at.isoformat(),
            "country": sms.country
        }
        for sms in otps
    ]


@router.get("/my-numbers")
async def get_my_test_numbers(
    test_user: TestUser = Depends(get_current_test_user),
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    """
    Get user's allocated numbers
    """
    allocations = db.query(TestUserNumber).filter(
        TestUserNumber.test_username == test_user.username
    ).all()
    
    number_ids = [alloc.number_id for alloc in allocations]
    
    if not number_ids:
        return []
    
    numbers = db.query(Number).filter(Number.id.in_(number_ids)).all()
    
    return [
        {
            "id": num.id,
            "number": num.number,
            "country": num.country,
            "country_name": num.country_name,
            "service": num.service,
            "range_name": num.range_name,
            "allocated_at": next(
                (alloc.allocated_at.isoformat() for alloc in allocations if alloc.number_id == num.id),
                None
            )
        }
        for num in numbers
    ]


# Admin routes for test user management
@router.get("/admin/users", response_model=List[TestUserResponse])
async def list_test_users(
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
) -> List[TestUser]:
    """
    List all test users (Admin only)
    """
    return db.query(TestUser).all()


@router.post("/admin/users", response_model=TestUserResponse)
async def create_test_user(
    user_data: TestUserCreate,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
) -> TestUser:
    """
    Create test user (Admin only)
    """
    # Check if username exists
    if db.query(TestUser).filter(TestUser.username == user_data.username).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists"
        )
    
    # Create test user
    test_user = TestUser(
        username=user_data.username,
        password=hash_password(user_data.password),
        number_limit=user_data.number_limit,
        status="active"
    )
    
    db.add(test_user)
    db.commit()
    db.refresh(test_user)
    
    return test_user


@router.put("/admin/users/{username}/limit")
async def update_test_user_limit(
    username: str,
    number_limit: int,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
) -> Dict[str, str]:
    """
    Update test user number limit (Admin only)
    """
    test_user = db.query(TestUser).filter(TestUser.username == username).first()
    
    if not test_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Test user not found"
        )
    
    test_user.number_limit = number_limit
    db.commit()
    
    return {"message": "Limit updated successfully"}


@router.post("/admin/users/{username}/block")
async def block_test_user(
    username: str,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
) -> Dict[str, str]:
    """
    Block test user (Admin only)
    """
    test_user = db.query(TestUser).filter(TestUser.username == username).first()
    
    if not test_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Test user not found"
        )
    
    test_user.status = "blocked"
    db.commit()
    
    return {"message": "Test user blocked successfully"}


@router.post("/admin/users/{username}/unblock")
async def unblock_test_user(
    username: str,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
) -> Dict[str, str]:
    """
    Unblock test user (Admin only)
    """
    test_user = db.query(TestUser).filter(TestUser.username == username).first()
    
    if not test_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Test user not found"
        )
    
    test_user.status = "active"
    db.commit()
    
    return {"message": "Test user unblocked successfully"}
