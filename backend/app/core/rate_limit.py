from __future__ import annotations

from collections import defaultdict, deque
from threading import Lock
from time import monotonic

from fastapi import HTTPException, Request, status


class FixedWindowRateLimiter:
    """Small process-local limiter for sensitive auth endpoints.

    This is intentionally dependency-free for this deployment. Multi-instance
    deployments should replace it with a shared store (Redis, etc.).
    """

    def __init__(self, limit: int, window_seconds: int) -> None:
        self.limit = limit
        self.window_seconds = window_seconds
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def check(self, key: str) -> None:
        now = monotonic()
        cutoff = now - self.window_seconds
        with self._lock:
            bucket = self._hits[key]
            while bucket and bucket[0] < cutoff:
                bucket.popleft()
            if len(bucket) >= self.limit:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many attempts. Please try again later.",
                    headers={"Retry-After": str(self.window_seconds)},
                )
            bucket.append(now)


auth_limiter = FixedWindowRateLimiter(limit=8, window_seconds=60)
password_reset_limiter = FixedWindowRateLimiter(limit=5, window_seconds=300)


def client_key(request: Request, suffix: str = "") -> str:
    host = request.client.host if request.client else "unknown"
    return f"{suffix}:{host}"
