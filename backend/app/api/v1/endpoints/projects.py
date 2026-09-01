"""
Projects endpoint — get project, manage master plans, worker requirements, material requests.
"""
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel
from typing import Optional
from app.core.security import get_current_user, require_roles
from app.db.supabase_client import supabase_admin
from app.core.config import get_settings

router = APIRouter()
settings = get_settings()


@router.get("/", summary="List all projects for current user")
async def list_all_projects(current_user: dict = Depends(get_current_user)):
    if current_user["role"] == "company_admin":
        company = supabase_admin.table("companies").select("id").eq("owner_user_id", current_user["id"]).execute()
        if not company.data or len(company.data) == 0:
            return []
        company_id = company.data[0]["id"]
        result = supabase_admin.table("projects") \
            .select("*, companies(name)") \
            .eq("company_id", company_id) \
            .order("created_at", desc=True) \
            .execute()
        return result.data or []
    elif current_user["role"] == "site_manager":
        assignments = supabase_admin.table("site_manager_assignments") \
            .select("project_id") \
            .eq("user_id", current_user["id"]) \
            .execute()
        project_ids = [a["project_id"] for a in (assignments.data or [])]
        if not project_ids:
            return []
        
        result = supabase_admin.table("projects") \
            .select("*, companies(name)") \
            .in_("id", project_ids) \
            .order("created_at", desc=True) \
            .execute()
        return result.data or []
    return []


class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    location: Optional[str] = None

@router.post("/", summary="Create a new project")
async def create_project(body: ProjectCreate, current_user: dict = Depends(require_roles("company_admin"))):
    company = supabase_admin.table("companies").select("id").eq("owner_user_id", current_user["id"]).execute()
    if not company.data or len(company.data) == 0:
        raise HTTPException(status_code=400, detail="User does not have an active company. Please create a company first.")
    
    project_id = str(uuid.uuid4())
    result = supabase_admin.table("projects").insert({
        "id": project_id,
        "company_id": company.data[0]["id"],
        "name": body.name,
        "description": body.description,
        "location": body.location,
        "status": "active",
        "created_by": current_user["id"]
    }).execute()
    
    return result.data[0]



@router.get("/{project_id}", summary="Get project details")
async def get_project(project_id: str, current_user: dict = Depends(get_current_user)):
    result = supabase_admin.table("projects").select("*, companies(name)").eq("id", project_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Project not found")
    return result.data


@router.patch("/{project_id}", summary="Update project status")
async def update_project(
    project_id: str,
    status_val: str,
    current_user: dict = Depends(require_roles("company_admin")),
):
    result = supabase_admin.table("projects").update({"status": status_val}).eq("id", project_id).execute()
    return result.data[0]


# ── Master Plans ─────────────────────────────────────────────────────────────

@router.get("/{project_id}/master-plans", summary="List master plans for project")
async def list_master_plans(project_id: str, current_user: dict = Depends(get_current_user)):
    plans = supabase_admin.table("master_plans") \
        .select("*") \
        .eq("project_id", project_id) \
        .execute()
    if not plans.data:
        return []

    plan_ids = [p["id"] for p in plans.data]
    versions = supabase_admin.table("master_plan_versions") \
        .select("*") \
        .in_("master_plan_id", plan_ids) \
        .order("version_number", desc=True) \
        .execute()

    versions_by_plan = {}
    for v in (versions.data or []):
        mp_id = v["master_plan_id"]
        if mp_id not in versions_by_plan:
            versions_by_plan[mp_id] = []
        versions_by_plan[mp_id].append(v)

    res = []
    for p in plans.data:
        res.append({
            **p,
            "master_plan_versions": versions_by_plan.get(p["id"], [])
        })
    return res


@router.post("/{project_id}/master-plans", summary="Upload a new master plan (first version)")
async def upload_master_plan(
    project_id: str,
    file: UploadFile = File(...),
    note: Optional[str] = Form(None),
    current_user: dict = Depends(require_roles("company_admin")),
):
    file_bytes = await file.read()
    if len(file_bytes) > 100 * 1024 * 1024:  # 100 MB limit for master plans
        raise HTTPException(status_code=422, detail="File exceeds 100 MB limit")

    # Upload to Supabase Storage
    master_plan_id = str(uuid.uuid4())
    version_id = str(uuid.uuid4())
    storage_path = f"{project_id}/{master_plan_id}/v1/{file.filename}"

    supabase_admin.storage.from_(settings.master_plans_bucket).upload(
        path=storage_path,
        file=file_bytes,
        file_options={"content-type": file.content_type or "application/octet-stream"},
    )

    # Create master_plan record
    supabase_admin.table("master_plans").insert({
        "id": master_plan_id,
        "project_id": project_id,
        "status": "active",
    }).execute()

    # Create version record
    supabase_admin.table("master_plan_versions").insert({
        "id": version_id,
        "master_plan_id": master_plan_id,
        "version_number": 1,
        "file_url": storage_path,
        "file_type": file.content_type or "application/octet-stream",
        "file_size_bytes": len(file_bytes),
        "uploaded_by": current_user["id"],
        "note": note,
    }).execute()

    # Set current_version_id
    supabase_admin.table("master_plans").update({"current_version_id": version_id}).eq("id", master_plan_id).execute()

    # Audit log
    supabase_admin.table("audit_logs").insert({
        "actor_user_id": current_user["id"],
        "entity_type": "master_plan",
        "entity_id": master_plan_id,
        "action": "upload_v1",
    }).execute()

    return {"master_plan_id": master_plan_id, "version_id": version_id, "version_number": 1}


# ── Worker Requirements ───────────────────────────────────────────────────────

class WorkerRequirementCreate(BaseModel):
    work_type: str
    trade: str
    headcount: int
    date: str
    duration: Optional[str] = None
    working_hours: Optional[str] = None
    location: str
    pay: float
    pay_basis: str = "per_day"
    description: Optional[str] = None
    required_skills: list[str] = []
    deadline: Optional[str] = None
    urgent_flag: bool = False


@router.get("/{project_id}/worker-requirements", summary="List worker requirements for project")
async def list_worker_requirements(project_id: str, current_user: dict = Depends(get_current_user)):
    result = supabase_admin.table("worker_requirements") \
        .select("*") \
        .eq("project_id", project_id) \
        .order("created_at", desc=True) \
        .execute()
    return result.data or []


@router.post("/{project_id}/worker-requirements", summary="Create a worker requirement")
async def create_worker_requirement(
    project_id: str,
    body: WorkerRequirementCreate,
    current_user: dict = Depends(require_roles("site_manager", "company_admin")),
):
    req_id = str(uuid.uuid4())
    data = body.model_dump(exclude_none=True)
    if "deadline" in data and not data["deadline"]:
        del data["deadline"]
    result = supabase_admin.table("worker_requirements").insert({
        "id": req_id,
        "project_id": project_id,
        "site_manager_id": current_user["id"],
        **data,
    }).execute()
    return result.data[0]


# ── Material Requests ─────────────────────────────────────────────────────────

class MaterialRequestCreate(BaseModel):
    material: str
    quantity: float
    unit: str
    required_by_date: str
    priority: str = "medium"
    remarks: Optional[str] = None


@router.get("/{project_id}/material-requests", summary="List material requests for project")
async def list_material_requests(project_id: str, current_user: dict = Depends(get_current_user)):
    result = supabase_admin.table("material_requests") \
        .select("*") \
        .eq("project_id", project_id) \
        .order("created_at", desc=True) \
        .execute()
    return result.data or []


@router.post("/{project_id}/material-requests", summary="Create a material request")
async def create_material_request(
    project_id: str,
    body: MaterialRequestCreate,
    current_user: dict = Depends(require_roles("site_manager", "company_admin")),
):
    req_id = str(uuid.uuid4())
    data = body.model_dump(exclude_none=True)
    result = supabase_admin.table("material_requests").insert({
        "id": req_id,
        "project_id": project_id,
        "site_manager_id": current_user["id"],
        "status": "draft",
        **data,
    }).execute()
    return result.data[0]


# ── Site Manager Assignments ──────────────────────────────────────────────────

class SiteManagerAssign(BaseModel):
    email: str

@router.get("/{project_id}/site-managers", summary="List assigned site managers for project")
async def list_assigned_site_managers(
    project_id: str,
    current_user: dict = Depends(get_current_user),
):
    assignments = supabase_admin.table("site_manager_assignments") \
        .select("id, user_id, assigned_at, users(id, name, email, phone)") \
        .eq("project_id", project_id) \
        .execute()
    return [
        {
            "assignment_id": a["id"],
            "assigned_at": a["assigned_at"],
            **(a.get("users") or {"id": a["user_id"], "name": "Site Manager", "email": "", "phone": ""})
        }
        for a in (assignments.data or [])
    ]


@router.post("/{project_id}/site-managers", summary="Assign a site manager to a project by email")
async def assign_site_manager(
    project_id: str,
    body: SiteManagerAssign,
    current_user: dict = Depends(require_roles("company_admin")),
):
    user = supabase_admin.table("users").select("id, role").eq("email", body.email).execute()
    if not user.data or len(user.data) == 0:
        raise HTTPException(status_code=404, detail="User with this email not found")
    
    if user.data[0]["role"] != "site_manager":
        raise HTTPException(status_code=400, detail="User is not a site manager")
        
    assignment_id = str(uuid.uuid4())
    supabase_admin.table("site_manager_assignments").insert({
        "id": assignment_id,
        "project_id": project_id,
        "user_id": user.data[0]["id"]
    }).execute()
    
    return {"status": "success", "assignment_id": assignment_id}


@router.delete("/{project_id}/site-managers/{user_id}", summary="Remove a site manager assignment from a project")
async def remove_site_manager(
    project_id: str,
    user_id: str,
    current_user: dict = Depends(require_roles("company_admin")),
):
    supabase_admin.table("site_manager_assignments") \
        .delete() \
        .eq("project_id", project_id) \
        .eq("user_id", user_id) \
        .execute()
    return {"status": "success", "message": "Site manager assignment removed"}
