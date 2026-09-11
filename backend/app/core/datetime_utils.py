from __future__ import annotations

from datetime import datetime, timezone


def ensure_utc(value: datetime) -> datetime:
    """Return an aware UTC datetime without relying on server local timezone."""
    if value.tzinfo is None:
        # Legacy/naive input is treated as UTC for backwards compatibility.
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)
