"""
Notifications endpoint — list unread, mark read.
"""
from fastapi import APIRouter, Depends
from app.core.security import get_current_user
from app.db.supabase_client import supabase_admin

router = APIRouter()


@router.get("/", summary="Get notifications for current user")
async def list_notifications(current_user: dict = Depends(get_current_user)):
    result = supabase_admin.table("notifications") \
        .select("*") \
        .eq("user_id", current_user["id"]) \
        .order("created_at", desc=True) \
        .limit(50) \
        .execute()
    return {
        "notifications": result.data or [],
        "unread_count": sum(1 for n in (result.data or []) if not n.get("read_at")),
    }


@router.patch("/{notification_id}/read", summary="Mark a notification as read")
async def mark_read(notification_id: str, current_user: dict = Depends(get_current_user)):
    from datetime import datetime
    result = supabase_admin.table("notifications") \
        .update({"read_at": datetime.utcnow().isoformat()}) \
        .eq("id", notification_id) \
        .eq("user_id", current_user["id"]) \
        .execute()
    return result.data[0] if result.data else {}


@router.patch("/mark-all-read", summary="Mark all notifications as read")
async def mark_all_read(current_user: dict = Depends(get_current_user)):
    from datetime import datetime
    supabase_admin.table("notifications") \
        .update({"read_at": datetime.utcnow().isoformat()}) \
        .eq("user_id", current_user["id"]) \
        .is_("read_at", "null") \
        .execute()
    return {"message": "All notifications marked as read"}
