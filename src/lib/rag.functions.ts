import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY = "https://ai.gateway.lovable.dev/v1";
const EMBED_MODEL = "google/gemini-embedding-2";
const CHAT_MODEL = "google/gemini-3.6-flash";
/** Below this cosine similarity we treat retrieval as "nothing relevant found". */
const RELEVANCE_FLOOR = 0.35;

type PageChunk = { content: string; page: number };

function chunkPages(pages: string[], size = 1200, overlap = 150): PageChunk[] {
  const chunks: PageChunk[] = [];
  pages.forEach((raw, pageIdx) => {
    const clean = raw.replace(/\s+/g, " ").trim();
    if (!clean) return;
    let i = 0;
    while (i < clean.length) {
      chunks.push({ content: clean.slice(i, i + size), page: pageIdx + 1 });
      i += size - overlap;
    }
  });
  return chunks;
}

async function embed(apiKey: string, inputs: string[]): Promise<number[][]> {
  const out: number[][] = [];
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

async function chat(apiKey: string, system: string, user: string): Promise<string> {
  const res = await fetch(`${GATEWAY}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
    body: JSON.stringify({
      model: CHAT_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    if (res.status === 429) throw new Error("AI rate limit reached. Please retry in a moment.");
    if (res.status === 402) throw new Error("AI credits exhausted. Please add credits to continue.");
    throw new Error(`AI failed (${res.status}): ${t.slice(0, 200)}`);
  }
  const json = (await res.json()) as { choices: { message: { content: string } }[] };
  return json.choices?.[0]?.message?.content ?? "";
}

function parseJsonLoose<T>(raw: string): T | null {
  try {
    const cleaned = raw
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/, "")
      .trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start < 0 || end < 0) return null;
    return JSON.parse(cleaned.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

/* ------------------------------- metadata ------------------------------- */

const MetadataSchema = z.object({ text: z.string().min(20).max(30_000) });

export type ExtractedMetadata = {
  title: string | null;
  grNumber: string | null;
  department: string | null;
  category: string | null;
  language: string | null;
  docDate: string | null;
  summary: string | null;
};

export const extractMetadata = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => MetadataSchema.parse(input))
  .handler(async ({ data }): Promise<ExtractedMetadata> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");
    const raw = await chat(
      apiKey,
      `You extract metadata from official documents of the Maharashtra Higher & Technical Education Department.
Return STRICT JSON only (no markdown fences):
{"title":string|null,"grNumber":string|null,"department":string|null,"category":"GR"|"Circular"|"Notification"|"Policy"|"Scheme"|"Report"|"Other","language":"English"|"Marathi"|"Hindi"|"Mixed","docDate":string|null,"summary":"2 sentence summary"}
Use null when the value is genuinely absent. grNumber is the government resolution / circular reference number as printed.`,
      data.text.slice(0, 12_000),
    );
    const parsed = parseJsonLoose<ExtractedMetadata>(raw);
    return {
      title: parsed?.title ?? null,
      grNumber: parsed?.grNumber ?? null,
      department: parsed?.department ?? null,
      category: parsed?.category ?? null,
      language: parsed?.language ?? null,
      docDate: parsed?.docDate ?? null,
      summary: parsed?.summary ?? null,
    };
  });

/* -------------------------------- ingest -------------------------------- */

const IngestSchema = z.object({
  title: z.string().min(1).max(300),
  docType: z.string().min(1).max(50).default("Uploaded"),
  filename: z.string().max(300).optional(),
  pages: z.array(z.string()).min(1).max(400),
  pageCount: z.number().int().min(0).max(5000).default(0),
  extractionMethod: z.string().max(20).default("text"),
  grNumber: z.string().max(120).nullable().optional(),
  department: z.string().max(200).nullable().optional(),
  category: z.string().max(80).nullable().optional(),
  language: z.string().max(40).nullable().optional(),
  docDate: z.string().max(60).nullable().optional(),
  summary: z.string().max(4000).nullable().optional(),
});

export const ingestDocument = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => IngestSchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const chunks = chunkPages(data.pages);
    if (chunks.length === 0) throw new Error("No text to ingest");

    const charCount = data.pages.join("\n").length;

    const { data: doc, error: docErr } = await supabaseAdmin
      .from("rag_documents")
      .insert({
        title: data.title,
        doc_type: data.category || data.docType,
        filename: data.filename ?? null,
        chunk_count: chunks.length,
        char_count: charCount,
        page_count: data.pageCount || data.pages.length,
        gr_number: data.grNumber ?? null,
        department: data.department ?? null,
        category: data.category ?? data.docType,
        language: data.language ?? "English",
        doc_date: data.docDate ?? null,
        ai_summary: data.summary ?? null,
        extraction_method: data.extractionMethod,
        processing_status: "processing",
        embedding_status: "pending",
        ai_ready: false,
      })
      .select("id")
      .single();
    if (docErr || !doc) throw new Error(docErr?.message ?? "Insert failed");

    try {
      const embeddings = await embed(
        apiKey,
        chunks.map((c) => c.content),
      );
      const rows = chunks.map((c, idx) => ({
        document_id: doc.id,
        chunk_index: idx,
        page_number: c.page,
        content: c.content,
        embedding: embeddings[idx] as unknown as string,
      }));
      const { error: chunkErr } = await supabaseAdmin.from("rag_chunks").insert(rows);
      if (chunkErr) throw new Error(chunkErr.message);

      await supabaseAdmin
        .from("rag_documents")
        .update({
          processing_status: "ready",
          embedding_status: "complete",
          ai_ready: true,
        })
        .eq("id", doc.id);
    } catch (e) {
      await supabaseAdmin.from("rag_documents").delete().eq("id", doc.id);
      throw e;
    }

    return { id: doc.id, chunks: chunks.length };
  });

export const listIngestedDocuments = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("rag_documents")
    .select(
      "id, title, doc_type, filename, chunk_count, char_count, created_at, gr_number, department, category, language, page_count, doc_date, processing_status, embedding_status, ai_ready, extraction_method, ai_summary",
    )
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

/* -------------------------------- search -------------------------------- */

const SearchSchema = z.object({ query: z.string().min(2).max(1000) });

type Decision = {
  recommendation: string;
  considerations: string[];
  risks: string[];
  nextSteps: string[];
};

export type RagSource = {
  index: number;
  docId: string;
  title: string;
  type: string;
  filename: string | null;
  grNumber: string | null;
  department: string | null;
  language: string | null;
  page: number | null;
  chunkIndex: number;
  excerpt: string;
  similarity: number;
};

export type RagReference = {
  docId: string;
  title: string;
  type: string;
  filename: string | null;
  grNumber: string | null;
  department: string | null;
  pages: number[];
  citations: number[];
  topSimilarity: number;
  passages: number;
};

export type RagAnswer = {
  status: "answered" | "no_documents" | "no_match";
  answer: string;
  keyPoints: string[];
  decisionSupport: Decision | null;
  confidence: number;
  sources: RagSource[];
  references: RagReference[];
};

export const ragSearch = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => SearchSchema.parse(input))
  .handler(async ({ data }): Promise<RagAnswer> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const empty = (status: RagAnswer["status"], answer: string): RagAnswer => ({
      status,
      answer,
      keyPoints: [],
      decisionSupport: null,
      confidence: 0,
      sources: [],
      references: [],
    });

    const [queryEmbedding] = await embed(apiKey, [data.query]);
    const { data: matches, error } = await supabaseAdmin.rpc("match_rag_chunks", {
      query_embedding: queryEmbedding as unknown as string,
      match_count: 8,
    });
    if (error) throw new Error(error.message);

    const all = (matches ?? []) as Array<{
      id: string;
      document_id: string;
      content: string;
      chunk_index: number;
      page_number: number | null;
      similarity: number;
    }>;

    if (all.length === 0) {
      return empty(
        "no_documents",
        "No documents have been indexed yet. Upload official documents in the Knowledge Repository so answers can be grounded in your own sources.",
      );
    }

    const chunks = all.filter((c) => c.similarity >= RELEVANCE_FLOOR);
    if (chunks.length === 0) {
      return empty(
        "no_match",
        "No relevant information was found in the indexed documents for this question. This answer is intentionally withheld rather than generated, to avoid unverified guidance. Try rephrasing the question or upload the relevant Government Resolution or circular.",
      );
    }

    const docIds = Array.from(new Set(chunks.map((c) => c.document_id)));
    const { data: docs } = await supabaseAdmin
      .from("rag_documents")
      .select("id, title, doc_type, filename, gr_number, department, language, category")
      .in("id", docIds);
    const docMap = new Map((docs ?? []).map((d) => [d.id, d]));

    const context = chunks
      .map((c, i) => {
        const d = docMap.get(c.document_id);
        return `[${i + 1}] "${d?.title ?? "Document"}"${d?.gr_number ? ` (Ref ${d.gr_number})` : ""} — page ${c.page_number ?? "?"}\n${c.content}`;
      })
      .join("\n\n---\n\n");

    const system = `You are HTE Copilot, an assistant for the Maharashtra Higher & Technical Education Department. Answer ONLY from the provided context. Cite sources inline using [1], [2] matching the context indices. If the context does not contain the answer, set "answer" to a clear statement that the indexed documents do not cover it — never invent facts.

Respond with STRICT JSON only (no markdown fences), matching:
{
  "answer": "concise structured answer with inline [n] citations",
  "grounded": true|false,
  "keyPoints": ["3-5 short factual bullets with [n] citations"],
  "decisionSupport": {
    "recommendation": "one-paragraph recommended course of action for the officer",
    "considerations": ["2-4 factors to weigh before deciding"],
    "risks": ["1-3 compliance or procedural risks"],
    "nextSteps": ["2-5 concrete actionable steps"]
  }
}`;

    const raw = await chat(apiKey, system, `Question: ${data.query}\n\nContext:\n${context}`);

    let answer = raw || "No answer generated.";
    let keyPoints: string[] = [];
    let decisionSupport: Decision | null = null;
    let grounded = true;
    const parsed = parseJsonLoose<{
      answer?: string;
      grounded?: boolean;
      keyPoints?: string[];
      decisionSupport?: Partial<Decision>;
    }>(raw);
    if (parsed) {
      if (parsed.answer) answer = parsed.answer;
      if (parsed.grounded === false) grounded = false;
      keyPoints = Array.isArray(parsed.keyPoints) ? parsed.keyPoints.slice(0, 6) : [];
      if (parsed.decisionSupport) {
        decisionSupport = {
          recommendation: parsed.decisionSupport.recommendation ?? "",
          considerations: parsed.decisionSupport.considerations ?? [],
          risks: parsed.decisionSupport.risks ?? [],
          nextSteps: parsed.decisionSupport.nextSteps ?? [],
        };
      }
    }

    if (!grounded) {
      return empty("no_match", answer);
    }

    const avgSim = chunks.reduce((s, c) => s + c.similarity, 0) / chunks.length;

    const sources: RagSource[] = chunks.map((c, i) => {
      const d = docMap.get(c.document_id);
      return {
        index: i + 1,
        docId: c.document_id,
        title: d?.title ?? "Document",
        type: d?.category ?? d?.doc_type ?? "Uploaded",
        filename: d?.filename ?? null,
        grNumber: d?.gr_number ?? null,
        department: d?.department ?? null,
        language: d?.language ?? null,
        page: c.page_number ?? null,
        chunkIndex: c.chunk_index,
        excerpt: c.content.slice(0, 320),
        similarity: c.similarity,
      };
    });

    const references: RagReference[] = docIds.map((id) => {
      const d = docMap.get(id);
      const forDoc = sources.filter((s) => s.docId === id);
      return {
        docId: id,
        title: d?.title ?? "Document",
        type: d?.category ?? d?.doc_type ?? "Uploaded",
        filename: d?.filename ?? null,
        grNumber: d?.gr_number ?? null,
        department: d?.department ?? null,
        pages: Array.from(new Set(forDoc.map((s) => s.page).filter((p): p is number => !!p))).sort(
          (a, b) => a - b,
        ),
        citations: forDoc.map((s) => s.index),
        topSimilarity: Math.max(...forDoc.map((s) => s.similarity)),
        passages: forDoc.length,
      };
    });

    return {
      status: "answered",
      answer,
      keyPoints,
      decisionSupport,
      confidence: Math.max(0, Math.min(1, avgSim)),
      sources,
      references,
    };
  });

/* --------------------------- preview / summary --------------------------- */

const DocIdSchema = z.object({ id: z.string().uuid() });

export const getDocumentPreview = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => DocIdSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: doc, error: docErr } = await supabaseAdmin
      .from("rag_documents")
      .select(
        "id, title, doc_type, filename, chunk_count, char_count, created_at, gr_number, department, category, language, page_count, doc_date, processing_status, embedding_status, ai_ready, extraction_method, ai_summary",
      )
      .eq("id", data.id)
      .single();
    if (docErr || !doc) throw new Error(docErr?.message ?? "Document not found");
    const { data: chunks, error } = await supabaseAdmin
      .from("rag_chunks")
      .select("chunk_index, page_number, content")
      .eq("document_id", data.id)
      .order("chunk_index", { ascending: true })
      .limit(8);
    if (error) throw new Error(error.message);
    return {
      document: doc,
      text: (chunks ?? [])
        .map((c) => `— Page ${c.page_number ?? "?"} —\n${c.content}`)
        .join("\n\n"),
    };
  });

export const summarizeDocument = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => DocIdSchema.parse(input))
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
    const text = (chunks ?? [])
      .map((c) => c.content)
      .join("\n\n")
      .slice(0, 24_000);
    if (!text) throw new Error("No content to summarize");

    const summary = await chat(
      apiKey,
      "Summarize the official document for a government officer. Return 1 short overview paragraph followed by 4-6 bullet points covering scope, eligibility, obligations and timelines. Plain text only.",
      `Document: ${doc?.title ?? ""}\n\n${text}`,
    );
    return { title: doc?.title ?? "Document", summary: summary || "No summary generated." };
  });
