import { useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, DollarSign, Settings, Bell,
  Trash2, Layers, LogOut, Menu, X, Search, Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationToast } from "@/components/NotificationToast";

const superAdminNav = [
  { title: "Dashboard",      url: "/super-admin/dashboard",     icon: LayoutDashboard },
  { title: "Clients",        url: "/super-admin/clients",       icon: Users           },
  { title: "Billing",        url: "/super-admin/billing",       icon: DollarSign      },
  { title: "Notifications",  url: "/super-admin/notifications", icon: Bell            },
  { title: "Settings",       url: "/super-admin/settings",      icon: Settings        },
  { title: "Recycle Bin",    url: "/super-admin/recycle-bin",   icon: Trash2          },
];

function SuperAdminSidebar({ collapsed }: { collapsed: boolean }) {
  const location = useLocation();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen border-r border-border bg-card transition-all duration-200 flex flex-col",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-border px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary shrink-0">
          <Shield className="h-4 w-4 text-primary-foreground" />
        </div>
        {!collapsed && (
          <div>
            <span className="font-heading text-lg font-bold text-foreground">
              Sim<span className="text-primary">Track</span>
            </span>
            <p className="text-[10px] text-muted-foreground leading-none mt-0.5">Super Admin</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {superAdminNav.map((item) => {
          const isActive = location.pathname === item.url || location.pathname.startsWith(item.url + "/");
          const isDanger  = item.url.includes("recycle");
          return (
            <Link
              key={item.title}
              to={item.url}
              className={cn(
                "group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-150",
                "hover:bg-accent hover:text-foreground",
                isActive
                  ? "bg-accent text-primary border-l-2 border-primary"
                  : "text-muted-foreground border-l-2 border-transparent",
                isDanger && !isActive && "hover:text-destructive"
              )}
            >
              <item.icon className={cn(
                "h-4 w-4 shrink-0",
                isActive ? "text-primary" : isDanger ? "text-muted-foreground group-hover:text-destructive" : "text-muted-foreground group-hover:text-foreground"
              )} />
              {!collapsed && <span>{item.title}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="border-t border-border p-4 space-y-2">
          <p className="text-xs text-muted-foreground font-medium">SimTrack Platform</p>
          <p className="text-xs text-muted-foreground">Super Admin</p>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-xs text-destructive hover:text-destructive/80 transition-colors mt-1"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign Out
          </button>
        </div>
      )}
    </aside>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const DAILY_QUOTES = [
  "Success is the sum of small efforts, repeated day in and day out.",
  "The secret of getting ahead is getting started.",
  "Don't watch the clock; do what it does. Keep going.",
  "Great things never come from comfort zones.",
  "Push yourself, because no one else is going to do it for you.",
  "Dream it. Wish it. Do it.",
  "Little things make big days.",
  "It's going to be hard, but hard is not impossible.",
  "Wake up with determination. Go to bed with satisfaction.",
  "Do something today that your future self will thank you for.",
];

function getDailyQuote() {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  return DAILY_QUOTES[dayOfYear % DAILY_QUOTES.length];
}

function SuperAdminGreeting({ name }: { name: string }) {
  const greeting = getGreeting();
  const quote    = getDailyQuote();

  return (
    <div className="hidden md:flex flex-col">
      <span className="text-sm font-medium text-foreground">
        {greeting}, {name} 👋
      </span>
      <span className="text-xs text-primary/70 italic truncate max-w-md">"{quote}"</span>
    </div>
  );
}

function SuperAdminTopBar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const initials = user?.name?.split(" ").map(n => n[0]).join("").slice(0, 2) || "SA";

  return (
    <header
      className={cn(
        "fixed top-0 right-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card px-6 transition-all duration-200",
        collapsed ? "left-16" : "left-60"
      )}
    >
      <div className="flex items-center gap-4">
        <button
          onClick={onToggle}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          {collapsed ? <Menu className="h-5 w-5" /> : <X className="h-5 w-5" />}
        </button>
        <div className="hidden md:flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            <Shield className="h-3 w-3" /> Super Admin
          </span>
          <SuperAdminGreeting name={user?.name?.split(" ")[0] ?? "Admin"} />
        </div>
      </div>

      <div className="hidden md:flex items-center max-w-xs flex-1 mx-8">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search clients, invoices..."
            className="w-full rounded-md border border-border bg-accent py-2 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Date + time — right side */}
        <div className="hidden md:flex flex-col items-end leading-tight">
          <span className="text-xs font-medium text-foreground">
            {new Date().toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })}
          </span>
          <span className="text-xs text-muted-foreground">
            {new Date().toLocaleDateString("en-KE", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </span>
        </div>

        <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
          {initials}
        </div>
      </div>
    </header>
  );
}

export function SuperAdminLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <NotificationToast />
      <SuperAdminSidebar collapsed={collapsed} />
      <SuperAdminTopBar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <main
        className={cn(
          "pt-16 transition-all duration-200 min-h-screen",
          collapsed ? "ml-16" : "ml-60"
        )}
      >
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}