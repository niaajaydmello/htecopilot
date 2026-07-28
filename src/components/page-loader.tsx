import { Sparkles } from "lucide-react";

export function PageLoader() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 py-6">
      <div className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm shadow-card">
        <Sparkles className="h-4 w-4 animate-pulse text-accent" />
        Loading…
      </div>
      <div className="h-8 w-1/3 animate-pulse rounded-lg bg-muted" />
      <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-40 animate-pulse rounded-2xl border bg-muted/50" />
        ))}
      </div>
    </div>
  );
}
