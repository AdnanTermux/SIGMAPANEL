# 🚀 SIGMAPANEL v3 — Enterprise Telecom SMS Infrastructure

SIGMAPANEL is a production-grade, high-performance telecom SMS gateway and management dashboard. Built with a modular **FastAPI** backend and a responsive **Vanilla JS SPA** frontend, it supports multiple **SMPP** and **HTTP** providers, real-time OTP processing, and a strict hierarchical reseller system.

---

## 🏛 Hierarchical Architecture

The system is designed for massive scale with a clear chain of command:
1.  **Admin:** Full system control, infrastructure management, and global audit logs.
2.  **Manager:** Manage resellers, adjust balances, monitor traffic, and approve requests.
3.  **Reseller:** Create client accounts (Sub Resellers), manage their own inventory and payouts.
4.  **Sub Reseller (Client):** High-level client access. Manage numbers, view OTPs, and use the API.

---

## ✨ Key Features

-   **📡 Multi-Protocol support:** Connect to providers via SMPP or HTTP. Includes a built-in **SMPP Server** (Port 2775).
-   **🛡️ Security First:** Cloudflare-style browser integrity checks, rate-limiting, IP blacklisting, and JWT-based authentication.
-   **⚡ Real-time Processing:** Redis-backed queues handle high-throughput SMS and DLR updates.
-   **📊 Professional Analytics:** Detailed traffic stats, profit monitoring, and live OTP feeds with WebSocket updates.
-   **🛠️ Modular Frontend:** Refactored for stability and performance. No infinite loading screens.
-   **🐳 Containerized:** Ready for deployment with Docker and Docker Compose.

---

## 🛠 File Structure & Modules

```text
SIGMAPANEL/
├── main.py                # FastAPI entry point & Middleware config
├── smpp_server.py         # Production-grade SMPP Server (asyncio)
├── worker.py              # Background worker for SMS/Queue processing
├── database.py            # SQLite schema & migration logic
├── queue_manager.py       # Redis connection pooling & queuing
├── security_middleware.py # WAF, Rate-limiting, & Firewall logic
├── routes/                # Backend API Endpoints (modular)
│   ├── auth.py            # Authentication & RBAC
│   ├── numbers.py         # Number allocation & Inventory
│   ├── sms.py             # SMS logs & Profit logic
│   └── users.py           # User hierarchy & Balance management
└── static/                # Frontend Assets
    ├── css/style.css      # Modern Indigo/Slate enterprise theme
    └── js/                # Modular SPA Frontend
        ├── app.js         # Navigation & Shell initialization
        ├── router.js      # Custom SPA Router
        └── modules/       # Feature-specific logic (sms, numbers, etc.)
```

---

## 🚀 Deployment Guide

### 1. VPS / Dedicated Server (Ubuntu/Debian)

**Prerequisites:** Docker, Docker Compose, Nginx.

```bash
# Clone the repository
git clone https://github.com/AdnanTermux/SIGMAPANEL.git
cd SIGMAPANEL

# Build and start services
docker-compose up -d --build

# The panel will be available at http://your-ip:8000
```

**Nginx Configuration:**
Use the provided `nginx_hardened.conf` for production SSL and reverse proxy settings.

### 2. Railway / Cloud Platforms

1.  Connect your GitHub repository.
2.  Add a **Redis** service.
3.  Set Environment Variables:
    -   `DATABASE_URL`: `/data/sigmapanel.db`
    -   `REDIS_URL`: `redis://your-redis-url`
4.  Deploy. Railway will automatically detect the `Dockerfile`.

---

## 🔌 Connection Specifications

### SMPP Server (Built-in)
-   **Host:** `your-vps-ip`
-   **Port:** `2775`
-   **Supported Bind:** `bind_transceiver`, `bind_receiver`, `bind_transmitter`
-   **DLR Format:** `id:(.*?) sub:.*? dlvrd:(.*?) stat:(.*?) err:(.*?)`

### HTTP Webhook (Incoming)
-   **Endpoint:** `/api/webhook/receive`
-   **Method:** `POST / GET`
-   **Parameters:** `to`, `from`, `msg`, `secret_token`

---

## 🧪 Demo Access
Use the restricted test panel for demonstration:
-   **URL:** `/login`
-   **Username:** `test123`
-   **Password:** `test123`

---

## 📈 Development
To run in development mode locally:
```bash
pip install -r requirements.txt
python main.py &
python worker.py &
python smpp_server.py
```

Developed with ❤️ for Professional Telecom Infrastructures.
