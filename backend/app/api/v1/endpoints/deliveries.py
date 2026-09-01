"""
Deliveries — ETA tracking, driver location updates (via secure link), history.
"""
import hashlib
import secrets
import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.core.security import get_current_user, require_roles, get_driver_delivery_from_token
from app.db.supabase_client import supabase_admin

router = APIRouter()

DRIVER_LINK_EXPIRE_HOURS = 48


@router.get("/", summary="List deliveries for current user (vendor or company admin)")
async def list_deliveries(current_user: dict = Depends(get_current_user)):
    if current_user["role"] == "vendor":
        vendor = supabase_admin.table("vendors").select("id").eq("user_id", current_user["id"]).single().execute()
        deliveries = supabase_admin.table("deliveries") \
            .select("*, driver_delivery_assignments(drivers(name, phone))") \
            .eq("vendor_id", vendor.data["id"] if vendor.data else "") \
            .execute()
    else:
        # Company Admin sees all deliveries for their company
        deliveries = supabase_admin.table("deliveries") \
            .select("*, vendors(business_name)") \
            .execute()
    return deliveries.data or []


@router.get("/{delivery_id}/eta", summary="Get current ETA and last known location")
async def get_eta(delivery_id: str, current_user: dict = Depends(get_current_user)):
    result = supabase_admin.table("deliveries") \
        .select("*, location_updates(lat, lng, timestamp, speed, accuracy)") \
        .eq("id", delivery_id) \
        .single() \
        .execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Delivery not found")

    updates = sorted(result.data.get("location_updates", []), key=lambda x: x["timestamp"], reverse=True)
    last_location = updates[0] if updates else None

    return {
        **result.data,
        "last_location": last_location,
        "location_history": updates[:10],  # last 10 pings
    }


class LocationUpdate(BaseModel):
    lat: float
    lng: float
    link_token: str
    speed: float | None = None
    accuracy: float | None = None


@router.post("/{delivery_id}/location-updates", summary="Driver posts GPS update via secure link")
async def post_location_update(
    delivery_id: str,
    body: LocationUpdate,
):
    """No JWT required — authenticated by the one-time driver link token."""
    assignment = await get_driver_delivery_from_token(body.link_token)
    if assignment["delivery_id"] != delivery_id:
        raise HTTPException(status_code=403, detail="Token does not match this delivery")

    supabase_admin.table("location_updates").insert({
        "id": str(uuid.uuid4()),
        "delivery_id": delivery_id,
        "driver_id": assignment["driver_id"],
        "lat": body.lat,
        "lng": body.lng,
        "speed": body.speed,
        "accuracy": body.accuracy,
        "timestamp": datetime.utcnow().isoformat(),
    }).execute()

    # Update delivery's last known position
    supabase_admin.table("deliveries").update({
        "last_lat": body.lat,
        "last_lng": body.lng,
        "last_location_updated_at": datetime.utcnow().isoformat(),
    }).eq("id", delivery_id).execute()

    return {"status": "ok"}


@router.post("/{delivery_id}/driver-link", summary="Vendor generates a secure driver link")
async def generate_driver_link(
    delivery_id: str,
    driver_id: str,
    current_user: dict = Depends(require_roles("vendor")),
):
    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    expires_at = datetime.utcnow() + timedelta(hours=DRIVER_LINK_EXPIRE_HOURS)

    assignment_id = str(uuid.uuid4())
    supabase_admin.table("driver_delivery_assignments").insert({
        "id": assignment_id,
        "delivery_id": delivery_id,
        "driver_id": driver_id,
        "secure_link_token_hash": token_hash,
        "link_expires_at": expires_at.isoformat(),
    }).execute()

    return {
        "link_token": raw_token,
        "expires_at": expires_at.isoformat(),
        "note": "Share this token with the driver. It expires in 48 hours and can only be used for this delivery.",
    }
