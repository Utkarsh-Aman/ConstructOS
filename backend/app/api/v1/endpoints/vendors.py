"""
Vendor portal — view open material demands/RFPs from all companies, submit/withdraw quotes, manage fleet drivers & trucks.
"""
import uuid
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.security import get_current_user, require_roles
from app.db.supabase_client import supabase_admin

router = APIRouter()


def get_or_create_vendor_profile(user: dict) -> dict:
    """Ensure a vendor profile row exists for the authenticated user."""
    v_res = supabase_admin.table("vendors").select("*").eq("user_id", user["id"]).execute()
    if v_res.data and len(v_res.data) > 0:
        return v_res.data[0]
    
    # Auto-provision vendor profile from user info
    new_vendor_id = str(uuid.uuid4())
    insert_res = supabase_admin.table("vendors").insert({
        "id": new_vendor_id,
        "user_id": user["id"],
        "business_name": user.get("full_name") or user.get("company_name") or "Vendor Business",
        "phone": user.get("phone") or "0000000000",
        "email": user.get("email"),
        "verification_status": "verified",
    }).execute()
    return insert_res.data[0] if insert_res.data else {"id": new_vendor_id}


# ── RFP & Material Demands Marketplace ──────────────────────────────────────

@router.get("/rfps", summary="List all open material requests & RFPs across all companies")
async def list_open_rfps(current_user: dict = Depends(require_roles("vendor"))):
    vendor = get_or_create_vendor_profile(current_user)

    # 1. Fetch all open RFPs
    rfps_res = supabase_admin.table("rfps") \
        .select("*, rfp_items(*), material_requests(*, projects(name, location, companies(name)))") \
        .eq("status", "open") \
        .execute()
    open_rfps = rfps_res.data or []

    # 2. Fetch approved material requests that may not have an explicit RFP yet
    mat_res = supabase_admin.table("material_requests") \
        .select("*, projects(name, location, companies(name))") \
        .in_("status", ["approved", "submitted", "under_review"]) \
        .execute()
    all_mat_reqs = mat_res.data or []

    # Find which RFPs/requests this vendor has already quoted on
    quotes_res = supabase_admin.table("quotes") \
        .select("rfp_id, status") \
        .eq("vendor_id", vendor["id"]) \
        .neq("status", "withdrawn") \
        .execute()
    quoted_rfp_ids = {q["rfp_id"] for q in (quotes_res.data or [])}

    # Merge and standardize demands for the vendor marketplace
    demands = []
    seen_mat_ids = set()

    for r in open_rfps:
        mr = r.get("material_requests") or {}
        seen_mat_ids.add(mr.get("id"))
        proj = mr.get("projects") or {}
        comp = proj.get("companies") or {}
        demands.append({
            "id": r["id"],
            "rfp_id": r["id"],
            "material_request_id": mr.get("id"),
            "material": mr.get("material") or (r.get("rfp_items", [{}])[0].get("item") if r.get("rfp_items") else "Material"),
            "quantity": mr.get("quantity") or (r.get("rfp_items", [{}])[0].get("quantity") if r.get("rfp_items") else 1),
            "unit": mr.get("unit") or (r.get("rfp_items", [{}])[0].get("unit") if r.get("rfp_items") else "Units"),
            "required_by_date": mr.get("required_by_date"),
            "priority": mr.get("priority", "medium"),
            "remarks": mr.get("remarks"),
            "project_name": proj.get("name", "Active Construction Project"),
            "project_location": proj.get("location"),
            "company_name": comp.get("name", "General Contractor"),
            "created_at": r.get("created_at"),
            "already_quoted": r["id"] in quoted_rfp_ids,
        })

    for mr in all_mat_reqs:
        if mr["id"] in seen_mat_ids:
            continue
        proj = mr.get("projects") or {}
        comp = proj.get("companies") or {}
        demands.append({
            "id": f"mr_{mr['id']}",
            "rfp_id": None,
            "material_request_id": mr["id"],
            "material": mr.get("material", "Material"),
            "quantity": mr.get("quantity", 1),
            "unit": mr.get("unit", "Units"),
            "required_by_date": mr.get("required_by_date"),
            "priority": mr.get("priority", "medium"),
            "remarks": mr.get("remarks"),
            "project_name": proj.get("name", "Active Construction Project"),
            "project_location": proj.get("location"),
            "company_name": comp.get("name", "General Contractor"),
            "created_at": mr.get("created_at"),
            "already_quoted": False,
        })

    return demands


# ── Quote Management ──────────────────────────────────────────────────────────

@router.get("/my-quotes", summary="List all quotes submitted by current vendor")
async def list_my_quotes(current_user: dict = Depends(require_roles("vendor"))):
    vendor = get_or_create_vendor_profile(current_user)

    quotes = supabase_admin.table("quotes") \
        .select("*, rfps(*, material_requests(*, projects(name, location, companies(name)))), quote_items(*)") \
        .eq("vendor_id", vendor["id"]) \
        .order("created_at", desc=True) \
        .execute()
    
    formatted_quotes = []
    for q in (quotes.data or []):
        items = q.get("quote_items") or []
        tot = sum(float(it.get("total") or 0) for it in items)
        formatted_quotes.append({
            **q,
            "total_amount": tot,
            "validity_period_days": 30,
            "delivery_timeline_days": 3,
        })

    return formatted_quotes


class QuoteLineItem(BaseModel):
    item: str
    quantity: float
    unit: str
    unit_price: float
    total: float
    tax: Optional[float] = None


class QuoteCreate(BaseModel):
    material_request_id: Optional[str] = None
    total_amount: float
    currency: str = "INR"
    validity_period_days: int = 30
    delivery_timeline_days: Optional[int] = None
    terms: Optional[str] = None
    items: list[QuoteLineItem]


@router.post("/rfps/{rfp_id}/quotes", summary="Vendor submits a quote for an RFP or Material Request")
async def submit_quote(
    rfp_id: str,
    body: QuoteCreate,
    current_user: dict = Depends(require_roles("vendor")),
):
    vendor = get_or_create_vendor_profile(current_user)

    actual_rfp_id = rfp_id

    # If submitting by material request prefix (e.g. mr_<id>) or if no RFP exists yet
    if rfp_id.startswith("mr_") or body.material_request_id:
        req_id = body.material_request_id or rfp_id.replace("mr_", "")
        # Check if RFP already exists for this material request
        rfp_res = supabase_admin.table("rfps").select("id, status").eq("material_request_id", req_id).execute()
        if rfp_res.data and len(rfp_res.data) > 0:
            actual_rfp_id = rfp_res.data[0]["id"]
        else:
            # Auto-create the RFP
            actual_rfp_id = str(uuid.uuid4())
            supabase_admin.table("rfps").insert({
                "id": actual_rfp_id,
                "material_request_id": req_id,
                "status": "open",
            }).execute()
            # Update material request status to approved
            supabase_admin.table("material_requests").update({"status": "approved"}).eq("id", req_id).execute()
    else:
        # Verify existing RFP is open
        rfp = supabase_admin.table("rfps").select("status").eq("id", actual_rfp_id).single().execute()
        if not rfp.data or rfp.data["status"] != "open":
            raise HTTPException(status_code=409, detail="RFP is not accepting quotes")

    quote_id = str(uuid.uuid4())
    expected_delivery_date = (datetime.utcnow() + timedelta(days=body.delivery_timeline_days or 3)).strftime("%Y-%m-%d")
    validity_date = (datetime.utcnow() + timedelta(days=body.validity_period_days or 30)).strftime("%Y-%m-%d")

    supabase_admin.table("quotes").insert({
        "id": quote_id,
        "rfp_id": actual_rfp_id,
        "vendor_id": vendor["id"],
        "expected_delivery_date": expected_delivery_date,
        "validity_date": validity_date,
        "payment_terms": body.terms,
        "terms_and_conditions": body.terms,
        "status": "submitted",
    }).execute()

    for item in body.items:
        supabase_admin.table("quote_items").insert({
            "id": str(uuid.uuid4()),
            "quote_id": quote_id,
            **item.model_dump(),
        }).execute()

    return {"quote_id": quote_id, "rfp_id": actual_rfp_id, "status": "submitted"}


@router.patch("/quotes/{quote_id}/withdraw", summary="Vendor withdraws their quote")
async def withdraw_quote(
    quote_id: str,
    current_user: dict = Depends(require_roles("vendor")),
):
    vendor = get_or_create_vendor_profile(current_user)
    result = supabase_admin.table("quotes") \
        .update({"status": "withdrawn"}) \
        .eq("id", quote_id) \
        .eq("vendor_id", vendor["id"]) \
        .execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Quote not found or already withdrawn")
    return {"status": "withdrawn"}


# ── Real Fleet: Drivers & Trucks Management ──────────────────────────────────

class DriverCreate(BaseModel):
    name: str
    contact: str


@router.get("/drivers", summary="List registered drivers for current vendor")
async def list_vendor_drivers(current_user: dict = Depends(require_roles("vendor", "company_admin"))):
    vendor = get_or_create_vendor_profile(current_user)
    drivers = supabase_admin.table("drivers") \
        .select("*") \
        .eq("vendor_id", vendor["id"]) \
        .order("created_at", desc=True) \
        .execute()
    return drivers.data or []


@router.post("/drivers", summary="Register a new driver")
async def create_vendor_driver(
    body: DriverCreate,
    current_user: dict = Depends(require_roles("vendor", "company_admin")),
):
    vendor = get_or_create_vendor_profile(current_user)
    driver_id = str(uuid.uuid4())
    res = supabase_admin.table("drivers").insert({
        "id": driver_id,
        "vendor_id": vendor["id"],
        "name": body.name,
        "contact": body.contact,
    }).execute()
    return res.data[0] if res.data else {"id": driver_id, "name": body.name, "contact": body.contact}


@router.delete("/drivers/{driver_id}", summary="Remove a registered driver")
async def delete_vendor_driver(
    driver_id: str,
    current_user: dict = Depends(require_roles("vendor", "company_admin")),
):
    vendor = get_or_create_vendor_profile(current_user)
    supabase_admin.table("drivers").delete().eq("id", driver_id).eq("vendor_id", vendor["id"]).execute()
    return {"status": "deleted", "id": driver_id}


class TruckCreate(BaseModel):
    registration_number: str
    type: Optional[str] = "Standard Truck"
    capacity: Optional[str] = "10 Tons"


@router.get("/trucks", summary="List registered trucks for current vendor")
async def list_vendor_trucks(current_user: dict = Depends(require_roles("vendor", "company_admin"))):
    vendor = get_or_create_vendor_profile(current_user)
    trucks = supabase_admin.table("trucks") \
        .select("*") \
        .eq("vendor_id", vendor["id"]) \
        .order("created_at", desc=True) \
        .execute()
    return trucks.data or []


@router.post("/trucks", summary="Register a new truck/vehicle")
async def create_vendor_truck(
    body: TruckCreate,
    current_user: dict = Depends(require_roles("vendor", "company_admin")),
):
    vendor = get_or_create_vendor_profile(current_user)
    truck_id = str(uuid.uuid4())
    res = supabase_admin.table("trucks").insert({
        "id": truck_id,
        "vendor_id": vendor["id"],
        "registration_number": body.registration_number,
        "type": body.type,
        "capacity": body.capacity,
    }).execute()
    return res.data[0] if res.data else {"id": truck_id, "registration_number": body.registration_number}


@router.delete("/trucks/{truck_id}", summary="Remove a truck")
async def delete_vendor_truck(
    truck_id: str,
    current_user: dict = Depends(require_roles("vendor", "company_admin")),
):
    vendor = get_or_create_vendor_profile(current_user)
    supabase_admin.table("trucks").delete().eq("id", truck_id).eq("vendor_id", vendor["id"]).execute()
    return {"status": "deleted", "id": truck_id}
