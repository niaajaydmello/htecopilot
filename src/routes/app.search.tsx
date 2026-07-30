import { createFileRoute, Link as RouterLink } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import {
  Search,
  Sparkles,
  Send,
  BookmarkPlus,
  Copy,
  ChevronRight,
  FileText,
  ExternalLink,
  GraduationCap,
  Database,
  Lightbulb,
  AlertTriangle,
  ListChecks,
  Scale,
  Library,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { exampleQueries, suggestedQuestions } from "@/lib/hte-data";
import { ragSearch, listIngestedDocuments } from "@/lib/rag.functions";

const searchSchema = z.object({ q: z.string().optional() });

export const Route = createFileRoute("/app/search")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "AI Search · HTE Copilot" },
      { name: "description", content: "Ask anything grounded on your ingested HTE documents." },
    ],
  }),
  component: SearchPage,
});

type SearchResult = Awaited<ReturnType<typeof ragSearch>>;

function SearchPage() {
  const { q } = Route.useSearch();
  const [query, setQuery] = useState(q ?? "");
  const [askedQuery, setAskedQuery] = useState<string>("");
  const [answer, setAnswer] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);

  const runRag = useServerFn(ragSearch);
  const listDocs = useServerFn(listIngestedDocuments);
  const { data: docs } = useQuery({
    queryKey: ["ingested-docs"],
    queryFn: () => listDocs(),
  });

  const ask = async (text: string) => {
    if (!text.trim()) return;
    setLoading(true);
    setAnswer(null);
    setAskedQuery(text);
    setQuery(text);
    try {
      const res = await runRag({ data: { query: text } });
      setAnswer(res);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Search failed");
    } finally {
      setLoading(false);
    }
  };

  const askRef = useRef(ask);
  askRef.current = ask;
  useEffect(() => {
    if (q && q.trim()) askRef.current(q);
  }, [q]);

  const docCount = docs?.length ?? 0;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {!answer && !loading && (
        <Hero onAsk={ask} query={query} setQuery={setQuery} docCount={docCount} />
      )}
      {loading && <Loading query={askedQuery} docCount={docCount} />}
      {answer && (
        <AnswerPanel query={askedQuery} a={answer} onAsk={ask} onReset={() => setAnswer(null)} />
      )}
    </div>
  );
}

function Hero({
  onAsk,
  query,
  setQuery,
  docCount,
}: {
  onAsk: (q: string) => void;
  query: string;
  setQuery: (v: string) => void;
  docCount: number;
}) {
  return (
    <div className="space-y-8 py-6">
      <div className="text-center">
        <Badge variant="secondary" className="rounded-full px-3 py-1">
          <Sparkles className="mr-1.5 h-3 w-3 text-accent" />
          {docCount > 0
            ? `Grounded on ${docCount} ingested document${docCount === 1 ? "" : "s"}`
            : "Upload documents in the Library to start"}
        </Badge>
        <h1 className="mt-4 text-4xl font-bold">
          Ask anything about <span className="gradient-text">Higher Technical Education</span>
        </h1>
        <p className="mt-2 text-muted-foreground">
          Answers with inline citations from your ingested corpus.
        </p>
      </div>

      <div className="glass shadow-elevated rounded-2xl p-3">
        <div className="rounded-xl bg-card p-4">
          <Textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask a question about your uploaded HTE documents…"
            rows={3}
            className="resize-none border-0 bg-transparent text-base shadow-none focus-visible:ring-0"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onAsk(query);
            }}
          />
          <div className="mt-2 flex items-center gap-2">
            <div className="ml-auto flex items-center gap-2">
              <span className="hidden text-xs text-muted-foreground md:inline">⌘+↵ to send</span>
              <Button onClick={() => onAsk(query)} className="gradient-primary shadow-elevated">
                <Send className="mr-1.5 h-4 w-4" /> Ask
              </Button>
            </div>
          </div>
        </div>
      </div>

      {docCount === 0 && (
        <div className="rounded-2xl border border-dashed bg-card/60 p-6 text-center text-sm text-muted-foreground">
          <Database className="mx-auto mb-2 h-5 w-5 text-accent" />
          No documents ingested yet. Go to <b>Document Library</b> and upload a PDF or text file to
          give the AI a knowledge base to answer from.
        </div>
      )}

      <div>
        <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Try an example
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          {exampleQueries.map((e) => (
            <button
              key={e}
              onClick={() => onAsk(e)}
              className="group flex items-center gap-3 rounded-xl border bg-card p-4 text-left text-sm shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elevated"
            >
              <Search className="h-4 w-4 text-accent" />
              <span className="flex-1">{e}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Popular topics
        </div>
        <div className="flex flex-wrap gap-2">
          {suggestedQuestions.map((s) => (
            <button
              key={s}
              onClick={() => onAsk(s)}
              className="rounded-full border bg-card px-3 py-1 text-xs hover:bg-accent/10"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Loading({ query, docCount }: { query: string; docCount: number }) {
  return (
    <div className="space-y-4 py-10 text-center">
      <div className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm shadow-card">
        <Sparkles className="h-4 w-4 animate-pulse text-accent" />
        Retrieving from {docCount} ingested document{docCount === 1 ? "" : "s"}…
      </div>
      <p className="text-lg font-medium">{query}</p>
      <div className="mx-auto max-w-2xl space-y-3">
        {[70, 90, 50, 80].map((w, i) => (
          <div key={i} className="h-3 animate-pulse rounded bg-muted" style={{ width: `${w}%` }} />
        ))}
      </div>
    </div>
  );
}

function AnswerPanel({
  query,
  a,
  onAsk,
  onReset,
}: {
  query: string;
  a: SearchResult;
  onAsk: (q: string) => void;
  onReset: () => void;
}) {
  if (a.status !== "answered") {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs text-muted-foreground">Your question</div>
            <h1 className="text-2xl font-semibold">{query}</h1>
          </div>
          <Button variant="outline" size="sm" onClick={onReset}>
            <Search className="mr-1.5 h-4 w-4" /> New search
          </Button>
        </div>
        <section className="rounded-2xl border border-dashed bg-card p-8 text-center shadow-card">
          <AlertTriangle className="mx-auto h-6 w-6 text-accent" />
          <h2 className="mt-3 text-lg font-semibold">
            {a.status === "no_documents"
              ? "No indexed documents"
              : "No grounded answer available"}
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">{a.answer}</p>
          <Button asChild variant="outline" size="sm" className="mt-4">
            <RouterLink to="/app/library">
              <Library className="mr-1.5 h-4 w-4" /> Open Knowledge Repository
            </RouterLink>
          </Button>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs text-muted-foreground">Your question</div>
          <h1 className="text-2xl font-semibold">{query}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onReset}>
            <Search className="mr-1.5 h-4 w-4" /> New search
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(a.answer);
              toast.success("Answer copied");
            }}
          >
            <Copy className="mr-1.5 h-4 w-4" /> Copy
          </Button>
          <Button variant="outline" size="sm" onClick={() => toast.success("Saved to workspace")}>
            <BookmarkPlus className="mr-1.5 h-4 w-4" /> Save
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">

        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-2xl border bg-card p-6 shadow-card">
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-accent">
              <Sparkles className="h-3.5 w-3.5" /> AI answer
            </div>
            <div className="prose prose-sm mt-3 max-w-none whitespace-pre-wrap text-base leading-relaxed">
              {a.answer}
            </div>
          </section>

          {a.keyPoints.length > 0 && (
            <section className="rounded-2xl border bg-card p-6 shadow-card">
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-accent">
                <ListChecks className="h-3.5 w-3.5" /> Key points
              </div>
              <ul className="mt-3 space-y-2">
                {a.keyPoints.map((k, i) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                    <span>{k}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {a.decisionSupport && (
            <section className="rounded-2xl border bg-card p-6 shadow-card">
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-accent">
                <Lightbulb className="h-3.5 w-3.5" /> Informed decision making
              </div>
              {a.decisionSupport.recommendation && (
                <p className="mt-3 rounded-xl border bg-background/60 p-4 text-sm leading-relaxed">
                  {a.decisionSupport.recommendation}
                </p>
              )}
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <DecisionList
                  icon={Scale}
                  title="Considerations"
                  items={a.decisionSupport.considerations}
                />
                <DecisionList icon={AlertTriangle} title="Risks" items={a.decisionSupport.risks} />
                <DecisionList
                  icon={ListChecks}
                  title="Next steps"
                  items={a.decisionSupport.nextSteps}
                />
              </div>
            </section>
          )}

          {a.references.length > 0 && (
            <section className="rounded-2xl border bg-card p-6 shadow-card">
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-accent">
                <Library className="h-3.5 w-3.5" /> References to official documents
              </div>
              <ol className="mt-3 space-y-3">
                {a.references.map((r) => (
                  <li
                    key={r.docId}
                    className="flex items-start gap-3 rounded-xl border bg-background/60 p-4"
                  >
                    <FileText className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{r.title}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline">{r.type}</Badge>
                        {r.grNumber && <Badge variant="secondary">GR {r.grNumber}</Badge>}
                        {r.department && <span className="truncate">{r.department}</span>}
                        {r.filename && <span className="truncate">{r.filename}</span>}
                        {r.pages.length > 0 && (
                          <span>
                            · page{r.pages.length === 1 ? "" : "s"} {r.pages.join(", ")}
                          </span>
                        )}
                        <span>
                          · {r.passages} passage{r.passages === 1 ? "" : "s"} cited
                        </span>
                        <span>· relevance {Math.round(r.topSimilarity * 100)}%</span>
                      </div>
                      <RouterLink
                        to="/app/library"
                        className="mt-2 inline-flex items-center gap-1 text-xs text-accent hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" /> Open document
                      </RouterLink>

                    </div>
                    <div className="flex shrink-0 gap-1">
                      {r.citations.map((c) => (
                        <Badge key={c} variant="secondary">
                          [{c}]
                        </Badge>
                      ))}
                    </div>

                  </li>
                ))}
              </ol>
            </section>
          )}

          {a.sources.length > 0 && (
            <section className="rounded-2xl border bg-card p-6 shadow-card">
              <h3 className="text-sm font-semibold">Retrieved passages</h3>
              <div className="mt-3 space-y-3">
                {a.sources.map((s) => (
                  <div
                    key={`${s.docId}-${s.chunkIndex}`}
                    className="rounded-lg border bg-background/60 p-3"
                  >
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="secondary">[{s.index}]</Badge>
                      <Badge variant="outline">{s.type}</Badge>
                      <span className="truncate">{s.title}</span>
                      <span className="ml-auto">sim {Math.round(s.similarity * 100)}%</span>
                    </div>
                    <p className="mt-2 line-clamp-4 text-xs italic text-foreground/80">
                      &ldquo;{s.excerpt}&rdquo;
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          <div className="rounded-2xl border bg-card p-6 shadow-card">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">
                Retrieval confidence
              </div>
              <GraduationCap className="h-4 w-4 text-accent" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold gradient-text">
                {Math.round(a.confidence * 100)}%
              </span>
              <span className="text-xs text-muted-foreground">avg similarity</span>
            </div>
            <Progress value={a.confidence * 100} className="mt-3 h-1.5" />
          </div>

          <div className="rounded-2xl border bg-card p-5 shadow-card">
            <div className="mb-3 text-xs uppercase tracking-widest text-muted-foreground">
              Sources used
            </div>
            {a.sources.length === 0 ? (
              <p className="text-xs text-muted-foreground">No sources.</p>
            ) : (
              <ul className="space-y-3">
                {a.sources.map((s) => (
                  <li
                    key={`${s.docId}-${s.chunkIndex}`}
                    className="rounded-lg border bg-background/60 p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="secondary">[{s.index}]</Badge>
                          <span>chunk {s.chunkIndex + 1}</span>
                        </div>
                        <div className="mt-1 truncate text-sm font-medium">{s.title}</div>
                        {s.filename && (
                          <div className="truncate text-xs text-muted-foreground">{s.filename}</div>
                        )}
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border bg-card p-5 shadow-card">
            <div className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">
              Follow up
            </div>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                size="sm"
                onClick={() => onAsk(`Summarize key points about: ${query}`)}
              >
                <FileText className="mr-2 h-4 w-4" /> Summarize
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                size="sm"
                onClick={() => onAsk(`List eligibility & documents required for: ${query}`)}
              >
                <FileText className="mr-2 h-4 w-4" /> Eligibility & docs
              </Button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function DecisionList({
  icon: Icon,
  title,
  items,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  items: string[];
}) {
  if (!items || items.length === 0) return null;
  return (
    <div className="rounded-xl border bg-background/60 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold">
        <Icon className="h-3.5 w-3.5 text-accent" /> {title}
      </div>
      <ul className="mt-2 space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className="text-xs leading-relaxed text-muted-foreground">
            • {it}
          </li>
        ))}
      </ul>
    </div>
  );
}
