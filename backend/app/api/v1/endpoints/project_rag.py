"""
Project RAG Endpoints — project document indexing and AI queries for Company Admin & Site Manager.
"""
import io
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel
from pypdf import PdfReader

from app.core.security import get_current_user, require_roles
from app.core.config import get_settings
from app.db.supabase_client import supabase_admin
from app.services.rag_service import retrieve_relevant_chunks, ingest_document
from app.services.groq_service import generate_rag_answer

router = APIRouter()
settings = get_settings()


class ProjectQueryRequest(BaseModel):
    question: str
    chat_history: list[dict] = []
    include_global_kb: bool = False


@router.get("/{project_id}/documents", summary="List indexed RAG documents for a project (including Master Plans)")
async def list_project_documents(
    project_id: str,
    current_user: dict = Depends(require_roles("company_admin", "site_manager")),
):
    # Verify project exists
    project = supabase_admin.table("projects").select("id, name, company_id, companies(name)").eq("id", project_id).single().execute()
    if not project.data:
        raise HTTPException(status_code=404, detail="Project not found")

    project_name = project.data.get("name", "Project")
    company_name = project.data.get("companies", {}).get("name", "Company") if project.data.get("companies") else "Company"
    company_id = project.data.get("company_id")

    # 1. Fetch custom RAG documents
    docs_result = supabase_admin.table("rag_documents") \
        .select("id, title, source_type, url, project_name, company_name, ingested_at") \
        .eq("project_id", project_id) \
        .order("ingested_at", desc=True) \
        .execute()

    docs = list(docs_result.data or [])

    # 2. Check for Master Plans for this project and ensure they appear in the knowledge base
    try:
        mp_result = supabase_admin.table("master_plans").select("id").eq("project_id", project_id).execute()
        mp_ids = [m["id"] for m in (mp_result.data or [])]

        if mp_ids:
            versions_res = supabase_admin.table("master_plan_versions") \
                .select("id, master_plan_id, version_number, file_url, uploaded_at, note") \
                .in_("master_plan_id", mp_ids) \
                .order("uploaded_at", desc=True) \
                .execute()

            existing_urls = {d.get("url") for d in docs}

            for v in (versions_res.data or []):
                file_url = v.get("file_url") or ""
                filename = file_url.split("/")[-1] if "/" in file_url else file_url
                doc_title = f"Master Plan (v{v.get('version_number', 1)}): {filename}"

                if file_url not in existing_urls:
                    # Register this master plan into rag_documents
                    doc_id = str(uuid.uuid4())
                    ingested_at = v.get("uploaded_at")
                    try:
                        supabase_admin.table("rag_documents").insert({
                            "id": doc_id,
                            "title": doc_title,
                            "source_type": "MasterPlan",
                            "url": file_url,
                            "project_id": project_id,
                            "company_id": company_id,
                            "project_name": project_name,
                            "company_name": company_name,
                        }).execute()

                        # Try downloading and chunking the master plan file if possible
                        try:
                            file_data = supabase_admin.storage.from_(settings.master_plans_bucket).download(file_url)
                            if file_data and len(file_data) > 0:
                                reader = PdfReader(io.BytesIO(file_data))
                                extracted = []
                                for idx, p in enumerate(reader.pages):
                                    t = p.extract_text() or ""
                                    if t.strip():
                                        extracted.append(f"[Page {idx+1}] {t.strip()}")
                                plan_text = "\n\n".join(extracted)
                                if plan_text.strip():
                                    await ingest_document(
                                        document_id=doc_id,
                                        document_title=doc_title,
                                        source_type="MasterPlan",
                                        text=plan_text,
                                        project_id=project_id,
                                        company_id=company_id,
                                        project_name=project_name,
                                        company_name=company_name,
                                    )
                        except Exception as dl_err:
                            print(f"[RAG] Master plan text indexing notice: {dl_err}")

                    except Exception as ins_err:
                        print(f"[RAG] Master plan doc insert notice: {ins_err}")

                    docs.append({
                        "id": doc_id,
                        "title": doc_title,
                        "source_type": "MasterPlan",
                        "url": file_url,
                        "project_name": project_name,
                        "company_name": company_name,
                        "ingested_at": ingested_at,
                    })
    except Exception as mp_err:
        print(f"[RAG] Master plans sync notice: {mp_err}")

    return docs


@router.post("/{project_id}/documents/ingest", summary="Upload and index a PDF document for project RAG")
async def ingest_project_document(
    project_id: str,
    file: UploadFile = File(...),
    document_title: Optional[str] = Form(None),
    source_type: str = Form("ProjectDocument"),
    current_user: dict = Depends(require_roles("company_admin", "site_manager")),
):
    # Verify project & company info
    project = supabase_admin.table("projects").select("id, name, company_id, companies(name)").eq("id", project_id).single().execute()
    if not project.data:
        raise HTTPException(status_code=404, detail="Project not found")

    project_name = project.data.get("name", "Project")
    company_name = project.data.get("companies", {}).get("name", "Company") if project.data.get("companies") else "Company"
    company_id = project.data.get("company_id")

    file_bytes = await file.read()
    if len(file_bytes) > 50 * 1024 * 1024:
        raise HTTPException(status_code=422, detail="Document exceeds 50 MB limit")

    # Extract text from PDF or plain text
    filename = file.filename or "document.pdf"
    title = document_title or filename
    full_text = ""

    if filename.lower().endswith(".pdf"):
        try:
            reader = PdfReader(io.BytesIO(file_bytes))
            extracted_pages = []
            for idx, p in enumerate(reader.pages):
                txt = p.extract_text() or ""
                if txt.strip():
                    extracted_pages.append(f"[Page {idx+1}] {txt.strip()}")
            full_text = "\n\n".join(extracted_pages)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to extract text from PDF: {str(e)}")
    else:
        try:
            full_text = file_bytes.decode("utf-8", errors="ignore")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to decode text: {str(e)}")

    if not full_text.strip():
        raise HTTPException(status_code=400, detail="Document is empty or contains no readable text")

    # Create record in rag_documents with metadata
    doc_id = str(uuid.uuid4())
    supabase_admin.table("rag_documents").insert({
        "id": doc_id,
        "title": title,
        "source_type": source_type,
        "url": filename,
        "project_id": project_id,
        "company_id": company_id,
        "project_name": project_name,
        "company_name": company_name,
    }).execute()

    # Ingest and embed chunks
    stored_chunks = await ingest_document(
        document_id=doc_id,
        document_title=title,
        source_type=source_type,
        text=full_text,
        project_id=project_id,
        company_id=company_id,
        project_name=project_name,
        company_name=company_name,
    )

    return {
        "status": "success",
        "document_id": doc_id,
        "title": title,
        "project_name": project_name,
        "chunks_indexed": stored_chunks,
    }


@router.post("/{project_id}/ai-query", summary="Query AI grounded on project documents and construction knowledge")
async def query_project_rag(
    project_id: str,
    body: ProjectQueryRequest,
    current_user: dict = Depends(require_roles("company_admin", "site_manager")),
):
    # Verify project
    project = supabase_admin.table("projects").select("id, name").eq("id", project_id).single().execute()
    if not project.data:
        raise HTTPException(status_code=404, detail="Project not found")

    project_name = project.data.get("name")

    # Retrieve relevant chunks (strictly project or hybrid project + BIS standards)
    retrieved_chunks = await retrieve_relevant_chunks(
        query=body.question,
        top_k=6,
        project_id=project_id,
        include_global_kb=body.include_global_kb,
    )

    from app.services.groq_service import generate_project_rag_answer
    result = await generate_project_rag_answer(
        question=body.question,
        project_name=project_name,
        retrieved_chunks=retrieved_chunks,
        chat_history=body.chat_history,
        include_global_kb=body.include_global_kb,
    )

    return {
        "answer": result["answer"],
        "grounded": result.get("grounded", False),
        "project_name": project_name,
        "included_global_kb": body.include_global_kb,
    }
