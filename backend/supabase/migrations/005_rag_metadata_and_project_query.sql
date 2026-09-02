-- ============================================================
-- Migration 005: RAG Metadata & Project-Scoped Queries
-- ============================================================

-- Add project and company metadata to rag_documents
ALTER TABLE rag_documents ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id);
ALTER TABLE rag_documents ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE rag_documents ADD COLUMN IF NOT EXISTS project_name TEXT;
ALTER TABLE rag_documents ADD COLUMN IF NOT EXISTS company_name TEXT;

-- Add metadata to rag_chunks for direct indexing
ALTER TABLE rag_chunks ADD COLUMN IF NOT EXISTS project_id UUID;
ALTER TABLE rag_chunks ADD COLUMN IF NOT EXISTS company_id UUID;

-- Update pgvector similarity search RPC function to support project filtering
CREATE OR REPLACE FUNCTION match_rag_chunks(
  query_embedding vector(384),
  match_threshold FLOAT DEFAULT 0.25,
  match_count INT DEFAULT 5,
  filter_project_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  chunk_text TEXT,
  chunk_index INT,
  similarity FLOAT,
  document_title TEXT,
  project_name TEXT,
  company_name TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    rc.id,
    rc.document_id,
    rc.chunk_text,
    rc.chunk_index,
    1 - (rc.embedding <=> query_embedding) AS similarity,
    rd.title AS document_title,
    rd.project_name,
    rd.company_name
  FROM rag_chunks rc
  JOIN rag_documents rd ON rd.id = rc.document_id
  WHERE (1 - (rc.embedding <=> query_embedding) > match_threshold)
    AND (filter_project_id IS NULL OR rd.project_id = filter_project_id)
  ORDER BY rc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
