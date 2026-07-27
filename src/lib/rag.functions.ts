import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY = "https://ai.gateway.lovable.dev/v1";
const EMBED_MODEL = "google/gemini-embedding-2";
const CHAT_MODEL = "google/gemini-3.6-flash";

function chunkText(text: string, size = 1200, overlap = 150): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const chunks: string[] = [];
  let i = 0;
  while (i < clean.length) {
    chunks.push(clean.slice(i, i + size));
    i += size - overlap;
  }
  return chunks;
}

async function embed(apiKey: string, inputs: string[]): Promise<number[][]> {
  const out: number[][] = [];
  // Gemini embeddings cap batch at 100
  for (let i = 0; i < inputs.length; i += 50) {
    const batch = inputs.slice(i, i + 50);
    const res = await fetch(`${GATEWAY}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
      },
      body: JSON.stringify({ model: EMBED_MODEL, input: batch }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Embedding failed (${res.status}): ${t.slice(0, 200)}`);
    }
    const data = (await res.json()) as { data: { embedding: number[]; index: number }[] };
    const sorted = [...data.data].sort((a, b) => a.index - b.index);
    for (const item of sorted) out.push(item.embedding);
  }
  return out;
}

const IngestSchema = z.object({
  title: z.string().min(1).max(300),
  docType: z.string().min(1).max(50).default("Uploaded"),
  filename: z.string().max(300).optional(),
  content: z.string().min(20).max(500_000),
});

export const ingestDocument = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => IngestSchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const chunks = chunkText(data.content);
    if (chunks.length === 0) throw new Error("No text to ingest");

    const embeddings = await embed(apiKey, chunks);

    const { data: doc, error: docErr } = await supabaseAdmin
      .from("rag_documents")
      .insert({
        title: data.title,
        doc_type: data.docType,
        filename: data.filename ?? null,
        chunk_count: chunks.length,
        char_count: data.content.length,
      })
      .select("id")
      .single();
    if (docErr || !doc) throw new Error(docErr?.message ?? "Insert failed");

    const rows = chunks.map((content, idx) => ({
      document_id: doc.id,
      chunk_index: idx,
      content,
      embedding: embeddings[idx] as unknown as string,
    }));
    const { error: chunkErr } = await supabaseAdmin.from("rag_chunks").insert(rows);
    if (chunkErr) {
      await supabaseAdmin.from("rag_documents").delete().eq("id", doc.id);
      throw new Error(chunkErr.message);
    }

    return { id: doc.id, chunks: chunks.length };
  });

export const listIngestedDocuments = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("rag_documents")
    .select("id, title, doc_type, filename, chunk_count, char_count, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const deleteIngestedDocument = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("rag_documents").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const SearchSchema = z.object({ query: z.string().min(2).max(1000) });

export const ragSearch = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => SearchSchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [queryEmbedding] = await embed(apiKey, [data.query]);
    const { data: matches, error } = await supabaseAdmin.rpc("match_rag_chunks", {
      query_embedding: queryEmbedding as unknown as string,
      match_count: 6,
    });
    if (error) throw new Error(error.message);

    const chunks = (matches ?? []) as Array<{
      id: string;
      document_id: string;
      content: string;
      chunk_index: number;
      similarity: number;
    }>;

    if (chunks.length === 0) {
      return {
        answer:
          "No ingested documents are available yet. Please upload a document from the Document Library so the AI can answer from your official sources.",
        confidence: 0,
        sources: [],
      };
    }

    const docIds = Array.from(new Set(chunks.map((c) => c.document_id)));
    const { data: docs } = await supabaseAdmin
      .from("rag_documents")
      .select("id, title, doc_type, filename")
      .in("id", docIds);
    const docMap = new Map((docs ?? []).map((d) => [d.id, d]));

    const context = chunks
      .map((c, i) => {
        const d = docMap.get(c.document_id);
        return `[${i + 1}] "${d?.title ?? "Document"}" (chunk ${c.chunk_index + 1})\n${c.content}`;
      })
      .join("\n\n---\n\n");

    const system = `You are HTE Copilot, an assistant for the Maharashtra Higher & Technical Education Department. Answer ONLY from the provided context. Cite sources inline using [1], [2] matching the context indices. If the answer is not in the context, say so honestly. Be concise, structured, and use plain language suitable for government officers.`;

    const userMsg = `Question: ${data.query}\n\nContext:\n${context}`;

    const res = await fetch(`${GATEWAY}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
      body: JSON.stringify({
        model: CHAT_MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: userMsg },
        ],
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`AI failed (${res.status}): ${t.slice(0, 200)}`);
    }
    const json = (await res.json()) as {
      choices: { message: { content: string } }[];
    };
    const answer = json.choices?.[0]?.message?.content ?? "No answer generated.";
    const avgSim = chunks.reduce((s, c) => s + c.similarity, 0) / chunks.length;

    return {
      answer,
      confidence: Math.max(0, Math.min(1, avgSim)),
      sources: chunks.map((c, i) => {
        const d = docMap.get(c.document_id);
        return {
          index: i + 1,
          docId: c.document_id,
          title: d?.title ?? "Document",
          type: d?.doc_type ?? "Uploaded",
          filename: d?.filename ?? null,
          chunkIndex: c.chunk_index,
          excerpt: c.content.slice(0, 320),
          similarity: c.similarity,
        };
      }),
    };
  });
