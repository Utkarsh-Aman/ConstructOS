"""
Companies endpoint — Company Admin only.
"""
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from app.core.security import get_current_user, require_roles
from app.db.supabase_client import supabase_admin

router = APIRouter()


class CreateCompanyRequest(BaseModel):
    name: str


class CreateProjectRequest(BaseModel):
    name: str


@router.post("/", summary="Create a company (Company Admin)")
async def create_company(
    body: CreateCompanyRequest,
    current_user: dict = Depends(require_roles("company_admin")),
):
    company_id = str(uuid.uuid4())
    result = supabase_admin.table("companies").insert({
        "id": company_id,
        "name": body.name,
        "owner_user_id": current_user["id"],
    }).execute()
    return result.data[0]


@router.get("/{company_id}", summary="Get company details")
async def get_company(
    company_id: str,
    current_user: dict = Depends(get_current_user),
):
    result = supabase_admin.table("companies").select("*").eq("id", company_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Company not found")
    return result.data


@router.get("/{company_id}/projects", summary="List projects for a company")
async def list_projects(
    company_id: str,
    current_user: dict = Depends(get_current_user),
):
    result = supabase_admin.table("projects") \
        .select("*") \
        .eq("company_id", company_id) \
        .is_("deleted_at", "null") \
        .order("created_at", desc=True) \
        .execute()
    return result.data or []


@router.post("/{company_id}/projects", summary="Create a project")
async def create_project(
    company_id: str,
    body: CreateProjectRequest,
    current_user: dict = Depends(require_roles("company_admin")),
):
    project_id = str(uuid.uuid4())
    result = supabase_admin.table("projects").insert({
        "id": project_id,
        "company_id": company_id,
        "name": body.name,
        "created_by": current_user["id"],
        "status": "active",
    }).execute()
    return result.data[0]
