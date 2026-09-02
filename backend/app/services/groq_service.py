"""
Groq LLM service.
Handles:
 1. Structured extraction of quotation line items from raw OCR text.
 2. Plain-language explanation of already-determined flags.
 3. Public RAG answer generation (helpful, comprehensive, no citations).
 4. Project-scoped RAG answer generation (strictly project documents, no citations).
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

FALLBACK_MODELS = [
    settings.groq_model,
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
    "qwen/qwen3.8-27b",
    "groq/compound",
]


async def call_groq_with_fallback(**kwargs):
    """Executes a Groq chat completion with automatic model fallback."""
    last_err = None
    for model_name in FALLBACK_MODELS:
        try:
            call_kwargs = dict(kwargs)
            call_kwargs["model"] = model_name
            return await groq_client.chat.completions.create(**call_kwargs)
        except Exception as err:
            last_err = err
            logger.warning("groq_model_fallback", failed_model=model_name, error=str(err))
            continue
    raise last_err


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
  "currency": str|null,
  "line_items": [
    {
      "line_number": int,
      "description_extracted": str|null,
      "material_normalised": str|null,
      "quantity_extracted": str|null,
      "quantity_normalised": number|null,
      "unit_extracted": str|null,
      "unit_normalised": str|null,
      "unit_price_extracted": number|null,
      "total_price_extracted": number|null,
      "tax": number|null,
      "field_source": {
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
  "grand_total_extracted": number|null,
  "payment_terms": str|null,
  "terms_and_conditions": str|null,
  "extraction_notes": str|null
}
"""


@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))
async def extract_quotation_line_items(raw_text: str) -> dict:
    logger.info("llm_extraction_start", text_length=len(raw_text))
    response = await call_groq_with_fallback(
        messages=[
            {"role": "system", "content": EXTRACTION_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": f"Extract all line items from this construction quotation document:\n\n{raw_text}",
            },
        ],
        temperature=0.0,
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
    context = json.dumps({
        "finding": finding,
        "line_item": line_item,
        "reference_data": reference_data,
    }, indent=2)

    response = await call_groq_with_fallback(
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
    context = json.dumps({"findings": findings, "line_item_count": len(line_items)}, indent=2)
    response = await call_groq_with_fallback(
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


# ── Public RAG Chat (General, Friendly, Flexible) ─────────────────────────────

PUBLIC_RAG_SYSTEM_PROMPT = """You are ConstructOS Assistant — a friendly, knowledgeable, and expert AI assistant for construction, civil engineering, architecture, building materials, waterproofing, glazing, site safety, and project workflows.

GUIDELINES:
1. Provide helpful, informative, and well-structured answers to user questions.
2. Use the provided reference context when relevant to provide accurate, concrete facts and specifications.
3. If the user asks general engineering or construction questions (such as waterproofing methods, drainage in curtain glazing, cement ratios, rebar spacing, safety rules), explain the concept clearly and thoroughly using sound engineering principles.
4. Format your response cleanly using markdown (bullet points, bold text for key terms).
5. DO NOT include bracketed citation tags like [Source 1], [Source 2], or chunk IDs in your answer. Write naturally and directly.
6. Maintain a helpful, professional, and accessible tone for contractors, site engineers, and property owners.
"""


@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))
async def generate_rag_answer(
    question: str,
    retrieved_chunks: list[dict],
    chat_history: list[dict],
) -> dict:
    """
    Generate a helpful, grounded RAG answer for public chat (no citations tags).
    """
    sources_text = ""
    if retrieved_chunks:
        sources_text = "\n\n".join(
            f"--- Reference Excerpt {i+1} ---\n{c['chunk_text']}"
            for i, c in enumerate(retrieved_chunks)
        )

    messages = [{"role": "system", "content": PUBLIC_RAG_SYSTEM_PROMPT}]
    messages.extend(chat_history[-6:])

    if sources_text:
        messages.append({
            "role": "user",
            "content": f"Reference Knowledge:\n{sources_text}\n\nUser Question: {question}",
        })
    else:
        messages.append({
            "role": "user",
            "content": question,
        })

    response = await call_groq_with_fallback(
        messages=messages,
        temperature=0.4,
        max_tokens=1024,
    )
    answer = response.choices[0].message.content.strip()
    return {"answer": answer, "grounded": bool(retrieved_chunks)}


# ── Project-Scoped RAG Chat (Strictly Project Documents) ──────────────────────

PROJECT_RAG_SYSTEM_PROMPT = """You are the AI Project Assistant for the construction project "{project_name}".

GUIDELINES:
1. Answer the user's questions clearly, thoroughly, and helpfully using the provided uploaded documents, drawings, reports, master plans, and specifications for this project.
2. If the user asks about teams, people, roles, pool names, timelines, specifications, dimensions, materials, or rules mentioned in the document excerpts, provide a complete, well-organized response.
3. If the provided excerpts genuinely do not contain information to answer the question, state politely:
   "The uploaded documents for project '{project_name}' do not contain information regarding this topic."
4. Format your answer cleanly in markdown (bullet points, bold text for key terms). DO NOT output bracketed citation tags like [Source 1] or chunk IDs.
"""

PROJECT_AND_STANDARDS_SYSTEM_PROMPT = """You are the AI Project & Engineering Standards Assistant for the project "{project_name}".

GUIDELINES:
1. You have access to two knowledge sources in the provided excerpts:
   - Project Documents (Master plans, drawings, and specifications for "{project_name}")
   - National Construction Standards & BIS Codes (IS codes, safety rules, materials, engineering best practices)
2. Provide a comprehensive, professional answer combining project-specific details and relevant national construction standards / BIS codes.
3. If project documents specify a custom detail, prioritize the project requirement and note any applicable BIS standard.
4. Format your answer cleanly in markdown (bullet points, tables, bold text). DO NOT output bracketed citation tags like [Source 1] or chunk IDs.
"""


@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))
async def generate_project_rag_answer(
    question: str,
    project_name: str,
    retrieved_chunks: list[dict],
    chat_history: list[dict],
    include_global_kb: bool = False,
) -> dict:
    """
    Generate an answer grounded on project documents (and optionally national standards & BIS codes).
    """
    if not retrieved_chunks:
        return {
            "answer": f"The uploaded documents and master plans for project '{project_name}' do not contain information regarding this topic. Please upload relevant drawings or specification PDFs to query them.",
            "grounded": False,
        }

    sources_text = "\n\n".join(
        f"--- {c.get('source_scope', 'Document')} Excerpt {i+1} ({c.get('document_title', 'Project Plan')}) ---\n{c['chunk_text']}"
        for i, c in enumerate(retrieved_chunks)
    )

    template = PROJECT_AND_STANDARDS_SYSTEM_PROMPT if include_global_kb else PROJECT_RAG_SYSTEM_PROMPT
    system_prompt = template.format(project_name=project_name)
    messages = [{"role": "system", "content": system_prompt}]
    messages.extend(chat_history[-6:])
    messages.append({
        "role": "user",
        "content": f"Knowledge Excerpts:\n{sources_text}\n\nQuestion: {question}",
    })

    response = await call_groq_with_fallback(
        messages=messages,
        temperature=0.3 if include_global_kb else 0.2,
        max_tokens=1024,
    )
    answer = response.choices[0].message.content.strip()
    return {"answer": answer, "grounded": True}


@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))
async def generate_quotation_followup_answer(
    question: str,
    line_items: list[dict],
    findings: list[dict],
    retrieved_chunks: list[dict],
    chat_history: list[dict],
) -> dict:
    quotation_context = json.dumps({
        "line_items": line_items[:20],
        "findings": findings,
    }, indent=2)

    sources_block = "\n\n".join(
        f"--- Reference Source {i+1} ---\n{c['chunk_text']}" for i, c in enumerate(retrieved_chunks)
    )

    system = (
        "You are ConstructOS Assistant answering questions about a specific uploaded quotation.\n"
        "RULES:\n"
        "1. Answer using the quotation data (line items, findings) and provided reference sources.\n"
        "2. If you cite a line item, reference it by its description and line number.\n"
        "3. Do not include bracketed citation numbers. Write naturally.\n"
        "4. Never invent numbers or findings not present in the data.\n"
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

    response = await call_groq_with_fallback(
        messages=messages,
        temperature=0.2,
        max_tokens=1024,
    )
    answer = response.choices[0].message.content.strip()
    return {"answer": answer, "grounded": True}
