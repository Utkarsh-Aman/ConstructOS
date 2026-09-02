-- ============================================================
-- Migration 007: Drop all old overloads and define clean single match_rag_chunks
-- ============================================================

DROP FUNCTION IF EXISTS match_rag_chunks(vector, double precision, integer);
DROP FUNCTION IF EXISTS match_rag_chunks(vector, double precision, integer, uuid);
DROP FUNCTION IF EXISTS match_rag_chunks(vector, double precision, integer, text[]);
DROP FUNCTION IF EXISTS match_rag_chunks(vector, float, int);
DROP FUNCTION IF EXISTS match_rag_chunks(vector, float, int, uuid);
DROP FUNCTION IF EXISTS match_rag_chunks(vector, float, int, text[]);

CREATE OR REPLACE FUNCTION match_rag_chunks(
  query_embedding vector(384),
  match_threshold FLOAT DEFAULT 0.0,
  match_count INT DEFAULT 8,
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
  IF filter_project_id IS NOT NULL THEN
    RETURN QUERY
    SELECT
      rc.id,
      rc.document_id,
      rc.chunk_text,
      rc.chunk_index,
      (1 - (rc.embedding <=> query_embedding))::FLOAT AS similarity,
      rd.title AS document_title,
      rd.project_name,
      rd.company_name
    FROM (
      SELECT d.id, d.title, d.project_name, d.company_name
      FROM rag_documents d
      WHERE d.project_id = filter_project_id
    ) rd
    JOIN rag_chunks rc ON rc.document_id = rd.id
    WHERE (1 - (rc.embedding <=> query_embedding)) >= match_threshold
    ORDER BY rc.embedding <=> query_embedding
    LIMIT match_count;
  ELSE
    RETURN QUERY
    SELECT
      rc.id,
      rc.document_id,
      rc.chunk_text,
      rc.chunk_index,
      (1 - (rc.embedding <=> query_embedding))::FLOAT AS similarity,
      rd.title AS document_title,
      rd.project_name,
      rd.company_name
    FROM rag_chunks rc
    JOIN rag_documents rd ON rd.id = rc.document_id
    WHERE (1 - (rc.embedding <=> query_embedding)) >= match_threshold
    ORDER BY rc.embedding <=> query_embedding
    LIMIT match_count;
  END IF;
END;
$$;
