import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Sparkles, Mail, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in · HTE Copilot" }] }),
  component: Auth,
});

const ROLES = ["Officer", "Faculty", "Administrator", "Student"] as const;

function Auth() {
  const navigate = useNavigate();
  const [role, setRole] = useState<(typeof ROLES)[number]>("Officer");

  return (
    <div className="grid min-h-screen bg-hero md:grid-cols-2">
      <aside className="relative hidden flex-col justify-between p-12 md:flex">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg gradient-primary shadow-elevated">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold">HTE AI Copilot</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Government of Maharashtra
            </div>
          </div>
        </Link>
        <div className="max-w-md space-y-4">
          <h1 className="text-4xl font-bold gradient-text">
            Intelligent access to administrative knowledge.
          </h1>
          <p className="text-muted-foreground">
            Every answer cited to an official GR. Every workflow generated from real policy.
          </p>
        </div>
        <div className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} HTE Department, Maharashtra
        </div>
      </aside>

      <main className="flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6 rounded-2xl border bg-card p-8 shadow-elevated">
          <div>
            <h2 className="text-2xl font-semibold">Welcome back</h2>
            <p className="text-sm text-muted-foreground">Sign in to continue to your workspace.</p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">
              Choose your role
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {ROLES.map((r) => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={`rounded-lg border px-3 py-2 text-sm transition ${
                    r === role
                      ? "gradient-primary border-transparent text-primary-foreground shadow-elevated"
                      : "bg-background/60 hover:bg-accent/10"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-2">

              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="email" placeholder="you@maharashtra.gov.in" className="pl-9" />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="pw">Password</Label>
                <Input id="pw" type="password" placeholder="••••••••" />
              </div>
            </div>
            <Button
              className="w-full gradient-primary shadow-elevated"
              onClick={() => navigate({ to: "/app" })}
            >
              Sign in as {role} <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            By continuing you agree to the HTE Terms of Use.
          </p>
        </div>
      </main>
    </div>
  );
}
