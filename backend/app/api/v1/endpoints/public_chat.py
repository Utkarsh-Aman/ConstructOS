"""
Public RAG chatbot and quotation follow-up chat endpoints.
Both scopes reuse shared retrieval infrastructure (§10.2).
"""
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.security import get_anonymous_session
from app.db.supabase_client import supabase_admin
from app.services.rag_service import retrieve_relevant_chunks
from app.services.groq_service import generate_rag_answer, generate_quotation_followup_answer

router = APIRouter()


class MessageRequest(BaseModel):
    content: str
    chat_session_id: str | None = None
    quotation_id: str | None = None   # set for QuotationFollowUp scope


@router.post("/message", summary="Send a message to the RAG chatbot or quotation follow-up chat")
async def send_message(
    body: MessageRequest,
    session: dict = Depends(get_anonymous_session),
):
    is_followup = body.quotation_id is not None
    scope = "QuotationFollowUp" if is_followup else "General"

    # --- Get or create chat session ---
    chat_session_id = body.chat_session_id
    if not chat_session_id:
        cs_id = str(uuid.uuid4())
        supabase_admin.table("chat_sessions").insert({
            "id": cs_id,
            "anonymous_session_id": session["id"],
            "scope": scope,
            "uploaded_quotation_id": body.quotation_id,
        }).execute()
        chat_session_id = cs_id
    else:
        # Validate it belongs to this session
        cs_result = supabase_admin.table("chat_sessions") \
            .select("id, scope") \
            .eq("id", chat_session_id) \
            .eq("anonymous_session_id", session["id"]) \
            .single() \
            .execute()
        if not cs_result.data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat session not found")

    # --- Rate limit: messages per session ---
    msg_count = supabase_admin.table("chat_messages") \
        .select("id", count="exact") \
        .eq("chat_session_id", chat_session_id) \
        .execute()
    from app.core.config import get_settings
    s = get_settings()
    if (msg_count.count or 0) >= s.public_chat_max_messages_per_session:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Message limit reached for this session.",
        )

    # --- Store user message ---
    user_msg_id = str(uuid.uuid4())
    supabase_admin.table("chat_messages").insert({
        "id": user_msg_id,
        "chat_session_id": chat_session_id,
        "role": "User",
        "content": body.content,
    }).execute()

    # --- Load recent chat history for context ---
    history_result = supabase_admin.table("chat_messages") \
        .select("role, content") \
        .eq("chat_session_id", chat_session_id) \
        .order("created_at") \
        .limit(12) \
        .execute()
    chat_history = [
        {"role": m["role"].lower(), "content": m["content"]}
        for m in (history_result.data or [])
    ]

    # --- Retrieve relevant chunks from knowledge base ---
    retrieved_chunks = await retrieve_relevant_chunks(body.content)

    # --- Generate answer ---
    if is_followup and body.quotation_id:
        # Verify ownership
        q_result = supabase_admin.table("uploaded_quotations") \
            .select("id, status") \
            .eq("id", body.quotation_id) \
            .eq("anonymous_session_id", session["id"]) \
            .single() \
            .execute()
        if not q_result.data or q_result.data["status"] != "Ready":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis not found or not ready")

        # Fetch line items and findings for context
        doc = supabase_admin.table("quotation_documents") \
            .select("id") \
            .eq("uploaded_quotation_id", body.quotation_id) \
            .single() \
            .execute().data or {}

        line_items = supabase_admin.table("quotation_line_items") \
            .select("*") \
            .eq("quotation_document_id", doc.get("id", "")) \
            .execute().data or []

        analysis = supabase_admin.table("quotation_analyses") \
            .select("id") \
            .eq("uploaded_quotation_id", body.quotation_id) \
            .single() \
            .execute().data or {}

        findings = supabase_admin.table("verification_findings") \
            .select("*") \
            .eq("analysis_id", analysis.get("id", "")) \
            .execute().data or []

        result = await generate_quotation_followup_answer(
            question=body.content,
            line_items=line_items,
            findings=findings,
            retrieved_chunks=retrieved_chunks,
            chat_history=chat_history,
        )
    else:
        result = await generate_rag_answer(
            question=body.content,
            retrieved_chunks=retrieved_chunks,
            chat_history=chat_history,
        )

    # --- Store assistant message ---
    asst_msg_id = str(uuid.uuid4())
    supabase_admin.table("chat_messages").insert({
        "id": asst_msg_id,
        "chat_session_id": chat_session_id,
        "role": "Assistant",
        "content": result["answer"],
    }).execute()

    # --- Store citations ---
    for chunk_id in result.get("cited_chunk_ids", []):
        supabase_admin.table("chat_citations").insert({
            "chat_message_id": asst_msg_id,
            "citation_type": "RAGDocument",
            "cited_entity_id": chunk_id,
        }).execute()

    # Enrich chunks with citation metadata for UI
    sources = [
        {
            "id": c["id"],
            "document_title": c.get("document_title"),
            "chunk_text": c["chunk_text"][:200] + "..." if len(c.get("chunk_text", "")) > 200 else c.get("chunk_text"),
        }
        for c in retrieved_chunks
        if c["id"] in result.get("cited_chunk_ids", [])
    ]

    return {
        "chat_session_id": chat_session_id,
        "message_id": asst_msg_id,
        "answer": result["answer"],
        "grounded": result.get("grounded", False),
        "sources": sources,
        "disclaimer": "Answers are generated from available sources and may be incomplete — not a substitute for professional advice.",
    }
