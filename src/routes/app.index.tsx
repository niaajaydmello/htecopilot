import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Search,
  FileText,
  TrendingUp,
  Bell,
  Sparkles,
  Clock3,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { documents, recentSearches, trendingTopics } from "@/lib/hte-data";

export const Route = createFileRoute("/app/")({
  head: () => ({
    meta: [
      { title: "Dashboard · HTE AI Copilot" },
      { name: "description", content: "Your Higher & Technical Education command center." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const metrics = [
    { label: "Queries this week", value: "1,284", delta: "+12.4%", icon: Search },
    { label: "Documents indexed", value: "3,942", delta: "+18 new", icon: FileText },
    { label: "Avg. confidence", value: "96.2%", delta: "▲ 1.1%", icon: Sparkles },
    { label: "Avg. response time", value: "1.4s", delta: "−240ms", icon: Zap },
  ];
  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Good afternoon, R. Shinde</h1>
          <p className="text-sm text-muted-foreground">
            Here&apos;s what&apos;s happening across Higher &amp; Technical Education today.
          </p>
        </div>
        <Link to="/app/search">
          <Button className="gradient-primary shadow-elevated">
            <Search className="mr-2 h-4 w-4" /> Ask the Copilot
          </Button>
        </Link>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-2xl border bg-card p-5 shadow-card">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              {m.label}
              <m.icon className="h-4 w-4" />
            </div>
            <div className="mt-2 text-2xl font-semibold">{m.value}</div>
            <div className="mt-1 text-xs text-success">{m.delta}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border bg-card p-6 shadow-card lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-accent" /> Trending Government Resolutions
            </h2>
            <Link to="/app/library" className="text-xs text-muted-foreground hover:text-foreground">
              View all →
            </Link>
          </div>
          <ul className="mt-4 divide-y">
            {documents.slice(0, 5).map((d) => (
              <li key={d.id} className="flex items-start justify-between gap-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="secondary">{d.type}</Badge>
                    <span>{d.number}</span>
                    <span>· {d.date}</span>
                  </div>
                  <div className="mt-1 truncate font-medium">{d.title}</div>
                </div>
                <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border bg-card p-6 shadow-card">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-accent" /> Recent Searches
          </h2>
          <ul className="mt-4 space-y-2">
            {recentSearches.map((r) => (
              <li key={r}>
                <Link
                  to="/app/search"
                  search={{ q: r }}
                  className="block rounded-lg border bg-background/60 px-3 py-2 text-sm hover:bg-accent/10"
                >
                  {r}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border bg-card p-6 shadow-card lg:col-span-2">
          <h2 className="text-lg font-semibold">Popular Topics</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {trendingTopics.map((t) => (
              <Link key={t} to="/app/search" search={{ q: t }}>
                <Badge variant="secondary" className="cursor-pointer rounded-full px-3 py-1 text-xs hover:bg-accent/20">
                  {t}
                </Badge>
              </Link>
            ))}
          </div>

          <h3 className="mt-8 text-sm font-semibold text-muted-foreground">AI Insights</h3>
          <div className="mt-3 rounded-xl bg-hero p-5 border">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-accent" />
              <p className="text-sm">
                GR-HTE-2025/014 changed 6 clauses vs. the 2021 procedure. Faculty ratio moved from 1:15 to 1:20 and financial guarantee doubled to ₹2 crore. <Link to="/app/compare" className="underline">Open comparison →</Link>
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border bg-card p-6 shadow-card">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Bell className="h-4 w-4 text-accent" /> Notifications
          </h2>
          <ul className="mt-4 space-y-3 text-sm">
            {[
              "AICTE inspection window opens 15 Aug",
              "Scholarship deadline extended to 30 Sep",
              "New circular on CAP grievances published",
            ].map((n) => (
              <li key={n} className="rounded-lg border bg-background/60 px-3 py-2">{n}</li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
