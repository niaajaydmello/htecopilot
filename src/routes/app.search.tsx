import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import {
  Search,
  Sparkles,
  ShieldCheck,
  FileText,
  Mic,
  Send,
  BookmarkPlus,
  Languages,
  GraduationCap,
  Users,
  ListChecks,
  ExternalLink,
  Copy,
  ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  exampleQueries,
  generateAnswer,
  suggestedQuestions,
  type GroundedAnswer,
} from "@/lib/hte-data";

const searchSchema = z.object({ q: z.string().optional() });

export const Route = createFileRoute("/app/search")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "AI Search · HTE Copilot" },
      { name: "description", content: "Ask anything about Higher & Technical Education." },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const { q } = Route.useSearch();
  const [query, setQuery] = useState(q ?? "");
  const [answer, setAnswer] = useState<GroundedAnswer | null>(null);
  const [loading, setLoading] = useState(false);

  const ask = (text: string) => {
    if (!text.trim()) return;
    setLoading(true);
    setAnswer(null);
    setQuery(text);
    setTimeout(() => {
      setAnswer(generateAnswer(text));
      setLoading(false);
    }, 900);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {!answer && !loading && <Hero onAsk={ask} query={query} setQuery={setQuery} />}
      {loading && <Loading query={query} />}
      {answer && <AnswerPanel a={answer} onAsk={ask} onReset={() => setAnswer(null)} />}
    </div>
  );
}

function Hero({
  onAsk,
  query,
  setQuery,
}: {
  onAsk: (q: string) => void;
  query: string;
  setQuery: (v: string) => void;
}) {
  return (
    <div className="space-y-8 py-6">
      <div className="text-center">
        <Badge variant="secondary" className="rounded-full px-3 py-1">
          <Sparkles className="mr-1.5 h-3 w-3 text-accent" /> Grounded on official HTE documents
        </Badge>
        <h1 className="mt-4 text-4xl font-bold">
          Ask anything about <span className="gradient-text">Higher Technical Education</span>
        </h1>
        <p className="mt-2 text-muted-foreground">
          Cited answers, side-by-side sources, comparable across years.
        </p>
      </div>

      <div className="glass shadow-elevated rounded-2xl p-3">
        <div className="rounded-xl bg-card p-4">
          <Textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask anything about Higher Technical Education…"
            rows={3}
            className="resize-none border-0 bg-transparent text-base shadow-none focus-visible:ring-0"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onAsk(query);
            }}
          />
          <div className="mt-2 flex items-center gap-2">
            <Button variant="ghost" size="sm">
              <Mic className="mr-1.5 h-4 w-4" /> Voice
            </Button>
            <div className="ml-auto flex items-center gap-2">
              <span className="hidden text-xs text-muted-foreground md:inline">
                ⌘+↵ to send
              </span>
              <Button onClick={() => onAsk(query)} className="gradient-primary shadow-elevated">
                <Send className="mr-1.5 h-4 w-4" /> Ask
              </Button>
            </div>
          </div>
        </div>
      </div>

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

function Loading({ query }: { query: string }) {
  return (
    <div className="space-y-4 py-10 text-center">
      <div className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm shadow-card">
        <Sparkles className="h-4 w-4 animate-pulse text-accent" />
        Retrieving from 3,942 documents…
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
  a,
  onAsk,
  onReset,
}: {
  a: GroundedAnswer;
  onAsk: (q: string) => void;
  onReset: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs text-muted-foreground">Your question</div>
          <h1 className="text-2xl font-semibold">{a.query}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onReset}>
            <Search className="mr-1.5 h-4 w-4" /> New search
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
              <Sparkles className="h-3.5 w-3.5" /> Answer summary
            </div>
            <p className="mt-3 text-base leading-relaxed">{a.summary}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              {["Explain simply", "Like a student", "Like a parent", "In Marathi", "5-point summary"].map(
                (t) => (
                  <Button key={t} size="sm" variant="secondary" className="rounded-full">
                    <Languages className="mr-1.5 h-3.5 w-3.5" />
                    {t}
                  </Button>
                ),
              )}
            </div>
          </section>

          <Tabs defaultValue="explanation">
            <TabsList>
              <TabsTrigger value="explanation">Explanation</TabsTrigger>
              <TabsTrigger value="eligibility">Eligibility</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="rules">Rules</TabsTrigger>
              <TabsTrigger value="exceptions">Exceptions</TabsTrigger>
            </TabsList>
            <TabsContent value="explanation" className="rounded-2xl border bg-card p-6 shadow-card">
              <p className="text-sm leading-relaxed">{a.explanation}</p>
              <div className="mt-4 rounded-lg border bg-warning/10 p-3 text-xs">
                <div className="font-semibold text-warning-foreground">Important notes</div>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
                  {a.notes.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              </div>
            </TabsContent>
            <TabsContent value="eligibility" className="rounded-2xl border bg-card p-6 shadow-card">
              <ul className="space-y-2 text-sm">
                {a.eligibility.map((e) => (
                  <li key={e} className="flex items-start gap-2">
                    <ShieldCheck className="mt-0.5 h-4 w-4 text-success" /> {e}
                  </li>
                ))}
              </ul>
            </TabsContent>
            <TabsContent value="documents" className="rounded-2xl border bg-card p-6 shadow-card">
              <ul className="space-y-2 text-sm">
                {a.documents.map((d) => (
                  <li key={d} className="flex items-start gap-2">
                    <FileText className="mt-0.5 h-4 w-4 text-accent" /> {d}
                  </li>
                ))}
              </ul>
            </TabsContent>
            <TabsContent value="timeline" className="rounded-2xl border bg-card p-6 shadow-card">
              <ol className="space-y-3">
                {a.timeline.map((t, i) => (
                  <li key={t.step} className="flex items-start gap-3">
                    <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full gradient-primary text-xs font-semibold text-primary-foreground">
                      {i + 1}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{t.step}</div>
                      <div className="text-xs text-muted-foreground">{t.duration}</div>
                    </div>
                  </li>
                ))}
              </ol>
            </TabsContent>
            <TabsContent value="rules" className="rounded-2xl border bg-card p-6 shadow-card">
              <ul className="space-y-2 text-sm">
                {a.rules.map((r) => (
                  <li key={r} className="flex items-start gap-2">
                    <ListChecks className="mt-0.5 h-4 w-4 text-accent" /> {r}
                  </li>
                ))}
              </ul>
            </TabsContent>
            <TabsContent value="exceptions" className="rounded-2xl border bg-card p-6 shadow-card">
              <ul className="space-y-2 text-sm">
                {a.exceptions.map((e) => (
                  <li key={e} className="flex items-start gap-2">
                    <Users className="mt-0.5 h-4 w-4 text-warning" /> {e}
                  </li>
                ))}
              </ul>
            </TabsContent>
          </Tabs>

          <section className="rounded-2xl border bg-card p-6 shadow-card">
            <h3 className="text-sm font-semibold">Related</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {a.related.map((r) => (
                <button
                  key={r}
                  onClick={() => onAsk(r)}
                  className="rounded-full border bg-background/60 px-3 py-1 text-xs hover:bg-accent/10"
                >
                  {r}
                </button>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <div className="rounded-2xl border bg-card p-6 shadow-card">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">
                AI confidence
              </div>
              <GraduationCap className="h-4 w-4 text-accent" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold gradient-text">
                {Math.round(a.confidence * 100)}%
              </span>
              <span className="text-xs text-muted-foreground">grounded</span>
            </div>
            <Progress value={a.confidence * 100} className="mt-3 h-1.5" />
          </div>

          <div className="rounded-2xl border bg-card p-5 shadow-card">
            <div className="mb-3 text-xs uppercase tracking-widest text-muted-foreground">
              Sources used
            </div>
            <ul className="space-y-3">
              {a.sources.map((s) => (
                <li key={s.docId} className="rounded-lg border bg-background/60 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="secondary">{s.number}</Badge>
                        <span>· p. {s.page}</span>
                      </div>
                      <div className="mt-1 truncate text-sm font-medium">{s.title}</div>
                    </div>
                    <button className="text-muted-foreground hover:text-foreground" aria-label="Open">
                      <ExternalLink className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="mt-2 rounded bg-warning/20 px-2 py-1 text-xs italic text-foreground/80">
                    &ldquo;{s.excerpt}&rdquo;
                  </p>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border bg-card p-5 shadow-card">
            <div className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">
              Actions
            </div>
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start" size="sm">
                <FileText className="mr-2 h-4 w-4" /> Generate PDF report
              </Button>
              <Button variant="outline" className="w-full justify-start" size="sm">
                <Copy className="mr-2 h-4 w-4" /> Copy answer
              </Button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
