import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Filter,
  Sparkles,
  FileText,
  Upload,
  Loader2,
  Trash2,
  Database,
  Eye,
  Check,
  CircleDashed,
  ScanText,
  Tags,
  Scissors,
  Binary,
  Boxes,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { extractDocument } from "@/lib/extract-text";
import {
  ingestDocument,
  listIngestedDocuments,
  deleteIngestedDocument,
  getDocumentPreview,
  summarizeDocument,
  extractMetadata,
} from "@/lib/rag.functions";

export const Route = createFileRoute("/app/library")({
  head: () => ({
    meta: [
      { title: "Knowledge Repository · HTE Copilot" },
      {
        name: "description",
        content:
          "Upload, process and index official HTE documents into the AI knowledge repository.",
      },
      { property: "og:title", content: "Knowledge Repository · HTE Copilot" },
      {
        property: "og:description",
        content: "Upload PDFs, Word files and scanned documents for AI-grounded search.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Library,
});

type IngestedDoc = Awaited<ReturnType<typeof listIngestedDocuments>>[number];

/* ------------------------------- pipeline ------------------------------- */

const STAGES = [
  { key: "extract", label: "Text extraction", icon: FileText },
  { key: "ocr", label: "OCR (if needed)", icon: ScanText },
  { key: "metadata", label: "Metadata extraction", icon: Tags },
  { key: "chunk", label: "Chunking", icon: Scissors },
  { key: "embed", label: "Embedding generation", icon: Binary },
  { key: "index", label: "Vector DB indexing", icon: Boxes },
  { key: "ready", label: "Ready for AI Search", icon: ShieldCheck },
] as const;

type StageKey = (typeof STAGES)[number]["key"];
type StageState = "pending" | "active" | "done" | "skipped" | "error";

type PipelineJob = {
  file: string;
  note: string;
  states: Record<StageKey, StageState>;
  error?: { stage: StageKey; message: string; attempts: number } | null;
  status: "running" | "done" | "failed";
};

function newJob(file: string): PipelineJob {
  return {
    file,
    note: "Queued",
    status: "running",
    error: null,
    states: {
      extract: "pending",
      ocr: "pending",
      metadata: "pending",
      chunk: "pending",
      embed: "pending",
      index: "pending",
      ready: "pending",
    },
  };
}


function Pipeline({ job }: { job: PipelineJob }) {
  return (
    <div className="rounded-2xl border bg-background/60 p-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Sparkles className="h-4 w-4 text-accent" />
        <span className="truncate">{job.file}</span>
        <span className="ml-auto text-xs text-muted-foreground">{job.note}</span>
      </div>
      <ol className="mt-4 grid gap-2 md:grid-cols-4 lg:grid-cols-7">
        {STAGES.map((s) => {
          const st = job.states[s.key];
          const Icon = s.icon;
          return (
            <li
              key={s.key}
              className={`rounded-xl border p-3 text-center transition ${
                st === "done"
                  ? "border-accent/40 bg-accent/10"
                  : st === "active"
                    ? "border-primary/50 bg-primary/10"
                    : st === "error"
                      ? "border-destructive/50 bg-destructive/10"
                      : "bg-card"
              }`}
            >
              <div className="mx-auto grid h-8 w-8 place-items-center rounded-lg bg-background/70">
                {st === "active" ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                ) : st === "done" ? (
                  <Check className="h-4 w-4 text-accent" />
                ) : st === "skipped" ? (
                  <CircleDashed className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Icon className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div className="mt-2 text-[11px] leading-tight">{s.label}</div>
              {st === "skipped" && (
                <div className="text-[10px] text-muted-foreground">not required</div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* --------------------------------- page --------------------------------- */

function Library() {
  const [job, setJob] = useState<PipelineJob | null>(null);
  const listDocs = useServerFn(listIngestedDocuments);
  const { data, isLoading } = useQuery({
    queryKey: ["ingested-docs"],
    queryFn: () => listDocs(),
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Knowledge Repository</h1>
        <p className="text-sm text-muted-foreground">
          Upload PDF, DOCX, TXT or scanned documents. Each file runs through the AI processing
          pipeline and becomes searchable with grounded, cited answers.
        </p>
      </header>

      <UploadPanel job={job} setJob={setJob} />

      <RepositoryList docs={data ?? []} isLoading={isLoading} />
    </div>
  );
}

/* ------------------------------ upload panel ----------------------------- */

function UploadPanel({
  job,
  setJob,
}: {
  job: PipelineJob | null;
  setJob: (j: PipelineJob | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const ingest = useServerFn(ingestDocument);
  const getMeta = useServerFn(extractMetadata);
  const qc = useQueryClient();

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    for (const file of Array.from(files)) {
      let current = newJob(file.name);
      const update = (patch: Partial<Record<StageKey, StageState>>, note?: string) => {
        current = {
          ...current,
          note: note ?? current.note,
          states: { ...current.states, ...patch },
        };
        setJob(current);
      };
      setJob(current);
      try {
        update({ extract: "active" }, "Extracting text…");
        const extracted = await extractDocument(file, (m) => update({}, m));
        if (extracted.method === "ocr") {
          update({ extract: "done", ocr: "done" }, "OCR complete");
        } else {
          update({ extract: "done", ocr: "skipped" }, "Text extracted");
        }
        const fullText = extracted.pages.join("\n\n");
        if (fullText.trim().length < 20) {
          update({ metadata: "error" }, "No readable text found");
          toast.error(`${file.name}: no readable text found`);
          continue;
        }

        update({ metadata: "active" }, "Extracting metadata…");
        let meta = {
          title: null as string | null,
          grNumber: null as string | null,
          department: null as string | null,
          category: null as string | null,
          language: null as string | null,
          docDate: null as string | null,
          summary: null as string | null,
        };
        try {
          meta = await getMeta({ data: { text: fullText.slice(0, 20_000) } });
        } catch {
          /* metadata is best-effort */
        }
        update({ metadata: "done" }, "Metadata extracted");

        update({ chunk: "active" }, "Chunking…");
        const usedTitle = title.trim() || meta.title || file.name.replace(/\.[^.]+$/, "");
        update({ chunk: "done", embed: "active" }, "Generating embeddings…");

        const res = await ingest({
          data: {
            title: usedTitle,
            docType: meta.category ?? "Uploaded",
            filename: file.name,
            pages: extracted.pages,
            pageCount: extracted.pageCount,
            extractionMethod: extracted.method,
            grNumber: meta.grNumber,
            department: meta.department,
            category: meta.category,
            language: meta.language,
            docDate: meta.docDate,
            summary: meta.summary,
          },
        });

        update({ embed: "done", index: "done", ready: "done" }, `Indexed ${res.chunks} chunks`);
        toast.success(`"${usedTitle}" is ready for AI Search — ${res.chunks} chunks indexed`);
        setTitle("");
        qc.invalidateQueries({ queryKey: ["ingested-docs"] });
      } catch (e) {
        update({ embed: "error" }, e instanceof Error ? e.message : "Failed");
        toast.error(e instanceof Error ? e.message : `Failed to ingest ${file.name}`);
      }
    }
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <section className="rounded-2xl border bg-card p-6 shadow-card">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg gradient-primary text-primary-foreground shadow-elevated">
          <Upload className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold">Upload documents for AI ingestion</h2>
          <p className="text-sm text-muted-foreground">
            PDF, DOCX, TXT, Markdown or scanned images. Scanned pages are automatically routed
            through OCR.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]">
        <Input
          placeholder="Title (optional — AI detects it from the document)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={busy}
        />
        <Button
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="gradient-primary shadow-elevated"
        >
          {busy ? (
            <>
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Processing…
            </>
          ) : (
            <>
              <Upload className="mr-1.5 h-4 w-4" /> Choose files
            </>
          )}
        </Button>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.docx,.txt,.md,.png,.jpg,.jpeg,.webp,.tiff,.bmp"
        className="hidden"
        onChange={(e) => onFiles(e.target.files)}
      />

      {job && (
        <div className="mt-5">
          <Pipeline job={job} />
        </div>
      )}
    </section>
  );
}

/* ----------------------------- repository list --------------------------- */

function yearOf(d: IngestedDoc): string {
  const m = d.doc_date?.match(/(19|20)\d{2}/);
  return m ? m[0] : new Date(d.created_at).getFullYear().toString();
}

function RepositoryList({ docs, isLoading }: { docs: IngestedDoc[]; isLoading: boolean }) {
  const [q, setQ] = useState("");
  const [dept, setDept] = useState("All");
  const [type, setType] = useState("All");
  const [lang, setLang] = useState("All");
  const [year, setYear] = useState("All");
  const [open, setOpen] = useState<{
    title: string;
    mode: "preview" | "summary";
    body: string | null;
    doc?: IngestedDoc;
  } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const preview = useServerFn(getDocumentPreview);
  const summarize = useServerFn(summarizeDocument);
  const del = useServerFn(deleteIngestedDocument);
  const qc = useQueryClient();

  const uniq = (vals: (string | null)[]) =>
    Array.from(new Set(vals.filter((v): v is string => !!v && v.trim() !== ""))).sort();

  const departments = useMemo(() => uniq(docs.map((d) => d.department)), [docs]);
  const types = useMemo(() => uniq(docs.map((d) => d.category ?? d.doc_type)), [docs]);
  const languages = useMemo(() => uniq(docs.map((d) => d.language)), [docs]);
  const years = useMemo(() => uniq(docs.map(yearOf)).reverse(), [docs]);

  const filtered = docs.filter((d) => {
    const t = d.category ?? d.doc_type;
    const hay = `${d.title} ${d.gr_number ?? ""} ${d.filename ?? ""} ${d.department ?? ""}`.toLowerCase();
    return (
      (dept === "All" || d.department === dept) &&
      (type === "All" || t === type) &&
      (lang === "All" || d.language === lang) &&
      (year === "All" || yearOf(d) === year) &&
      (q === "" || hay.includes(q.toLowerCase()))
    );
  });

  const onPreview = async (d: IngestedDoc) => {
    setBusyId(d.id + ":preview");
    setOpen({ title: d.title, mode: "preview", body: null, doc: d });
    try {
      const res = await preview({ data: { id: d.id } });
      setOpen({ title: d.title, mode: "preview", body: res.text || "(no text)", doc: d });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Preview failed");
      setOpen(null);
    } finally {
      setBusyId(null);
    }
  };

  const onSummary = async (d: IngestedDoc) => {
    setBusyId(d.id + ":summary");
    setOpen({ title: d.title, mode: "summary", body: null, doc: d });
    try {
      const res = await summarize({ data: { id: d.id } });
      setOpen({ title: d.title, mode: "summary", body: res.summary, doc: d });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Summary failed");
      setOpen(null);
    } finally {
      setBusyId(null);
    }
  };

  const onDelete = async (d: IngestedDoc) => {
    if (!confirm(`Delete "${d.title}" and its embeddings?`)) return;
    try {
      await del({ data: { id: d.id } });
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["ingested-docs"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border bg-card p-4 shadow-card">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search title, GR number, department…"
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select label="Department" value={dept} setValue={setDept} options={departments} />
            <Select label="Type" value={type} setValue={setType} options={types} />
            <Select label="Language" value={lang} setValue={setLang} options={languages} />
            <Select label="Year" value={year} setValue={setYear} options={years} />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Database className="h-4 w-4 text-accent" />
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Indexed documents
        </h2>
        <Badge variant="secondary" className="ml-auto">
          {filtered.length} of {docs.length}
        </Badge>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-52 animate-pulse rounded-2xl border bg-muted/50" />
          ))}
        </div>
      ) : docs.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          No documents indexed yet. Upload above to build your knowledge base.
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          No documents match these filters.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((d) => (
            <article key={d.id} className="rounded-2xl border bg-card p-5 shadow-card">
              <div className="flex items-start gap-3">
                <FileText className="mt-1 h-5 w-5 shrink-0 text-accent" />
                <div className="min-w-0 flex-1">
                  <h3 className="line-clamp-2 font-semibold">{d.title}</h3>
                  <div className="truncate text-xs text-muted-foreground">{d.filename ?? "—"}</div>
                </div>
                {d.ai_ready && (
                  <Badge className="gradient-primary border-transparent text-primary-foreground">
                    <Sparkles className="mr-1 h-3 w-3" /> AI Ready
                  </Badge>
                )}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                <Meta label="GR / Ref" value={d.gr_number ?? "—"} />
                <Meta label="Department" value={d.department ?? "—"} />
                <Meta label="Date" value={d.doc_date ?? new Date(d.created_at).toLocaleDateString()} />
                <Meta label="Category" value={d.category ?? d.doc_type} />
                <Meta label="Language" value={d.language ?? "—"} />
                <Meta label="Pages" value={String(d.page_count || "—")} />
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <Badge variant={d.processing_status === "ready" ? "secondary" : "outline"}>
                  Processing: {d.processing_status}
                </Badge>
                <Badge variant={d.embedding_status === "complete" ? "secondary" : "outline"}>
                  Embedding: {d.embedding_status}
                </Badge>
                <span className="text-muted-foreground">
                  {d.chunk_count} chunks · {d.char_count.toLocaleString()} chars ·{" "}
                  {d.extraction_method.toUpperCase()}
                </span>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => onPreview(d)}
                  disabled={busyId === d.id + ":preview"}
                >
                  {busyId === d.id + ":preview" ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Eye className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Preview
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => onSummary(d)}
                  disabled={busyId === d.id + ":summary"}
                >
                  {busyId === d.id + ":summary" ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Summary
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onDelete(d)}
                  aria-label={`Delete ${d.title}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{open?.title}</DialogTitle>
            <DialogDescription>
              {open?.mode === "summary" ? "AI-generated summary" : "Extracted document text"}
              {open?.doc?.gr_number ? ` · ${open.doc.gr_number}` : ""}
            </DialogDescription>
          </DialogHeader>
          {open?.body == null ? (
            <div className="space-y-2 py-4">
              {[80, 95, 65, 90].map((w, i) => (
                <div
                  key={i}
                  className="h-3 animate-pulse rounded bg-muted"
                  style={{ width: `${w}%` }}
                />
              ))}
            </div>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap rounded-xl border bg-background/60 p-4 text-sm leading-relaxed">
              {open.body}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background/60 px-3 py-2">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="truncate text-xs" title={value}>
        {value}
      </div>
    </div>
  );
}

function Select({
  label,
  value,
  setValue,
  options,
}: {
  label: string;
  value: string;
  setValue: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="flex items-center gap-1 text-xs text-muted-foreground">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="rounded-full border bg-background/60 px-3 py-1.5 text-xs"
      >
        <option value="All">{label}: All</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}
