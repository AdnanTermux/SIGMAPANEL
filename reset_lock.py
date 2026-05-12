#!/usr/bin/env python3
"""
Sigma SMS A2P - Reset Account Lock
Unlocks a locked account and resets failed login attempts.
Usage: python3 reset_lock.py [username]
"""
import sys
from sqlalchemy import create_engine, text

try:
    from app.config import settings
    DATABASE_URL = settings.DATABASE_URL
except Exception:
    import os
    from dotenv import load_dotenv
    load_dotenv()
    DATABASE_URL = os.getenv('DATABASE_URL', 'mysql+pymysql://root:@localhost/sigma_sms_a2p')


def reset_lock(username: str):
    try:
        engine = create_engine(DATABASE_URL)
        with engine.connect() as conn:
            result = conn.execute(
                text("SELECT id, status, failed_login_attempts, locked_until FROM users WHERE username = :u"),
                {"u": username}
            ).fetchone()

            if not result:
                print(f"❌ User '{username}' not found.")
                return

            print(f"User found: id={result[0]}, status={result[1]}, "
                  f"failed_attempts={result[2]}, locked_until={result[3]}")

            conn.execute(
                text("""
                    UPDATE users
                    SET failed_login_attempts = 0,
                        locked_until = NULL,
                        status = 'active'
                    WHERE username = :u
                """),
                {"u": username}
            )
            conn.commit()
            print(f"✅ Account '{username}' unlocked and reset to active.")
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    uname = sys.argv[1] if len(sys.argv) > 1 else "admin"
    print(f"Resetting lock for: {uname}")
    reset_lock(uname)
