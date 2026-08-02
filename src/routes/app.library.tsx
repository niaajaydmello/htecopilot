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
  AlertTriangle,
  RefreshCw,
  X,

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


function Pipeline({
  job,
  onRetry,
  onDismiss,
  retrying,
}: {
  job: PipelineJob;
  onRetry: () => void;
  onDismiss: () => void;
  retrying: boolean;
}) {
  const failedStage = job.error ? STAGES.find((s) => s.key === job.error!.stage) : null;
  return (
    <div className="rounded-2xl border bg-background/60 p-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Sparkles className="h-4 w-4 text-accent" />
        <span className="truncate">{job.file}</span>
        <span
          className={`ml-auto text-xs ${job.status === "failed" ? "text-destructive" : "text-muted-foreground"}`}
        >
          {job.note}
        </span>
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
                ) : st === "error" ? (
                  <AlertTriangle className="h-4 w-4 text-destructive" />
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
              {st === "error" && <div className="text-[10px] text-destructive">failed</div>}
            </li>
          );
        })}
      </ol>

      {job.status === "failed" && job.error && (
        <div className="mt-4 rounded-xl border border-destructive/40 bg-destructive/5 p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-destructive">
                {failedStage?.label ?? "Processing"} failed
              </div>
              <p className="mt-1 break-words text-xs text-muted-foreground">
                {job.error.message}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {job.error.attempts} attempt{job.error.attempts === 1 ? "" : "s"} made · nothing was
                added to the knowledge base, so retrying is safe.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" onClick={onRetry} disabled={retrying}>
                  {retrying ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Retry {failedStage ? failedStage.label.toLowerCase() : "processing"}
                </Button>
                <Button size="sm" variant="outline" onClick={onDismiss} disabled={retrying}>
                  <X className="mr-1.5 h-3.5 w-3.5" /> Dismiss
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
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

type Meta = {
  title: string | null;
  grNumber: string | null;
  department: string | null;
  category: string | null;
  language: string | null;
  docDate: string | null;
  summary: string | null;
};

const EMPTY_META: Meta = {
  title: null,
  grNumber: null,
  department: null,
  category: null,
  language: null,
  docDate: null,
  summary: null,
};

type Cache = {
  extracted?: Awaited<ReturnType<typeof extractDocument>>;
  meta?: Meta;
  attempts: number;
};

function messageOf(e: unknown, fallback: string) {
  if (e instanceof Error && e.message) return e.message;
  return fallback;
}

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
  const [retrying, setRetrying] = useState(false);
  const pending = useRef<{ file: File; cache: Cache } | null>(null);
  const ingest = useServerFn(ingestDocument);
  const getMeta = useServerFn(extractMetadata);
  const qc = useQueryClient();

  const runPipeline = async (file: File, cache: Cache) => {
    let current = newJob(file.name);
    const update = (
      patch: Partial<Record<StageKey, StageState>>,
      note?: string,
      extra?: Partial<PipelineJob>,
    ) => {
      current = {
        ...current,
        note: note ?? current.note,
        states: { ...current.states, ...patch },
        ...extra,
      };
      setJob(current);
    };
    const fail = (stage: StageKey, e: unknown, fallback: string) => {
      const message = messageOf(e, fallback);
      pending.current = { file, cache };
      update({ [stage]: "error" } as Partial<Record<StageKey, StageState>>, "Failed", {
        status: "failed",
        error: { stage, message, attempts: cache.attempts },
      });
      toast.error(`${file.name}: ${message}`);
    };

    setJob(current);
    cache.attempts += 1;

    // 1) extraction + OCR
    if (!cache.extracted) {
      try {
        update({ extract: "active" }, "Extracting text…");
        cache.extracted = await extractDocument(file, (m) => update({}, m));
      } catch (e) {
        fail("extract", e, "Text extraction failed");
        return false;
      }
    }
    const extracted = cache.extracted;
    if (extracted.method === "ocr") update({ extract: "done", ocr: "done" }, "OCR complete");
    else update({ extract: "done", ocr: "skipped" }, "Text extracted");

    const fullText = extracted.pages.join("\n\n");
    if (fullText.trim().length < 20) {
      cache.extracted = undefined; // force a fresh extraction/OCR pass on retry
      fail(
        extracted.method === "ocr" ? "ocr" : "extract",
        new Error(
          "No readable text could be recovered from this file. Retry, or upload a higher-quality scan.",
        ),
        "No readable text found",
      );
      return false;
    }

    // 2) metadata (best-effort, never blocks ingestion)
    if (!cache.meta) {
      update({ metadata: "active" }, "Extracting metadata…");
      try {
        cache.meta = await getMeta({ data: { text: fullText.slice(0, 20_000) } });
        update({ metadata: "done" }, "Metadata extracted");
      } catch {
        cache.meta = EMPTY_META;
        update({ metadata: "skipped" }, "Metadata unavailable — continuing");
      }
    } else {
      update({ metadata: "done" }, "Metadata reused");
    }
    const meta = cache.meta ?? EMPTY_META;

    // 3) chunk + embed + index
    update({ chunk: "active" }, "Chunking…");
    const usedTitle = title.trim() || meta.title || file.name.replace(/\.[^.]+$/, "");
    update({ chunk: "done", embed: "active" }, "Generating embeddings…");

    try {
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
      update({ embed: "done", index: "done", ready: "done" }, `Indexed ${res.chunks} chunks`, {
        status: "done",
        error: null,
      });
      toast.success(`"${usedTitle}" is ready for AI Search — ${res.chunks} chunks indexed`);
      pending.current = null;
      setTitle("");
      qc.invalidateQueries({ queryKey: ["ingested-docs"] });
      return true;
    } catch (e) {
      fail("embed", e, "Embedding or indexing failed");
      return false;
    }
  };

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    pending.current = null;
    for (const file of Array.from(files)) {
      await runPipeline(file, { attempts: 0 });
    }
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const onRetry = async () => {
    const item = pending.current;
    if (!item) return;
    setRetrying(true);
    await runPipeline(item.file, item.cache);
    setRetrying(false);
  };

  const onDismiss = () => {
    pending.current = null;
    setJob(null);
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

      <LinkDiscovery
        busy={busy}
        onIngest={async (files) => {
          setBusy(true);
          pending.current = null;
          for (const f of files) {
            await runPipeline(f, { attempts: 0 });
          }
          setBusy(false);
        }}
      />

      {job && (
        <div className="mt-5">
          <Pipeline job={job} onRetry={onRetry} onDismiss={onDismiss} retrying={retrying} />
        </div>
      )}
    </section>
  );
}

/* --------------------------- link discovery flow -------------------------- */

const DEPTHS = [
  { key: "page" as const, label: "This page only", hint: "Fastest — links on the pasted page" },
  { key: "level" as const, label: "One level deep", hint: "Also follows links on that page" },
  { key: "site" as const, label: "Full site crawl", hint: "Walks the site (up to 40 pages)" },
];

type Found = Awaited<ReturnType<typeof discoverPdfs>>;

function LinkDiscovery({
  busy,
  onIngest,
}: {
  busy: boolean;
  onIngest: (files: File[]) => Promise<void>;
}) {
  const [url, setUrl] = useState("");
  const [depth, setDepth] = useState<"page" | "level" | "site">("page");
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<Found | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState<string | null>(null);

  const discover = useServerFn(discoverPdfs);
  const fetchPdf = useServerFn(fetchRemotePdf);

  const scan = async () => {
    if (!url.trim()) return;
    setScanning(true);
    setResult(null);
    setSelected(new Set());
    try {
      const res = await discover({ data: { url: url.trim(), depth } });
      setResult(res);
      setSelected(new Set(res.pdfs.map((p) => p.url)));
      if (res.pdfs.length === 0) toast.info("No PDF links were found on that page.");
      else toast.success(`Found ${res.pdfs.length} PDF${res.pdfs.length === 1 ? "" : "s"}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not read that website link.");
    } finally {
      setScanning(false);
    }
  };

  const toggle = (u: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(u)) next.delete(u);
      else next.add(u);
      return next;
    });

  const ingestSelected = async () => {
    if (!result) return;
    const picks = result.pdfs.filter((p) => selected.has(p.url));
    if (picks.length === 0) return;
    const files: File[] = [];
    for (const p of picks) {
      setDownloading(p.url);
      try {
        const dl = await fetchPdf({ data: { url: p.url } });
        const bin = atob(dl.base64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        files.push(new File([bytes], dl.filename, { type: "application/pdf" }));
      } catch (e) {
        toast.error(`${p.title}: ${e instanceof Error ? e.message : "download failed"}`);
      }
    }
    setDownloading(null);
    if (files.length > 0) await onIngest(files);
  };

  const disabled = busy || scanning || downloading !== null;

  return (
    <div className="mt-6 rounded-2xl border bg-background/60 p-5">
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
          <LinkIcon className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">Paste a website link instead</h3>
          <p className="text-xs text-muted-foreground">
            We fetch the page, discover every linked PDF, and let you pick which ones to ingest.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
        <Input
          placeholder="https://www.maharashtra.gov.in/…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && scan()}
          disabled={disabled}
        />
        <Button onClick={scan} disabled={disabled || !url.trim()} variant="outline">
          {scanning ? (
            <>
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Scanning…
            </>
          ) : (
            <>
              <Globe className="mr-1.5 h-4 w-4" /> Find PDFs
            </>
          )}
        </Button>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {DEPTHS.map((d) => (
          <button
            key={d.key}
            type="button"
            onClick={() => setDepth(d.key)}
            disabled={disabled}
            className={`rounded-xl border p-3 text-left transition disabled:opacity-60 ${
              depth === d.key ? "border-primary/60 bg-primary/10" : "bg-card hover:bg-muted/50"
            }`}
          >
            <div className="text-xs font-medium">{d.label}</div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">{d.hint}</div>
          </button>
        ))}
      </div>

      {result && (
        <div className="mt-4 rounded-xl border bg-card">
          <div className="flex flex-wrap items-center gap-2 border-b p-3 text-xs text-muted-foreground">
            <span>
              {result.pdfs.length} PDF{result.pdfs.length === 1 ? "" : "s"} · {result.pagesCrawled}{" "}
              page{result.pagesCrawled === 1 ? "" : "s"} scanned
              {result.truncated ? " · limit reached" : ""}
            </span>
            {result.pdfs.length > 0 && (
              <div className="ml-auto flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={disabled}
                  onClick={() =>
                    setSelected(
                      selected.size === result.pdfs.length
                        ? new Set()
                        : new Set(result.pdfs.map((p) => p.url)),
                    )
                  }
                >
                  {selected.size === result.pdfs.length ? "Clear all" : "Select all"}
                </Button>
                <Button
                  size="sm"
                  className="gradient-primary"
                  disabled={disabled || selected.size === 0}
                  onClick={ingestSelected}
                >
                  {downloading ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Ingest {selected.size} selected
                </Button>
              </div>
            )}
          </div>
          <ul className="max-h-72 divide-y overflow-y-auto">
            {result.pdfs.map((p) => (
              <li key={p.url} className="flex items-start gap-3 p-3">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 accent-[hsl(var(--primary))]"
                  checked={selected.has(p.url)}
                  onChange={() => toggle(p.url)}
                  disabled={disabled}
                  aria-label={`Select ${p.title}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{p.title}</div>
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block truncate text-[11px] text-muted-foreground hover:underline"
                  >
                    {p.url}
                  </a>
                </div>
                {downloading === p.url && (
                  <Loader2 className="mt-1 h-4 w-4 animate-spin text-primary" />
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
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
