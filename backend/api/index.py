"""Vercel entrypoint for FastAPI app."""

try:
    from backend.core import app
except Exception:  # pragma: no cover - fallback for local direct run
    from core import app  # type: ignore

