import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Search,
  Filter,
  BookmarkPlus,
  Download,
  Sparkles,
  FileText,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { documents, type DocType } from "@/lib/hte-data";

const TYPES: DocType[] = ["GR", "Circular", "Notification", "Policy", "Scheme"];

export const Route = createFileRoute("/app/library")({
  head: () => ({
    meta: [
      { title: "Document Library · HTE Copilot" },
      { name: "description", content: "Search, filter and summarise official HTE documents." },
    ],
  }),
  component: Library,
});

function Library() {
  const [q, setQ] = useState("");
  const [type, setType] = useState<DocType | "All">("All");
  const [year, setYear] = useState<number | "All">("All");

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
          {documents.length} documents · GRs, circulars, notifications, policies &amp; schemes.
        </p>
      </header>

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
              <Button size="sm" variant="outline" className="flex-1">
                <FileText className="mr-1.5 h-3.5 w-3.5" /> Preview
              </Button>
              <Button size="sm" variant="ghost">
                <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Summary
              </Button>
              <Button size="icon" variant="ghost" aria-label="Bookmark">
                <BookmarkPlus className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" aria-label="Download">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </article>
        ))}
      </div>
    </div>
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
