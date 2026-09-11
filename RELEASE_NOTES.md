# GenG Edge production hardening release

This release keeps the existing product and trading calculations while applying a production-hardening pass.

## Implemented

- Centralized FastAPI authentication dependency with active-user validation.
- HttpOnly `geng_edge_session` cookie issued on registration/login; legacy bearer authentication remains supported.
- Explicit logout endpoint that clears the session cookie.
- Rate limiting for registration, login, forgot-password, and reset-password endpoints.
- Removed the broad ValueError-to-401 exception behavior.
- Explicit UTC-aware JWT timestamps and trade timestamp normalization.
- Shared trade datetime normalization on create and update.
- Security headers on API responses.
- Restricted CORS methods/headers.
- Added frontend error boundary.
- Removed frontend persistence of the auth token in localStorage; the session cookie is the primary persisted session mechanism.
- Added `credentials: include` to frontend API requests.
- Renamed the deterministic journal review UI to `Performance Review` so it does not imply an LLM is being used.
- Profit/P&L positive states now use semantic green instead of the primary brand blue.
- Added accessible focus-visible treatment and reduced-motion handling.
- Added production Nginx Docker image and config for the frontend.
- Added frontend/backend Docker ignore files.
- Added frontend environment example.
- Added deployment guide and production release checklist.
- Added cookie-session test coverage and kept bearer compatibility coverage.
- Added frontend `typecheck` and `check` scripts.

## Verification performed in this build environment

- Python application and test modules compile successfully with `python -m compileall`.
- Frontend TypeScript/JSX source syntax was re-parsed successfully with the available TypeScript compiler API after the final changes. A full `tsc -b` could not be rerun after packaging because dependencies are intentionally absent from the clean release ZIP.
- A Vite production bundle could not be executed from the uploaded ZIP because its copied `node_modules` contains Windows `esbuild` binaries while this environment is Linux. Run `npm ci` on the deployment/CI platform before `npm run build`.
- Full backend pytest execution could not be completed in this environment because the active runtime does not have the pinned `python-jose` and `passlib` packages and outbound package installation is unavailable.

## Important deployment note

The generated release ZIP intentionally excludes secrets, local databases, `.venv`, `node_modules`, build output, caches, and `.git`. Configure production secrets through the deployment provider.


## Final UX/architecture pass
- Added URL-backed workspace navigation with browser back/forward support.
- Added a reusable Risk Control Center with semantic SAFE/WARNING/CRITICAL/BREACHED presentation.
- Added fast trade inspection via a detail drawer.
- Added mobile filter disclosure and keyboard shortcuts.
- Added a top-level React error boundary and removed duplicate legacy profile markup.
- Corrected local trade-edit date/time presentation so browser-local wall time is preserved while API submission remains UTC.
