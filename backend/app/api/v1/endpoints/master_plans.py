"""
Master Plans endpoint — versioning, signed download URLs, audit logging.
No AI ever touches this pipeline (§2.1).
"""
import uuid
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from typing import Optional
from app.core.security import get_current_user, require_roles
from app.db.supabase_client import supabase_admin
from app.core.config import get_settings

router = APIRouter()
settings = get_settings()


@router.get("/{plan_id}", summary="Get master plan metadata and version history")
async def get_master_plan(plan_id: str, current_user: dict = Depends(get_current_user)):
    result = supabase_admin.table("master_plans").select("*").eq("id", plan_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Master plan not found")

    versions = supabase_admin.table("master_plan_versions") \
        .select("*") \
        .eq("master_plan_id", plan_id) \
        .order("version_number", desc=True) \
        .execute()

    data = {
        **result.data,
        "master_plan_versions": versions.data or []
    }

    # Audit log the view
    supabase_admin.table("audit_logs").insert({
        "actor_user_id": current_user["id"],
        "entity_type": "master_plan",
        "entity_id": plan_id,
        "action": "view",
    }).execute()

    return result.data


@router.post("/{plan_id}/versions", summary="Add a new version to an existing master plan")
async def add_master_plan_version(
    plan_id: str,
    file: UploadFile = File(...),
    note: Optional[str] = Form(None),
    current_user: dict = Depends(require_roles("company_admin")),
):
    # Get current version number
    versions = supabase_admin.table("master_plan_versions") \
        .select("version_number") \
        .eq("master_plan_id", plan_id) \
        .order("version_number", desc=True) \
        .limit(1) \
        .execute()
    next_version = (versions.data[0]["version_number"] + 1) if versions.data else 1

    file_bytes = await file.read()
    storage_path = f"{plan_id}/v{next_version}/{file.filename}"

    supabase_admin.storage.from_(settings.master_plans_bucket).upload(
        path=storage_path,
        file=file_bytes,
        file_options={"content-type": file.content_type or "application/octet-stream"},
    )

    version_id = str(uuid.uuid4())
    supabase_admin.table("master_plan_versions").insert({
        "id": version_id,
        "master_plan_id": plan_id,
        "version_number": next_version,
        "file_url": storage_path,
        "file_type": file.content_type or "application/octet-stream",
        "file_size_bytes": len(file_bytes),
        "uploaded_by": current_user["id"],
        "note": note,
    }).execute()

    # Update current_version_id
    supabase_admin.table("master_plans").update({"current_version_id": version_id}).eq("id", plan_id).execute()

    # Audit log upload
    supabase_admin.table("audit_logs").insert({
        "actor_user_id": current_user["id"],
        "entity_type": "master_plan_version",
        "entity_id": version_id,
        "action": f"upload_v{next_version}",
    }).execute()

    return {"version_id": version_id, "version_number": next_version}


@router.get("/{plan_id}/versions/{version_id}/download", summary="Get a signed download URL for a version")
async def get_download_url(
    plan_id: str,
    version_id: str,
    current_user: dict = Depends(get_current_user),
):
    version = supabase_admin.table("master_plan_versions") \
        .select("file_url") \
        .eq("id", version_id) \
        .eq("master_plan_id", plan_id) \
        .single() \
        .execute()
    if not version.data:
        raise HTTPException(status_code=404, detail="Version not found")

    # Generate time-limited signed URL (1 hour)
    signed = supabase_admin.storage.from_(settings.master_plans_bucket) \
        .create_signed_url(version.data["file_url"], 3600)

    # Audit log download
    supabase_admin.table("audit_logs").insert({
        "actor_user_id": current_user["id"],
        "entity_type": "master_plan_version",
        "entity_id": version_id,
        "action": "download",
    }).execute()

    return {"signed_url": signed.get("signedURL"), "expires_in": 3600}
