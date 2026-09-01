"""
RAG (Retrieval-Augmented Generation) service.
Handles:
 1. Embedding generation for chunks and queries.
 2. Vector similarity search against rag_chunks via pgvector.
 3. Assembling retrieved context for the LLM.
"""
import asyncio
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
SIMILARITY_THRESHOLD = 0.4
TOP_K = 5


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
    filter_source_types: Optional[list[str]] = None,
) -> list[dict]:
    """
    Embed the query and search rag_chunks via pgvector cosine similarity.
    Returns top-k chunks with their document metadata.
    """
    query_embedding = await embed_text(query)

    # Use Supabase RPC for pgvector similarity search
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

    logger.info("rag_retrieval_success", chunk_count=len(chunks))
    return chunks


async def ingest_document(
    document_id: str,
    document_title: str,
    source_type: str,
    text: str,
    chunk_size: int = 512,
    overlap: int = 64,
) -> int:
    """
    Split text into overlapping chunks, embed each, and store in rag_chunks.
    Returns number of chunks stored.
    """
    # Simple token-aware chunking by characters (replace with tiktoken for production)
    chunks = []
    start = 0
    while start < len(text):
        end = min(start + chunk_size, len(text))
        chunk_text = text[start:end]
        if chunk_text.strip():
            chunks.append(chunk_text)
        start += chunk_size - overlap

    logger.info("rag_ingestion_start", document_id=document_id, chunk_count=len(chunks))

    stored = 0
    for idx, chunk_text in enumerate(chunks):
        embedding = await embed_text(chunk_text)
        supabase_admin.table("rag_chunks").insert({
            "document_id": document_id,
            "chunk_text": chunk_text,
            "embedding": embedding,
            "chunk_index": idx,
        }).execute()
        stored += 1

    logger.info("rag_ingestion_complete", stored=stored)
    return stored
