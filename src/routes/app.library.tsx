import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Filter,
  BookmarkPlus,
  Download,
  Sparkles,
  FileText,
  Upload,
  Loader2,
  Trash2,
  Database,
  Eye,
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
import { documents, type DocType, type HteDoc } from "@/lib/hte-data";
import { extractTextFromFile } from "@/lib/extract-text";
import {
  ingestDocument,
  listIngestedDocuments,
  deleteIngestedDocument,
  getDocumentPreview,
  summarizeDocument,
} from "@/lib/rag.functions";

const TYPES: DocType[] = ["GR", "Circular", "Notification", "Policy", "Scheme"];


export const Route = createFileRoute("/app/library")({
  head: () => ({
    meta: [
      { title: "Document Library · HTE Copilot" },
      { name: "description", content: "Upload and manage documents ingested for AI search." },
    ],
  }),
  component: Library,
});

function Library() {
  const [q, setQ] = useState("");
  const [type, setType] = useState<DocType | "All">("All");
  const [year, setYear] = useState<number | "All">("All");
  const [catalogueDoc, setCatalogueDoc] = useState<{
    doc: HteDoc;
    mode: "preview" | "summary";
  } | null>(null);


  const years = Array.from(new Set(documents.map((d) => d.year))).sort((a, b) => b - a);

  const filtered = documents.filter(
    (d) =>
      (type === "All" || d.type === type) &&
      (year === "All" || d.year === year) &&
      (q === "" || (d.title + d.number + d.tags.join(" ")).toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Document Library</h1>
        <p className="text-sm text-muted-foreground">
          Upload official HTE documents. They are chunked, embedded and made searchable via AI.
        </p>
      </header>

      <UploadPanel />

      <IngestedList />

      <div className="rounded-2xl border bg-card p-4 shadow-card">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title, number, tag…" className="pl-9" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <FilterChip label="All" active={type === "All"} onClick={() => setType("All")} />
            {TYPES.map((t) => (
              <FilterChip key={t} label={t} active={type === t} onClick={() => setType(t)} />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FilterChip label="All years" active={year === "All"} onClick={() => setYear("All")} />
            {years.map((y) => (
              <FilterChip key={y} label={String(y)} active={year === y} onClick={() => setYear(y)} />
            ))}
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Demo catalogue
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((d) => (
            <article key={d.id} className="group flex flex-col rounded-2xl border bg-card p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elevated">
              <div className="flex items-start justify-between gap-2">
                <Badge variant="secondary">{d.type}</Badge>
                <span className="text-xs text-muted-foreground">{d.date}</span>
              </div>
              <h3 className="mt-3 line-clamp-2 text-base font-semibold">{d.title}</h3>
              <div className="mt-1 text-xs text-muted-foreground">{d.number} · {d.pages}p</div>
              <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{d.summary}</p>
              <div className="mt-3 flex flex-wrap gap-1">
                {d.tags.map((t) => (
                  <span key={t} className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] text-accent-foreground/80">
                    {t}
                  </span>
                ))}
              </div>
              <div className="mt-auto pt-4 flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setCatalogueDoc({ doc: d, mode: "preview" })}
                >
                  <Eye className="mr-1.5 h-3.5 w-3.5" /> Preview
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setCatalogueDoc({ doc: d, mode: "summary" })}
                >
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Summary
                </Button>
              </div>

            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

function UploadPanel() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [docType, setDocType] = useState<string>("Uploaded");
  const [busy, setBusy] = useState<string | null>(null);
  const ingest = useServerFn(ingestDocument);
  const qc = useQueryClient();

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    for (const file of Array.from(files)) {
      try {
        setBusy(`Extracting ${file.name}…`);
        const text = await extractTextFromFile(file);
        if (!text.trim() || text.trim().length < 20) {
          toast.error(`${file.name}: no readable text found`);
          continue;
        }
        setBusy(`Embedding & ingesting ${file.name}…`);
        const usedTitle = title.trim() || file.name.replace(/\.[^.]+$/, "");
        const res = await ingest({
          data: {
            title: usedTitle,
            docType,
            filename: file.name,
            content: text,
          },
        });
        toast.success(`Ingested "${usedTitle}" — ${res.chunks} chunks`);
        setTitle("");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : `Failed to ingest ${file.name}`);
      }
    }
    setBusy(null);
    qc.invalidateQueries({ queryKey: ["ingested-docs"] });
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
            PDF, TXT or Markdown. Documents are parsed, chunked and embedded so AI Search can answer
            questions grounded on their content.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-[1fr_180px_auto]">
        <Input
          placeholder="Title (optional — defaults to filename)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={!!busy}
        />
        <select
          value={docType}
          onChange={(e) => setDocType(e.target.value)}
          disabled={!!busy}
          className="rounded-md border bg-background px-3 py-2 text-sm"
        >
          {["Uploaded", "GR", "Circular", "Notification", "Policy", "Scheme"].map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <Button
          onClick={() => inputRef.current?.click()}
          disabled={!!busy}
          className="gradient-primary shadow-elevated"
        >
          {busy ? (
            <>
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> {busy}
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
        accept=".pdf,.txt,.md,text/plain,text/markdown,application/pdf"
        className="hidden"
        onChange={(e) => onFiles(e.target.files)}
      />
    </section>
  );
}

function IngestedList() {
  const listDocs = useServerFn(listIngestedDocuments);
  const del = useServerFn(deleteIngestedDocument);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["ingested-docs"],
    queryFn: () => listDocs(),
  });

  const onDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}" and its embeddings?`)) return;
    try {
      await del({ data: { id } });
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["ingested-docs"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  return (
    <section className="rounded-2xl border bg-card p-6 shadow-card">
      <div className="mb-4 flex items-center gap-2">
        <Database className="h-4 w-4 text-accent" />
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Ingested knowledge base
        </h2>
        <Badge variant="secondary" className="ml-auto">
          {data?.length ?? 0} document{(data?.length ?? 0) === 1 ? "" : "s"}
        </Badge>
      </div>

      {isLoading ? (
        <div className="py-6 text-center text-sm text-muted-foreground">Loading…</div>
      ) : !data || data.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          No ingested documents yet. Upload above to make them available to AI Search.
        </div>
      ) : (
        <ul className="divide-y">
          {data.map((d) => (
            <li key={d.id} className="flex items-center gap-3 py-3">
              <FileText className="h-4 w-4 text-accent" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{d.title}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {d.filename ?? "—"} · {d.chunk_count} chunks · {d.char_count.toLocaleString()} chars
                </div>
              </div>
              <Badge variant="outline">{d.doc_type}</Badge>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onDelete(d.id, d.title)}
                aria-label="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs transition ${
        active
          ? "gradient-primary border-transparent text-primary-foreground shadow-elevated"
          : "bg-background/60 hover:bg-accent/10"
      }`}
    >
      {label}
    </button>
  );
}
