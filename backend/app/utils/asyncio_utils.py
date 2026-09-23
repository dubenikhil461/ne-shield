"""Async utilities for Windows.

The psycopg async driver cannot run on the Windows ProactorEventLoop.
These helpers set the selector event-loop policy on Windows so async
database operations work in scripts and ad-hoc tooling.
"""
import asyncio
import sys
from typing import Callable, TypeVar

T = TypeVar("T")


def _ensure_policy() -> None:
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())


def run_async(coro: Callable[[], T]) -> T:
    """Run an async coroutine, selecting a compatible loop on Windows."""
    _ensure_policy()
    return asyncio.run(coro())
