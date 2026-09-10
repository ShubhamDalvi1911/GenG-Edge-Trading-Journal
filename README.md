# ⚡ GenG Edge

<div align="center">

### Forex Trading Journal • Performance Analytics • Risk Management

[![Frontend Deployment](https://img.shields.io/badge/Netlify-Deployed-00C7B7?style=flat-square&logo=netlify&logoColor=white)](https://gengedgetradingjournal.netlify.app)
[![Backend Status](https://img.shields.io/badge/Render-Online-46E3B7?style=flat-square&logo=render&logoColor=white)](https://geng-edge-backend.onrender.com/health)
[![Python Version](https://img.shields.io/badge/Python-3.13-3776AB?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)
[![React Version](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)

[Live Application](https://gengedgetradingjournal.netlify.app) • [API Documentation](https://geng-edge-backend.onrender.com/docs)

</div>

---

**GenG Edge** is a modern forex trading journal and risk-management workspace designed to help traders **record executions, analyze performance, monitor funded-account rules, and prepare positions using disciplined risk calculations**.

The application brings journaling, analytics, account monitoring, automated email alerts, and independent trading utilities into one cohesive platform.

> **Record → Analyze → Review → Manage Risk**

> [!NOTE]
> *GenG Edge is software for journaling, analysis, and trade planning. It is **not a broker, trading signal service, investment adviser, or guarantee of profitability.***

---

## ✨ Highlights

- 🔐 **Authentication:** Secure JWT-based auth, email verification, and password resets.
- 📊 **Performance Analytics:** Comprehensive equity, P&L, strategy, and session metrics.
- 📝 **Trading Journal:** Granular trade tagging (setups, sessions, timeframes, market conditions).
- 🎯 **Funded Account Guard:** Automated daily loss, drawdown, and rule breach tracking.
- 📧 **Automated Alerts:** Email notifications for risk breaches and periodic account summaries.
- 🧮 **Trading Utilities:** Integrated position-size calculator & market hours tracker.
- 🤖 **AI Journal Reports:** Automated analytical breakdowns of recurring trading patterns.
- 🌓 **Modern UI:** Responsive dark and light theme options.
- 🐳 **Developer-Friendly:** Local SQLite support, MailHog integration, Docker Compose setup, and Alembic migrations.

---

## 🖥️ Application Overview

GenG Edge is structured into two core operational environments:

### 🔒 Private Trading Workspace
Accessible strictly to authenticated users:
* **Dashboard & Analytics:** Equity curves, win rates, and daily performance calendars.
* **Trade Management:** Full trade logging, editing, filtering, and setup breakdowns.
* **Risk Engine:** Real-time evaluation of funded account parameters.
* **AI Analysis:** Smart synthesis of recent execution history.

### 🌐 Public Experience
SEO-ready public tools and marketing pages:
* **Public Tools:** Position Size Calculator & Timezone-aware Forex Market Hours.
* **Information:** Features, Pricing, About, FAQ, Terms, Privacy, and Disclaimer.

---

## 🏗️ System Architecture

```text
                           PRODUCTION DEPLOYMENT
                                 Internet
                                    │
                     ┌──────────────┴──────────────┐
                     ▼                             ▼
              Netlify Frontend               Render Backend
                React + Vite                    FastAPI
                     │                             │
                     └────────── HTTPS API ────────┘
                                                   │
                                                   ▼
                                          PostgreSQL Database
```

```text
                         LOCAL DEVELOPMENT WORKFLOW
       
       React / Vite ────────► FastAPI ────────► SQLite
                                │
                                ▼ (Optional Email Capture)
                            MailHog
```

---

## 🧰 Technology Stack

| Domain | Technologies |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Recharts, Lucide Icons |
| **Backend** | Python 3.13, FastAPI, SQLAlchemy, Pydantic v2, Alembic, JWT, bcrypt |
| **Databases** | SQLite (Development), PostgreSQL (Production) |
| **Tooling & Infra**| Docker, MailHog, Netlify, Render, GitHub Actions |

---

## ⚡ Quick Start (Windows)

The repository includes an automated launcher script for fast setup:

```cmd
.\START_GENG_EDGE.bat
```

This launch script automatically:
1. Provisions a Python `.venv` environment and installs `requirements.txt`.
2. Runs database migrations via Alembic.
3. Launches the FastAPI backend on `http://127.0.0.1:8000`.
4. Initializes the React Vite frontend on `http://127.0.0.1:5173`.

---

## 🔧 Manual Installation

### Prerequisites
* Python **3.13+**
* Node.js **LTS** & npm
* Git

### 1. Clone Repository
```bash
git clone [https://github.com/ShubhamDalvi1911/GenG-Edge-Trading-Journal.git](https://github.com/ShubhamDalvi1911/GenG-Edge-Trading-Journal.git)
cd GenG-Edge-Trading-Journal
```

### 2. Backend Setup
```bash
cd backend
python -m venv .venv

# On Windows
.\.venv\Scripts\activate
# On macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env

# Run migrations & start server
alembic upgrade head
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

### 3. Frontend Setup
```bash
# Open a second terminal
cd frontend
npm install
npm run dev -- --host 127.0.0.1
```

Access the app locally at **`http://127.0.0.1:5173`**.

---

## 🔐 Environment Configuration

Create a `.env` file in the `/backend` directory based on `.env.example`:

```ini
# Core Configuration
DATABASE_URL=sqlite:///./trading_journal.db
SECRET_KEY=your-development-secret-key-change-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=1440
ENVIRONMENT=development

# URLs & CORS
FRONTEND_URL=http://localhost:5173
BACKEND_URL=[http://127.0.0.1:8000](http://127.0.0.1:8000)
CORS_ORIGINS=http://localhost:5173,[http://127.0.0.1:5173](http://127.0.0.1:5173)

# Local SMTP / MailHog
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USERNAME=
SMTP_PASSWORD=
SMTP_FROM_EMAIL=no-reply@gengedge.local
SMTP_USE_TLS=false
```

---

## 🛡️ Risk Management & Calculations

```text
  ┌────────────────┐     ┌────────────────┐     ┌────────────────┐
  │  SAFE (<70%)   │ ──► │ WARNING (>70%) │ ──► │ CRITICAL (>90%)│
  └────────────────┘     └────────────────┘     └────────────────┘
                                                        │
                                                        ▼
                                                 BREACHED (100%)
```

GenG Edge tracks real-time account rules for funded accounts:
* **Profit Targets** & **Max Drawdown**
* **Daily Loss Thresholds**
* **Remaining Risk Capacity**

When risk parameters cross configured safety margins (`CRITICAL` or `BREACHED`), the system dispatches automated warning emails via configured SMTP settings.

---

## 🔑 Authentication Lifecycle

```text
[ User Action ]            [ Processing ]               [ Output ]

Forgot Password ──► POST /api/auth/forgot-password ──► Generate & Hash Token
                                                             │
                                                             ▼
/reset-password ◄── POST /api/auth/reset-password  ◄── Send Email Link
       │
       ▼
Update Password ──► Invalidate Used Token
```

* **Token Expiration:** Short-lived, single-use reset & verification tokens.
* **Privacy Standard:** Password reset endpoints return uniform generic responses to prevent account enumeration attacks.

---

## 📚 API Endpoint Reference

Detailed documentation is accessible via Swagger UI at `/docs` when running locally.

| Group | Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| **Auth** | `POST` | `/api/auth/register` | Register a new user |
| **Auth** | `POST` | `/api/auth/login` | Authenticate & acquire JWT token |
| **Auth** | `GET` | `/api/auth/me` | Fetch authenticated user profile |
| **Trades** | `GET` | `/api/trades` | Fetch user trades (supports filtering) |
| **Trades** | `POST` | `/api/trades` | Log a new execution |
| **Trades** | `PUT` | `/api/trades/{id}` | Update existing trade entry |
| **Analytics**| `GET` | `/api/analytics` | Retrieve dashboard performance metrics |
| **System** | `GET` | `/health` | Application health check endpoint |

---

## 📁 Repository Structure

```text
GenG-Edge-Trading-Journal/
├── backend/
│   ├── app/
│   │   ├── core/          # Security & app setup
│   │   ├── database/      # Database session engines
│   │   ├── models/        # SQLAlchemy ORM models
│   │   ├── routes/        # FastAPI endpoints
│   │   ├── schemas/       # Pydantic data contracts
│   │   └── services/      # Core business logic
│   ├── migrations/        # Alembic database versions
│   └── tests/             # Pytest test suite
├── frontend/
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── services/      # Axios API Client
│   │   └── App.tsx        # Main application layout
│   └── vite.config.ts
├── docker-compose.yml     # Local orchestration (MailHog + App)
├── START_GENG_EDGE.bat    # Windows launcher script
└── README.md
```

---

## 🧪 Testing & Verification

### Backend Tests
```bash
cd backend
pytest -q
```

### Frontend Build Verification
```bash
cd frontend
npm run build
```

---

## 📌 Project Status

| Module | Status |
| :--- | :---: |
| Authentication & JWT | ✅ Completed |
| Trade Journal & Tags | ✅ Completed |
| Risk Engine & Alerts | ✅ Completed |
| Position Calculator | ✅ Completed |
| Forex Session Tracker | ✅ Completed |
| Dark / Light Theme | ✅ Completed |
| Production Deploy Setup | ✅ Completed |

---

## ⚠️ Disclaimer

Trading foreign exchange on margin carries a high level of risk and may not be suitable for all investors. **GenG Edge** provides software-based calculations and analytical tools based on user inputs. Always verify parameters, contract specifications, and margin rules directly with your broker before entering live market positions.

---

## 👤 Author

**Shubham Dalvi**
- GitHub: [@ShubhamDalvi1911](https://github.com/ShubhamDalvi1911)

---

## 📄 License

This repository is currently unlicensed. All rights are reserved.