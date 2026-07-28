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

    const system = `You are HTE Copilot, an assistant for the Maharashtra Higher & Technical Education Department. Answer ONLY from the provided context. Cite sources inline using [1], [2] matching the context indices. If the answer is not in the context, say so honestly.

Respond with STRICT JSON only (no markdown fences), matching:
{
  "answer": "concise structured answer with inline [n] citations",
  "keyPoints": ["3-5 short factual bullets with [n] citations"],
  "decisionSupport": {
    "recommendation": "one-paragraph recommended course of action for the officer",
    "considerations": ["2-4 factors to weigh before deciding"],
    "risks": ["1-3 compliance or procedural risks"],
    "nextSteps": ["2-5 concrete actionable steps"]
  }
}`;

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
    const raw = json.choices?.[0]?.message?.content ?? "";

    type Decision = {
      recommendation: string;
      considerations: string[];
      risks: string[];
      nextSteps: string[];
    };
    let answer = raw || "No answer generated.";
    let keyPoints: string[] = [];
    let decisionSupport: Decision | null = null;
    try {
      const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
      const start = cleaned.indexOf("{");
      const end = cleaned.lastIndexOf("}");
      const parsed = JSON.parse(cleaned.slice(start, end + 1)) as {
        answer?: string;
        keyPoints?: string[];
        decisionSupport?: Partial<Decision>;
      };
      if (parsed.answer) answer = parsed.answer;
      keyPoints = Array.isArray(parsed.keyPoints) ? parsed.keyPoints.slice(0, 6) : [];
      if (parsed.decisionSupport) {
        decisionSupport = {
          recommendation: parsed.decisionSupport.recommendation ?? "",
          considerations: parsed.decisionSupport.considerations ?? [],
          risks: parsed.decisionSupport.risks ?? [],
          nextSteps: parsed.decisionSupport.nextSteps ?? [],
        };
      }
    } catch {
      // keep raw text answer
    }

    const avgSim = chunks.reduce((s, c) => s + c.similarity, 0) / chunks.length;

    const sources = chunks.map((c, i) => {
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
    });

    const references = docIds.map((id) => {
      const d = docMap.get(id);
      const forDoc = sources.filter((s) => s.docId === id);
      return {
        docId: id,
        title: d?.title ?? "Document",
        type: d?.doc_type ?? "Uploaded",
        filename: d?.filename ?? null,
        citations: forDoc.map((s) => s.index),
        topSimilarity: Math.max(...forDoc.map((s) => s.similarity)),
        passages: forDoc.length,
      };
    });

    return {
      answer,
      keyPoints,
      decisionSupport,
      confidence: Math.max(0, Math.min(1, avgSim)),
      sources,
      references,
    };
  });

const SummarizeSchema = z.object({ id: z.string().uuid() });

export const getDocumentPreview = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => SummarizeSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: doc, error: docErr } = await supabaseAdmin
      .from("rag_documents")
      .select("id, title, doc_type, filename, chunk_count, char_count, created_at")
      .eq("id", data.id)
      .single();
    if (docErr || !doc) throw new Error(docErr?.message ?? "Document not found");
    const { data: chunks, error } = await supabaseAdmin
      .from("rag_chunks")
      .select("chunk_index, content")
      .eq("document_id", data.id)
      .order("chunk_index", { ascending: true })
      .limit(6);
    if (error) throw new Error(error.message);
    return { document: doc, text: (chunks ?? []).map((c) => c.content).join("\n\n") };
  });

export const summarizeDocument = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => SummarizeSchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: doc } = await supabaseAdmin
      .from("rag_documents")
      .select("title, doc_type")
      .eq("id", data.id)
      .single();
    const { data: chunks, error } = await supabaseAdmin
      .from("rag_chunks")
      .select("content")
      .eq("document_id", data.id)
      .order("chunk_index", { ascending: true })
      .limit(10);
    if (error) throw new Error(error.message);
    const text = (chunks ?? []).map((c) => c.content).join("\n\n").slice(0, 24_000);
    if (!text) throw new Error("No content to summarize");

    const res = await fetch(`${GATEWAY}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
      body: JSON.stringify({
        model: CHAT_MODEL,
        messages: [
          {
            role: "system",
            content:
              "Summarize the official document for a government officer. Return 1 short overview paragraph followed by 4-6 bullet points covering scope, eligibility, obligations and timelines. Plain text only.",
          },
          { role: "user", content: `Document: ${doc?.title ?? ""}\n\n${text}` },
        ],
      }),
    });
    if (!res.ok) throw new Error(`AI failed (${res.status})`);
    const json = (await res.json()) as { choices: { message: { content: string } }[] };
    return {
      title: doc?.title ?? "Document",
      summary: json.choices?.[0]?.message?.content ?? "No summary generated.",
    };
  });

