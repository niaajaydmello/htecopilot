import { createFileRoute } from "@tanstack/react-router";
import { Star, Folder, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/app/saved")({
  head: () => ({ meta: [{ title: "Saved Responses · HTE Copilot" }] }),
  component: Saved,
});

const collections = [
  { name: "Affiliation research", count: 8 },
  { name: "Scholarship briefs", count: 5 },
  { name: "Faculty rules", count: 12 },
];

const saved = [
  { q: "Establishing a new engineering college", when: "2 days ago", src: "GR-HTE-2025/014" },
  { q: "CAP round 2 grievance timeline", when: "5 days ago", src: "Circular-CAP/2023" },
  { q: "Post-matric scholarship eligibility", when: "1 week ago", src: "Circular-16/2025" },
];

function Saved() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Star className="h-7 w-7 text-accent" /> Saved Workspace
        </h1>
        <p className="text-sm text-muted-foreground">
          Bookmarked answers, folders and pinned documents.
        </p>
      </header>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Collections
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {collections.map((c) => (
            <div key={c.name} className="rounded-2xl border bg-card p-5 shadow-card">
              <div className="flex items-center gap-2">
                <Folder className="h-5 w-5 text-accent" />
                <span className="font-medium">{c.name}</span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{c.count} items</div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Pinned answers
        </h2>
        <ul className="space-y-3">
          {saved.map((s) => (
            <li key={s.q} className="rounded-xl border bg-card p-4 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <FileText className="h-3.5 w-3.5" /> {s.src}
                    <span>· {s.when}</span>
                  </div>
                  <div className="mt-1 font-medium">{s.q}</div>
                </div>
                <Badge variant="secondary">saved</Badge>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
