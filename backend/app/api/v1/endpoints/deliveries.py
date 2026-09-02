"""
Deliveries — ETA tracking, driver location updates (via secure link or auth), history.
"""
import hashlib
import secrets
import uuid
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.core.security import get_current_user, require_roles, get_driver_delivery_from_token
from app.db.supabase_client import supabase_admin

router = APIRouter()

DRIVER_LINK_EXPIRE_HOURS = 48


@router.get("/", summary="List deliveries for current user (vendor, site_manager, company_admin, driver)")
async def list_deliveries(current_user: dict = Depends(get_current_user)):
    role = current_user["role"]

    if role == "vendor":
        vendor = supabase_admin.table("vendors").select("id").eq("user_id", current_user["id"]).execute()
        if not vendor.data or len(vendor.data) == 0:
            return []
        vendor_id = vendor.data[0]["id"]
        # Find quotes for this vendor
        quotes = supabase_admin.table("quotes").select("id").eq("vendor_id", vendor_id).execute()
        quote_ids = [q["id"] for q in (quotes.data or [])]
        if not quote_ids:
            return []
        deliveries = supabase_admin.table("deliveries") \
            .select("*, projects(name), drivers(name, contact)") \
            .in_("quote_id", quote_ids) \
            .order("created_at", desc=True) \
            .execute()
        return deliveries.data or []

    elif role == "site_manager":
        assignments = supabase_admin.table("site_manager_assignments") \
            .select("project_id") \
            .eq("user_id", current_user["id"]) \
            .execute()
        project_ids = [a["project_id"] for a in (assignments.data or [])]
        if not project_ids:
            return []
        deliveries = supabase_admin.table("deliveries") \
            .select("*, projects(name), drivers(name, contact), quotes(vendors(business_name, phone))") \
            .in_("project_id", project_ids) \
            .order("created_at", desc=True) \
            .execute()
        return deliveries.data or []

    elif role == "driver":
        # Check driver assignments for this user
        driver_rec = supabase_admin.table("drivers").select("id").eq("contact", current_user.get("phone", "")).execute()
        driver_ids = [d["id"] for d in (driver_rec.data or [])]
        if driver_ids:
            deliveries = supabase_admin.table("deliveries") \
                .select("*, projects(name), quotes(vendors(business_name, phone))") \
                .in_("driver_id", driver_ids) \
                .order("created_at", desc=True) \
                .execute()
            if deliveries.data:
                return deliveries.data
        # Fallback to all active deliveries
        deliveries = supabase_admin.table("deliveries") \
            .select("*, projects(name), quotes(vendors(business_name, phone)), drivers(name, contact)") \
            .order("created_at", desc=True) \
            .execute()
        return deliveries.data or []

    elif role == "company_admin":
        company = supabase_admin.table("companies").select("id").eq("owner_user_id", current_user["id"]).execute()
        if not company.data or len(company.data) == 0:
            return []
        company_id = company.data[0]["id"]
        projects = supabase_admin.table("projects").select("id").eq("company_id", company_id).execute()
        project_ids = [p["id"] for p in (projects.data or [])]
        if not project_ids:
            return []
        deliveries = supabase_admin.table("deliveries") \
            .select("*, projects(name), drivers(name, contact), quotes(vendors(business_name, phone))") \
            .in_("project_id", project_ids) \
            .order("created_at", desc=True) \
            .execute()
        return deliveries.data or []

    return []


@router.get("/{delivery_id}/eta", summary="Get current ETA and last known location")
async def get_eta(delivery_id: str, current_user: dict = Depends(get_current_user)):
    result = supabase_admin.table("deliveries") \
        .select("*, projects(name), drivers(name, contact), location_updates(lat, lng, captured_at, speed, accuracy)") \
        .eq("id", delivery_id) \
        .single() \
        .execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Delivery not found")

    updates = sorted(result.data.get("location_updates", []), key=lambda x: x.get("captured_at") or "", reverse=True)
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
    speed: Optional[float] = None
    accuracy: Optional[float] = None


@router.post("/{delivery_id}/location-updates", summary="Driver posts GPS update via secure link")
async def post_location_update(
    delivery_id: str,
    body: LocationUpdate,
):
    """No JWT required — authenticated by the one-time driver link token."""
    assignment = await get_driver_delivery_from_token(body.link_token)
    if assignment["delivery_id"] != delivery_id:
        raise HTTPException(status_code=403, detail="Token does not match this delivery")

    now_iso = datetime.utcnow().isoformat()

    supabase_admin.table("location_updates").insert({
        "id": str(uuid.uuid4()),
        "delivery_id": delivery_id,
        "driver_id": assignment["driver_id"],
        "lat": body.lat,
        "lng": body.lng,
        "speed": body.speed,
        "accuracy": body.accuracy,
        "captured_at": now_iso,
    }).execute()

    # Update delivery's last known position
    supabase_admin.table("deliveries").update({
        "last_lat": body.lat,
        "last_lng": body.lng,
        "last_location_updated_at": now_iso,
        "status": "in_transit",
    }).eq("id", delivery_id).execute()

    return {"status": "ok", "last_lat": body.lat, "last_lng": body.lng, "updated_at": now_iso}


class DirectLocationUpdate(BaseModel):
    lat: float
    lng: float
    speed: Optional[float] = None
    accuracy: Optional[float] = None


@router.post("/{delivery_id}/my-location", summary="Direct location update by authenticated driver, site manager, or vendor")
async def post_my_location(
    delivery_id: str,
    body: DirectLocationUpdate,
    current_user: dict = Depends(get_current_user),
):
    """Authenticated endpoint allowing 1-click GPS update directly from the app."""
    now_iso = datetime.utcnow().isoformat()

    supabase_admin.table("location_updates").insert({
        "id": str(uuid.uuid4()),
        "delivery_id": delivery_id,
        "lat": body.lat,
        "lng": body.lng,
        "speed": body.speed,
        "accuracy": body.accuracy,
        "captured_at": now_iso,
    }).execute()

    # Update delivery's last known position and status
    supabase_admin.table("deliveries").update({
        "last_lat": body.lat,
        "last_lng": body.lng,
        "last_location_updated_at": now_iso,
        "status": "in_transit",
    }).eq("id", delivery_id).execute()

    return {"status": "ok", "last_lat": body.lat, "last_lng": body.lng, "updated_at": now_iso}


def is_valid_uuid(val: Optional[str]) -> bool:
    if not val:
        return False
    try:
        uuid.UUID(str(val))
        return True
    except (ValueError, AttributeError, TypeError):
        return False


@router.post("/{delivery_id}/driver-link", summary="Vendor or manager generates a secure driver link")
async def generate_driver_link(
    delivery_id: str,
    driver_id: Optional[str] = None,
    current_user: dict = Depends(require_roles("vendor", "company_admin", "site_manager")),
):
    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    expires_at = datetime.utcnow() + timedelta(hours=DRIVER_LINK_EXPIRE_HOURS)

    actual_driver_id = None

    if driver_id and is_valid_uuid(driver_id):
        drv_check = supabase_admin.table("drivers").select("id").eq("id", driver_id).execute()
        if drv_check.data and len(drv_check.data) > 0:
            actual_driver_id = driver_id

    if not actual_driver_id:
        if driver_id and not is_valid_uuid(driver_id):
            name_check = supabase_admin.table("drivers").select("id").ilike("name", f"%{driver_id}%").execute()
            if name_check.data and len(name_check.data) > 0:
                actual_driver_id = name_check.data[0]["id"]

        if not actual_driver_id:
            driver_query = supabase_admin.table("drivers").select("id").limit(1).execute()
            if driver_query.data and len(driver_query.data) > 0:
                actual_driver_id = driver_query.data[0]["id"]
            else:
                actual_driver_id = str(uuid.uuid4())
                vendor_query = supabase_admin.table("vendors").select("id").limit(1).execute()
                v_id = vendor_query.data[0]["id"] if vendor_query.data else str(uuid.uuid4())
                supabase_admin.table("drivers").insert({
                    "id": actual_driver_id,
                    "vendor_id": v_id,
                    "name": str(driver_id) if (driver_id and not is_valid_uuid(driver_id)) else "Assigned Fleet Driver",
                    "contact": "9876543210",
                }).execute()

    # Link driver to delivery
    supabase_admin.table("deliveries").update({"driver_id": actual_driver_id}).eq("id", delivery_id).execute()

    assignment_id = str(uuid.uuid4())
    supabase_admin.table("driver_delivery_assignments").insert({
        "id": assignment_id,
        "delivery_id": delivery_id,
        "driver_id": actual_driver_id,
        "secure_link_token_hash": token_hash,
        "link_expires_at": expires_at.isoformat(),
    }).execute()

    return {
        "link_token": raw_token,
        "expires_at": expires_at.isoformat(),
        "driver_id": actual_driver_id,
        "note": "Share this token with the driver. It expires in 48 hours and can only be used for this delivery.",
    }


class DeliveryStatusUpdate(BaseModel):
    status: str
    driver_id: Optional[str] = None
    truck_id: Optional[str] = None


@router.patch("/{delivery_id}", summary="Update delivery status, driver, or truck")
async def update_delivery(
    delivery_id: str,
    body: DeliveryStatusUpdate,
    current_user: dict = Depends(get_current_user),
):
    update_data = {}
    if body.status:
        update_data["status"] = body.status
    if body.driver_id:
        update_data["driver_id"] = body.driver_id
    if body.truck_id:
        update_data["truck_id"] = body.truck_id

    res = supabase_admin.table("deliveries").update(update_data).eq("id", delivery_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Delivery not found")
    return res.data[0]
