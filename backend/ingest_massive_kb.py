"""
Optimized streaming ingestion script for massive_knowledge_base.pdf (3,709 pages).
Streams text, embeds in batches of 40-50 chunks, and immediately inserts into Supabase.
100% local embedding model (all-MiniLM-L6-v2) — 0 Groq LLM tokens consumed.
"""
import os
import sys
import uuid
import time
from pypdf import PdfReader
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv

load_dotenv()

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.supabase_client import supabase_admin

PDF_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "app", "services", "massive_knowledge_base.pdf")
MODEL_NAME = "all-MiniLM-L6-v2"
CHUNK_SIZE = 800
CHUNK_OVERLAP = 120
BATCH_SIZE = 50

def main():
    if not os.path.exists(PDF_PATH):
        print(f"Error: PDF not found at {PDF_PATH}", flush=True)
        return

    print(f"=== Starting Ingestion of {os.path.basename(PDF_PATH)} ===", flush=True)
    print(f"File size: {os.path.getsize(PDF_PATH) / (1024*1024):.2f} MB", flush=True)

    # 1. Load local SentenceTransformer embedding model
    print(f"Loading local embedding model: {MODEL_NAME}...", flush=True)
    model = SentenceTransformer(MODEL_NAME)
    print("Embedding model loaded successfully.", flush=True)

    # 2. Get or Create RAG Document record
    doc_title = "Massive Construction & Civil Engineering Knowledge Base"
    existing_doc = supabase_admin.table("rag_documents").select("id").eq("title", doc_title).execute()

    if existing_doc.data and len(existing_doc.data) > 0:
        doc_id = existing_doc.data[0]["id"]
        print(f"RAG Document ID: {doc_id}", flush=True)
    else:
        doc_id = str(uuid.uuid4())
        supabase_admin.table("rag_documents").insert({
            "id": doc_id,
            "title": doc_title,
            "source_type": "Standard",
            "url": "massive_knowledge_base.pdf",
            "project_name": "General Construction Standards",
            "company_name": "Global Construction Knowledge",
        }).execute()
        print(f"Created new RAG Document record: {doc_id}", flush=True)

    # Check how many chunks already exist (for resume capability)
    count_res = supabase_admin.table("rag_chunks").select("id", count="exact").eq("document_id", doc_id).execute()
    already_stored = count_res.count or 0
    print(f"Existing chunks already stored in database: {already_stored}", flush=True)

    # 3. Stream pages and embed in real-time batches
    print("Opening PDF stream...", flush=True)
    reader = PdfReader(PDF_PATH)
    total_pages = len(reader.pages)
    print(f"Total pages in PDF: {total_pages}", flush=True)

    chunk_buffer = []
    current_text = ""
    chunk_index = already_stored
    total_chunks_saved = already_stored
    start_time = time.time()

    def flush_batch(batch):
        nonlocal total_chunks_saved
        if not batch:
            return
        texts = [b["chunk_text"] for b in batch]
        embeddings = model.encode(texts, batch_size=32, show_progress_bar=False).tolist()

        db_rows = []
        for b, emb in zip(batch, embeddings):
            db_rows.append({
                "id": str(uuid.uuid4()),
                "document_id": doc_id,
                "chunk_text": b["chunk_text"],
                "chunk_index": b["chunk_index"],
                "embedding": emb,
            })

        supabase_admin.table("rag_chunks").insert(db_rows).execute()
        total_chunks_saved += len(db_rows)

    print("\n--- Processing pages and streaming vector embeddings to Supabase ---", flush=True)

    for page_idx in range(total_pages):
        try:
            p = reader.pages[page_idx]
            txt = p.extract_text() or ""
        except Exception:
            continue

        if not txt.strip():
            continue

        clean_txt = " ".join(txt.split())
        current_text += f"\n[Page {page_idx + 1}] " + clean_txt

        while len(current_text) >= CHUNK_SIZE:
            chunk = current_text[:CHUNK_SIZE].strip()
            if len(chunk) > 60:
                chunk_buffer.append({
                    "chunk_text": chunk,
                    "chunk_index": chunk_index,
                })
                chunk_index += 1
            current_text = current_text[CHUNK_SIZE - CHUNK_OVERLAP:]

            # When buffer reaches BATCH_SIZE, embed and insert immediately!
            if len(chunk_buffer) >= BATCH_SIZE:
                try:
                    flush_batch(chunk_buffer)
                    chunk_buffer = []
                    elapsed = time.time() - start_time
                    rate = total_chunks_saved / max(1, elapsed)
                    print(
                        f"Page {page_idx + 1}/{total_pages} | Chunks in DB: {total_chunks_saved} | Speed: {rate:.1f} chunks/sec",
                        flush=True
                    )
                except Exception as exc:
                    print(f"Batch insert error at page {page_idx}: {exc}", flush=True)
                    chunk_buffer = []

    # Flush any remaining chunks
    if chunk_buffer:
        try:
            flush_batch(chunk_buffer)
            print(f"Final batch flushed. Total chunks in DB: {total_chunks_saved}", flush=True)
        except Exception as exc:
            print(f"Final batch error: {exc}", flush=True)

    total_time = time.time() - start_time
    print(f"\n=== Ingestion Completed in {total_time:.1f} seconds! ===", flush=True)
    print(f"Total vector chunks active in Supabase: {total_chunks_saved}", flush=True)

if __name__ == "__main__":
    main()
