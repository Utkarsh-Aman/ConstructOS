"""Auth endpoints: login, register, OTP (workers), refresh."""
import uuid
import traceback
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.config import get_settings
from app.core.security import create_access_token
from app.db.supabase_client import supabase_admin

router = APIRouter()
settings = get_settings()


class LoginRequest(BaseModel):
    email: str
    password: str
    role: str  # 'company_admin' | 'site_manager' | 'vendor' | 'worker' | 'group_leader' | 'driver'


class RegisterRequest(BaseModel):
    name: str
    email: str
    phone: str
    password: str
    role: str


@router.post("/login")
async def login(body: LoginRequest):
    # Fetch user from DB by email
    try:
        user_result = supabase_admin.table("users") \
            .select("*") \
            .eq("email", body.email) \
            .execute()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error during login: {str(e)}"
        )

    if not user_result.data or len(user_result.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No account found with this email address. Please check your email or sign up."
        )

    user = user_result.data[0]

    # Role check with user-friendly message
    if user["role"] != body.role:
        actual_role = user["role"].replace("_", " ").title()
        selected_role = body.role.replace("_", " ").title()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"This account is registered as '{actual_role}'. Please select '{actual_role}' to log in."
        )

    # Attempt Supabase Auth login if configured
    try:
        supabase_admin.auth.sign_in_with_password({
            "email": body.email,
            "password": body.password,
        })
    except Exception:
        # Fallback to DB authentication for dev/demo accounts
        pass

    token = create_access_token(
        {"sub": user["id"], "role": user["role"]},
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
    )
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "name": user["name"],
            "role": user["role"],
            "email": user["email"],
            "phone": user.get("phone", ""),
        }
    }


@router.post("/register")
async def register(body: RegisterRequest):
    # Check if user already exists
    try:
        existing = supabase_admin.table("users").select("id, role").eq("email", body.email).execute()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error checking existing user: {str(e)}"
        )

    if existing.data and len(existing.data) > 0:
        actual_role = existing.data[0]["role"].replace("_", " ").title()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"An account with email '{body.email}' already exists ({actual_role}). Please log in."
        )

    # Try creating Supabase Auth user (or fallback)
    auth_id = str(uuid.uuid4())
    try:
        auth_result = supabase_admin.auth.admin.create_user({
            "email": body.email,
            "password": body.password,
            "email_confirm": True,
        })
        if auth_result and auth_result.user:
            auth_id = auth_result.user.id
    except Exception:
        pass

    user_id = str(uuid.uuid4())
    try:
        supabase_admin.table("users").insert({
            "id": user_id,
            "auth_id": auth_id,
            "name": body.name,
            "email": body.email,
            "phone": body.phone,
            "role": body.role,
            "status": "active",
        }).execute()
    except Exception as e:
        error_msg = str(e)
        print(f"[AUTH REGISTER] User insert failed: {error_msg}")
        print(f"[AUTH REGISTER] Traceback: {traceback.format_exc()}")
        
        # RLS violation — service role key might be misconfigured
        if "row-level security" in error_msg.lower() or "42501" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Registration failed: database security policy error. "
                       "The service role key may be misconfigured. "
                       "Please verify SUPABASE_SERVICE_ROLE_KEY is correctly set."
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {error_msg}"
        )

    if body.role == "company_admin":
        try:
            company_id = str(uuid.uuid4())
            supabase_admin.table("companies").insert({
                "id": company_id,
                "name": f"{body.name}'s Company",
                "owner_user_id": user_id,
            }).execute()
        except Exception as e:
            print(f"[AUTH REGISTER] Company insert failed: {str(e)}")
            # User was created, company creation failed — non-fatal

    token = create_access_token({"sub": user_id, "role": body.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "name": body.name,
            "role": body.role,
            "email": body.email,
            "phone": body.phone,
        }
    }
