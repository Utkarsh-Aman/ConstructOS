"""
Worker requirements — responses (individual + group), status transitions.
"""
import uuid
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.core.security import get_current_user, require_roles
from app.db.supabase_client import supabase_admin

router = APIRouter()


class WorkerResponseCreate(BaseModel):
    type: str = "individual"          # "individual" | "group"
    group_id: Optional[str] = None
    committed_count: Optional[int] = None
@router.get("/", summary="List all worker requirements for current user")
async def list_all_requirements(current_user: dict = Depends(get_current_user)):
    role = current_user["role"]
    if role == "company_admin":
        company = supabase_admin.table("companies").select("id").eq("owner_user_id", current_user["id"]).execute()
        if not company.data or len(company.data) == 0:
            return []
        # Find projects for company
        projects = supabase_admin.table("projects").select("id").eq("company_id", company.data[0]["id"]).execute()
        project_ids = [p["id"] for p in (projects.data or [])]
        if not project_ids:
            return []
        
        result = supabase_admin.table("worker_requirements") \
            .select("*, projects(name)") \
            .in_("project_id", project_ids) \
            .is_("deleted_at", "null") \
            .order("created_at", desc=True) \
            .execute()
        return result.data or []
    elif role == "site_manager":
        assignments = supabase_admin.table("site_manager_assignments").select("project_id").eq("user_id", current_user["id"]).execute()
        project_ids = [a["project_id"] for a in (assignments.data or [])]
        if not project_ids:
            return []
        
        result = supabase_admin.table("worker_requirements") \
            .select("*, projects(name)") \
            .in_("project_id", project_ids) \
            .is_("deleted_at", "null") \
            .order("created_at", desc=True) \
            .execute()
        return result.data or []
    elif role in ["worker", "group_leader"]:
        # Workers see open requirements
        result = supabase_admin.table("worker_requirements") \
            .select("*, projects(name)") \
            .in_("status", ["open", "partially_filled"]) \
            .is_("deleted_at", "null") \
            .order("created_at", desc=True) \
            .execute()
        return result.data or []
    
    
    return []


@router.get("/my-work", summary="List work assigned to current worker or group")
async def list_my_work(current_user: dict = Depends(require_roles("worker", "group_leader"))):
    if current_user["role"] == "worker":
        # Get assignments for this worker
        assignments = supabase_admin.table("work_assignments") \
            .select("requirement_id") \
            .eq("worker_user_id", current_user["id"]) \
            .execute()
        req_ids = [a["requirement_id"] for a in (assignments.data or [])]
    else:
        # Get responses for this group leader
        responses = supabase_admin.table("worker_responses") \
            .select("requirement_id") \
            .eq("worker_user_id", current_user["id"]) \
            .eq("type", "group") \
            .execute()
        req_ids = [r["requirement_id"] for r in (responses.data or [])]
    
    if not req_ids:
        return []
        
    result = supabase_admin.table("worker_requirements") \
        .select("*, projects(name)") \
        .in_("id", req_ids) \
        .is_("deleted_at", "null") \
        .order("created_at", desc=True) \
        .execute()
    return result.data or []
@router.get("/{req_id}", summary="Get worker requirement details + responses")
async def get_requirement(req_id: str, current_user: dict = Depends(get_current_user)):
    req = supabase_admin.table("worker_requirements").select("*").eq("id", req_id).single().execute()
    if not req.data:
        raise HTTPException(status_code=404, detail="Requirement not found")

    responses = supabase_admin.table("worker_responses") \
        .select("*, users(name, phone)") \
        .eq("requirement_id", req_id) \
        .execute()

    accepted_count = sum(
        (r.get("committed_count") or 1)
        for r in (responses.data or [])
        if r["status"] == "accepted"
    )
    return {
        **req.data,
        "responses": responses.data or [],
        "accepted_count": accepted_count,
        "remaining": max(0, req.data["headcount"] - accepted_count),
    }


@router.post("/{req_id}/responses", summary="Worker/Group Leader responds to a requirement")
async def create_response(
    req_id: str,
    body: WorkerResponseCreate,
    current_user: dict = Depends(require_roles("worker", "group_leader")),
):
    # Validate group leader for group responses
    if body.type == "group":
        if current_user["role"] != "group_leader":
            raise HTTPException(status_code=403, detail="Only group leaders can submit group responses")
        
        if not body.committed_count or body.committed_count <= 0:
            body.committed_count = 1

        # Auto-find or create worker_group for this group leader
        g_res = supabase_admin.table("worker_groups").select("id").eq("leader_user_id", current_user["id"]).execute()
        if not g_res.data:
            g_id = str(uuid.uuid4())
            supabase_admin.table("worker_groups").insert({
                "id": g_id,
                "leader_user_id": current_user["id"],
                "name": f"{current_user.get('name', 'Leader')}'s Squad"
            }).execute()
            body.group_id = g_id
        else:
            body.group_id = g_res.data[0]["id"]

    # Check requirement is still open
    req = supabase_admin.table("worker_requirements").select("status, headcount").eq("id", req_id).single().execute()
    if not req.data or req.data["status"] not in ("open", "partially_filled"):
        raise HTTPException(status_code=409, detail="Requirement is not accepting responses")

    resp_id = str(uuid.uuid4())
    supabase_admin.table("worker_responses").insert({
        "id": resp_id,
        "requirement_id": req_id,
        "worker_user_id": current_user["id"],
        "type": body.type,
        "group_id": body.group_id,
        "committed_count": body.committed_count,
        "status": "accepted" if body.type == "individual" else "pending",
    }).execute()

    # If individual acceptance, create assignment and update requirement status
    if body.type == "individual":
        supabase_admin.table("work_assignments").insert({
            "id": str(uuid.uuid4()),
            "requirement_id": req_id,
            "worker_user_id": current_user["id"],
            "status": "assigned",
        }).execute()
        _update_requirement_fill_status(req_id)

    # Notify site manager
    _notify_site_manager(req_id, current_user, body)

    return {"response_id": resp_id, "status": "accepted" if body.type == "individual" else "pending"}


def _update_requirement_fill_status(req_id: str):
    """Recompute and update the requirement status based on total accepted count."""
    req = supabase_admin.table("worker_requirements").select("headcount").eq("id", req_id).single().execute()
    if not req.data:
        return

    responses = supabase_admin.table("worker_responses") \
        .select("committed_count, type") \
        .eq("requirement_id", req_id) \
        .eq("status", "accepted") \
        .execute()

    accepted = sum((r.get("committed_count") or 1) for r in (responses.data or []))
    headcount = req.data["headcount"]

    if accepted >= headcount:
        new_status = "filled"
    elif accepted > 0:
        new_status = "partially_filled"
    else:
        new_status = "open"

    supabase_admin.table("worker_requirements").update({"status": new_status}).eq("id", req_id).execute()


def _notify_site_manager(req_id: str, worker: dict, body: WorkerResponseCreate):
    req = supabase_admin.table("worker_requirements") \
        .select("site_manager_id") \
        .eq("id", req_id) \
        .single() \
        .execute()
    if not req.data:
        return
    supabase_admin.table("notifications").insert({
        "user_id": req.data["site_manager_id"],
        "type": "worker_response_received",
        "payload_json": {
            "requirement_id": req_id,
            "worker_name": worker.get("name"),
            "type": body.type,
            "committed_count": body.committed_count,
        },
    }).execute()
