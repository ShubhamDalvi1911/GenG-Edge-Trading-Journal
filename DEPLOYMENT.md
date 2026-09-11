# GenG Edge deployment guide

## Architecture

- Frontend: React/Vite static SPA. Deploy with Netlify/Vercel or the included production Nginx image (`frontend/Dockerfile.prod`).
- Backend: FastAPI + SQLAlchemy + Alembic. Use PostgreSQL in production.
- Authentication: HttpOnly session cookie is set by the API; bearer tokens remain accepted for backward compatibility with existing API clients.

## Backend environment

Copy `backend/.env.example` to your secret store and set at minimum:

- `DATABASE_URL` — managed PostgreSQL URL.
- `SECRET_KEY` — random value of at least 32 characters.
- `ENVIRONMENT=production`.
- `FRONTEND_URL` — canonical frontend origin.
- `BACKEND_URL` — canonical API origin.
- `CORS_ORIGINS` — comma-separated exact frontend origins.
- SMTP settings if email notifications are enabled.

Do not place database credentials, SMTP passwords, or API keys in frontend variables.

## Database

Run migrations during deployment:

```bash
alembic upgrade head
```

Never rely on application startup to create production tables.

## Backend start

```bash
uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
```

## Frontend build

Set `VITE_API_URL` to the public API origin and run:

```bash
npm ci
npm run build
```

For Nginx/Docker:

```bash
docker build -f Dockerfile.prod --build-arg VITE_API_URL=https://geng-edge-backend.onrender.com -t geng-edge-web .
docker run -p 8080:80 geng-edge-web
```

## Security notes

The API sets the `geng_edge_session` cookie with `HttpOnly`, `SameSite=Lax`, and `Secure` in production. CORS is restricted to explicit origins. Sensitive auth endpoints have process-local throttling; for multi-instance deployments, replace the in-memory limiter with a shared store such as Redis.

The public app should always be served over HTTPS in production. Keep private routes out of the sitemap. Rotate `SECRET_KEY` only with a deliberate session invalidation plan.

## Release checklist

1. Run backend tests in a clean Python environment.
2. Run frontend typecheck and production build in a clean Node environment.
3. Apply Alembic migrations against a backup of production data.
4. Verify `/health` and the frontend `/healthz` endpoint.
5. Test registration, login, logout, password reset, trade CRUD, account isolation, and risk analytics.
6. Verify the canonical domain, CORS, SMTP delivery, robots, sitemap, and HTTPS.
7. Monitor errors and authentication failures after release.
