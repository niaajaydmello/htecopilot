import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/app/settings")({
  head: () => ({
    meta: [
      { title: "Settings · HTE AI Copilot" },
      {
        name: "description",
        content:
          "Manage your HTE Copilot profile, department details and answer preferences.",
      },
      { property: "og:title", content: "Settings · HTE AI Copilot" },
      {
        property: "og:description",
        content: "Manage your HTE Copilot profile and answer preferences.",
      },
    ],
  }),
  component: Settings,
});

const STORAGE_KEY = "hte-settings";

const PREFS = [
  { key: "marathi", l: "Marathi answers by default", d: "Return answers in Marathi with English toggle." },
  { key: "confidence", l: "Show confidence scores", d: "Display grounding confidence on every answer." },
  { key: "digest", l: "Email me policy updates", d: "Weekly digest of new GRs and circulars." },
] as const;

type Settings = {
  name: string;
  role: string;
  department: string;
  email: string;
  prefs: Record<string, boolean>;
};

const DEFAULTS: Settings = {
  name: "R. Shinde",
  role: "Officer — HTE",
  department: "Higher & Technical Education",
  email: "rshinde@maharashtra.gov.in",
  prefs: { marathi: true, confidence: true, digest: true },
};

function load(): Settings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

function Settings() {
  const [saved, setSaved] = useState<Settings>(DEFAULTS);
  const [form, setForm] = useState<Settings>(DEFAULTS);

  useEffect(() => {
    const s = load();
    setSaved(s);
    setForm(s);
  }, []);

  const dirty = JSON.stringify(saved) !== JSON.stringify(form);

  const save = () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    setSaved(form);
    toast.success("Settings saved");
  };

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
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="role">Role</Label>
            <Input
              id="role"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="dept">Department</Label>
            <Input
              id="dept"
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-6 shadow-card">
        <h2 className="font-semibold">Preferences</h2>
        <div className="mt-4 space-y-4">
          {PREFS.map((p) => (
            <div key={p.key} className="flex items-start justify-between gap-4 rounded-lg border p-3">
              <div>
                <div className="text-sm font-medium">{p.l}</div>
                <div className="text-xs text-muted-foreground">{p.d}</div>
              </div>
              <Switch
                checked={form.prefs[p.key] ?? false}
                onCheckedChange={(v) =>
                  setForm({ ...form, prefs: { ...form.prefs, [p.key]: v } })
                }
              />
            </div>
          ))}
        </div>
      </section>

      <div className="flex justify-end gap-2">
        <Button variant="outline" disabled={!dirty} onClick={() => setForm(saved)}>
          Cancel
        </Button>
        <Button className="gradient-primary shadow-elevated" disabled={!dirty} onClick={save}>
          Save changes
        </Button>
      </div>
    </div>
  );
}
