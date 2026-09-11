# GenG Edge — Complete Product & Technical Documentation

**Document type:** Product, developer, deployment, and operations handbook  
**Project:** GenG Edge Trading Journal  
**Release:** Production candidate / final validated source package  

---

## 1. Product Overview

GenG Edge is a trading-journal and risk-management workspace designed for traders who want to record executions, understand performance patterns, monitor account constraints, and make more disciplined risk decisions.

The product is organized around three pillars:

1. **Journal** — capture trades and the context behind the decision.
2. **Risk** — monitor account limits, drawdown, daily loss, and funded-account rules.
3. **Review** — analyze results across symbols, sessions, strategies, trading days, and behavioral inputs.

GenG Edge is software for journaling, analytics, and planning. It is **not** a broker, trading signal service, investment adviser, or guarantee of profitability.

---

## 2. Product Capabilities

### Authentication

- User registration.
- Login.
- Password reset flow.
- Email verification infrastructure.
- HttpOnly session cookie as the primary persisted browser session.
- Backward-compatible bearer authentication for existing API clients.
- Logout endpoint that clears the session cookie.
- Throttling for sensitive authentication endpoints.

### Trading Journal

- Create, edit, inspect, and delete trades.
- Search and filter journal records.
- Track symbols, direction, sessions, strategies, notes, and behavioral context.
- Record execution timestamps.
- Store monetary trade results and trade costs.

### Analytics

- Equity/performance analysis.
- Session analysis.
- Symbol analysis.
- Strategy analysis.
- Trading-day/month calendar views.
- Deterministic performance review based on stored journal data.

### Funded-Account Risk

- Profit target tracking.
- Daily loss tracking.
- Drawdown tracking.
- Trailing drawdown support where configured.
- Trading-day rules.
- Consistency/account-rule monitoring.
- Risk status presentation using SAFE, WARNING, CRITICAL, and BREACHED states.

### Tools

- Position-size calculation.
- Risk-based sizing.
- Pip-value and conversion handling.
- Market-session hours and overlap views.
- Browser timezone handling with DST-aware conversion.

### Settings

- Notification preferences.
- Email test functionality.
- Theme switching.
- User/profile settings.

---

## 3. Technology Stack

### Frontend

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Recharts
- Lucide icons
- Radix UI packages where applicable

### Backend

- FastAPI
- Python 3.13 recommended
- SQLAlchemy 2
- Pydantic / Pydantic Settings
- Alembic
- SQLite for local development
- PostgreSQL for production
- JWT token signing
- SMTP-compatible email delivery

### Quality / testing

- pytest
- pytest-asyncio
- Vitest dependencies for frontend testing
- TypeScript project compilation

---

## 4. Repository Layout

```text
.
├── backend/
│   ├── app/
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── datetime_utils.py
│   │   │   ├── dependencies.py
│   │   │   ├── rate_limit.py
│   │   │   └── security.py
│   │   ├── database/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── schemas/
│   │   └── services/
│   ├── migrations/
│   ├── tests/
│   ├── .env.example
│   ├── Dockerfile
│   └── requirements.txt
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── lib/
│   │   ├── services/
│   │   ├── types/
│   │   └── App.tsx
│   ├── .env.example
│   ├── Dockerfile.prod
│   ├── nginx.conf
│   └── package.json
│
├── docker-compose.yml
├── render.yaml
├── netlify.toml
├── START_GENG_EDGE.bat
├── DEPLOYMENT.md
├── RELEASE_NOTES.md
├── RELEASE_VALIDATION.md
└── README.md
```

The release intentionally excludes generated runtime assets such as `.git`, `.venv`, `node_modules`, caches, local databases, and build output.

---

## 5. Local Development

### Requirements

Recommended:

- Python 3.13
- Node.js LTS
- npm
- Git
- Docker Desktop (optional)

### Backend setup

```powershell
cd backend
py -3.13 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

### Frontend setup

Open another terminal:

```powershell
cd frontend
npm ci
npm run dev -- --host 127.0.0.1
```

Open:

```text
http://127.0.0.1:5173
```

### One-click Windows launcher

The root `START_GENG_EDGE.bat` can prepare the local environment and start the application using the included Windows workflow.

---

## 6. Environment Variables

### Backend

Copy `backend/.env.example` to `backend/.env`.

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | SQLAlchemy database URL. SQLite locally; PostgreSQL recommended in production. |
| `SECRET_KEY` | Yes | Secret used to sign auth tokens. Use a strong random value in production. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Yes | Token lifetime. |
| `ENVIRONMENT` | Yes | `development`, `test`, or `production`. |
| `BACKEND_URL` | Yes | Canonical backend URL. |
| `CORS_ORIGINS` | Yes | Exact allowed frontend origins, comma-separated. |
| `FRONTEND_URL` | Yes | Canonical frontend URL used by email links/assets. |
| `UPLOAD_DIR` | Optional | Upload storage path. |
| `SMTP_HOST` | Optional | SMTP server. |
| `SMTP_PORT` | Optional | SMTP port. |
| `SMTP_USERNAME` | Optional | SMTP username. |
| `SMTP_PASSWORD` | Optional | SMTP password. |
| `SMTP_FROM_EMAIL` | Optional | Sender email. |
| `SMTP_USE_TLS` | Optional | SMTP STARTTLS behavior. |
| `MT5_LOGIN` | Optional | Reserved MT5 integration setting. |
| `MT5_PASSWORD` | Optional | Reserved MT5 integration setting. |
| `MT5_SERVER` | Optional | Reserved MT5 integration setting. |
| `AI_API_KEY` | Optional | Reserved external AI integration setting. |

### Frontend

`frontend/.env.example` contains the public build-time API origin:

```env
VITE_API_URL=https://geng-edge-backend.onrender.com
```

Never place secrets in frontend `VITE_*` variables. Anything exposed through the frontend build is public.

---

## 7. Authentication & Security Model

### Browser authentication

The frontend uses `credentials: include` for API requests and the backend issues the `geng_edge_session` cookie.

In production the cookie should be:

- `HttpOnly`
- `Secure`
- `SameSite=Lax`

Bearer authentication remains accepted for backwards compatibility with API clients.

### Authorization

Protected routes use centralized authentication dependency logic rather than duplicating token parsing in each route.

Every protected resource must also enforce ownership. A user must not be able to access another user's accounts, trades, analytics, or private files.

### Rate limiting

Sensitive endpoints are throttled, including:

- registration
- login
- forgot-password
- reset-password

The current limiter is process-local. For a multi-instance production deployment, replace it with a shared store such as Redis.

### HTTP security

The backend applies security headers and restricts CORS to explicitly configured origins.

### Secrets

Do not commit:

- `SECRET_KEY`
- database credentials
- SMTP passwords
- third-party API keys
- reset tokens
- verification tokens

---

## 8. Date, Timezone, and Trading-Day Rules

Trading timestamps must be handled consistently.

### Storage policy

Store canonical timestamps in UTC.

### Presentation policy

Convert to the user's/account's intended timezone only at the presentation layer.

This prevents server-local timezone differences from affecting:

- daily loss calculations
- trading-day boundaries
- calendar displays
- session analysis
- drawdown reporting
- DST-sensitive session calculations

Trade create and update paths should use the same timestamp normalization logic.

---

## 9. Financial Precision

Financial fields should use fixed-precision database storage (`NUMERIC`/`DECIMAL`) where required rather than binary floating-point types.

Migration `0005_financial_precision.py` introduces the fixed-precision schema changes.

Critical calculations should use `Decimal` in Python and should avoid premature rounding.

Presentation rounding belongs in the UI/reporting layer unless the business rule explicitly requires otherwise.

---

## 10. Database & Migrations

Alembic migrations are stored under:

```text
backend/migrations/versions/
```

The production database should be initialized/upgraded explicitly:

```bash
alembic upgrade head
```

Do not rely on application startup to create production schema.

### Current migration sequence

```text
0001_initial_schema
0002_user_audit_fields
0003_account_tokens
0004_user_avatar_framing
0005_financial_precision
```

Before a production migration:

1. Back up the database.
2. Test the migration against a copy.
3. Run `alembic upgrade head`.
4. Verify critical historical analytics.
5. Keep a rollback/recovery plan.

---

## 11. API Overview

The FastAPI service is mounted under `/api`.

### Authentication

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

### User / notifications

```text
GET /api/users/me
GET /api/users/me/notifications
PUT /api/users/me/notifications
POST /api/notifications/test
POST /api/notifications/summary/{period}
```

### Accounts

```text
GET  /api/accounts
POST /api/accounts
PUT  /api/accounts/{account_id}
```

### Trades

```text
GET    /api/trades
POST   /api/trades
GET    /api/trades/{trade_id}
PUT    /api/trades/{trade_id}
DELETE /api/trades/{trade_id}
```

### Analytics

Analytics endpoints are grouped under `/api/analytics` and provide account/trade performance information used by the dashboard and review workflows.

### Development documentation

FastAPI interactive docs are available at:

```text
http://127.0.0.1:8000/docs
```

Production should disable public interactive docs unless there is an intentional operational reason to expose them.

---

## 12. Trading Domain Concepts

A trade should be treated as more than a row of prices. Important business concepts include:

```text
Trade
Instrument
Trade Costs
Risk Calculation
Position Sizing
Account Rule
Risk Snapshot
Rule Evaluation
```

Critical calculation responsibilities belong in service/domain logic rather than UI components.

Important calculations include:

- P&L
- risk amount
- risk percentage
- R multiple / R:R
- equity curve
- drawdown
- daily loss
- profit factor
- expectancy
- account-rule compliance
- position sizing

Whenever a financial calculation changes, add regression tests before release.

---

## 13. Risk Control Center

The risk system is a core product differentiator.

The UI should surface four states:

```text
SAFE
WARNING
CRITICAL
BREACHED
```

A risk snapshot should communicate:

- current balance/equity
- daily P&L
- daily loss limit
- daily loss remaining
- drawdown
- drawdown limit
- drawdown remaining
- profit target
- target progress
- trading-day progress
- active warnings
- rule violations

Good messaging is actionable. Example:

> You have $180 remaining before today's loss limit.

Avoid presenting risk as a decorative progress bar without showing the underlying limit and remaining capacity.

---

## 14. Trade Review UX

The application includes a fast trade inspection flow through a detail drawer.

A strong trade detail view should show:

```text
Symbol / Direction
P&L
Entry / Exit
Size
Risk
R:R
Strategy
Session
Emotion
Confidence
Discipline
Notes / Lesson
```

Actions should include:

- Edit
- Duplicate where appropriate
- Delete

The goal is to make reviewing an individual trade much faster than opening a full-screen editing workflow every time.

---

## 15. Performance Review and Analytics

The deterministic review system should not claim to use an LLM unless a real model is actually integrated.

The current terminology uses **Performance Review** rather than implying cloud AI analysis.

Useful analytical questions include:

- What makes the trader profitable?
- Which sessions perform best?
- Which symbols perform worst?
- Which strategies have enough sample size to be meaningful?
- Are emotional/discipline factors associated with performance?
- Are trading rules being followed?
- What happens after a losing streak?

Behavioral insights must include sample sizes and must not present weak correlations as facts.

---

## 16. Frontend UX Standards

The UI is designed around a dark trading aesthetic with semantic states:

- green = positive/profit/success
- red = loss/danger
- amber = warning
- blue = primary interaction
- gray = neutral

The application should maintain:

- consistent spacing
- consistent typography
- readable charts
- visible focus states
- keyboard navigation
- responsive mobile layouts
- clear loading states
- useful empty states
- human-readable error messages

Mobile interfaces should not simply shrink desktop screens. Dense filters should collapse into drawers or disclosure controls, and wide trade tables should become readable cards where necessary.

---

## 17. Keyboard Shortcuts

The workspace supports a small set of productivity shortcuts.

Examples:

```text
N              New Trade
G then D       Dashboard
G then T       Trades
G then A       Analytics
/              Search
Esc            Close modal/drawer
Ctrl/Cmd+Enter Save
```

Do not introduce shortcuts that interfere with browser/system accessibility behavior.

---

## 18. Email Notifications

Risk notifications can be generated when an account reaches critical/breached states, subject to user preference settings and SMTP configuration.

### Local MailHog workflow

```bash
docker compose up -d mailhog
```

Then inspect:

```text
http://localhost:8025
```

SMTP is exposed locally on port `1025`.

### Production email

Use the SMTP provider configured by the production environment. Never commit provider credentials.

User-controlled content inserted into HTML email should always be escaped.

---

## 19. Docker Deployment

### Backend

The backend contains a Dockerfile suitable for container deployment.

Start command:

```bash
uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
```

### Frontend

The production frontend image uses Nginx.

Build:

```bash
docker build \
  -f frontend/Dockerfile.prod \
  --build-arg VITE_API_URL=https://geng-edge-backend.onrender.com \
  -t geng-edge-web .
```

Run:

```bash
docker run -p 8080:80 geng-edge-web
```

The Nginx configuration provides SPA routing behavior and a frontend health endpoint.

---

## 20. PostgreSQL Production Setup

SQLite is appropriate for local development. PostgreSQL is recommended for production.

Example flow:

```bash
export DATABASE_URL='postgresql+psycopg://USER:PASSWORD@HOST/DBNAME'
alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Use the database provider's managed backups and monitoring.

Do not place credentials in the repository or frontend configuration.

---

## 21. Netlify / Vercel / Render Notes

### Frontend

The repository includes:

- `netlify.toml`
- `frontend/vercel.json`
- `frontend/Dockerfile.prod`
- `frontend/nginx.conf`

Configure `VITE_API_URL` at build time.

### Backend

`render.yaml` provides deployment configuration that can be adapted to your Render environment.

Production secrets must be entered through the provider's secret/environment configuration.

---

## 22. Health Checks

Use the backend health endpoint during deployment and monitoring.

The frontend Nginx image also provides a health endpoint.

After deployment, verify:

1. Backend health response.
2. Frontend health response.
3. Browser can load the SPA.
4. Browser can authenticate.
5. API requests succeed with credentials.
6. HTTPS and CORS behavior are correct.
7. Email delivery works when enabled.

---

## 23. Testing & Quality Gates

### Backend

Create a clean environment and run:

```bash
python -m pip install -r backend/requirements.txt
cd backend
pytest -q
```

### Frontend

```bash
cd frontend
npm ci
npm run typecheck
npm test
npm run build
```

The package's `check` script combines type checking and frontend tests.

### End-to-end smoke test

Recommended flow:

```text
Register
↓
Login
↓
Create account
↓
Create trade
↓
Open dashboard
↓
Open risk control
↓
Open trade detail
↓
View analytics
↓
Logout
```

### Final release audit

Check for:

```text
console.log
TODO/FIXME
hard-coded secrets
debugger
broken links
unused imports
runtime errors
missing migration
```

---

## 24. Production Release Procedure

### Step 1 — Prepare secrets

Generate a strong `SECRET_KEY`, configure PostgreSQL, CORS, frontend URL, backend URL, and SMTP values.

### Step 2 — Backup database

For SQLite environments use:

```powershell
.\BACKUP_DATABASE.bat
```

For PostgreSQL use your managed database backup/snapshot mechanism.

### Step 3 — Apply migrations

```bash
alembic upgrade head
```

### Step 4 — Build frontend

```bash
npm ci
npm run build
```

### Step 5 — Start backend

```bash
uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
```

### Step 6 — Verify

Test:

- signup
- login
- logout
- password reset
- account creation
- trade CRUD
- risk calculations
- analytics
- authorization isolation
- frontend routing
- mobile layout
- production health checks

### Step 7 — Monitor

Monitor:

- application errors
- authentication failures
- email failures
- API latency
- database errors
- resource usage

---

## 25. Backups & Recovery

Backups are mandatory for any production journal that contains irreplaceable user data.

Recommended strategy:

- daily automated database backups
- retained rolling backups
- periodic restore tests
- separate storage from the application host
- documented recovery process

A backup is only considered operationally useful after a restore test has succeeded.

---

## 26. Security Checklist

Before production launch:

```text
[ ] HTTPS enforced
[ ] Secure cookies active
[ ] CORS restricted to exact origins
[ ] SECRET_KEY replaced
[ ] Database credentials stored as secrets
[ ] SMTP credentials stored as secrets
[ ] Sensitive auth endpoints rate-limited
[ ] Interactive API docs restricted if necessary
[ ] Cross-user ownership tests pass
[ ] Reset/verification tokens never logged
[ ] Uploaded files are ownership-protected
[ ] Production database backups configured
[ ] Dependency vulnerabilities reviewed
```

---

## 27. Known Validation Boundaries of This Release

The release source was checked in the available environment for:

- Python source compilation.
- Frontend TypeScript project compilation/source parsing.
- Release hygiene.
- Removal of legacy localStorage auth persistence.
- Migration/source consistency checks.

Two full runtime checks depend on a networked target environment because the clean source archive intentionally contains no installed dependencies:

1. Frontend production bundling with `npm ci && npm run build`.
2. Full backend pytest execution after installing `backend/requirements.txt`.

These commands must be executed in CI or on the deployment environment before promoting the build to production.

This is an explicit environment constraint, not a claim that the checks passed locally.

---

## 28. Troubleshooting

### Frontend cannot reach API

Check:

- `VITE_API_URL`
- backend URL
- CORS origins
- HTTPS scheme
- backend health endpoint

### Login succeeds but protected requests fail

Check:

- browser cookie storage
- HTTPS in production
- `credentials: include`
- CORS `allow_credentials`
- cookie SameSite/Secure settings

### Database migration fails

Check:

- `DATABASE_URL`
- database connectivity
- current Alembic revision
- backup before migration

Useful command:

```bash
alembic current
```

### Email not arriving

Check:

- SMTP host/port
- TLS setting
- username/password
- sender identity
- provider restrictions
- spam/quarantine

For local development use MailHog.

### Build fails after a clean checkout

Use:

```bash
npm ci
npm run typecheck
npm run build
```

Do not copy `node_modules` across operating systems.

---

## 29. Future Engineering Roadmap

The application is now substantially hardened, but a mature SaaS platform can continue improving in these areas:

### Architecture

- Fully decompose the remaining large `App.tsx` surface into independent feature modules.
- Continue moving domain calculations out of UI components.
- Consider TanStack Query for broader server-state lifecycle management.

### Product

- richer daily/weekly/monthly review workflows
- deeper rule-violation reporting
- larger behavioral analytics layer
- CSV/broker/MT4/MT5 import workflows
- trade screenshot attachment workflows
- saved analytics views
- richer funded-account rule templates

### Operations

- shared Redis-backed rate limiting for multi-instance deployments
- centralized error monitoring such as Sentry
- structured logs/request IDs
- automated CI/CD deployment gates
- scheduled backup verification

These are opportunities for further scale and polish, not reasons to remove the current product foundations.

---

## 30. Engineering Principles

When extending GenG Edge, follow these principles:

1. **Financial correctness first.** Never alter a trading calculation without tests.
2. **Security by default.** Never weaken authentication or ownership checks for convenience.
3. **UTC internally.** Present localized times at the boundary.
4. **Backend owns authoritative financial metrics.** Frontend should primarily present them.
5. **Small feature modules beat giant components.** Keep UI, API, domain logic, and persistence separated.
6. **No fake intelligence.** Never label deterministic logic as AI.
7. **No secret values in frontend code.** Anything shipped to the browser is public.
8. **Every destructive operation should be deliberate.** Protect account and journal deletion.
9. **Every release should be reproducible.** Build from a clean checkout.
10. **Document actual behavior.** Never claim a feature is implemented unless it is verified.

---

## 31. Ownership & Handoff

A future developer taking over this project should read these files in order:

1. `README.md`
2. `GEN_G_EDGE_DOCUMENTATION.md` (this document)
3. `DEPLOYMENT.md`
4. `RELEASE_NOTES.md`
5. `RELEASE_VALIDATION.md`
6. `backend/app/core/`
7. `backend/app/services/`
8. `backend/migrations/`
9. `frontend/src/`

Before modifying core financial logic, review the related backend tests first.

---

## 32. Product Disclaimer

GenG Edge provides software calculations, journaling, analytics, and risk-management utilities. Calculations can depend on instrument specifications, broker settings, account currency, spreads, commissions, swap, margin rules, execution behavior, session definitions, and other external factors.

Users must independently verify important calculations and remain responsible for their trading decisions. GenG Edge does not guarantee trading results, profitability, or compliance with any particular broker or funded-account provider's rules.
