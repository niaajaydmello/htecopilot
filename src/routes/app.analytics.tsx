import { createFileRoute } from "@tanstack/react-router";
import { BarChart3, TrendingUp, Clock3, FileText } from "lucide-react";
import { analytics } from "@/lib/hte-data";

export const Route = createFileRoute("/app/analytics")({
  head: () => ({ meta: [{ title: "Analytics · HTE Copilot" }] }),
  component: Analytics,
});

function Analytics() {
  const maxT = Math.max(...analytics.topTopics.map((t) => t.value));
  const maxU = Math.max(...analytics.usageByMonth.map((u) => u.q));

  const kpis = [
    { l: "Queries (30d)", v: "8,412", d: "+21%", i: TrendingUp },
    { l: "Docs referenced", v: "1,203", d: "+8%", i: FileText },
    { l: "Avg. response", v: "1.4s", d: "−240ms", i: Clock3 },
    { l: "Answer confidence", v: "96.2%", d: "▲ 1.1%", i: BarChart3 },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Usage, topics and policy references across the department.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.l} className="rounded-2xl border bg-card p-5 shadow-card">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              {k.l}
              <k.i className="h-4 w-4" />
            </div>
            <div className="mt-2 text-2xl font-semibold">{k.v}</div>
            <div className="text-xs text-success">{k.d}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border bg-card p-6 shadow-card">
          <h2 className="text-lg font-semibold">Most searched topics</h2>
          <div className="mt-5 space-y-3">
            {analytics.topTopics.map((t) => (
              <div key={t.name}>
                <div className="flex justify-between text-xs">
                  <span className="font-medium">{t.name}</span>
                  <span className="text-muted-foreground">{t.value}</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-muted">
                  <div
                    className="h-full rounded-full gradient-primary"
                    style={{ width: `${(t.value / maxT) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border bg-card p-6 shadow-card">
          <h2 className="text-lg font-semibold">Queries per month</h2>
          <div className="mt-5 flex h-56 items-end gap-3">
            {analytics.usageByMonth.map((u) => (
              <div key={u.m} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className="w-full rounded-t-md gradient-primary shadow-elevated"
                  style={{ height: `${(u.q / maxU) * 100}%` }}
                />
                <div className="text-xs text-muted-foreground">{u.m}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
