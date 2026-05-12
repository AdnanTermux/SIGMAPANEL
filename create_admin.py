#!/usr/bin/env python3
"""
Sigma SMS A2P - Create Admin User
Quick script to create or reset admin account
"""
import sys
from getpass import getpass
from sqlalchemy import create_engine, text
from passlib.context import CryptContext
from app.config import settings

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_admin():
    """Create or update admin user"""
    
    print("=" * 60)
    print("  Sigma SMS A2P - Admin Account Setup")
    print("=" * 60)
    print()
    
    # Get admin details
    print("Enter admin details:")
    username = input("Username [admin]: ").strip() or "admin"
    email = input("Email [admin@sigma-sms.com]: ").strip() or "admin@sigma-sms.com"
    
    # Get password
    while True:
        password = getpass("Password: ")
        if len(password) < 6:
            print("❌ Password must be at least 6 characters!")
            continue
        
        password_confirm = getpass("Confirm Password: ")
        if password != password_confirm:
            print("❌ Passwords don't match!")
            continue
        
        break
    
    # Hash password
    hashed_password = pwd_context.hash(password)
    
    # Connect to database
    try:
        engine = create_engine(settings.DATABASE_URL)
        
        with engine.connect() as conn:
            # Check if user exists
            result = conn.execute(
                text("SELECT id FROM users WHERE username = :username"),
                {"username": username}
            )
            existing_user = result.fetchone()
            
            if existing_user:
                # Update existing user
                print(f"\n⚠️  User '{username}' already exists. Updating...")
                conn.execute(
                    text("""
                        UPDATE users 
                        SET email = :email, 
                            password = :password, 
                            role = 'admin', 
                            status = 'active'
                        WHERE username = :username
                    """),
                    {
                        "username": username,
                        "email": email,
                        "password": hashed_password
                    }
                )
                conn.commit()
                print(f"✅ Admin user '{username}' updated successfully!")
            else:
                # Create new user
                conn.execute(
                    text("""
                        INSERT INTO users (username, email, password, role, status)
                        VALUES (:username, :email, :password, 'admin', 'active')
                    """),
                    {
                        "username": username,
                        "email": email,
                        "password": hashed_password
                    }
                )
                conn.commit()
                print(f"✅ Admin user '{username}' created successfully!")
        
        print()
        print("=" * 60)
        print("  Login Details")
        print("=" * 60)
        print(f"  Username: {username}")
        print(f"  Email:    {email}")
        print(f"  Password: {password}")
        print()
        print(f"  Login URL: {settings.APP_URL}/login")
        print("=" * 60)
        print()
        print("⚠️  IMPORTANT: Save these credentials in a secure location!")
        print()
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    try:
        create_admin()
    except KeyboardInterrupt:
        print("\n\n❌ Cancelled by user")
        sys.exit(1)
