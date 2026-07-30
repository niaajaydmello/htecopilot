ALTER TABLE public.rag_documents
  ADD COLUMN IF NOT EXISTS gr_number text,
  ADD COLUMN IF NOT EXISTS department text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS language text,
  ADD COLUMN IF NOT EXISTS page_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS doc_date text,
  ADD COLUMN IF NOT EXISTS processing_status text NOT NULL DEFAULT 'ready',
  ADD COLUMN IF NOT EXISTS embedding_status text NOT NULL DEFAULT 'complete',
  ADD COLUMN IF NOT EXISTS ai_ready boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS extraction_method text NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS ai_summary text;

ALTER TABLE public.rag_chunks
  ADD COLUMN IF NOT EXISTS page_number integer;

DROP FUNCTION IF EXISTS public.match_rag_chunks(vector, integer);

CREATE OR REPLACE FUNCTION public.match_rag_chunks(query_embedding vector, match_count integer DEFAULT 6)
RETURNS TABLE(id uuid, document_id uuid, content text, chunk_index integer, page_number integer, similarity double precision)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  select c.id, c.document_id, c.content, c.chunk_index, c.page_number,
    1 - (c.embedding::halfvec(3072) <=> query_embedding::halfvec(3072)) as similarity
  from public.rag_chunks c
  order by c.embedding::halfvec(3072) <=> query_embedding::halfvec(3072)
  limit match_count;
$function$;