-- ============================================================
-- pgvector similarity search RPC function
-- Used by rag_service.py via supabase_admin.rpc("match_rag_chunks", ...)
-- ============================================================
CREATE OR REPLACE FUNCTION match_rag_chunks(
  query_embedding vector(384),  -- match dimension of all-MiniLM-L6-v2
  match_threshold FLOAT DEFAULT 0.4,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  chunk_text TEXT,
  chunk_index INT,
  similarity FLOAT,
  document_title TEXT
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
    rd.title AS document_title
  FROM rag_chunks rc
  JOIN rag_documents rd ON rd.id = rc.document_id
  WHERE 1 - (rc.embedding <=> query_embedding) > match_threshold
  ORDER BY rc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Re-create embedding column with correct dimension for all-MiniLM-L6-v2 (384-dim)
-- Note: if you switch to a 1536-dim model, update both here and in rag_service.py
ALTER TABLE rag_chunks ALTER COLUMN embedding TYPE vector(384);

-- Drop and recreate index with correct dimension
DROP INDEX IF EXISTS idx_rag_chunks_embedding;
CREATE INDEX idx_rag_chunks_embedding ON rag_chunks USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
