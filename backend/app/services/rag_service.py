"""
RAG (Retrieval-Augmented Generation) service.
Handles:
 1. Embedding generation for chunks and queries.
 2. Vector similarity search against rag_chunks via pgvector.
 3. Scoped retrieval by project_id and company_id.
 4. Assembling retrieved context for the LLM.
"""
import asyncio
import uuid
from typing import Optional

import structlog
from sentence_transformers import SentenceTransformer

from app.db.supabase_client import supabase_admin
from app.core.config import get_settings

logger = structlog.get_logger()
settings = get_settings()

# Load embedding model once at module level
_embedding_model: Optional[SentenceTransformer] = None
EMBEDDING_MODEL_NAME = "all-MiniLM-L6-v2"   # 384-dim; fast and free; swap to larger for production
SIMILARITY_THRESHOLD = 0.25
TOP_K = 6


def get_embedding_model() -> SentenceTransformer:
    global _embedding_model
    if _embedding_model is None:
        logger.info("loading_embedding_model", model=EMBEDDING_MODEL_NAME)
        _embedding_model = SentenceTransformer(EMBEDDING_MODEL_NAME)
    return _embedding_model


async def embed_text(text: str) -> list[float]:
    """Generate an embedding vector for a text string."""
    loop = asyncio.get_event_loop()
    model = get_embedding_model()
    vector = await loop.run_in_executor(None, lambda: model.encode(text).tolist())
    return vector


async def retrieve_relevant_chunks(
    query: str,
    top_k: int = TOP_K,
    project_id: Optional[str] = None,
    filter_source_types: Optional[list[str]] = None,
    include_global_kb: bool = False,
) -> list[dict]:
    """
    Embed the query and retrieve relevant chunks.
    When project_id is provided, fetches the project's documents & chunks and computes
    exact cosine similarity in NumPy.
    If include_global_kb is True, supplements project chunks with national / BIS construction standards.
    When project_id is None, uses pgvector similarity search across the global knowledge base.
    """
    import json
    import numpy as np

    query_embedding = await embed_text(query)

    if project_id:
        # 1. Fetch document IDs belonging to this project
        doc_res = supabase_admin.table("rag_documents") \
            .select("id, title, project_name, company_name") \
            .eq("project_id", project_id) \
            .execute()
        docs = doc_res.data or []
        doc_map = {d["id"]: d for d in docs}
        doc_ids = list(doc_map.keys())

        top_chunks = []
        if doc_ids:
            # 2. Fetch all chunks belonging to these project documents
            chunk_res = supabase_admin.table("rag_chunks") \
                .select("id, document_id, chunk_index, chunk_text, embedding") \
                .in_("document_id", doc_ids) \
                .execute()
            chunks = chunk_res.data or []

            # 3. Vectorized exact cosine similarity
            q_arr = np.array(query_embedding, dtype=np.float32)
            q_norm = np.linalg.norm(q_arr)
            if q_norm > 0 and chunks:
                scored = []
                for c in chunks:
                    emb = c.get("embedding")
                    if not emb:
                        continue
                    if isinstance(emb, str):
                        emb = json.loads(emb)
                    c_arr = np.array(emb, dtype=np.float32)
                    c_norm = np.linalg.norm(c_arr)
                    if c_norm == 0:
                        continue
                    sim = float(np.dot(q_arr, c_arr) / (q_norm * c_norm))
                    c_copy = dict(c)
                    c_copy.pop("embedding", None)
                    c_copy["similarity"] = sim
                    c_copy["source_scope"] = "Project Document"
                    d_info = doc_map.get(c["document_id"], {})
                    c_copy["document_title"] = d_info.get("title")
                    c_copy["project_name"] = d_info.get("project_name")
                    c_copy["company_name"] = d_info.get("company_name")
                    scored.append((sim, c_copy))

                scored.sort(key=lambda x: x[0], reverse=True)
                top_chunks = [c for sim, c in scored[:top_k] if sim >= 0.15]

        # 4. If include_global_kb is True, supplement with national standards & BIS codes
        if include_global_kb:
            try:
                global_params = {
                    "query_embedding": query_embedding,
                    "match_threshold": 0.10,
                    "match_count": 4,
                }
                global_res = supabase_admin.rpc("match_rag_chunks", global_params).execute()
                for gc in (global_res.data or []):
                    gc_copy = dict(gc)
                    gc_copy["source_scope"] = "National / BIS Standard"
                    top_chunks.append(gc_copy)
            except Exception as e:
                logger.warning("supplement_global_kb_failed", error=str(e))

        logger.info(
            "rag_project_retrieval_success",
            project_id=project_id,
            chunk_count=len(top_chunks),
            included_global=include_global_kb,
        )
        return top_chunks

    # Public/Global search across massive knowledge base
    params = {
        "query_embedding": query_embedding,
        "match_threshold": SIMILARITY_THRESHOLD,
        "match_count": top_k,
    }

    result = supabase_admin.rpc("match_rag_chunks", params).execute()
    chunks = result.data or []

    if not chunks:
        logger.info("rag_retrieval_empty", query_preview=query[:80])
        return []

    logger.info("rag_retrieval_success", chunk_count=len(chunks), project_scoped=False)
    return chunks


async def ingest_document(
    document_id: str,
    document_title: str,
    source_type: str,
    text: str,
    project_id: Optional[str] = None,
    company_id: Optional[str] = None,
    project_name: Optional[str] = None,
    company_name: Optional[str] = None,
    chunk_size: int = 700,
    overlap: int = 100,
) -> int:
    """
    Split text into overlapping chunks, embed each, and store in rag_chunks with metadata.
    Returns number of chunks stored.
    """
    chunks = []
    start = 0
    while start < len(text):
        end = min(start + chunk_size, len(text))
        chunk_text = text[start:end].strip()
        if chunk_text:
            chunks.append(chunk_text)
        start += chunk_size - overlap

    logger.info("rag_ingestion_start", document_id=document_id, chunk_count=len(chunks))

    model = get_embedding_model()
    stored = 0
    batch_size = 50

    for i in range(0, len(chunks), batch_size):
        batch_texts = chunks[i:i + batch_size]
        loop = asyncio.get_event_loop()
        embeddings = await loop.run_in_executor(None, lambda: model.encode(batch_texts).tolist())

        db_rows = []
        for idx, (chunk_str, emb) in enumerate(zip(batch_texts, embeddings)):
            db_rows.append({
                "id": str(uuid.uuid4()),
                "document_id": document_id,
                "chunk_text": chunk_str,
                "embedding": emb,
                "chunk_index": i + idx,
                "project_id": project_id,
                "company_id": company_id,
            })

        supabase_admin.table("rag_chunks").insert(db_rows).execute()
        stored += len(db_rows)

    logger.info("rag_ingestion_complete", stored=stored)
    return stored
