#!/usr/bin/env python3
"""
Test password hashing and verify credentials
"""
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Test passwords
passwords = {
    "admin123": None,
    "test123": None,
}

print("=" * 60)
print("  Password Hash Generator")
print("=" * 60)
print()

# Generate hashes
for password in passwords.keys():
    hash_value = pwd_context.hash(password)
    passwords[password] = hash_value
    print(f"Password: {password}")
    print(f"Hash:     {hash_value}")
    print()

# Verify hashes
print("=" * 60)
print("  Verification Test")
print("=" * 60)
print()

for password, hash_value in passwords.items():
    is_valid = pwd_context.verify(password, hash_value)
    print(f"Password '{password}' verification: {'✓ PASS' if is_valid else '✗ FAIL'}")

print()
print("=" * 60)
print("  SQL INSERT Statements")
print("=" * 60)
print()

print("-- Admin user (username: admin, password: admin123)")
print(f"INSERT INTO users (username, email, password, role, status)")
print(f"VALUES ('admin', 'admin@sigma-sms.com', '{passwords['admin123']}', 'admin', 'active');")
print()

print("-- Test user (username: test123, password: test123)")
print(f"INSERT INTO test_users (username, password, number_limit, status)")
print(f"VALUES ('test123', '{passwords['test123']}', 10, 'active');")
print()
