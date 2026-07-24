import { createFileRoute } from "@tanstack/react-router";
import { Clock3, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { timelineEvents } from "@/lib/hte-data";

export const Route = createFileRoute("/app/timeline")({
  head: () => ({ meta: [{ title: "Timeline Explorer · HTE Copilot" }] }),
  component: Timeline,
});

function Timeline() {
  const years = Array.from(new Set(timelineEvents.map((e) => e.year))).sort();

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <h1 className="text-3xl font-bold">Interactive Timeline</h1>
        <p className="text-sm text-muted-foreground">
          Every circular, GR &amp; policy — chronologically, expandable.
        </p>
      </header>

      <div className="relative pl-8">
        <div className="absolute left-3 top-0 bottom-0 w-px bg-border" />
        {years.map((y) => (
          <div key={y} className="mb-10">
            <div className="mb-4 flex items-center gap-3">
              <div className="absolute left-0 grid h-6 w-6 place-items-center rounded-full gradient-primary text-[10px] font-bold text-primary-foreground shadow-elevated">
                <Clock3 className="h-3 w-3" />
              </div>
              <h2 className="text-xl font-semibold">{y}</h2>
              <Badge variant="secondary">
                {timelineEvents.filter((e) => e.year === y).length} events
              </Badge>
            </div>
            <div className="grid gap-3">
              {timelineEvents
                .filter((e) => e.year === y)
                .map((e) => (
                  <div
                    key={e.docId + e.title}
                    className="rounded-xl border bg-card p-4 shadow-card transition hover:shadow-elevated"
                  >
                    <div className="flex items-start gap-3">
                      <FileText className="mt-0.5 h-4 w-4 text-accent" />
                      <div>
                        <div className="font-medium">{e.title}</div>
                        <div className="text-xs text-muted-foreground">{e.docId}</div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
