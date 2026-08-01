import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Search,
  FolderOpen,
  GitCompareArrows,
  BarChart3,
  Star,
  Settings,
  Sparkles,
  Sun,
  Moon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
};

const nav: NavItem[] = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/app/search", label: "AI Search", icon: Search },
  { to: "/app/library", label: "Document Library", icon: FolderOpen },
  { to: "/app/compare", label: "Compare Documents", icon: GitCompareArrows },
  { to: "/app/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/app/saved", label: "Saved Responses", icon: Star },
  { to: "/app/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [quick, setQuick] = useState("");
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = typeof window !== "undefined" && localStorage.getItem("hte-theme");
    const shouldDark = stored === "dark";
    setDark(shouldDark);
    document.documentElement.classList.toggle("dark", shouldDark);
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("hte-theme", next ? "dark" : "light");
  };

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex h-16 items-center gap-2 border-b px-5">
          <div className="grid h-9 w-9 place-items-center rounded-lg gradient-primary shadow-elevated">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold">HTE Copilot</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Maharashtra
            </div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {nav.map((n) => {
            const active = n.end ? pathname === n.to : pathname.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to as string}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  active
                    ? "gradient-primary text-primary-foreground shadow-elevated"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
              >
                <n.icon className="h-4 w-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t p-3">
          <div className="flex items-center gap-3 rounded-lg p-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-accent text-accent-foreground text-xs">
                RS
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 leading-tight">
              <div className="text-sm font-medium">R. Shinde</div>
              <div className="text-xs text-muted-foreground">Officer · HTE</div>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/70 px-6 backdrop-blur-xl">
          <form
            className="relative flex-1 max-w-xl"
            onSubmit={(e) => {
              e.preventDefault();
              const q = quick.trim();
              if (!q) return;
              navigate({ to: "/app/search", search: { q } });
            }}
          >
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={quick}
              onChange={(e) => setQuick(e.target.value)}
              placeholder="Quick search — GRs, circulars, policies…"
              className="pl-9"
            />
            <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground md:block">
              ↵
            </kbd>
          </form>

          <div className="ml-auto flex items-center gap-2">
            <Badge variant="secondary" className="hidden md:inline-flex">
              <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-success" /> AI online
            </Badge>
            <Button size="icon" variant="ghost" onClick={toggleTheme} aria-label="Toggle theme">
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </header>
        <main className="min-w-0 flex-1 p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
