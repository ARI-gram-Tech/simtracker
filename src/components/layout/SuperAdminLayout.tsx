// src/components/layout/SuperAdminLayout.tsx
import { useState, useEffect, useRef } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, DollarSign, Settings, Bell,
  Trash2, Layers, LogOut, Menu, X, Shield, Moon, Sun, User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useUnreadCount } from "@/hooks/useNotifications";
import { NotificationToast } from "@/components/NotificationToast";
import { NotificationsPanel } from "@/components/NotificationsPanel";
import { ProfileModal } from "@/components/ProfileModal";
import { useIsMobile } from "@/hooks/useIsMobile";

// ─── Nav config ───────────────────────────────────────────────────────────────
const superAdminNav = [
  { title: "Dashboard",     url: "/super-admin/dashboard",     icon: LayoutDashboard, danger: false },
  { title: "Clients",       url: "/super-admin/clients",       icon: Users,           danger: false },
  { title: "Billing",       url: "/super-admin/billing",       icon: DollarSign,      danger: false },
  { title: "Notifications", url: "/super-admin/notifications", icon: Bell,            danger: false },
  { title: "Settings",      url: "/super-admin/settings",      icon: Settings,        danger: false },
  { title: "Recycle Bin",   url: "/super-admin/recycle-bin",   icon: Trash2,          danger: true  },
];

// Mobile core items (shown in bottom bar)
const superAdminCoreNav = superAdminNav.slice(0, 4);

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
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
  "Hard is not impossible — keep going.",
  "Wake up with determination. Go to bed with satisfaction.",
  "Do something today that your future self will thank you for.",
];

function getDailyQuote(): string {
  const d = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  return DAILY_QUOTES[d % DAILY_QUOTES.length];
}

function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="hidden lg:flex flex-col items-end leading-tight">
      <span className="text-xs font-medium text-foreground">
        {time.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })}
      </span>
      <span className="text-xs text-muted-foreground">
        {time.toLocaleDateString("en-KE", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
      </span>
    </div>
  );
}

// ─── Sidebar inner content ────────────────────────────────────────────────────
function SidebarContent({
  collapsed,
  onLinkClick,
  onLogout,
}: {
  collapsed: boolean;
  onLinkClick?: () => void;
  onLogout: () => void;
}) {
  const location = useLocation();

  return (
    <>
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-border px-4 shrink-0">
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
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
        {superAdminNav.map((item) => {
          const isActive =
            location.pathname === item.url ||
            location.pathname.startsWith(item.url + "/");
          return (
            <Link
              key={item.title}
              to={item.url}
              onClick={onLinkClick}
              title={collapsed ? item.title : undefined}
              className={cn(
                "group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-150",
                "hover:bg-accent hover:text-foreground",
                isActive
                  ? "bg-accent text-primary border-l-2 border-primary"
                  : "text-muted-foreground border-l-2 border-transparent",
                item.danger && !isActive && "hover:text-destructive"
              )}
            >
              <item.icon
                className={cn(
                  "h-4 w-4 shrink-0 transition-colors",
                  isActive
                    ? "text-primary"
                    : item.danger
                    ? "text-muted-foreground group-hover:text-destructive"
                    : "text-muted-foreground group-hover:text-foreground"
                )}
              />
              {!collapsed && <span className="truncate">{item.title}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="border-t border-border p-4 space-y-2 shrink-0">
          <p className="text-xs text-muted-foreground font-medium">SimTrack Platform</p>
          <p className="text-xs text-muted-foreground">Super Admin</p>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 text-xs text-destructive hover:text-destructive/80 transition-colors mt-1"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign Out
          </button>
        </div>
      )}
    </>
  );
}

// ─── Main layout ──────────────────────────────────────────────────────────────
export function SuperAdminLayout() {
  const [collapsed, setCollapsed]           = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu]     = useState(false);
  const [showProfile, setShowProfile]       = useState(false);

  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const userMenuRef = useRef<HTMLDivElement>(null);

  const { data: unreadData } = useUnreadCount();
  const unreadCount = unreadData?.unread_count ?? 0;

  // Auto-collapse on tablet
  useEffect(() => {
    const mql = window.matchMedia("(min-width: 768px) and (max-width: 1023px)");
    if (mql.matches) setCollapsed(true);
    const handler = (e: MediaQueryListEvent) => { if (e.matches) setCollapsed(true); };
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  // Close drawer on route change
  useEffect(() => { setMobileDrawerOpen(false); }, [location.pathname]);

  // Prevent body scroll when drawer open
  useEffect(() => {
    document.body.style.overflow = mobileDrawerOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileDrawerOpen]);

  // Close user menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    }
    if (showUserMenu) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showUserMenu]);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const fullName = user?.name ?? "Admin";
  const firstName = fullName.split(" ")[0];
  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "SA";

  return (
    <div className="min-h-screen bg-background">
      <NotificationToast />

      {/* ── Desktop sidebar ──────────────────────────────────────────── */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen border-r border-border bg-card",
          "transition-all duration-200 flex-col hidden md:flex",
          collapsed ? "w-16" : "w-60"
        )}
      >
        <SidebarContent collapsed={collapsed} onLogout={handleLogout} />
      </aside>

      {/* ── Mobile drawer ────────────────────────────────────────────── */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-300 md:hidden",
          mobileDrawerOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setMobileDrawerOpen(false)}
        aria-hidden="true"
      />
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-full w-72 bg-card shadow-2xl",
          "flex flex-col transition-transform duration-300 ease-in-out md:hidden",
          mobileDrawerOpen ? "translate-x-0" : "-translate-x-full"
        )}
        role="dialog"
        aria-modal="true"
      >
        <button
          onClick={() => setMobileDrawerOpen(false)}
          className="absolute top-4 right-4 rounded-md p-1.5 text-muted-foreground hover:bg-accent"
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
        <SidebarContent
          collapsed={false}
          onLinkClick={() => setMobileDrawerOpen(false)}
          onLogout={handleLogout}
        />
      </aside>

      {/* ── Top bar ──────────────────────────────────────────────────── */}
      <header
        className={cn(
          "fixed top-0 right-0 z-30 flex h-16 items-center justify-between",
          "border-b border-border bg-card px-4 md:px-6 transition-all duration-200",
          "left-0",
          !collapsed ? "md:left-60" : "md:left-16"
        )}
      >
        {/* Left */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileDrawerOpen(true)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent transition-colors md:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Desktop collapse toggle */}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="hidden md:flex rounded-md p-1.5 text-muted-foreground hover:bg-accent transition-colors"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Desktop: badge + greeting */}
          <div className="hidden md:flex items-center gap-3 min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary shrink-0">
              <Shield className="h-3 w-3" /> Super Admin
            </span>
            <div className="hidden lg:flex flex-col leading-tight min-w-0">
              <span className="text-sm font-medium text-foreground truncate">
                {getGreeting()}, {firstName} 👋
              </span>
              <span className="text-xs text-primary/70 italic truncate max-w-xs">
                "{getDailyQuote()}"
              </span>
            </div>
          </div>

          {/* Mobile: app name */}
          <span className="md:hidden font-heading text-base font-bold text-foreground">
            Sim<span className="text-primary">Track</span>
          </span>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          <LiveClock />

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="rounded-md p-2 text-muted-foreground hover:bg-accent transition-colors"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>

          {/* Bell */}
          <button
            onClick={() => setShowNotifications(true)}
            className="relative rounded-md p-2 text-muted-foreground hover:bg-accent transition-colors"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* Avatar */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu((p) => !p)}
              className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="User menu"
              aria-expanded={showUserMenu}
            >
              {initials}
            </button>

            {showUserMenu && (
              <div className="absolute right-0 top-full mt-2 z-50 w-52 rounded-xl border border-border bg-card shadow-xl py-1 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3 py-2.5 border-b border-border">
                  <p className="text-sm font-semibold text-foreground truncate">{fullName}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Super Admin</p>
                </div>
                <button
                  onClick={() => { setShowUserMenu(false); setShowProfile(true); }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
                >
                  <User className="h-4 w-4 shrink-0" /> My Profile
                </button>
                <button
                  onClick={() => { setShowUserMenu(false); navigate("/super-admin/settings"); }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
                >
                  <Settings className="h-4 w-4 shrink-0" /> Settings
                </button>
                <div className="border-t border-border my-1" />
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-destructive hover:bg-accent transition-colors"
                >
                  <LogOut className="h-4 w-4 shrink-0" /> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <main
        className={cn(
          "pt-16 min-h-screen transition-all duration-200",
          "ml-0",
          collapsed ? "md:ml-16" : "md:ml-60",
          "pb-16 md:pb-0"
        )}
      >
        <div className="p-4 md:p-6">
          <Outlet />
        </div>
      </main>

      {/* ── Mobile bottom nav ────────────────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border md:hidden">
        <div className="flex items-stretch h-16">
          {superAdminCoreNav.map((item) => {
            const isActive =
              location.pathname === item.url ||
              location.pathname.startsWith(item.url + "/");
            return (
              <Link
                key={item.url}
                to={item.url}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-1 px-1 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <span
                  className={cn(
                    "text-[10px] font-medium truncate",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {item.title}
                </span>
              </Link>
            );
          })}
          {/* Settings as the 5th slot */}
          <Link
            to="/super-admin/settings"
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 px-1 transition-colors",
              location.pathname.startsWith("/super-admin/settings")
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Settings className="h-5 w-5 shrink-0" />
            <span className="text-[10px] font-medium">Settings</span>
          </Link>
        </div>
      </nav>

      {/* Panels & modals */}
      <NotificationsPanel open={showNotifications} onClose={() => setShowNotifications(false)} />
      <ProfileModal open={showProfile} onClose={() => setShowProfile(false)} />
    </div>
  );
}