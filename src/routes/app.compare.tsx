import { createFileRoute } from "@tanstack/react-router";
import { GitCompareArrows, Plus, Minus, ArrowRight, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { comparisonRows } from "@/lib/hte-data";

export const Route = createFileRoute("/app/compare")({
  head: () => ({ meta: [{ title: "Compare Documents · HTE Copilot" }] }),
  component: Compare,
});

function Compare() {
  const added = comparisonRows.filter((r) => r.change === "added").length;
  const removed = comparisonRows.filter((r) => r.change === "removed").length;
  const modified = comparisonRows.filter((r) => r.change === "modified").length;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Compare Documents</h1>
        <p className="text-sm text-muted-foreground">
          Upload or select two GRs — the AI produces a clause-level diff.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <DocSlot label="Document A" title="GR-HTE-2021/077" subtitle="College Affiliation Procedure (2021)" />
        <DocSlot label="Document B" title="GR-HTE-2025/014" subtitle="Establishment of New Engineering Colleges (2025)" />
      </div>

      <div className="rounded-2xl border bg-card p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <GitCompareArrows className="h-5 w-5 text-accent" />
            <span className="text-lg font-semibold">
              {comparisonRows.length} changes detected
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Badge className="bg-success text-success-foreground"><Plus className="mr-1 h-3 w-3" /> {added} added</Badge>
            <Badge className="bg-warning text-warning-foreground">≈ {modified} modified</Badge>
            <Badge className="bg-destructive text-destructive-foreground"><Minus className="mr-1 h-3 w-3" /> {removed} removed</Badge>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-3 font-medium">Field</th>
                <th className="p-3 font-medium">Document A</th>
                <th className="p-3 font-medium"></th>
                <th className="p-3 font-medium">Document B</th>
                <th className="p-3 font-medium">Change</th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((r) => (
                <tr key={r.field} className="border-t">
                  <td className="p-3 font-medium">{r.field}</td>
                  <td className={`p-3 ${r.change === "removed" ? "bg-destructive/10 line-through" : ""}`}>{r.oldV}</td>
                  <td className="p-3 text-muted-foreground"><ArrowRight className="h-4 w-4" /></td>
                  <td
                    className={`p-3 ${
                      r.change === "added"
                        ? "bg-success/10"
                        : r.change === "modified"
                          ? "bg-warning/10"
                          : ""
                    }`}
                  >
                    {r.newV}
                  </td>
                  <td className="p-3">
                    <Badge
                      variant="secondary"
                      className={
                        r.change === "added"
                          ? "bg-success/20 text-success"
                          : r.change === "removed"
                            ? "bg-destructive/20 text-destructive"
                            : "bg-warning/20"
                      }
                    >
                      {r.change}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function DocSlot({ label, title, subtitle }: { label: string; title: string; subtitle: string }) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-card">
      <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1 font-semibold">{title}</div>
      <div className="text-sm text-muted-foreground">{subtitle}</div>
      <div className="mt-4 flex gap-2">
        <Button variant="outline" size="sm">
          <Upload className="mr-1.5 h-4 w-4" /> Replace
        </Button>
        <Button variant="ghost" size="sm">Preview</Button>
      </div>
    </div>
  );
}
