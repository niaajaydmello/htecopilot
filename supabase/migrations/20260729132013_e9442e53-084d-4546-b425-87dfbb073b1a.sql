-- Remove overly permissive public policies
DROP POLICY IF EXISTS "public read rag_documents" ON public.rag_documents;
DROP POLICY IF EXISTS "public insert rag_documents" ON public.rag_documents;
DROP POLICY IF EXISTS "public update rag_documents" ON public.rag_documents;
DROP POLICY IF EXISTS "public delete rag_documents" ON public.rag_documents;

DROP POLICY IF EXISTS "public read rag_chunks" ON public.rag_chunks;
DROP POLICY IF EXISTS "public insert rag_chunks" ON public.rag_chunks;
DROP POLICY IF EXISTS "public delete rag_chunks" ON public.rag_chunks;

ALTER TABLE public.rag_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rag_chunks ENABLE ROW LEVEL SECURITY;

-- Revoke Data API access; all access goes through trusted server functions (service role)
REVOKE ALL ON public.rag_documents FROM anon, authenticated;
REVOKE ALL ON public.rag_chunks FROM anon, authenticated;
GRANT ALL ON public.rag_documents TO service_role;
GRANT ALL ON public.rag_chunks TO service_role;

-- Vector search RPC is only callable by trusted server code
REVOKE ALL ON FUNCTION public.match_rag_chunks(vector, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_rag_chunks(vector, integer) TO service_role;