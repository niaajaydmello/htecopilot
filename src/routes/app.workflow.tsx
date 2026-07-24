import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Brain, ArrowRight, Sparkles, FileText, Users, Clock3, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/app/workflow")({
  head: () => ({ meta: [{ title: "AI Workflow Assistant · HTE Copilot" }] }),
  component: WorkflowPage,
});

const defaultSteps = [
  { t: "Feasibility & land acquisition", d: "2.5 acres metro / 5 acres non-metro", i: FileText },
  { t: "Prepare required documents", d: "Trust deed, land docs, financials", i: FileText },
  { t: "AICTE online application", d: "APH-2024 portal — Aug to Oct window", i: ShieldCheck },
  { t: "State NOC scrutiny", d: "Directorate of Technical Education", i: Users },
  { t: "AICTE inspection", d: "Physical inspection by expert committee", i: Users },
  { t: "University LIC visit", d: "Local Inquiry Committee report", i: Users },
  { t: "Affiliation & admission approval", d: "State CET Cell mapping", i: Clock3 },
];

export default function _unused() {}

function WorkflowPage() {
  const [q, setQ] = useState("I want to establish a new engineering college.");

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Brain className="h-7 w-7 text-accent" /> AI Workflow Assistant
        </h1>
        <p className="text-sm text-muted-foreground">
          Describe your objective — the AI generates a step-by-step approval workflow.
        </p>
      </header>

      <div className="glass shadow-elevated rounded-2xl p-3">
        <div className="flex gap-2 rounded-xl bg-card p-3">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="What do you want to accomplish?" />
          <Button className="gradient-primary shadow-elevated">
            <Sparkles className="mr-1.5 h-4 w-4" /> Generate workflow
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-6 shadow-card">
        <div className="mb-6 text-sm text-muted-foreground">Estimated processing time · <span className="font-semibold text-foreground">4–6 months</span> · 3 departments involved</div>
        <ol className="space-y-4">
          {defaultSteps.map((s, i) => (
            <li key={s.t} className="flex items-start gap-4">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl gradient-primary text-sm font-bold text-primary-foreground shadow-elevated">
                {i + 1}
              </div>
              <div className="flex-1 rounded-xl border bg-background/60 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <s.i className="h-4 w-4 text-accent" /> {s.t}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{s.d}</div>
              </div>
              {i < defaultSteps.length - 1 && (
                <ArrowRight className="mt-4 h-4 w-4 text-muted-foreground" />
              )}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
