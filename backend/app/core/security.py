from datetime import datetime, timedelta
from typing import Optional
import secrets
import hashlib

from fastapi import Depends, HTTPException, Security, Cookie, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import get_settings
from app.db.supabase_client import supabase_admin

settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer(auto_error=False)

# ── Password helpers ─────────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

# ── JWT helpers ──────────────────────────────────────────────────────────────

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.access_token_expire_minutes))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)

def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(bearer_scheme),
):
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    payload = decode_access_token(credentials.credentials)
    user_id: str = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
    # Fetch user from DB
    try:
        result = supabase_admin.table("users").select("*").eq("id", user_id).execute()
        if not result.data or len(result.data) == 0:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
        return result.data[0]
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token or user not found")

def require_roles(*roles: str):
    """Dependency factory that enforces one or more allowed roles."""
    async def role_checker(current_user: dict = Depends(get_current_user)):
        if current_user["role"] not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return current_user
    return role_checker

# ── Anonymous session helpers ────────────────────────────────────────────────

def generate_session_token() -> tuple[str, str]:
    """Returns (raw_token, hashed_token). Store the hash; send the raw to client."""
    raw = secrets.token_urlsafe(32)
    hashed = hashlib.sha256(raw.encode()).hexdigest()
    return raw, hashed

def hash_session_token(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()

async def get_anonymous_session(
    request: Request,
    construct_session: Optional[str] = Cookie(default=None),
):
    """
    Validate the anonymous session cookie.
    Returns the session row from DB, or raises 401.
    On 404-style not-found, raises 404 (§5.6 — avoids confirming existence of other sessions).
    """
    token = construct_session
    if not token:
        # Check Authorization header fallback
        auth_header = request.headers.get("X-Session-Token")
        token = auth_header

    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No session token provided")

    token_hash = hash_session_token(token)
    result = supabase_admin.table("anonymous_sessions") \
        .select("*") \
        .eq("session_token", token_hash) \
        .gt("expires_at", datetime.utcnow().isoformat()) \
        .single() \
        .execute()

    if not result.data:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired session")

    # Touch last_active_at
    supabase_admin.table("anonymous_sessions") \
        .update({"last_active_at": datetime.utcnow().isoformat()}) \
        .eq("id", result.data["id"]) \
        .execute()

    return result.data

# ── Driver secure link ───────────────────────────────────────────────────────

async def get_driver_delivery_from_token(link_token: str):
    """Validate a single-use driver link token."""
    token_hash = hashlib.sha256(link_token.encode()).hexdigest()
    result = supabase_admin.table("driver_delivery_assignments") \
        .select("*, deliveries(*), drivers(*)") \
        .eq("secure_link_token_hash", token_hash) \
        .gt("link_expires_at", datetime.utcnow().isoformat()) \
        .single() \
        .execute()
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid or expired driver link")
    return result.data
