#!/usr/bin/env python3
"""
Sigma SMS A2P - Fix Admin and Test Accounts
This script creates/updates both admin and test panel accounts with proper password hashing
"""
import sys
from sqlalchemy import create_engine, text
from passlib.context import CryptContext

# Load environment
try:
    from app.config import settings
    DATABASE_URL = settings.DATABASE_URL
except:
    # Fallback: read from .env
    import os
    from dotenv import load_dotenv
    load_dotenv()
    DATABASE_URL = os.getenv('DATABASE_URL', 'mysql+pymysql://root:@localhost/sigma_sms_a2p')

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def fix_accounts():
    """Create/update admin and test accounts"""
    
    print("=" * 70)
    print("  Sigma SMS A2P - Account Fix Script")
    print("=" * 70)
    print()
    
    # Generate password hashes
    print("Generating password hashes...")
    admin_password = "admin123"
    test_password = "test123"
    
    admin_hash = pwd_context.hash(admin_password)
    test_hash = pwd_context.hash(test_password)
    
    print(f"✓ Admin password hash generated")
    print(f"✓ Test password hash generated")
    print()
    
    # Connect to database
    try:
        print(f"Connecting to database...")
        engine = create_engine(DATABASE_URL)
        
        with engine.connect() as conn:
            print("✓ Database connected")
            print()
            
            # Fix admin user
            print("=" * 70)
            print("  Creating/Updating Admin Account")
            print("=" * 70)
            
            # Check if admin exists
            result = conn.execute(
                text("SELECT id FROM users WHERE username = 'admin'")
            )
            admin_exists = result.fetchone()
            
            if admin_exists:
                print("Admin user exists, updating...")
                conn.execute(
                    text("""
                        UPDATE users 
                        SET password = :password,
                            email = 'admin@sigma-sms.com',
                            role = 'admin',
                            status = 'active',
                            failed_login_attempts = 0,
                            locked_until = NULL
                        WHERE username = 'admin'
                    """),
                    {"password": admin_hash}
                )
                conn.commit()
                print("✓ Admin user updated")
            else:
                print("Creating new admin user...")
                conn.execute(
                    text("""
                        INSERT INTO users (username, email, password, role, status)
                        VALUES ('admin', 'admin@sigma-sms.com', :password, 'admin', 'active')
                    """),
                    {"password": admin_hash}
                )
                conn.commit()
                print("✓ Admin user created")
            
            print()
            print("Admin Login Credentials:")
            print(f"  Username: admin")
            print(f"  Password: {admin_password}")
            print(f"  URL:      http://localhost:8000/login")
            print()
            
            # Fix test user
            print("=" * 70)
            print("  Creating/Updating Test Panel Account")
            print("=" * 70)
            
            # Check if test_users table exists
            try:
                result = conn.execute(
                    text("SELECT id FROM test_users WHERE username = 'test123'")
                )
                test_exists = result.fetchone()
                
                if test_exists:
                    print("Test user exists, updating...")
                    conn.execute(
                        text("""
                            UPDATE test_users 
                            SET password = :password,
                                number_limit = 10,
                                status = 'active'
                            WHERE username = 'test123'
                        """),
                        {"password": test_hash}
                    )
                    conn.commit()
                    print("✓ Test user updated")
                else:
                    print("Creating new test user...")
                    conn.execute(
                        text("""
                            INSERT INTO test_users (username, password, number_limit, status)
                            VALUES ('test123', :password, 10, 'active')
                        """),
                        {"password": test_hash}
                    )
                    conn.commit()
                    print("✓ Test user created")
                
                print()
                print("Test Panel Login Credentials:")
                print(f"  Username: test123")
                print(f"  Password: {test_password}")
                print(f"  URL:      http://localhost:8000/test-login")
                print()
                
            except Exception as e:
                print(f"⚠ Test users table not found or error: {e}")
                print("  Run: mysql -u root -p sigma_sms_a2p < database/schema_test_panel.sql")
                print()
            
            # Verify passwords work
            print("=" * 70)
            print("  Verification")
            print("=" * 70)
            
            # Verify admin
            result = conn.execute(
                text("SELECT password FROM users WHERE username = 'admin'")
            )
            stored_hash = result.fetchone()
            if stored_hash:
                is_valid = pwd_context.verify(admin_password, stored_hash[0])
                print(f"Admin password verification: {'✓ PASS' if is_valid else '✗ FAIL'}")
            
            # Verify test
            try:
                result = conn.execute(
                    text("SELECT password FROM test_users WHERE username = 'test123'")
                )
                stored_hash = result.fetchone()
                if stored_hash:
                    is_valid = pwd_context.verify(test_password, stored_hash[0])
                    print(f"Test password verification:  {'✓ PASS' if is_valid else '✗ FAIL'}")
            except:
                pass
            
            print()
            print("=" * 70)
            print("  ✓ All accounts fixed successfully!")
            print("=" * 70)
            print()
            print("You can now login with:")
            print()
            print("  Admin Panel:  http://localhost:8000/login")
            print("                Username: admin | Password: admin123")
            print()
            print("  Test Panel:   http://localhost:8000/test-login")
            print("                Username: test123 | Password: test123")
            print()
            print("⚠️  IMPORTANT: Change passwords after first login!")
            print()
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        print()
        print("Troubleshooting:")
        print("1. Check DATABASE_URL in .env file")
        print("2. Verify MySQL is running: systemctl status mysql")
        print("3. Test connection: mysql -u root -p sigma_sms_a2p")
        print("4. Import schemas if needed:")
        print("   mysql -u root -p sigma_sms_a2p < database/schema.sql")
        print("   mysql -u root -p sigma_sms_a2p < database/schema_test_panel.sql")
        sys.exit(1)

if __name__ == "__main__":
    try:
        fix_accounts()
    except KeyboardInterrupt:
        print("\n\n❌ Cancelled by user")
        sys.exit(1)
