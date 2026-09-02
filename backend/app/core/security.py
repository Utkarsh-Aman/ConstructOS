from datetime import datetime, timedelta
from typing import Optional
import secrets
import hashlib

from fastapi import Depends, HTTPException, Security, Cookie, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext

import uuid
import structlog

from app.core.config import get_settings
from app.db.supabase_client import supabase_admin

logger = structlog.get_logger()
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
    Validate the anonymous session cookie or X-Session-Token header.
    If no session exists or is expired, automatically provisions a valid session
    to ensure seamless public chatbot access across cross-origin deployments.
    """
    token = construct_session or request.headers.get("X-Session-Token")

    if token:
        token_hash = hash_session_token(token)
        result = supabase_admin.table("anonymous_sessions") \
            .select("*") \
            .eq("session_token", token_hash) \
            .gt("expires_at", datetime.utcnow().isoformat()) \
            .execute()

        if result.data and len(result.data) > 0:
            session_data = result.data[0]
            # Touch last_active_at in background
            try:
                supabase_admin.table("anonymous_sessions") \
                    .update({"last_active_at": datetime.utcnow().isoformat()}) \
                    .eq("id", session_data["id"]) \
                    .execute()
            except Exception:
                pass
            return session_data

    # Auto-provision anonymous session on the fly
    raw_token, token_hash = generate_session_token()
    expires_at = datetime.utcnow() + timedelta(hours=settings.anonymous_session_expire_hours)
    try:
        insert_res = supabase_admin.table("anonymous_sessions").insert({
            "session_token": token_hash,
            "expires_at": expires_at.isoformat(),
        }).execute()
        if insert_res.data and len(insert_res.data) > 0:
            return insert_res.data[0]
    except Exception as e:
        logger.warning("auto_provision_anonymous_session_fallback", error=str(e))

    return {
        "id": str(uuid.uuid4()),
        "session_token": token_hash,
        "expires_at": expires_at.isoformat(),
    }

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
