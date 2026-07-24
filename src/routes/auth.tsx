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
            <Button variant="outline" className="w-full">
              <svg className="mr-2 h-4 w-4" viewBox="0 0 48 48" aria-hidden>
                <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.5l6.8-6.8C35.9 2.3 30.4 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.2C12.4 13.1 17.7 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.5 24.6c0-1.6-.1-3.2-.4-4.7H24v9h12.7c-.5 3-2.2 5.6-4.8 7.3l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.4z"/>
                <path fill="#FBBC05" d="M10.5 28.6c-.5-1.4-.7-2.9-.7-4.6s.3-3.2.7-4.6l-7.9-6.2C1 16.6 0 20.2 0 24s1 7.4 2.6 10.8l7.9-6.2z"/>
                <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.6-3.6-13.5-9.9l-7.9 6.2C6.5 42.6 14.6 48 24 48z"/>
              </svg>
              Continue with Google
            </Button>
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">or email</span>
              <div className="h-px flex-1 bg-border" />
            </div>
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
