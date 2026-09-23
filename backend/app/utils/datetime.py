"""Datetime helper utilities."""
from datetime import datetime, timezone, timedelta


def now_utc() -> datetime:
    """Get current UTC time."""
    return datetime.now(timezone.utc)


def seconds_ago(seconds: int) -> datetime:
    """Get a datetime that is N seconds in the past."""
    return now_utc() - timedelta(seconds=seconds)


def minutes_ago(minutes: int) -> datetime:
    """Get a datetime that is N minutes in the past."""
    return now_utc() - timedelta(minutes=minutes)
