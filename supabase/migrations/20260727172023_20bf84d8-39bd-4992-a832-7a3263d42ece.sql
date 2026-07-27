
create extension if not exists vector;

create table public.rag_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  doc_type text not null default 'Uploaded',
  filename text,
  chunk_count int not null default 0,
  char_count int not null default 0,
  created_at timestamptz not null default now()
);

create table public.rag_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.rag_documents(id) on delete cascade,
  chunk_index int not null,
  content text not null,
  embedding vector(3072) not null,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.rag_documents to anon, authenticated;
grant all on public.rag_documents to service_role;
grant select, insert, update, delete on public.rag_chunks to anon, authenticated;
grant all on public.rag_chunks to service_role;

alter table public.rag_documents enable row level security;
alter table public.rag_chunks enable row level security;

create policy "public read rag_documents" on public.rag_documents for select using (true);
create policy "public insert rag_documents" on public.rag_documents for insert with check (true);
create policy "public update rag_documents" on public.rag_documents for update using (true);
create policy "public delete rag_documents" on public.rag_documents for delete using (true);

create policy "public read rag_chunks" on public.rag_chunks for select using (true);
create policy "public insert rag_chunks" on public.rag_chunks for insert with check (true);
create policy "public delete rag_chunks" on public.rag_chunks for delete using (true);

create index rag_chunks_embedding_idx on public.rag_chunks using hnsw ((embedding::halfvec(3072)) halfvec_cosine_ops);
create index rag_chunks_document_id_idx on public.rag_chunks(document_id);

create or replace function public.match_rag_chunks(query_embedding vector(3072), match_count int default 6)
returns table (id uuid, document_id uuid, content text, chunk_index int, similarity float)
language sql stable
set search_path = public
as $$
  select c.id, c.document_id, c.content, c.chunk_index,
    1 - (c.embedding::halfvec(3072) <=> query_embedding::halfvec(3072)) as similarity
  from public.rag_chunks c
  order by c.embedding::halfvec(3072) <=> query_embedding::halfvec(3072)
  limit match_count;
$$;

grant execute on function public.match_rag_chunks(vector, int) to anon, authenticated;
