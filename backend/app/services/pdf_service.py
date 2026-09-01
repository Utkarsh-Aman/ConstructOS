"""
PDF text extraction service using PyPDF.
Rules from PRD:
- Never alter numerical figures during extraction or LLM restructuring.
- Store raw OCR text separately (QuotationDocument.raw_ocr_text).
- Track confidence; if low, surface a warning — do not reject.
"""
import io
import re
from pathlib import Path
from typing import Optional

import structlog
from pypdf import PdfReader

logger = structlog.get_logger()

ALLOWED_TYPES = {"application/pdf", "image/jpeg", "image/png", "image/webp"}
ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".webp"}
MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024  # 20 MB


def validate_file(filename: str, content_type: str, size_bytes: int, max_mb: int = 20) -> None:
    """Raise ValueError if the file fails pre-processing validation."""
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(f"Unsupported file type '{ext}'. Supported: PDF, JPG, PNG.")
    if content_type not in ALLOWED_TYPES:
        raise ValueError(f"Unsupported content type '{content_type}'.")
    if size_bytes > max_mb * 1024 * 1024:
        raise ValueError(f"File size exceeds the {max_mb} MB limit.")


def extract_text_from_pdf(file_bytes: bytes) -> dict:
    """
    Extract raw text from a PDF using PyPDF.
    Returns:
        {
            "raw_text": str,
            "page_count": int,
            "confidence": float,   # 1.0 = fully text-based; lower = image-heavy
            "pages": [str, ...]    # per-page text
        }

    IMPORTANT: This function is READ-ONLY — it never modifies numerical values.
    The raw text is stored verbatim and passed to the LLM as-is.
    """
    reader = PdfReader(io.BytesIO(file_bytes))
    pages: list[str] = []
    text_pages = 0

    for page in reader.pages:
        page_text = page.extract_text() or ""
        pages.append(page_text)
        if page_text.strip():
            text_pages += 1

    raw_text = "\n\n--- PAGE BREAK ---\n\n".join(pages)
    page_count = len(reader.pages)
    # Rough confidence: ratio of pages with extractable text
    confidence = text_pages / page_count if page_count > 0 else 0.0

    logger.info(
        "pdf_extracted",
        page_count=page_count,
        text_pages=text_pages,
        confidence=round(confidence, 2),
        char_count=len(raw_text),
    )

    return {
        "raw_text": raw_text,
        "page_count": page_count,
        "confidence": round(confidence, 2),
        "pages": pages,
    }


def _numbers_match(original: str, processed: str) -> bool:
    """
    Verify that all numbers present in the original text are preserved unchanged
    in the LLM-processed output. Used as a post-processing guard (§2.5 / §9.4).
    """
    def extract_numbers(text: str) -> list[str]:
        # Match integers and decimals, including comma-separated (e.g. 1,50,000)
        return re.findall(r"\b[\d,]+(?:\.\d+)?\b", text)

    orig_nums = sorted(extract_numbers(original))
    proc_nums = sorted(extract_numbers(processed))
    return orig_nums == proc_nums


def guard_numerical_integrity(original_text: str, structured_output: dict) -> list[str]:
    """
    Post-extraction guard: checks that every number from the raw OCR text
    appears somewhere in the structured output.
    Returns a list of numbers that appear to be missing (empty = all good).
    This is a best-effort check; deterministic arithmetic validation happens
    later in the validation engine.
    """
    import re

    def extract_numbers(text: str) -> set[str]:
        return set(re.findall(r"\b[\d,]+(?:\.\d+)?\b", text))

    orig_nums = extract_numbers(original_text)
    output_str = str(structured_output)
    out_nums = extract_numbers(output_str)
    missing = orig_nums - out_nums
    if missing:
        logger.warning("numerical_integrity_check_failed", missing_numbers=list(missing))
    return list(missing)
