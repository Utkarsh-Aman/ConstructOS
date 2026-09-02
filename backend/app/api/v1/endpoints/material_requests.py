"""
Material requests — status machine, RFP creation, quote comparison.
"""
import uuid
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.core.security import get_current_user, require_roles
from app.db.supabase_client import supabase_admin

router = APIRouter()

# Valid state transitions (§16)
VALID_TRANSITIONS = {
    "draft":        ["submitted"],
    "submitted":    ["under_review"],
    "under_review": ["approved", "rejected"],
    "approved":     ["fulfilled"],
    "fulfilled":    ["closed"],
    "rejected":     ["closed"],
}
@router.get("/", summary="List all material requests for current user")
async def list_all_material_requests(current_user: dict = Depends(get_current_user)):
    role = current_user["role"]
    if role == "company_admin":
        company = supabase_admin.table("companies").select("id").eq("owner_user_id", current_user["id"]).execute()
        if not company.data or len(company.data) == 0:
            return []
        projects = supabase_admin.table("projects").select("id").eq("company_id", company.data[0]["id"]).execute()
        project_ids = [p["id"] for p in (projects.data or [])]
        if not project_ids:
            return []
        
        result = supabase_admin.table("material_requests") \
            .select("*, projects(name)") \
            .in_("project_id", project_ids) \
            .order("created_at", desc=True) \
            .execute()
        return result.data or []
    elif role == "site_manager":
        assignments = supabase_admin.table("site_manager_assignments").select("project_id").eq("user_id", current_user["id"]).execute()
        project_ids = [a["project_id"] for a in (assignments.data or [])]
        if not project_ids:
            return []
        
        result = supabase_admin.table("material_requests") \
            .select("*, projects(name)") \
            .in_("project_id", project_ids) \
            .order("created_at", desc=True) \
            .execute()
        return result.data or []
    
    return []


@router.get("/{req_id}", summary="Get material request details")
async def get_material_request(req_id: str, current_user: dict = Depends(get_current_user)):
    result = supabase_admin.table("material_requests") \
        .select("*, rfps(*, quotes(*))") \
        .eq("id", req_id) \
        .single() \
        .execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Material request not found")
    return result.data


@router.patch("/{req_id}/status", summary="Transition material request status (Company Admin)")
async def update_status(
    req_id: str,
    body: dict,
    current_user: dict = Depends(require_roles("company_admin")),
):
    new_status = body.get("status")
    current = supabase_admin.table("material_requests").select("status").eq("id", req_id).single().execute()
    if not current.data:
        raise HTTPException(status_code=404, detail="Not found")

    curr_status = current.data["status"]
    if new_status not in VALID_TRANSITIONS.get(curr_status, []):
        raise HTTPException(
            status_code=409,
            detail=f"Cannot transition from '{curr_status}' to '{new_status}'"
        )

    result = supabase_admin.table("material_requests") \
        .update({"status": new_status}) \
        .eq("id", req_id) \
        .execute()

    # Audit log
    supabase_admin.table("audit_logs").insert({
        "actor_user_id": current_user["id"],
        "entity_type": "material_request",
        "entity_id": req_id,
        "action": f"status_{curr_status}_to_{new_status}",
    }).execute()

    # Notify site manager
    req_row = supabase_admin.table("material_requests").select("site_manager_id, material").eq("id", req_id).single().execute()
    if req_row.data:
        supabase_admin.table("notifications").insert({
            "user_id": req_row.data["site_manager_id"],
            "type": "material_request_status_change",
            "payload_json": {
                "material_request_id": req_id,
                "material": req_row.data["material"],
                "new_status": new_status,
            },
        }).execute()

    return result.data[0]


@router.post("/{req_id}/rfp", summary="Open an RFP for this material request (Company Admin)")
async def open_rfp(req_id: str, current_user: dict = Depends(require_roles("company_admin"))):
    req = supabase_admin.table("material_requests").select("*").eq("id", req_id).single().execute()
    if not req.data or req.data["status"] != "approved":
        raise HTTPException(status_code=409, detail="Material request must be approved before opening an RFP")

    rfp_id = str(uuid.uuid4())
    supabase_admin.table("rfps").insert({
        "id": rfp_id,
        "material_request_id": req_id,
        "status": "open",
    }).execute()

    supabase_admin.table("rfp_items").insert({
        "id": str(uuid.uuid4()),
        "rfp_id": rfp_id,
        "item": req.data["material"],
        "quantity": req.data["quantity"],
        "unit": req.data["unit"],
    }).execute()

    return {"rfp_id": rfp_id, "status": "open"}


@router.get("/{req_id}/rfp/quotes/compare", summary="Side-by-side quote comparison for Company Admin")
async def compare_quotes(req_id: str, current_user: dict = Depends(require_roles("company_admin", "site_manager"))):
    rfp = supabase_admin.table("rfps") \
        .select("id") \
        .eq("material_request_id", req_id) \
        .eq("status", "open") \
        .execute()
    
    if not rfp.data or len(rfp.data) == 0:
        # Check any quotes directly associated
        rfp_any = supabase_admin.table("rfps").select("id").eq("material_request_id", req_id).execute()
        if not rfp_any.data:
            return {"rfp_id": None, "quotes": []}
        rfp_id = rfp_any.data[0]["id"]
    else:
        rfp_id = rfp.data[0]["id"]

    quotes = supabase_admin.table("quotes") \
        .select("*, vendors(business_name, phone, email), quote_items(*)") \
        .eq("rfp_id", rfp_id) \
        .neq("status", "withdrawn") \
        .execute()

    formatted_quotes = []
    for q in (quotes.data or []):
        items = q.get("quote_items") or []
        tot = sum(float(it.get("total") or 0) for it in items)
        formatted_quotes.append({
            **q,
            "total_amount": tot,
            "currency": "INR",
            "validity_period_days": 30,
            "delivery_timeline_days": 3,
        })

    return {"rfp_id": rfp_id, "quotes": formatted_quotes}


@router.post("/{req_id}/quotes/{quote_id}/accept", summary="Accept a vendor quote and schedule delivery")
async def accept_quote(
    req_id: str,
    quote_id: str,
    current_user: dict = Depends(require_roles("company_admin", "site_manager")),
):
    from datetime import datetime, timedelta

    # 1. Fetch material request
    req_res = supabase_admin.table("material_requests").select("*").eq("id", req_id).single().execute()
    if not req_res.data:
        raise HTTPException(status_code=404, detail="Material request not found")
    req = req_res.data

    # 2. Fetch quote
    quote_res = supabase_admin.table("quotes").select("*, vendors(*)").eq("id", quote_id).single().execute()
    if not quote_res.data:
        raise HTTPException(status_code=404, detail="Quotation not found")
    quote = quote_res.data

    rfp_id = quote.get("rfp_id")

    # 3. Mark selected quote as accepted
    supabase_admin.table("quotes").update({"status": "accepted"}).eq("id", quote_id).execute()

    # 4. Mark competing quotes for this RFP as rejected
    if rfp_id:
        supabase_admin.table("quotes").update({"status": "rejected"}).eq("rfp_id", rfp_id).neq("id", quote_id).execute()
        supabase_admin.table("rfps").update({"status": "closed"}).eq("id", rfp_id).execute()

    # 5. Mark material request as fulfilled
    supabase_admin.table("material_requests").update({"status": "fulfilled"}).eq("id", req_id).execute()

    # 6. Automatically create real delivery record
    lead_days = quote.get("delivery_timeline_days") or 3
    expected_delivery_date = (datetime.utcnow() + timedelta(days=lead_days)).strftime("%Y-%m-%d")
    
    delivery_id = str(uuid.uuid4())
    supabase_admin.table("deliveries").insert({
        "id": delivery_id,
        "quote_id": quote_id,
        "project_id": req["project_id"],
        "material": req["material"],
        "quantity": req["quantity"],
        "expected_date": expected_delivery_date,
        "status": "scheduled",
    }).execute()

    # 7. Notify vendor user if possible
    vendor_user_id = quote.get("vendors", {}).get("user_id") if quote.get("vendors") else None
    if vendor_user_id:
        try:
            supabase_admin.table("notifications").insert({
                "user_id": vendor_user_id,
                "type": "quote_accepted",
                "payload_json": {
                    "material": req["material"],
                    "quote_id": quote_id,
                    "delivery_id": delivery_id,
                    "message": f"Congratulations! Your quote for {req['material']} ({req['quantity']} {req['unit']}) was accepted.",
                },
            }).execute()
        except Exception:
            pass

    return {
        "status": "accepted",
        "quote_id": quote_id,
        "delivery_id": delivery_id,
        "message": "Quotation accepted successfully. Delivery shipment has been scheduled.",
    }
