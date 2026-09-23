"""Development launcher.

On Windows, the psycopg async driver and several async libraries cannot run on
the default ProactorEventLoop. This launcher sets the selector event-loop policy
BEFORE uvicorn creates its event loop, then starts the API server.

Usage:
    python run.py
"""
import asyncio
import sys

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

import uvicorn

def _uvicorn_kwargs() -> dict:
    """Return uvicorn options, degrading logging when streams are unavailable.

    When started non-interactively (e.g. with redirected stdout/stderr), those
    streams may be None, which makes uvicorn's dictConfig formatter setup crash
    with 'Unable to configure formatter'. Falling back to uvicorn's basic logging
    keeps the server bootable in those contexts.
    """
    kwargs: dict = {
        "host": "0.0.0.0",
        "port": 8000,
        "reload": False,
        "loop": "none",
    }
    if sys.stdout is None or sys.stderr is None:
        kwargs["log_config"] = None
    return kwargs


if __name__ == "__main__":
    uvicorn.run("app.main:app", **_uvicorn_kwargs())
