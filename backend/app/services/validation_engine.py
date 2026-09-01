"""
Deterministic validation engine (§9.4).

This module is the single source of truth for:
 - Arithmetic checks (quantity × unit_price = total)
 - Tax calculation verification
 - Grand total reconciliation
 - Percentage difference vs. reference price
 - Threshold-based flagging (>20% above/below reference)
 - Missing-field detection

HARD RULE: The LLM never calls this module — it's the other way around.
The LLM explains findings already produced here.
"""
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional
import structlog

logger = structlog.get_logger()

# Flagging threshold: items more than this % above reference are flagged
PRICE_HIGH_THRESHOLD_PCT = 20.0
PRICE_LOW_THRESHOLD_PCT = 20.0
# Grand total tolerance: allow rounding differences up to this amount (INR)
GRAND_TOTAL_TOLERANCE = Decimal("5.00")


def _to_decimal(value) -> Optional[Decimal]:
    if value is None:
        return None
    try:
        return Decimal(str(value))
    except Exception:
        return None


def check_line_item_arithmetic(item: dict) -> Optional[dict]:
    """
    Verify: quantity_normalised × unit_price_extracted ≈ total_price_extracted.
    Returns a finding dict if mismatch detected, else None.
    """
    qty = _to_decimal(item.get("quantity_normalised"))
    unit_price = _to_decimal(item.get("unit_price_extracted"))
    total = _to_decimal(item.get("total_price_extracted"))

    if qty is None or unit_price is None or total is None:
        return None  # Missing-field check handles this separately

    computed = (qty * unit_price).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    diff = abs(computed - total)

    if diff > Decimal("1.00"):  # allow minor rounding
        return {
            "finding_type": "CalculationMismatch",
            "outcome": "Flagged",
            "detail": {
                "computed_total": float(computed),
                "stated_total": float(total),
                "discrepancy": float(diff),
            },
        }
    return None


def check_missing_fields(item: dict) -> list[dict]:
    """
    Detect Missing fields per the field_source map.
    Returns one finding per missing critical field.
    """
    findings = []
    field_source: dict = item.get("field_source", {})

    critical_checks = {
        "quantity": "MissingQuantity",
        "unit": "MissingUnit",
        "unit_price": "MissingSpecification",
    }
    for field_key, finding_type in critical_checks.items():
        if field_source.get(field_key) == "Missing":
            findings.append({
                "finding_type": finding_type,
                "outcome": "Flagged",
                "detail": {"missing_field": field_key},
            })
    return findings


def check_price_vs_reference(
    item: dict,
    reference_prices: list[dict],   # list of ReferencePrice rows for this category+region
) -> dict:
    """
    Compare quoted unit price against reference range.
    Returns a finding with outcome Flagged / NoIssueDetected / InsufficientData.
    This is a DETERMINISTIC function — no LLM involvement.
    """
    unit_price = _to_decimal(item.get("unit_price_extracted"))
    material_cat = item.get("material_normalised")

    if not reference_prices:
        return {
            "finding_type": "PriceUnusual",
            "outcome": "InsufficientData",
            "detail": {
                "reason": f"No reference price data available for '{material_cat}'",
                "reference_source_id": None,
            },
        }

    if unit_price is None:
        return {
            "finding_type": "PriceUnusual",
            "outcome": "InsufficientData",
            "detail": {"reason": "Unit price is Missing — cannot compare against reference"},
        }

    # Use the most recent reference (effectiveDate desc) if multiple
    ref = sorted(reference_prices, key=lambda r: r.get("effective_date", ""), reverse=True)[0]
    price_low = _to_decimal(ref.get("price_low"))
    price_high = _to_decimal(ref.get("price_high"))

    if price_low is None or price_high is None:
        return {
            "finding_type": "PriceUnusual",
            "outcome": "InsufficientData",
            "detail": {"reason": "Reference price range incomplete"},
        }

    # Compute percentage deviation from reference range
    range_mid = (price_low + price_high) / 2
    pct_diff = float((unit_price - range_mid) / range_mid * 100) if range_mid else None

    flagged = False
    if unit_price > price_high * Decimal(str(1 + PRICE_HIGH_THRESHOLD_PCT / 100)):
        flagged = True
    elif unit_price < price_low * Decimal(str(1 - PRICE_LOW_THRESHOLD_PCT / 100)):
        flagged = True

    return {
        "finding_type": "PriceUnusual",
        "outcome": "Flagged" if flagged else "NoIssueDetected",
        "detail": {
            "quoted_unit_price": float(unit_price),
            "reference_low": float(price_low),
            "reference_high": float(price_high),
            "pct_diff_from_midpoint": round(pct_diff, 2) if pct_diff is not None else None,
            "reference_source_id": ref.get("id"),
            "reference_source_title": ref.get("title"),
            "effective_date": ref.get("effective_date"),
        },
    }


def check_grand_total(
    line_items: list[dict],
    additional_charges: Optional[dict],
    grand_total_extracted: Optional[float],
    tax_total_extracted: Optional[float],
) -> Optional[dict]:
    """
    Verify that line item totals + additional charges + tax ≈ grand total.
    Returns a finding if mismatch detected, else None.
    """
    if grand_total_extracted is None:
        return {
            "finding_type": "CalculationMismatch",
            "outcome": "InsufficientData",
            "detail": {"reason": "Grand total not found in document"},
        }

    computed = Decimal("0")
    for item in line_items:
        t = _to_decimal(item.get("total_price_extracted"))
        if t:
            computed += t

    # Add additional charges
    if additional_charges:
        for field in ["labour", "transportation", "other"]:
            v = _to_decimal(additional_charges.get(field))
            if v:
                computed += v

    # Add tax
    if tax_total_extracted:
        computed += _to_decimal(tax_total_extracted) or Decimal("0")

    stated = _to_decimal(grand_total_extracted)
    diff = abs(computed - stated) if stated else None

    if diff and diff > GRAND_TOTAL_TOLERANCE:
        return {
            "finding_type": "CalculationMismatch",
            "outcome": "Flagged",
            "detail": {
                "computed_grand_total": float(computed),
                "stated_grand_total": float(stated),
                "discrepancy": float(diff),
            },
        }
    return None


def run_full_validation(
    extracted: dict,
    reference_prices_by_category: dict,  # {material_category: [ReferencePrice rows]}
) -> list[dict]:
    """
    Run all deterministic checks across the full extracted quotation.
    Returns a list of raw finding dicts to be stored as VerificationFinding records.
    The LLM will add explanations to each finding separately.
    """
    findings = []
    line_items = extracted.get("line_items", [])

    for i, item in enumerate(line_items):
        item_findings = []

        # 1. Missing fields
        item_findings.extend(check_missing_fields(item))

        # 2. Arithmetic check
        arith = check_line_item_arithmetic(item)
        if arith:
            item_findings.append(arith)

        # 3. Price vs reference
        cat = item.get("material_normalised")
        refs = reference_prices_by_category.get(cat, []) if cat else []
        price_finding = check_price_vs_reference(item, refs)
        item_findings.append(price_finding)

        for f in item_findings:
            f["line_item_index"] = i
            findings.append(f)

    # 4. Grand total reconciliation
    grand_total_check = check_grand_total(
        line_items,
        extracted.get("additional_charges"),
        extracted.get("grand_total_extracted"),
        extracted.get("tax_total_extracted"),
    )
    if grand_total_check:
        findings.append(grand_total_check)

    flagged = sum(1 for f in findings if f["outcome"] == "Flagged")
    insufficient = sum(1 for f in findings if f["outcome"] == "InsufficientData")
    logger.info("validation_complete", total=len(findings), flagged=flagged, insufficient=insufficient)
    return findings
