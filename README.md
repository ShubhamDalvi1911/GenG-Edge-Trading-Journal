# GenG Edge

GenG Edge is a private forex trading journal and risk-management workspace for recording executions, reviewing performance, monitoring funded-account rules, and preparing trades with independent utility tools.

The product is built around one simple operating loop:

1. Record the decision and execution while the details are available.
2. Reconstruct performance from stored net P&L and account rules.
3. Review patterns across symbols, sessions, strategies, and trading days.
4. Use conservative risk calculations before committing to a position.

GenG Edge is not a broker, signal service, investment adviser, or promise of profitability. It is software for journaling, analysis, and planning.

The application keeps journal data in local SQLite by default and supports PostgreSQL for production. It includes a FastAPI backend, a React/Vite frontend, HttpOnly cookie sessions with backward-compatible bearer authentication, analytics, email risk alerts, theme switching, public SEO pages, and a Tools workspace.

## Features

- User registration and login with HttpOnly cookie sessions with backward-compatible bearer authentication.
- Trading account creation and funded-account rule configuration.
- Trade creation, editing, deletion, filtering, and search.
- Instrument-aware P&L and trade metrics.
- Dashboard analytics for equity, sessions, symbols, strategies, and trade quality.
- Monthly calendar and AI-style journal review generated from stored trades.
- Funded-account monitoring for profit targets, daily loss, drawdown, and consistency.
- Email notifications for critical and breached risk states.
- Settings for notification email preferences and SMTP test delivery.
- Persistent dark and light themes.
- Tools workspace with:
  - Position Size calculator using monetary risk, pip value, account currency conversion, broker lot settings, conservative lot rounding, validation, and estimated margin.
  - Forex Market Hours using IANA timezones, daylight-saving-aware conversion, session countdowns, overlaps, weekend handling, and a timezone-aware timeline.
- Local database backup script for Windows.
- Optional Docker Compose setup with MailHog for local email inspection.

## Technology

- Frontend: React 18, TypeScript, Vite, Tailwind CSS, Recharts, Lucide.
- Backend: FastAPI, SQLAlchemy, Pydantic Settings, JWT, SQLite locally, PostgreSQL in production, Alembic.
- Testing: pytest, pytest-asyncio, Vitest dependencies for frontend tests.
- Local email: SMTP-compatible delivery; MailHog is available in Docker Compose.

## Requirements

For the supported local setup, install:

- Python 3.13.
- Node.js LTS and npm.
- Git, if cloning from GitHub.
- Docker Desktop only if you want MailHog or the Docker workflow.

Python 3.13 is recommended because the pinned backend dependency versions are tested against it. Newer Python versions may require native builds for packages such as `pydantic-core`.

## Quick Start on Windows

From the repository root, double-click `START_GENG_EDGE.bat`.

The launcher creates `backend\\.venv` with Python 3.13, installs backend dependencies, starts FastAPI on `http://127.0.0.1:8000`, starts Vite on `http://127.0.0.1:5173`, and opens the frontend.

If Python 3.13 is not installed, install it first and run the launcher again.

## Manual Setup

### Backend

```powershell
cd backend
py -3.13 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

The backend reads `.env` from `backend/`. SQLite is used by default and creates `backend/trading_journal.db` when the application starts.

For a new or production database, apply migrations before starting the API:

```powershell
cd backend
.\.venv\Scripts\python.exe -m alembic upgrade head
```

### Frontend

Open a second terminal:

```powershell
cd frontend
npm install
npm run dev -- --host 127.0.0.1
```

Open `http://127.0.0.1:5173`.

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and configure as needed:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | SQLAlchemy database URL; defaults to local SQLite. |
| `SECRET_KEY` | Secret used to sign access tokens. Replace the example value. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | JWT lifetime. |
| `UPLOAD_DIR` | Local upload directory. |
| `SMTP_HOST` | SMTP server hostname. |
| `SMTP_PORT` | SMTP server port. |
| `SMTP_USERNAME` | Optional SMTP username. |
| `SMTP_PASSWORD` | Optional SMTP password. |
| `SMTP_FROM_EMAIL` | Sender address. |
| `SMTP_USE_TLS` | Whether SMTP STARTTLS is enabled. |
| `FRONTEND_URL` | Frontend URL used in branded email links/assets. |

The MT5 and AI variables in `.env.example` are reserved integration settings and are optional for the current local workflow.

## Email Notifications

Risk alerts are sent when an evaluated account reaches `CRITICAL` or `BREACHED` status, provided the user has enabled email alerts and configured a notification address in Settings. Alerts are evaluated after trade creation, trade updates, and account-rule updates.

### MailHog with Docker

Start the local SMTP capture service:

```powershell
docker compose up -d mailhog
```

MailHog SMTP listens on `localhost:1025` and its inbox is available at `http://localhost:8025`.

Use the Settings **Send test** button to verify delivery. For real email, replace the SMTP values in `backend/.env` with credentials from your email provider.

## Tools

Tools are independent of journal trade entry and never create or modify trades.

### Position Size

The calculator supports:

- Percentage or fixed risk.
- Account currencies including USD, EUR, GBP, JPY, AUD, CAD, CHF, NZD, and INR.
- Common forex symbols, custom symbols, JPY pairs, and configurable XAUUSD specifications.
- Stop-loss and take-profit price or pip modes.
- Quote-currency pip value calculation.
- Base/quote/account currency conversion.
- Manual conversion rates when a live rate is unavailable.
- Broker contract size, pip size, minimum lot, lot step, maximum lot, and leverage.
- Raw lot size, conservative rounded lot size, intended risk, actual risk, potential profit, potential loss, risk-to-reward, and estimated margin.

Actual broker specifications, conversion rates, margin rules, spreads, commissions, swaps, and execution conditions can differ. Verify calculations with your broker before placing a trade.

### Forex Market Hours

The market-hours tool uses browser `Intl.DateTimeFormat` and IANA timezone identifiers such as `Europe/London`, `America/New_York`, `Australia/Sydney`, `Asia/Tokyo`, and `Asia/Kolkata`. It updates once per second and supports:

- Automatic browser timezone detection.
- Manual timezone selection.
- DST-aware session conversion.
- Sydney overnight sessions.
- Open, closed, opening-soon, and closing-soon states.
- Dynamic overlaps and countdowns.
- Weekend status.
- A timeline that moves with the selected timezone.

Session times are standard reference schedules, not broker guarantees.

## API Overview

The backend API is mounted under `/api`.

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/users/me`
- `GET /api/users/me/notifications`
- `PUT /api/users/me/notifications`
- `POST /api/notifications/test`
- `POST /api/notifications/summary/{period}`
- `GET /api/accounts`
- `POST /api/accounts`
- `PUT /api/accounts/{account_id}`
- `GET /api/trades`
- `POST /api/trades`
- `GET /api/trades/{trade_id}`
- `PUT /api/trades/{trade_id}`
- `DELETE /api/trades/{trade_id}`
- Analytics endpoints under `/api/analytics`

FastAPI interactive documentation is available at `http://127.0.0.1:8000/docs` during non-production development. Production disables the interactive docs by default.

## Tests and Validation

Backend tests:

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest -q
```

Frontend typecheck and production build:

```powershell
cd frontend
npm run build
```

The build runs TypeScript project compilation followed by Vite production bundling.

## Documentation

For the complete product, technical, security, deployment, testing, and operations handbook, see `GEN_G_EDGE_DOCUMENTATION.md`.

## Production deployment

See `DEPLOYMENT.md` for the full production checklist, environment configuration, PostgreSQL migration flow, Nginx container build, authentication/session behavior, and release verification steps.

The checked-in `render.yaml`, `netlify.toml`, `frontend/Dockerfile.prod`, and `frontend/nginx.conf` are intended for deployment configuration; fill all production secrets in the provider's secret/environment settings rather than committing them.

## Backups

Create a timestamped copy of the local SQLite database:

```powershell
.\BACKUP_DATABASE.bat
```

Backups are written to `backups/`, which is ignored by Git.

## Docker

The optional Compose file starts MailHog, the backend, and the frontend:

```powershell
docker compose up --build
```

Services:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8000`
- FastAPI docs: `http://localhost:8000/docs`
- MailHog: `http://localhost:8025`

## Repository Hygiene

Do not commit these local files or directories:

- `backend/.env`
- `backend/.venv/`
- `backend/trading_journal.db`
- `frontend/node_modules/`
- `frontend/dist/`
- `backups/`
- `uploads/`

The repository `.gitignore` already excludes these runtime artifacts.

## Product Principles

### Evidence over narrative

Analytics are calculated from the trades stored in the journal. The review surfaces are intended to make recorded behavior easier to inspect, not to create certainty from incomplete data.

### Risk before size

The position calculator starts with intended risk and stop distance, then derives a lot size using pip value, contract size, conversion, and broker constraints. The result is rounded down to the configured lot step so the suggested size does not silently exceed the intended risk.

### Private by default

Journal and account routes require authentication. Backend queries scope records to the authenticated user and verify ownership before reading, updating, or deleting a trade. Public pages contain product information and independent tools only; they do not render user records.

### Local development without production shortcuts

SQLite keeps local setup lightweight. PostgreSQL, explicit CORS origins, environment-provided secrets, Alembic migrations, and a non-reload production process are the intended deployment path.

## Application Areas

### Private workspace

The authenticated dashboard includes:

- Dashboard: current account context, performance cards, risk status, calendar, and equity view.
- Trades: searchable and filterable trade history with create, edit, and delete actions.
- Analytics: direction, session, symbol, strategy, win-rate, P&L, and journal statistics.
- Calendar: daily and weekly performance grouped by trading date.
- AI Report: evidence-based observations and review prompts derived from stored records.
- Strategies: aggregate outcomes by the strategy recorded on each trade.
- Risk: funded-account limits, drawdown, daily loss, targets, and trading-day progress.
- Tools: independent position sizing and market-hours utilities.
- Settings: account rules, account profile, notification preferences, and SMTP test delivery.

### Public experience

The frontend serves indexable public pages without exposing journal data:

- `/`: product overview and calls to action.
- `/features`: journal, analytics, risk monitoring, and tool capabilities.
- `/about`: product purpose, technical foundation, and responsible-use position.
- `/tools/position-size-calculator`: public position-size utility.
- `/tools/forex-market-hours`: public DST-aware market-hours utility.
- `/pricing`, `/faq`, `/contact`, `/terms`, `/privacy`, and `/disclaimer`.

Private application routes and authentication pages are excluded from the sitemap and disallowed in `robots.txt` where appropriate.

## Security Model

- Passwords are hashed with bcrypt and are never stored in plaintext.
- Access tokens are signed with `SECRET_KEY` and have a configurable expiration.
- Production refuses a missing or short secret key.
- CORS is configured from `CORS_ORIGINS`; wildcard origins are not used.
- Trades and accounts are filtered by `user_id` on the backend.
- Database credentials, SMTP credentials, and signing secrets stay server-side.
- Production schema changes run through Alembic rather than application import side effects.
- Invalid authentication tokens return a safe unauthorized response rather than internal details.
- Public SEO files contain only public URLs and no account or trade data.

Security is an ongoing engineering responsibility. Before launch, configure HTTPS, rotate all deployment secrets, restrict database access, configure backups, and review provider logs and access controls.

## API Contract Summary

All application endpoints are mounted under `/api`.

| Area | Endpoints |
| --- | --- |
| Authentication | `POST /auth/register`, `POST /auth/login`, `GET /auth/me` |
| Users | `GET /users/me`, notification read/update endpoints |
| Accounts | `GET /accounts`, `POST /accounts`, `PUT /accounts/{account_id}` |
| Trades | `GET`, `POST`, `PUT`, and `DELETE /trades` resources |
| Analytics | Overview, last-30-days, calendar, AI report, funded-account evaluation |
| Notifications | Test email and daily/weekly summary delivery |
| Operations | `GET /health` |

The OpenAPI document is available at `/docs` during local development. Do not expose interactive API documentation publicly unless that is an intentional operational decision.

## Database and Migration Policy

Models live under `backend/app/models`. The database engine is selected through `DATABASE_URL`.

- Local development: SQLite at `sqlite:///./trading_journal.db`.
- Production: PostgreSQL connection string supplied by the hosting provider.
- New environments: run `python -m alembic upgrade head` before starting the backend.
- Schema changes: create a new migration, test it against SQLite where practical, and validate it against PostgreSQL before deployment.
- Backups: use provider-managed PostgreSQL backups in production and `BACKUP_DATABASE.bat` for local SQLite snapshots.

Never place a production PostgreSQL URL in frontend variables, committed files, screenshots, or public documentation.

## Observability and Operations

Before a production release, confirm:

- `/health` returns a healthy response.
- Render logs show a successful migration and Uvicorn startup.
- PostgreSQL connections use pre-ping and provider connection limits are respected.
- SMTP failures are logged server-side without exposing credentials to users.
- Frontend network errors show a recoverable error state rather than silently presenting stale private data.
- Backups and restoration procedures have been tested, not merely configured.

## Release Checklist

- [ ] Run backend migrations against the target database.
- [ ] Run the complete backend test suite.
- [ ] Run the frontend production build.
- [ ] Set production `DATABASE_URL`, `SECRET_KEY`, `ENVIRONMENT`, `FRONTEND_URL`, `BACKEND_URL`, and `CORS_ORIGINS`.
- [ ] Confirm no secrets or local databases are tracked by Git.
- [ ] Verify registration, login, logout, and expired-token behavior.
- [ ] Verify a user cannot read, update, or delete another user's trade.
- [ ] Verify position sizing with a standard pair, a JPY pair, and XAUUSD.
- [ ] Verify market-hours DST behavior and weekend handling.
- [ ] Verify `/robots.txt`, `/sitemap.xml`, canonical metadata, and public page titles.
- [ ] Verify HTTPS, custom domains, DNS, and API connectivity from the deployed frontend.
- [ ] Submit the public domain and sitemap to Google Search Console.

## Responsible Use

Forex and leveraged trading can result in rapid and substantial losses. GenG Edge calculations depend on the values entered by the user and may not include every broker-specific condition, spread, commission, swap, execution rule, or account restriction. Verify outputs with the relevant broker and account provider. Nothing in this repository is financial, investment, tax, or legal advice.

## Complete Environment Reference

The backend loads variables from `backend/.env` during local development. In production, define them in the hosting provider dashboard instead of committing a file.

| Variable | Required | Local example | Production guidance |
| --- | --- | --- | --- |
| `DATABASE_URL` | Yes | `sqlite:///./trading_journal.db` | Use the managed PostgreSQL connection string. |
| `SECRET_KEY` | Yes | A local development secret | Use a generated secret with at least 32 characters. |
| `ENVIRONMENT` | Yes | `development` | Set to `production`. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | `1440` | Choose a session lifetime appropriate for your threat model. |
| `FRONTEND_URL` | Yes | `http://localhost:5173` | `https://gengedgetradingjournal.netlify.app` |
| `BACKEND_URL` | Yes | `http://127.0.0.1:8000` | `https://geng-edge-backend.onrender.com` |
| `CORS_ORIGINS` | Yes | `http://localhost:5173,http://127.0.0.1:5173` | `https://gengedgetradingjournal.netlify.app,https://gengedgetradingjournal.netlify.app` |
| `UPLOAD_DIR` | No | `./uploads` | Use persistent storage if uploads are enabled. |
| `SMTP_HOST` | No | `localhost` | Use the provider SMTP hostname. |
| `SMTP_PORT` | No | `1025` | Use the provider SMTP port. |
| `SMTP_USERNAME` | No | Empty for MailHog | Store credentials only in the backend environment. |
| `SMTP_PASSWORD` | No | Empty for MailHog | Store credentials only in the backend environment. |
| `SMTP_FROM_EMAIL` | No | `no-reply@gengedge.local` | Use a verified sender address. |
| `SMTP_USE_TLS` | No | `false` | Usually `true` for hosted SMTP. |

Never expose `DATABASE_URL`, `SECRET_KEY`, `SMTP_PASSWORD`, or provider API keys through `VITE_*` variables. Vite variables are bundled into browser JavaScript.

## Authentication Lifecycle

### Registration

`POST /api/auth/register` creates a bcrypt-hashed password, creates an authenticated JWT response, and creates a 24-hour email-verification token. When SMTP is configured, the verification link is sent to the registered address.

### Login

`POST /api/auth/login` validates the email and password and returns a bearer token. The current frontend stores that token in local storage for the existing local-first workflow. A future hardening step may move the session to secure, HttpOnly cookies if the deployment model requires it.

### Password reset

1. Submit an email to `POST /api/auth/forgot-password`.
2. The response is intentionally generic so account existence is not disclosed.
3. A short-lived, hashed, one-time token is created for an active matching account.
4. SMTP sends a link to `/reset-password?token=...`.
5. `POST /api/auth/reset-password` replaces the password and marks the token used.

For local development without SMTP or Docker, the development environment returns the one-time reset link directly in the Forgot Password screen. This fallback is disabled whenever `ENVIRONMENT=production`.

### Email verification

Verification links use `/verify-email?token=...`. The token is stored only as a SHA-256 hash, expires after 24 hours, and cannot be reused.

### Account management

- `POST /api/users/me/change-password` requires the current password.
- `DELETE /api/users/me` permanently removes the user, trades, accounts, notifications, and lifecycle tokens.
- A deleted user's old bearer token cannot load `/api/auth/me` because the user record no longer exists.

## Project Structure

```text
.
├── backend/
│   ├── app/
│   │   ├── core/              Settings and security helpers
│   │   ├── database/          SQLAlchemy engine and sessions
│   │   ├── models/            User, account, trade, token, notification models
│   │   ├── routes/            FastAPI route modules
│   │   ├── schemas/           Pydantic request and response contracts
│   │   └── services/          Metrics, analytics, email, and account rules
│   ├── migrations/            Alembic environment and revisions
│   ├── tests/                 Backend regression tests
│   ├── alembic.ini
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── public/                Robots, sitemap, and static assets
│   ├── src/
│   │   ├── components/        Auth, public site, and tools components
│   │   ├── services/          API client and typed contracts
│   │   ├── App.tsx            Private workspace and route entry
│   │   └── styles.css
│   ├── package.json
│   ├── vercel.json
│   └── vite.config.ts
├── backups/
├── docker-compose.yml
├── render.yaml
├── START_GENG_EDGE.bat
└── README.md
```

## Daily Development Commands

Start the complete local application:

```powershell
.\START_GENG_EDGE.bat
```

Run the backend manually:

```powershell
cd backend
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Run the frontend manually:

```powershell
cd frontend
npm install
npm run dev -- --host 127.0.0.1
```

Run quality checks:

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest -q

cd ..\frontend
npm run build
```

## Local Email Troubleshooting

The default local SMTP configuration expects MailHog at `localhost:1025`.

With Docker Desktop installed:

```powershell
docker compose up -d mailhog
```

Open the inbox at `http://localhost:8025`.

Without Docker, use the development reset-link fallback shown in the Forgot Password screen. A real inbox requires a real SMTP provider and valid `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_FROM_EMAIL`, and `SMTP_USE_TLS` values.

If reset requests return a generic success message but no message arrives, check:

1. The SMTP host and port are reachable from the backend machine.
2. The sender address is accepted by the SMTP provider.
3. TLS mode matches the provider's requirements.
4. The backend process was restarted after changing `.env`.
5. Render logs for `Unable to send GenG Edge email`.

## Production Deployment Runbook

### 1. PostgreSQL

Create a managed PostgreSQL database. Copy its private connection string into Render as `DATABASE_URL`. Do not use the local SQLite path in production.

### 2. Render backend

Create a web service from the repository with:

```text
Root directory: backend
Build command: pip install -r requirements.txt
Start command: alembic upgrade head; uvicorn app.main:app --host 0.0.0.0 --port $PORT
Health check: /health
```

Set the production environment variables listed above. Render supplies `$PORT`; the application must not replace it with a fixed production port.

### 3. Vercel frontend

Create a Vercel project with:

```text
Root directory: frontend
Build command: npm run build
Output directory: dist
Environment variable: VITE_API_URL=https://geng-edge-backend.onrender.com
```

The included `vercel.json` rewrites client-side routes to `index.html` while leaving `/robots.txt`, `/sitemap.xml`, and static assets directly accessible.

### 4. Domains and DNS

Add `gengedge.com` to Vercel and `api.gengedge.com` to Render. Copy the exact DNS records shown by each provider into the DNS provider that controls the domain. Provider targets can differ by account and must not be guessed from this README.

After DNS propagates, verify:

```text
https://gengedgetradingjournal.netlify.app
https://geng-edge-backend.onrender.com/health
https://gengedgetradingjournal.netlify.app/robots.txt
https://gengedgetradingjournal.netlify.app/sitemap.xml
```

### 5. Search Console

1. Create a Google Search Console domain or URL-prefix property for `https://gengedgetradingjournal.netlify.app`.
2. Complete ownership verification.
3. Submit `https://gengedgetradingjournal.netlify.app/sitemap.xml`.
4. Inspect the homepage, Features page, About page, and public tool pages.
5. Request indexing for important public pages when appropriate.

Sitemap submission does not guarantee indexing or ranking.

## Current Scope and Future Work

Implemented in the current codebase:

- Multi-user HttpOnly cookie sessions with backward-compatible bearer authentication.
- Backend ownership checks for account and trade data.
- SQLite development and PostgreSQL production support.
- Alembic migrations.
- Password reset and email verification token flows.
- Password change and permanent account deletion.
- Public SEO pages, canonical metadata, robots, and sitemap.
- Position sizing and market-hours utilities.
- Local development reset-link fallback when SMTP is unavailable.

Recommended next production hardening steps:

- Add an external rate limiter for authentication and password-reset endpoints.
- Move browser sessions to secure HttpOnly cookies if the deployment threat model requires it.
- Add a managed transactional email provider and verified sender domain.
- Add browser-level end-to-end tests for the public routes and reset flow.
- Add structured JSON logging, error monitoring, and tested PostgreSQL restore procedures.
- Review dependency updates and run a security scan before each production release.

## License

Add the license you want to use before publishing the repository. No license is implied by this README.


## Final engineering pass

The release includes browser-history workspace routing, keyboard navigation, mobile filter disclosure, a reusable risk control center, trade detail drawer, centralized frontend error boundary, and local-time-safe trade editing. The release archive intentionally excludes dependency/install artifacts; run `npm ci` and `pip install -r backend/requirements.txt` in CI/deployment.
