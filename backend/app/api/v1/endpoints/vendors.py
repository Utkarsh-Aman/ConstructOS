"""
Vendor portal — view open RFPs, submit/edit/withdraw quotes, manage delivery tracking.
"""
import hashlib
import secrets
import uuid
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.security import get_current_user, require_roles, get_driver_delivery_from_token
from app.db.supabase_client import supabase_admin

router = APIRouter()


# ── RFP Discovery ─────────────────────────────────────────────────────────────

@router.get("/rfps", summary="List open RFPs available to vendors")
async def list_open_rfps(current_user: dict = Depends(require_roles("vendor"))):
    rfps = supabase_admin.table("rfps") \
        .select("*, rfp_items(*), material_requests(material, quantity, unit, required_by_date)") \
        .eq("status", "open") \
        .execute()
    # Filter to rfps not already quoted by this vendor
    vendor = supabase_admin.table("vendors").select("id").eq("user_id", current_user["id"]).single().execute()
    if not vendor.data:
        raise HTTPException(status_code=404, detail="Vendor profile not found")

    my_rfp_ids = {
        q["rfp_id"] for q in (
            supabase_admin.table("quotes").select("rfp_id")
            .eq("vendor_id", vendor.data["id"]).execute().data or []
        )
    }
    return [r for r in (rfps.data or []) if r["id"] not in my_rfp_ids]


# ── Quote Management ──────────────────────────────────────────────────────────

@router.get("/my-quotes", summary="List all quotes submitted by the current vendor")
async def list_my_quotes(current_user: dict = Depends(require_roles("vendor"))):
    vendor = supabase_admin.table("vendors").select("id").eq("user_id", current_user["id"]).single().execute()
    if not vendor.data:
        raise HTTPException(status_code=404, detail="Vendor profile not found")

    quotes = supabase_admin.table("quotes") \
        .select("*, rfps(*, material_requests(*)), quote_items(*)") \
        .eq("vendor_id", vendor.data["id"]) \
        .order("created_at", desc=True) \
        .execute()
    
    return quotes.data or []


class QuoteLineItem(BaseModel):
    item: str
    quantity: float
    unit: str
    unit_price: float
    total: float
    tax: Optional[float] = None


class QuoteCreate(BaseModel):
    total_amount: float
    currency: str = "INR"
    validity_period_days: int = 30
    delivery_timeline_days: Optional[int] = None
    terms: Optional[str] = None
    items: list[QuoteLineItem]


@router.post("/rfps/{rfp_id}/quotes", summary="Vendor submits a quote")
async def submit_quote(
    rfp_id: str,
    body: QuoteCreate,
    current_user: dict = Depends(require_roles("vendor")),
):
    vendor = supabase_admin.table("vendors").select("id").eq("user_id", current_user["id"]).single().execute()
    if not vendor.data:
        raise HTTPException(status_code=404, detail="Vendor profile not found")

    # Check RFP is still open
    rfp = supabase_admin.table("rfps").select("status").eq("id", rfp_id).single().execute()
    if not rfp.data or rfp.data["status"] != "open":
        raise HTTPException(status_code=409, detail="RFP is not accepting quotes")

    # Check no existing active quote from this vendor
    existing = supabase_admin.table("quotes") \
        .select("id") \
        .eq("rfp_id", rfp_id) \
        .eq("vendor_id", vendor.data["id"]) \
        .neq("status", "withdrawn") \
        .execute()
    if existing.data:
        raise HTTPException(status_code=409, detail="You already have an active quote for this RFP. Edit or withdraw it first.")

    quote_id = str(uuid.uuid4())
    supabase_admin.table("quotes").insert({
        "id": quote_id,
        "rfp_id": rfp_id,
        "vendor_id": vendor.data["id"],
        "total_amount": body.total_amount,
        "currency": body.currency,
        "validity_period_days": body.validity_period_days,
        "delivery_timeline_days": body.delivery_timeline_days,
        "terms": body.terms,
        "status": "submitted",
    }).execute()

    for item in body.items:
        supabase_admin.table("quote_items").insert({
            "id": str(uuid.uuid4()),
            "quote_id": quote_id,
            **item.model_dump(),
        }).execute()

    return {"quote_id": quote_id, "status": "submitted"}


@router.patch("/rfps/{rfp_id}/quotes/{quote_id}/withdraw", summary="Vendor withdraws their quote")
async def withdraw_quote(
    rfp_id: str,
    quote_id: str,
    current_user: dict = Depends(require_roles("vendor")),
):
    vendor = supabase_admin.table("vendors").select("id").eq("user_id", current_user["id"]).single().execute()
    result = supabase_admin.table("quotes") \
        .update({"status": "withdrawn"}) \
        .eq("id", quote_id) \
        .eq("rfp_id", rfp_id) \
        .eq("vendor_id", vendor.data["id"] if vendor.data else "") \
        .execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Quote not found or already withdrawn")
    return {"status": "withdrawn"}
