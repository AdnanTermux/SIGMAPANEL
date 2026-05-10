import sqlite3
import json
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from contextlib import contextmanager
import os

DB_PATH = os.environ.get("DATABASE_URL", "data/sigmapanel.db")

def get_db_path():
    os.makedirs(os.path.dirname(DB_PATH) or ".", exist_ok=True)
    return DB_PATH

@contextmanager
def get_db():
    conn = sqlite3.connect(get_db_path())
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()

def init_db():
    with get_db() as conn:
        conn.executescript(SCHEMA)

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'admin',
    status TEXT DEFAULT 'active',
    parent_id TEXT,
    full_name TEXT,
    balance REAL DEFAULT 0,
    credit_limit REAL DEFAULT 0,
    phone TEXT,
    country TEXT,
    timezone TEXT DEFAULT 'UTC',
    language TEXT DEFAULT 'en',
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TEXT,
    last_login TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (parent_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS ranges (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    provider_id TEXT,
    country_code TEXT,
    country_name TEXT,
    rate REAL DEFAULT 0,
    profit_margin REAL DEFAULT 0,
    otp_limit_per_day INTEGER DEFAULT 0,
    otp_daily_reset_hour INTEGER DEFAULT 0,
    allocation_limit_global INTEGER DEFAULT 10000,
    allocation_limit_per_user INTEGER DEFAULT 100,
    allocation_period TEXT DEFAULT 'daily',
    status TEXT DEFAULT 'active',
    total_numbers INTEGER DEFAULT 0,
    allocated_numbers INTEGER DEFAULT 0,
    total_sms INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS numbers (
    id TEXT PRIMARY KEY,
    number TEXT UNIQUE NOT NULL,
    country TEXT,
    country_name TEXT,
    range_name TEXT,
    range_id TEXT,
    service TEXT,
    status TEXT DEFAULT 'active',
    assigned_to TEXT,
    assigned_at TEXT,
    rate REAL DEFAULT 0,
    profit_margin REAL DEFAULT 0,
    total_sms INTEGER DEFAULT 0,
    last_sms_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (range_id) REFERENCES ranges(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS sms_received (
    id TEXT PRIMARY KEY,
    number TEXT NOT NULL,
    sender TEXT,
    recipient TEXT,
    service TEXT,
    country TEXT,
    range_name TEXT,
    otp TEXT,
    message TEXT NOT NULL,
    assigned_to TEXT,
    currency TEXT DEFAULT 'USD',
    rate REAL DEFAULT 0,
    profit REAL DEFAULT 0,
    received_at TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (number) REFERENCES numbers(number) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY,
    setting_key TEXT NOT NULL,
    setting_value TEXT NOT NULL,
    user_id TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(setting_key, user_id)
);

CREATE TABLE IF NOT EXISTS profit_log (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    number_id TEXT,
    sms_received_id TEXT,
    rate_applied REAL DEFAULT 0,
    profit_amount REAL DEFAULT 0,
    currency TEXT DEFAULT 'USD',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sms_received_number ON sms_received(number);
CREATE INDEX IF NOT EXISTS idx_sms_received_received_at ON sms_received(received_at);
CREATE INDEX IF NOT EXISTS idx_sms_received_service ON sms_received(service);
CREATE INDEX IF NOT EXISTS idx_numbers_range_id ON numbers(range_id);
CREATE INDEX IF NOT EXISTS idx_numbers_assigned_to ON numbers(assigned_to);
CREATE INDEX IF NOT EXISTS idx_numbers_status ON numbers(status);
CREATE INDEX IF NOT EXISTS idx_ranges_status ON ranges(status);
"""
