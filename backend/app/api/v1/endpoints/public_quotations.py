"""
Public quotation upload, status polling, analysis retrieval,
follow-up chat, and user-initiated deletion.
"""
import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, Request, UploadFile, status
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.core.security import get_anonymous_session, generate_session_token
from app.db.supabase_client import supabase_admin
from app.services.pdf_service import validate_file
from app.workers.quotation_worker import process_quotation

router = APIRouter()
settings = get_settings()


@router.post("/upload", summary="Upload a quotation document for verification")
async def upload_quotation(
    background_tasks: BackgroundTasks,
    request: Request,
    file: UploadFile = File(...),
    session: dict = Depends(get_anonymous_session),
):
    # --- Rate limiting: max uploads per session ---
    count_result = supabase_admin.table("uploaded_quotations") \
        .select("id", count="exact") \
        .eq("anonymous_session_id", session["id"]) \
        .neq("status", "Deleted") \
        .execute()
    if (count_result.count or 0) >= settings.public_upload_max_per_session:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Maximum of {settings.public_upload_max_per_session} quotation uploads per session reached.",
        )

    # --- Read & validate file ---
    file_bytes = await file.read()
    try:
        validate_file(
            filename=file.filename or "upload",
            content_type=file.content_type or "",
            size_bytes=len(file_bytes),
            max_mb=settings.max_quotation_file_size_mb,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))

    # --- Store file in Supabase Storage (private bucket) ---
    quotation_id = str(uuid.uuid4())
    storage_path = f"{session['id']}/{quotation_id}/{file.filename}"

    upload_result = supabase_admin.storage.from_(settings.quotations_bucket).upload(
        path=storage_path,
        file=file_bytes,
        file_options={"content-type": file.content_type or "application/octet-stream"},
    )

    # --- Create DB record ---
    row = {
        "id": quotation_id,
        "anonymous_session_id": session["id"],
        "original_filename": file.filename,
        "file_url": storage_path,
        "file_type": file.content_type,
        "file_size_bytes": len(file_bytes),
        "status": "Uploaded",
    }
    supabase_admin.table("uploaded_quotations").insert(row).execute()

    # --- Enqueue processing as background task ---
    background_tasks.add_task(process_quotation, quotation_id)

    return {"id": quotation_id, "status": "Uploaded", "message": "Processing started. Poll /status for updates."}


@router.get("/{quotation_id}/status", summary="Poll processing status")
async def get_quotation_status(
    quotation_id: str,
    session: dict = Depends(get_anonymous_session),
):
    """
    Returns the current status of an uploaded quotation.
    Foreign session tokens receive 404, not 403 (§5.6 — avoids revealing other sessions' data).
    """
    result = supabase_admin.table("uploaded_quotations") \
        .select("id, status, uploaded_at") \
        .eq("id", quotation_id) \
        .eq("anonymous_session_id", session["id"]) \
        .is_("deleted_at", "null") \
        .single() \
        .execute()

    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    return result.data


@router.get("/{quotation_id}/analysis", summary="Retrieve completed analysis report")
async def get_analysis(
    quotation_id: str,
    session: dict = Depends(get_anonymous_session),
):
    # Verify ownership
    q_result = supabase_admin.table("uploaded_quotations") \
        .select("id, status, original_filename, file_type, ocr_confidence:quotation_documents(ocr_confidence, page_count)") \
        .eq("id", quotation_id) \
        .eq("anonymous_session_id", session["id"]) \
        .is_("deleted_at", "null") \
        .single() \
        .execute()

    if not q_result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    if q_result.data["status"] != "Ready":
        raise HTTPException(status_code=status.HTTP_202_ACCEPTED, detail=f"Analysis status: {q_result.data['status']}")

    # Fetch analysis
    analysis = supabase_admin.table("quotation_analyses") \
        .select("*") \
        .eq("uploaded_quotation_id", quotation_id) \
        .single() \
        .execute().data

    # Fetch line items
    doc = supabase_admin.table("quotation_documents") \
        .select("id, page_count, ocr_confidence") \
        .eq("uploaded_quotation_id", quotation_id) \
        .single() \
        .execute().data

    line_items = []
    if doc:
        li_result = supabase_admin.table("quotation_line_items") \
            .select("*") \
            .eq("quotation_document_id", doc["id"]) \
            .order("line_number") \
            .execute()
        line_items = li_result.data or []

    # Fetch findings with reference source info
    findings = supabase_admin.table("verification_findings") \
        .select("*, reference_sources(title, source_type, region, published_date)") \
        .eq("analysis_id", analysis["id"]) \
        .execute().data or []

    return {
        "quotation": q_result.data,
        "document": doc,
        "analysis": analysis,
        "line_items": line_items,
        "findings": findings,
        "disclaimer": (
            "This is an analysis to help you ask better questions — "
            "not a certification that this quotation is fair or unfair."
        ),
    }


@router.delete("/{quotation_id}", summary="User-initiated deletion of quotation and all derived data")
async def delete_quotation(
    quotation_id: str,
    background_tasks: BackgroundTasks,
    session: dict = Depends(get_anonymous_session),
):
    """
    Soft-delete immediately (removes from all API access).
    Async hard purge of storage file within 24 hours (§18.4).
    """
    result = supabase_admin.table("uploaded_quotations") \
        .select("id, file_url, anonymous_session_id") \
        .eq("id", quotation_id) \
        .eq("anonymous_session_id", session["id"]) \
        .is_("deleted_at", "null") \
        .single() \
        .execute()

    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    # Soft-delete immediately
    supabase_admin.table("uploaded_quotations").update({
        "deleted_at": datetime.utcnow().isoformat(),
        "status": "Deleted",
    }).eq("id", quotation_id).execute()

    # Async hard purge of storage file
    file_url = result.data.get("file_url")
    if file_url:
        background_tasks.add_task(_purge_storage_file, file_url)

    return {"message": "Quotation deleted. Underlying file will be purged shortly."}


async def _purge_storage_file(file_url: str):
    try:
        supabase_admin.storage.from_(settings.quotations_bucket).remove([file_url])
    except Exception as exc:
        import structlog
        structlog.get_logger().error("storage_purge_failed", file_url=file_url, error=str(exc))
