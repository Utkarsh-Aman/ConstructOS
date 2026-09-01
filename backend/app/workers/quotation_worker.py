"""
Quotation processing worker.
Orchestrates the full pipeline (§10.2):
  Upload → Validate → Store file → OCR (PyPDF) → LLM Extraction →
  Deterministic Validation → Reference Lookup → LLM Explanation →
  Store findings → Mark analysis Complete/Failed
"""
import io
import uuid
from datetime import datetime

import structlog
from fastapi import BackgroundTasks

from app.db.supabase_client import supabase_admin
from app.core.config import get_settings
from app.services.pdf_service import extract_text_from_pdf, guard_numerical_integrity
from app.services.groq_service import (
    extract_quotation_line_items,
    generate_finding_explanation,
    generate_overall_summary,
)
from app.services.validation_engine import run_full_validation

logger = structlog.get_logger()
settings = get_settings()


async def process_quotation(uploaded_quotation_id: str) -> None:
    """
    Full async pipeline for processing an uploaded quotation.
    Runs as a FastAPI BackgroundTask — status updates are written to DB
    so the polling endpoint can reflect progress.
    """
    log = logger.bind(quotation_id=uploaded_quotation_id)
    log.info("pipeline_start")

    def update_status(status: str):
        supabase_admin.table("uploaded_quotations") \
            .update({"status": status, "updated_at": datetime.utcnow().isoformat()}) \
            .eq("id", uploaded_quotation_id) \
            .execute()

    try:
        # ── 1. Fetch quotation record ────────────────────────────────────────
        update_status("Processing")
        rec = supabase_admin.table("uploaded_quotations") \
            .select("*") \
            .eq("id", uploaded_quotation_id) \
            .single() \
            .execute().data

        if not rec:
            log.error("quotation_not_found")
            return

        # ── 2. Download file from Supabase Storage ───────────────────────────
        log.info("step_download")
        file_bytes = supabase_admin.storage.from_(settings.quotations_bucket) \
            .download(rec["file_url"])

        # ── 3. PDF text extraction (PyPDF) ───────────────────────────────────
        log.info("step_ocr")
        if rec.get("file_type", "").endswith("pdf") or "pdf" in rec.get("file_type", ""):
            ocr_result = extract_text_from_pdf(file_bytes)
        else:
            # Image files: basic fallback message (extend with Tesseract later)
            ocr_result = {
                "raw_text": "[Image-based document: text extraction not fully supported yet]",
                "page_count": 1,
                "confidence": 0.3,
                "pages": [],
            }

        # Store OCR document record
        doc_id = str(uuid.uuid4())
        supabase_admin.table("quotation_documents").insert({
            "id": doc_id,
            "uploaded_quotation_id": uploaded_quotation_id,
            "raw_ocr_text": ocr_result["raw_text"],
            "page_count": ocr_result["page_count"],
            "ocr_confidence": ocr_result["confidence"],
        }).execute()

        # ── 4. LLM structured extraction ─────────────────────────────────────
        log.info("step_llm_extraction")
        extracted = await extract_quotation_line_items(ocr_result["raw_text"])

        # Numerical integrity guard — warn if any numbers went missing
        missing_nums = guard_numerical_integrity(ocr_result["raw_text"], extracted)
        if missing_nums:
            log.warning("numerical_integrity_issue", missing=missing_nums)

        # Store QuotationLineItem records
        line_items = extracted.get("line_items", [])
        stored_line_items = []
        for item in line_items:
            item_id = str(uuid.uuid4())
            row = {
                "id": item_id,
                "quotation_document_id": doc_id,
                "line_number": item.get("line_number"),
                "description_extracted": item.get("description_extracted"),
                "material_normalised": item.get("material_normalised"),
                "quantity_extracted": str(item.get("quantity_extracted") or ""),
                "quantity_normalised": item.get("quantity_normalised"),
                "unit_extracted": item.get("unit_extracted"),
                "unit_normalised": item.get("unit_normalised"),
                "unit_price_extracted": item.get("unit_price_extracted"),
                "total_price_extracted": item.get("total_price_extracted"),
                "field_source": item.get("field_source", {}),
            }
            supabase_admin.table("quotation_line_items").insert(row).execute()
            stored_line_items.append({**row, **item})

        # ── 5. Create QuotationAnalysis record ───────────────────────────────
        analysis_id = str(uuid.uuid4())
        supabase_admin.table("quotation_analyses").insert({
            "id": analysis_id,
            "uploaded_quotation_id": uploaded_quotation_id,
            "status": "Pending",
            "started_at": datetime.utcnow().isoformat(),
        }).execute()

        # ── 6. Fetch reference prices for each normalized category ────────────
        log.info("step_reference_lookup")
        categories = list({
            item.get("material_normalised") for item in stored_line_items
            if item.get("material_normalised")
        })
        reference_prices_by_category: dict[str, list] = {}
        for cat in categories:
            ref_result = supabase_admin.table("reference_prices") \
                .select("*, reference_sources(title, source_type, region, published_date)") \
                .eq("material_category", cat) \
                .eq("status", "Active") \
                .execute()
            reference_prices_by_category[cat] = ref_result.data or []

        # ── 7. Deterministic validation ───────────────────────────────────────
        log.info("step_deterministic_validation")
        raw_findings = run_full_validation(extracted, reference_prices_by_category)

        # ── 8. LLM explanation for each finding ───────────────────────────────
        log.info("step_llm_explanation", finding_count=len(raw_findings))
        stored_findings = []
        for raw in raw_findings:
            line_idx = raw.get("line_item_index")
            line_item = stored_line_items[line_idx] if line_idx is not None and line_idx < len(stored_line_items) else {}
            ref_data = raw.get("detail", {})

            explanation = await generate_finding_explanation(raw, line_item, ref_data)

            ref_source_id = raw.get("detail", {}).get("reference_source_id")
            finding_id = str(uuid.uuid4())
            finding_row = {
                "id": finding_id,
                "analysis_id": analysis_id,
                "line_item_id": line_item.get("id"),
                "finding_type": raw["finding_type"],
                "outcome": raw["outcome"],
                "explanation": explanation,
                "reference_source_id": ref_source_id,
                "confidence": "High" if ocr_result["confidence"] > 0.8 else (
                    "Medium" if ocr_result["confidence"] > settings.ocr_confidence_threshold else "Low"
                ),
            }
            supabase_admin.table("verification_findings").insert(finding_row).execute()
            stored_findings.append({**finding_row, "detail": raw.get("detail", {})})

        # ── 9. Overall summary (LLM) ─────────────────────────────────────────
        log.info("step_overall_summary")
        summary = await generate_overall_summary(stored_findings, stored_line_items)

        # Determine overall confidence
        if ocr_result["confidence"] < settings.ocr_confidence_threshold:
            overall_confidence = "Low"
        elif any(f["outcome"] == "InsufficientData" for f in stored_findings):
            overall_confidence = "Medium"
        else:
            overall_confidence = "High"

        # ── 10. Mark analysis complete ────────────────────────────────────────
        supabase_admin.table("quotation_analyses").update({
            "status": "Completed",
            "overall_summary": summary,
            "overall_confidence": overall_confidence,
            "completed_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        }).eq("id", analysis_id).execute()

        update_status("Ready")
        log.info("pipeline_complete", analysis_id=analysis_id)

    except Exception as exc:
        log.exception("pipeline_failed", error=str(exc))
        update_status("Failed")
        # Mark analysis failed if it was created
        try:
            supabase_admin.table("quotation_analyses").update({
                "status": "Failed",
                "updated_at": datetime.utcnow().isoformat(),
            }).eq("uploaded_quotation_id", uploaded_quotation_id).execute()
        except Exception:
            pass
