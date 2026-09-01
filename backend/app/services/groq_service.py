"""
Groq LLM service.
Handles:
 1. Structured extraction of quotation line items from raw OCR text.
 2. LLM-assisted normalization (material descriptions → canonical categories).
 3. Plain-language explanation of already-determined flags.
 4. RAG answer generation (grounded on retrieved chunks).

Critical rules (§2.5, §9.4):
 - LLM NEVER decides whether something is flagged — it only explains flags
   already raised by the deterministic engine.
 - All numbers from the original text must be preserved unchanged.
 - If retrieval returns nothing relevant, return explicit "no grounded source" response.
"""
import json
from typing import Optional

import structlog
from groq import AsyncGroq
from tenacity import retry, stop_after_attempt, wait_exponential

from app.core.config import get_settings

logger = structlog.get_logger()
settings = get_settings()

groq_client = AsyncGroq(api_key=settings.groq_api_key)

# ── Extraction ───────────────────────────────────────────────────────────────

EXTRACTION_SYSTEM_PROMPT = """You are a precise data extraction assistant for construction quotation documents.

CRITICAL RULES — you MUST follow these without exception:
1. NEVER change, round, or infer any numerical value (quantities, prices, totals, tax amounts).
   If a number is in the document, copy it exactly. If it is absent, use null — never invent a number.
2. Tag each field with its source: "Extracted" (verbatim from document), "Normalised" (transformed to standard form),
   "Inferred" (logically implied but not stated), or "Missing" (absent and cannot be inferred).
3. If a field is ambiguous or unclear, set it as "Inferred" or "Missing" with a note — never guess silently.
4. Do NOT add items that are not in the document.
5. Return ONLY valid JSON matching the schema — no markdown, no explanation text outside the JSON.

OUTPUT SCHEMA:
{
  "vendor_info": { "name": str|null, "date": str|null, "quotation_number": str|null, "validity_period": str|null },
  "currency": str|null,  // e.g. "INR" — null if not detectable
  "line_items": [
    {
      "line_number": int,
      "description_extracted": str|null,
      "material_normalised": str|null,          // canonical material category
      "quantity_extracted": str|null,            // EXACT string from document
      "quantity_normalised": number|null,        // parsed numeric value — null if ambiguous
      "unit_extracted": str|null,
      "unit_normalised": str|null,               // canonical unit (e.g. "bag", "m³", "kg")
      "unit_price_extracted": number|null,       // EXACT value from document
      "total_price_extracted": number|null,      // EXACT value from document
      "tax": number|null,
      "field_source": {                          // per-field source tag
        "description": "Extracted"|"Inferred"|"Missing",
        "material_normalised": "Normalised"|"Missing",
        "quantity": "Extracted"|"Inferred"|"Missing",
        "quantity_normalised": "Normalised"|"Inferred"|"Missing",
        "unit": "Extracted"|"Inferred"|"Missing",
        "unit_normalised": "Normalised"|"Inferred"|"Missing",
        "unit_price": "Extracted"|"Inferred"|"Missing",
        "total_price": "Extracted"|"Inferred"|"Missing",
        "tax": "Extracted"|"Inferred"|"Missing"
      }
    }
  ],
  "additional_charges": {
    "labour": number|null,
    "transportation": number|null,
    "other": number|null,
    "field_source": { "labour": "Extracted"|"Inferred"|"Missing", "transportation": "Extracted"|"Inferred"|"Missing", "other": "Extracted"|"Inferred"|"Missing" }
  },
  "subtotal_extracted": number|null,
  "tax_total_extracted": number|null,
  "grand_total_extracted": number|null,           // EXACT value from document
  "payment_terms": str|null,
  "terms_and_conditions": str|null,
  "extraction_notes": str|null                    // any important caveats about readability
}
"""


@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))
async def extract_quotation_line_items(raw_text: str) -> dict:
    """
    Call Groq to perform structured extraction of a quotation.
    Returns a dict matching the schema above.
    Numbers are NEVER altered — the prompt enforces this explicitly.
    """
    logger.info("llm_extraction_start", text_length=len(raw_text))
    response = await groq_client.chat.completions.create(
        model=settings.groq_model,
        messages=[
            {"role": "system", "content": EXTRACTION_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": f"Extract all line items from this construction quotation document:\n\n{raw_text}",
            },
        ],
        temperature=0.0,   # deterministic extraction
        max_tokens=4096,
        response_format={"type": "json_object"},
    )
    raw_json = response.choices[0].message.content
    result = json.loads(raw_json)
    logger.info("llm_extraction_complete", line_items=len(result.get("line_items", [])))
    return result


# ── Explanation generation ───────────────────────────────────────────────────

EXPLANATION_SYSTEM_PROMPT = """You are a construction cost analysis assistant.
Your job is to explain, in plain language, why a specific issue was flagged in a contractor quotation.

CRITICAL RULES:
1. You explain only findings that the DETERMINISTIC engine has already identified.
   You do NOT decide whether something is flagged — that decision has already been made in code.
2. Every explanation must cite a specific source (reference price, standard, or extracted line item).
3. Do NOT invent numbers. Use only the numbers provided to you in the finding data.
4. Keep explanations concise (2–4 sentences), factual, and understandable by a non-technical reader.
5. Clearly distinguish between "No issue detected" (reference data existed and item was within range)
   and "Insufficient data" (no reference data was available to compare against).
"""


@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))
async def generate_finding_explanation(finding: dict, line_item: dict, reference_data: Optional[dict]) -> str:
    """
    Generate a plain-language explanation for a VerificationFinding.
    The finding's outcome (Flagged/NoIssueDetected/InsufficientData) has already been
    determined by deterministic code — the LLM only explains it.
    """
    context = json.dumps({
        "finding": finding,
        "line_item": line_item,
        "reference_data": reference_data,
    }, indent=2)

    response = await groq_client.chat.completions.create(
        model=settings.groq_model,
        messages=[
            {"role": "system", "content": EXPLANATION_SYSTEM_PROMPT},
            {"role": "user", "content": f"Explain this finding in plain language:\n{context}"},
        ],
        temperature=0.2,
        max_tokens=512,
    )
    return response.choices[0].message.content.strip()


@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))
async def generate_overall_summary(findings: list[dict], line_items: list[dict]) -> str:
    """Generate 2–3 sentence overall summary of the analysis. Grounded on deterministic findings only."""
    context = json.dumps({"findings": findings, "line_item_count": len(line_items)}, indent=2)
    response = await groq_client.chat.completions.create(
        model=settings.groq_model,
        messages=[
            {
                "role": "system",
                "content": (
                    "Summarise the quotation analysis in 2–3 plain-language sentences. "
                    "State how many items were flagged, how many had insufficient data, and the overall picture. "
                    "Do not make up findings not present in the data. "
                    "Remind the reader this is an analysis, not a certification."
                ),
            },
            {"role": "user", "content": context},
        ],
        temperature=0.2,
        max_tokens=300,
    )
    return response.choices[0].message.content.strip()


# ── RAG Chat ─────────────────────────────────────────────────────────────────

RAG_SYSTEM_PROMPT = """You are ConstructOS Assistant — a helpful AI for answering construction-related questions.

CRITICAL RULES:
1. Answer ONLY from the provided source documents. Do not use any knowledge not in the sources.
2. If the sources do not contain enough information to answer reliably, say explicitly:
   "I don't have a reliable grounded source for this question."
   Never fabricate an answer.
3. Cite your sources in your answer using the format [Source N] where N matches the source index provided.
4. Keep answers clear, concise, and appropriate for non-technical users.
5. If the user asks something outside construction/the platform's scope, politely redirect them.

DISCLAIMER (always true): Answers are generated from available sources and may be incomplete.
They are not a substitute for professional advice.
"""


@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))
async def generate_rag_answer(
    question: str,
    retrieved_chunks: list[dict],
    chat_history: list[dict],
) -> dict:
    """
    Generate a grounded RAG answer.
    Returns {"answer": str, "cited_chunk_ids": [uuid, ...], "grounded": bool}
    """
    if not retrieved_chunks:
        return {
            "answer": "I don't have a reliable grounded source for this question. Please consult a construction professional.",
            "cited_chunk_ids": [],
            "grounded": False,
        }

    sources_block = "\n\n".join(
        f"[Source {i+1}] (Document: {c['document_title']}, ID: {c['id']})\n{c['chunk_text']}"
        for i, c in enumerate(retrieved_chunks)
    )

    messages = [{"role": "system", "content": RAG_SYSTEM_PROMPT}]
    # Include last N messages of chat history for context
    messages.extend(chat_history[-6:])
    messages.append({
        "role": "user",
        "content": f"Sources:\n{sources_block}\n\nQuestion: {question}",
    })

    response = await groq_client.chat.completions.create(
        model=settings.groq_model,
        messages=messages,
        temperature=0.3,
        max_tokens=1024,
    )
    answer = response.choices[0].message.content.strip()
    cited_ids = [c["id"] for c in retrieved_chunks if f"[Source {retrieved_chunks.index(c)+1}]" in answer]
    return {"answer": answer, "cited_chunk_ids": cited_ids, "grounded": True}


@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))
async def generate_quotation_followup_answer(
    question: str,
    line_items: list[dict],
    findings: list[dict],
    retrieved_chunks: list[dict],
    chat_history: list[dict],
) -> dict:
    """
    Answer a follow-up question scoped to a specific uploaded quotation.
    Grounds on: extracted line items + findings + shared reference chunks.
    """
    quotation_context = json.dumps({
        "line_items": line_items[:20],   # cap to avoid token overflow
        "findings": findings,
    }, indent=2)

    sources_block = "\n\n".join(
        f"[Source {i+1}] {c['chunk_text']}" for i, c in enumerate(retrieved_chunks)
    )

    system = (
        "You are ConstructOS Assistant answering questions about a specific uploaded quotation.\n"
        "RULES:\n"
        "1. Answer ONLY using the quotation data (line items, findings) and the provided reference sources.\n"
        "2. If you cite a line item, reference it by its description and line number.\n"
        "3. If you cite a finding, reference its finding_type and explanation.\n"
        "4. If the question is unrelated to this quotation, say: 'This question is outside the scope of "
        "your uploaded quotation — please use the general chat for broader construction questions.'\n"
        "5. Never invent numbers or findings not present in the data.\n"
    )

    messages = [{"role": "system", "content": system}]
    messages.extend(chat_history[-6:])
    messages.append({
        "role": "user",
        "content": (
            f"Quotation data:\n{quotation_context}\n\n"
            f"Reference sources:\n{sources_block}\n\n"
            f"Question: {question}"
        ),
    })

    response = await groq_client.chat.completions.create(
        model=settings.groq_model,
        messages=messages,
        temperature=0.2,
        max_tokens=1024,
    )
    answer = response.choices[0].message.content.strip()
    return {"answer": answer, "grounded": True}
