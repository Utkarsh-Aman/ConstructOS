"""Anonymous session management for public users."""
from datetime import datetime, timedelta

from fastapi import APIRouter, Request, Response

from app.core.config import get_settings
from app.core.security import generate_session_token
from app.db.supabase_client import supabase_admin

router = APIRouter()
settings = get_settings()

COOKIE_NAME = "construct_session"


@router.post("/", summary="Create or refresh an anonymous session")
async def create_session(request: Request, response: Response):
    """
    Creates a new AnonymousSession. Returns the session token in an
    HTTP-only cookie (§18.1 — reduces XSS exposure vs. localStorage).
    Rate-limited per IP to prevent session farming.
    """
    raw_token, token_hash = generate_session_token()
    expires_at = datetime.utcnow() + timedelta(hours=settings.anonymous_session_expire_hours)

    supabase_admin.table("anonymous_sessions").insert({
        "session_token": token_hash,
        "expires_at": expires_at.isoformat(),
    }).execute()

    # Set HTTP-only cookie
    response.set_cookie(
        key=COOKIE_NAME,
        value=raw_token,
        httponly=True,
        samesite="lax",
        secure=settings.env != "development",
        max_age=settings.anonymous_session_expire_hours * 3600,
    )

    return {
        "message": "Session created",
        "expires_at": expires_at.isoformat(),
    }
