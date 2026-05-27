# 📡 SIGMAPANEL v3 — Telecom Infrastructure Panel

**Enterprise-grade SMS OTP Management System with Real-time SMPP Server & HTTP Gateways.**

SIGMAPANEL is a high-performance, secure, and scalable telecom platform built with **FastAPI**, **Redis**, and a modular **Vanilla JS SPA** frontend. It provides a complete suite of tools for managing SMS traffic, provider interconnections, and reseller hierarchies.

---

## ✨ Core Features

### 🏢 Enterprise Infrastructure
- **Real-time SMPP Server:** Support for incoming `BIND`, `SUBMIT_SM`, and `DELIVER_SM` PDUs on port `2775`.
- **Regex-based DLR Parsing:** High-accuracy delivery receipt extraction from vendor streams.
- **Asynchronous Queuing:** Redis-backed architecture for non-blocking SMS processing and persistence.
- **Service Name Masking:** Built-in support for Alphanumeric CLI (Service Brand IDs) with automatic normalization bypass.

### 🛡️ Hardened Security
- **Telecom-style Verification:** Pre-login browser integrity check and anti-bot validation screen.
- **Advanced Firewall:** Redis-backed rate limiting, IP blacklisting, and adaptive threat monitoring.
- **Role-Based Access Control (RBAC):** Strict data isolation for `admin`, `manager`, `reseller`, and `user` roles.
- **Session Protection:** 30-minute inactivity auto-logout and JWT-based authentication.

### 📊 Professional Management
- **Hierarchical User System:** Manage resellers, sub-resellers, and end-users with balance adjustments and audit logs.
- **Comprehensive Reporting:** Live OTP feeds, profit analytics (Chart.js), and detailed delivery logs.
- **Bulk Tools:** Bulk number allocation, global range revoke, and emergency purge utilities.
- **API Playground:** Interactive request tester and dynamic documentation for developers.

---

## 🚀 Quick Start

### 🐳 Docker Deployment (Recommended)
```bash
# Clone the repository
git clone https://github.com/AdnanTermux/SIGMAPANEL.git
cd SIGMAPANEL

# Start the complete stack
docker compose up -d --build
```
Access the panel at `http://localhost:8000`.

### 🛠️ Manual Installation
1. **Dependencies:** `pip install -r requirements.txt`
2. **Database:** The system auto-seeds an admin account (`admin/admin123`) on first run.
3. **Environment:**
   - `DATABASE_URL`: Path to SQLite DB (default: `data/sigmapanel.db`)
   - `REDIS_URL`: Redis connection string (default: `redis://localhost:6379/0`)
4. **Run:** `./entrypoint.sh`

---

## 📁 System Architecture

```text
SIGMAPANEL/
├── routes/              # FastAPI API endpoints (modular)
├── static/              # Frontend SPA
│   ├── js/              # Modular JavaScript components
│   └── css/             # Modern telecom dashboard styling
├── main.py              # Application entry point
├── smpp_server.py       # Async SMPP server listener
├── worker.py            # Background queue processor
├── queue_manager.py     # Redis queue interaction
├── security_middleware.py # WAF and rate-limiting logic
└── entrypoint.sh        # Process management script
```

---

## 📞 API & Integration

### Webhook Endpoint
`POST /api/webhook/sms`
- **Supported Formats:** JSON, Form-data, URL-encoded.
- **Auth:** Bearer Token (Generated in API Management).

### SMPP Server
- **Host:** `your-ip`
- **Port:** `2775`
- **Auth:** System ID & Password (Managed in SMPP Server Accounts).

---

## 📜 License
Proprietary and confidential. © 2026 SIGMAPANEL Infrastructure.
