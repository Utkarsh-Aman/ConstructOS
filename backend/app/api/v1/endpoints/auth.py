"""Auth endpoints: login, register, OTP (workers), refresh."""
import uuid
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.config import get_settings
from app.core.security import hash_password, verify_password, create_access_token
from app.db.supabase_client import supabase_admin

router = APIRouter()
settings = get_settings()


class LoginRequest(BaseModel):
    email: str
    password: str
    role: str  # 'company_admin' | 'site_manager' | 'vendor'


class RegisterRequest(BaseModel):
    name: str
    email: str
    phone: str
    password: str
    role: str


@router.post("/login")
async def login(body: LoginRequest):
    user_result = supabase_admin.table("users") \
        .select("*") \
        .eq("email", body.email) \
        .eq("role", body.role) \
        .eq("status", "active") \
        .single() \
        .execute()

    if not user_result.data:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    user = user_result.data
    # Verify password against Supabase Auth (or our own hash)
    auth_result = supabase_admin.auth.sign_in_with_password({
        "email": body.email,
        "password": body.password,
    })
    if not auth_result.user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = create_access_token(
        {"sub": user["id"], "role": user["role"]},
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
    )
    return {"access_token": token, "token_type": "bearer", "user": {
        "id": user["id"], "name": user["name"], "role": user["role"], "email": user["email"],
    }}


# Trigger uvicorn reload
@router.post("/register")
async def register(body: RegisterRequest):
    try:
        # Create Supabase Auth user
        auth_result = supabase_admin.auth.admin.create_user({
            "email": body.email,
            "password": body.password,
            "email_confirm": True,
        })
        if not auth_result.user:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Registration failed")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Registration failed: {str(e)}")

    user_id = str(uuid.uuid4())
    supabase_admin.table("users").insert({
        "id": user_id,
        "auth_id": auth_result.user.id,
        "name": body.name,
        "email": body.email,
        "phone": body.phone,
        "role": body.role,
        "status": "active",
    }).execute()

    if body.role == "company_admin":
        company_id = str(uuid.uuid4())
        supabase_admin.table("companies").insert({
            "id": company_id,
            "name": f"{body.name}'s Company",
            "owner_user_id": user_id,
        }).execute()

    token = create_access_token({"sub": user_id, "role": body.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "name": body.name,
            "role": body.role,
            "email": body.email,
        }
    }
