import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Sparkles,
  Search,
  FileText,
  GitCompareArrows,
  ShieldCheck,
  Zap,
  BarChart3,
  CheckCircle2,
  Quote,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HTE AI Copilot — AI for Higher & Technical Education" },
      {
        name: "description",
        content:
          "Enterprise-grade AI copilot for Maharashtra HTE: semantic search, cited answers, document comparison and workflow generation across every GR, circular and policy.",
      },
      { property: "og:title", content: "HTE AI Copilot — AI for Higher & Technical Education" },
      {
        property: "og:description",
        content:
          "Enterprise-grade AI copilot for Maharashtra HTE: semantic search, cited answers, document comparison and workflow generation across every GR, circular and policy.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-hero">
      <Nav />
      <Hero />
      <Features />
      <HowItWorks />
      <Benefits />
      <Testimonials />
      <TechStack />
      <Footer />
    </div>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-40 glass border-b">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg gradient-primary shadow-elevated">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold">HTE AI Copilot</span>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Govt. of Maharashtra
            </span>
          </div>
        </Link>
        <nav className="hidden gap-8 text-sm text-muted-foreground md:flex">
          <a href="#features" className="hover:text-foreground">Features</a>
          <a href="#how" className="hover:text-foreground">How it works</a>
          <a href="#benefits" className="hover:text-foreground">Benefits</a>
          <a href="#tech" className="hover:text-foreground">Technology</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/auth">
            <Button variant="ghost" size="sm">Sign in</Button>
          </Link>
          <Link to="/app">
            <Button size="sm" className="gradient-primary shadow-elevated">
              Launch Copilot
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="secondary" className="mb-6 rounded-full px-3 py-1 text-xs">
            <ShieldCheck className="mr-1.5 h-3 w-3" />
            Trusted • Cited • Explainable
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
            Instant, reliable access to{" "}
            <span className="gradient-text">administrative knowledge.</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground md:text-xl">
            HTE AI Copilot for Maharashtra&apos;s Higher &amp; Technical Education Department —
            grounded, cited answers from your official documents.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link to="/app/search">
              <Button size="lg" className="gradient-primary shadow-elevated">
                <Search className="mr-2 h-4 w-4" /> Start Searching
              </Button>
            </Link>
            <Link to="/app/library">
              <Button size="lg" variant="outline">
                <FileText className="mr-2 h-4 w-4" /> Explore Documents
              </Button>
            </Link>
          </div>

        </div>

        <div className="mx-auto mt-20 max-w-5xl">
          <div className="glass shadow-elevated rounded-2xl p-3">
            <div className="rounded-xl bg-card p-6">
              <div className="flex items-center gap-3 rounded-lg border bg-background/60 px-4 py-3">
                <Search className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  How do I start a new engineering college in Maharashtra?
                </span>
                <div className="ml-auto flex items-center gap-2 text-xs">
                  <Badge variant="secondary">RAG</Badge>
                  <Badge variant="secondary">Cited</Badge>
                </div>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {[
                  { k: "Confidence", v: "97%", i: ShieldCheck },
                  { k: "Sources used", v: "3 GRs · 1 AICTE", i: FileText },
                  { k: "Response time", v: "1.4s", i: Zap },
                ].map((s) => (
                  <div key={s.k} className="rounded-lg border bg-card p-4">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <s.i className="h-3.5 w-3.5" /> {s.k}
                    </div>
                    <div className="mt-1 text-lg font-semibold">{s.v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Features() {
  const items = [
    { i: Search, t: "AI Semantic Search", d: "Natural-language search across every GR, circular and notification." },
    { i: ShieldCheck, t: "Grounded, Cited Answers", d: "Every answer shows source document, passage and confidence score." },
    { i: GitCompareArrows, t: "Document Comparison", d: "Diff two GRs — added, removed, modified — in a visual table." },
    { i: FileText, t: "Document Library", d: "Upload official documents; they are chunked, embedded and searchable." },
    { i: BarChart3, t: "Analytics", d: "Track most-searched topics, usage trends and policy references." },
    { i: Zap, t: "Decision Support", d: "Recommendations, risks and next steps drawn from official sources." },

  ];
  return (
    <section id="features" className="mx-auto max-w-7xl px-6 py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-4xl font-bold">Built for administrative decisions.</h2>
        <p className="mt-4 text-muted-foreground">
          Not a chatbot. A decision-support platform that reads, cites and reasons over official documents.
        </p>
      </div>
      <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((f) => (
          <div key={f.t} className="group rounded-2xl border bg-card p-6 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elevated">
            <div className="grid h-10 w-10 place-items-center rounded-lg gradient-primary text-primary-foreground shadow-elevated">
              <f.i className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">{f.t}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{f.d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { n: "01", t: "Ingest", d: "GRs, circulars, AICTE notifications parsed and embedded." },
    { n: "02", t: "Retrieve", d: "Semantic + keyword hybrid retrieval across the knowledge base." },
    { n: "03", t: "Reason", d: "Grounded LLM synthesis with per-claim citations." },
    { n: "04", t: "Decide", d: "Compare, summarize, generate workflows and reports." },
  ];
  return (
    <section id="how" className="border-y bg-muted/30 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <h2 className="text-4xl font-bold">How it works</h2>
        <div className="mt-12 grid gap-6 md:grid-cols-4">
          {steps.map((s) => (
            <div key={s.n} className="rounded-2xl border bg-card p-6 shadow-card">
              <div className="text-xs font-semibold tracking-widest text-accent">{s.n}</div>
              <h3 className="mt-2 text-lg font-semibold">{s.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Benefits() {
  const items = [
    "Cut research time from hours to seconds",
    "Every answer traceable to an official GR",
    "Compare rule changes across years instantly",
    "Upload your own documents and query them instantly",
    "Role-based views for officers, faculty & students",
    "Audit-ready citations for every decision",
  ];
  return (
    <section id="benefits" className="mx-auto max-w-7xl px-6 py-24">
      <div className="grid items-center gap-12 md:grid-cols-2">
        <div>
          <h2 className="text-4xl font-bold">Why teams choose HTE Copilot</h2>
          <p className="mt-4 text-muted-foreground">
            Designed with the discipline of a Stripe dashboard and the intelligence of a modern research assistant.
          </p>
        </div>
        <ul className="grid gap-3">
          {items.map((b) => (
            <li key={b} className="flex items-start gap-3 rounded-xl border bg-card p-4 shadow-card">
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-success" />
              <span className="text-sm">{b}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Testimonials() {
  const quotes = [
    { q: "We answered a legislative query in 90 seconds. It used to take a full day.", n: "Deputy Secretary, HTE" },
    { q: "The comparison view caught three clause changes our team had missed.", n: "Joint Director, DTE" },
    { q: "Faculty finally have one place to check scholarship eligibility.", n: "Principal, Govt. Polytechnic" },
  ];
  return (
    <section className="border-y bg-muted/30 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <h2 className="text-4xl font-bold">Trusted by administrators</h2>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {quotes.map((t) => (
            <figure key={t.n} className="rounded-2xl border bg-card p-6 shadow-card">
              <Quote className="h-6 w-6 text-accent" />
              <blockquote className="mt-3 text-sm leading-relaxed">&ldquo;{t.q}&rdquo;</blockquote>
              <figcaption className="mt-4 text-xs text-muted-foreground">— {t.n}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function TechStack() {
  const tech = ["React", "TypeScript", "Tailwind CSS", "FastAPI", "RAG", "FAISS", "Gemini", "Whisper", "PyMuPDF"];
  return (
    <section id="tech" className="mx-auto max-w-7xl px-6 py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-4xl font-bold">Built on a modern AI stack</h2>
        <p className="mt-3 text-muted-foreground">Hybrid retrieval, grounded generation, speech &amp; translation — all production ready.</p>
      </div>
      <div className="mt-10 flex flex-wrap justify-center gap-2">
        {tech.map((t) => (
          <Badge key={t} variant="secondary" className="rounded-full px-3 py-1 text-xs">
            {t}
          </Badge>
        ))}
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t bg-muted/20">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-10 text-xs text-muted-foreground md:flex-row">
        <div>© {new Date().getFullYear()} Maharashtra HTE Department. All rights reserved.</div>
        <div>Grounded on official Government Resolutions, circulars and policies.</div>

      </div>
    </footer>
  );
}
