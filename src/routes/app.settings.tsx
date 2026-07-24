import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/app/settings")({
  head: () => ({ meta: [{ title: "Settings · HTE Copilot" }] }),
  component: Settings,
});

function Settings() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your workspace and preferences.</p>
      </header>

      <section className="rounded-2xl border bg-card p-6 shadow-card">
        <h2 className="font-semibold">Profile</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <Label>Full name</Label>
            <Input defaultValue="R. Shinde" />
          </div>
          <div className="space-y-1">
            <Label>Role</Label>
            <Input defaultValue="Officer — HTE" />
          </div>
          <div className="space-y-1">
            <Label>Department</Label>
            <Input defaultValue="Higher & Technical Education" />
          </div>
          <div className="space-y-1">
            <Label>Email</Label>
            <Input defaultValue="rshinde@maharashtra.gov.in" />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-6 shadow-card">
        <h2 className="font-semibold">Preferences</h2>
        <div className="mt-4 space-y-4">
          {[
            { l: "Marathi answers by default", d: "Return answers in Marathi with English toggle." },
            { l: "Show confidence scores", d: "Display grounding confidence on every answer." },
            { l: "Voice read-back", d: "Automatically read out answers when using voice search." },
            { l: "Email me policy updates", d: "Weekly digest of new GRs and circulars." },
          ].map((p) => (
            <div key={p.l} className="flex items-start justify-between gap-4 rounded-lg border p-3">
              <div>
                <div className="text-sm font-medium">{p.l}</div>
                <div className="text-xs text-muted-foreground">{p.d}</div>
              </div>
              <Switch defaultChecked />
            </div>
          ))}
        </div>
      </section>

      <div className="flex justify-end gap-2">
        <Button variant="outline">Cancel</Button>
        <Button className="gradient-primary shadow-elevated">Save changes</Button>
      </div>
    </div>
  );
}
