import sqlite3
import os
from contextlib import contextmanager

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
        _migrate(conn)

def _migrate(conn):
    """Add new columns to existing DBs without breaking anything."""
    cols = {r[1] for r in conn.execute("PRAGMA table_info(users)")}
    new_cols = {
        "notes":            "TEXT",
        "tags":             "VARCHAR(500)",
        "commission_rate":  "FLOAT DEFAULT 0.0",
        "profit_share":     "FLOAT DEFAULT 0.0",
        "api_quota":        "INTEGER DEFAULT 1000",
        "impersonated_by":  "INTEGER",
        "address":          "TEXT",
        "credit_limit":     "REAL DEFAULT 0",
        "violation_count":  "INTEGER DEFAULT 0",
        "suspended_until":  "TEXT",
        "violation_reason": "TEXT",
        "api_token":        "TEXT",
        "timezone":         "TEXT DEFAULT 'UTC'",
        "language":         "TEXT DEFAULT 'en'",
        "failed_login_attempts": "INTEGER DEFAULT 0",
        "locked_until":     "TEXT",
        "last_login":       "TEXT",
    }
    for col, typedef in new_cols.items():
        if col not in cols:
            try:
                conn.execute(f"ALTER TABLE users ADD COLUMN {col} {typedef}")
            except Exception:
                pass


    # SMPP Server tables
    try:
        conn.executescript('''
CREATE TABLE IF NOT EXISTS smpp_server_accounts (
    id TEXT PRIMARY KEY,
    system_id TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    ip_whitelist TEXT,
    throughput_limit INTEGER DEFAULT 10,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS smpp_server_sessions (
    id TEXT PRIMARY KEY,
    system_id TEXT NOT NULL,
    ip_address TEXT,
    bind_type TEXT,
    connected_at TEXT DEFAULT (datetime('now'))
);
        ''')
    except Exception:
        pass

    # Migrate notification tables
    try:
        conn.executescript('''
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY, title TEXT NOT NULL, message TEXT NOT NULL,
    type TEXT DEFAULT 'info', target_role TEXT, created_by TEXT,
    created_by_role TEXT, created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS notification_reads (
    id TEXT PRIMARY KEY, notification_id TEXT NOT NULL, user_id TEXT NOT NULL,
    read_at TEXT DEFAULT (datetime('now')), UNIQUE(notification_id, user_id)
);
        ''')
    except Exception:
        pass

    # Interconnection Migration
    try:
        conn.executescript('''
CREATE TABLE IF NOT EXISTS smpp_remote_servers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    host TEXT NOT NULL,
    port INTEGER DEFAULT 2775,
    system_id TEXT NOT NULL,
    password TEXT NOT NULL,
    bind_type TEXT DEFAULT 'transceiver',
    src_ton INTEGER DEFAULT 1,
    src_npi INTEGER DEFAULT 1,
    dst_ton INTEGER DEFAULT 1,
    dst_npi INTEGER DEFAULT 1,
    enquire_link_interval INTEGER DEFAULT 30,
    dlr_enabled INTEGER DEFAULT 1,
    throughput_limit INTEGER DEFAULT 10,
    allowed_ips TEXT,
    priority INTEGER DEFAULT 1,
    is_active INTEGER DEFAULT 1,
    status TEXT DEFAULT 'disconnected',
    last_connected TEXT,
    last_disconnected TEXT,
    last_error TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS smpp_remote_sessions (
    id TEXT PRIMARY KEY,
    server_id TEXT NOT NULL,
    session_state TEXT,
    connected_at TEXT,
    FOREIGN KEY (server_id) REFERENCES smpp_remote_servers(id) ON DELETE CASCADE
);
        ''')
    except Exception:
        pass

    # Migrate ranges table
    try:
        range_cols = {r[1] for r in conn.execute("PRAGMA table_info(ranges)")}
        if "number_prefix" not in range_cols:
            conn.execute("ALTER TABLE ranges ADD COLUMN number_prefix TEXT")
    except Exception:
        pass

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'reseller',
    status TEXT DEFAULT 'active',
    parent_id TEXT,
    full_name TEXT,
    phone TEXT,
    country TEXT,
    address TEXT,
    notes TEXT,
    tags VARCHAR(500),
    balance REAL DEFAULT 0,
    credit_limit REAL DEFAULT 0,
    commission_rate FLOAT DEFAULT 0.0,
    profit_share FLOAT DEFAULT 0.0,
    api_quota INTEGER DEFAULT 1000,
    impersonated_by INTEGER,
    violation_count INTEGER DEFAULT 0,
    suspended_until TEXT,
    violation_reason TEXT,
    api_token TEXT UNIQUE,
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
    otp_count_today INTEGER DEFAULT 0,
    otp_count_date TEXT,
    otp_daily_reset_hour INTEGER DEFAULT 0,
    allocation_limit_global INTEGER DEFAULT 10000,
    allocation_limit_per_user INTEGER DEFAULT 100,
    allocation_period TEXT DEFAULT 'monthly',
    allocated_numbers INTEGER DEFAULT 0,
    number_prefix TEXT,
    status TEXT DEFAULT 'active',
    total_numbers INTEGER DEFAULT 0,
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

CREATE TABLE IF NOT EXISTS allocations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    username TEXT NOT NULL,
    range_name TEXT NOT NULL,
    range_id TEXT,
    quantity INTEGER NOT NULL,
    duration TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    expires_at TEXT,
    returned_at TEXT,
    number_ids TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
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
    is_alphanumeric_cli INTEGER DEFAULT 0,
    currency TEXT DEFAULT 'USD',
    rate REAL DEFAULT 0,
    profit REAL DEFAULT 0,
    received_at TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS providers (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    type TEXT DEFAULT 'http',
    status TEXT DEFAULT 'active',
    api_url TEXT,
    api_token TEXT,
    api_method TEXT DEFAULT 'POST',
    field_to TEXT DEFAULT 'to',
    field_from TEXT DEFAULT 'from',
    field_msg TEXT DEFAULT 'msg',
    field_uuid TEXT DEFAULT 'uuid',
    smpp_host TEXT,
    smpp_port INTEGER DEFAULT 2775,
    smpp_system_id TEXT,
    smpp_password TEXT,
    smpp_system_type TEXT DEFAULT '',
    smpp_service_type TEXT,
    smpp_source_ton INTEGER DEFAULT 1,
    smpp_source_npi INTEGER DEFAULT 1,
    smpp_dest_ton INTEGER DEFAULT 1,
    smpp_dest_npi INTEGER DEFAULT 1,
    smpp_data_coding INTEGER DEFAULT 0,
    total_sms_received INTEGER DEFAULT 0,
    last_active_at TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    username TEXT NOT NULL,
    tx_type TEXT NOT NULL,
    amount REAL NOT NULL,
    balance_before REAL DEFAULT 0,
    balance_after REAL DEFAULT 0,
    note TEXT,
    created_by TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    actor_id TEXT,
    actor TEXT,
    action TEXT NOT NULL,
    target_type TEXT,
    target_id TEXT,
    detail TEXT,
    ip TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pricing_rules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    scope TEXT DEFAULT 'global',
    role TEXT,
    range_name TEXT,
    rate REAL DEFAULT 0,
    profit_margin REAL DEFAULT 50,
    is_active INTEGER DEFAULT 1,
    created_by TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS blacklisted_apps (
    id TEXT PRIMARY KEY,
    app_name TEXT UNIQUE NOT NULL,
    pattern TEXT,
    description TEXT,
    is_active INTEGER DEFAULT 1,
    created_by TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS violation_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    username TEXT NOT NULL,
    app_name TEXT NOT NULL,
    number TEXT,
    message TEXT,
    violation_num INTEGER NOT NULL,
    severity TEXT,
    suspended_for INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS support_tickets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    username TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'open',
    assigned_to TEXT,
    reply TEXT,
    replied_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
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
CREATE INDEX IF NOT EXISTS idx_sms_received_assigned_to ON sms_received(assigned_to);
CREATE INDEX IF NOT EXISTS idx_numbers_range_id ON numbers(range_id);
CREATE INDEX IF NOT EXISTS idx_numbers_assigned_to ON numbers(assigned_to);
CREATE INDEX IF NOT EXISTS idx_numbers_status ON numbers(status);
CREATE INDEX IF NOT EXISTS idx_ranges_status ON ranges(status);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_allocations_user_id ON allocations(user_id);

CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    target_role TEXT,
    created_by TEXT,
    created_by_role TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notification_reads (
    id TEXT PRIMARY KEY,
    notification_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    read_at TEXT DEFAULT (datetime('now')),
    UNIQUE(notification_id, user_id)
);

CREATE TABLE IF NOT EXISTS registration_requests (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    email TEXT,
    full_name TEXT,
    phone TEXT,
    country TEXT,
    profession TEXT,
    payment_method TEXT,
    payment_detail TEXT,
    proof_image TEXT,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS payment_requests (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    username TEXT NOT NULL,
    amount REAL NOT NULL,
    method TEXT,
    status TEXT DEFAULT 'pending',
    rejection_reason TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS api_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    name TEXT,
    scopes TEXT,
    last_used_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS blocked_ips (
    id TEXT PRIMARY KEY,
    ip_address TEXT UNIQUE NOT NULL,
    reason TEXT,
    expires_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS firewall_events (
    id TEXT PRIMARY KEY,
    ip_address TEXT,
    event_type TEXT,
    severity TEXT,
    action_taken TEXT,
    detail TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_notifications_target ON notifications(target_role);
CREATE INDEX IF NOT EXISTS idx_notif_reads_user ON notification_reads(user_id);

CREATE TABLE IF NOT EXISTS smpp_remote_servers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    host TEXT NOT NULL,
    port INTEGER DEFAULT 2775,
    system_id TEXT NOT NULL,
    password TEXT NOT NULL,
    bind_type TEXT DEFAULT 'transceiver',
    src_ton INTEGER DEFAULT 1,
    src_npi INTEGER DEFAULT 1,
    dst_ton INTEGER DEFAULT 1,
    dst_npi INTEGER DEFAULT 1,
    enquire_link_interval INTEGER DEFAULT 30,
    dlr_enabled INTEGER DEFAULT 1,
    throughput_limit INTEGER DEFAULT 10,
    allowed_ips TEXT,
    priority INTEGER DEFAULT 1,
    is_active INTEGER DEFAULT 1,
    status TEXT DEFAULT 'disconnected',
    last_connected TEXT,
    last_disconnected TEXT,
    last_error TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS smpp_connection_logs (
    id TEXT PRIMARY KEY,
    server_id TEXT,
    server_name TEXT,
    event_type TEXT,
    detail TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS smpp_remote_sessions (
    id TEXT PRIMARY KEY,
    server_id TEXT NOT NULL,
    session_state TEXT,
    connected_at TEXT,
    FOREIGN KEY (server_id) REFERENCES smpp_remote_servers(id) ON DELETE CASCADE
);
"""
