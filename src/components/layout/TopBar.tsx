// src/components/layout/TopBar.tsx
import { useState, useEffect, useRef } from "react";
import { Bell, Menu, LogOut, User, Settings, Moon, Sun, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationsPanel } from "@/components/NotificationsPanel";
import { ProfileModal } from "@/components/ProfileModal";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useUnreadCount } from "@/hooks/useNotifications";
import { useTheme } from "@/contexts/ThemeContext";

interface TopBarProps {
  /** Desktop only: sidebar collapse state affects left offset */
  collapsed: boolean;
  /** Desktop only: toggle sidebar collapse */
  onToggleSidebar: () => void;
  /** Mobile only: open the mobile drawer */
  onOpenMobileDrawer: () => void;
}

const settingsPath: Record<string, string> = {
  dealer_owner:       "/owner/settings",
  operations_manager: "/operations/settings",
  branch_manager:     "/branch/settings",
  van_team_leader:    "/van/settings",
  finance:            "/finance/settings",
};

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
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  return DAILY_QUOTES[dayOfYear % DAILY_QUOTES.length];
}

function getGreeting(name: string): string {
  const hour = new Date().getHours();
  const firstName = name?.split(" ")[0] ?? "there";
  if (hour < 12) return `Good morning, ${firstName} 👋`;
  if (hour < 17) return `Good afternoon, ${firstName} 👋`;
  return `Good evening, ${firstName} 👋`;
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
        {time.toLocaleDateString("en-KE", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </span>
    </div>
  );
}

export function TopBar({ collapsed, onToggleSidebar, onOpenMobileDrawer }: TopBarProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu]           = useState(false);
  const [showProfile, setShowProfile]             = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const { theme, toggleTheme } = useTheme();
  const { user, logout }       = useAuth();
  const navigate               = useNavigate();

  const { data: unreadData }   = useUnreadCount();
  const unreadCount            = unreadData?.unread_count ?? 0;

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
    setShowUserMenu(false);
    logout();
    navigate("/login", { replace: true });
  };

  const fullName = user?.name ?? "";
  const role     = user?.role ?? "dealer_owner";
  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "??";

  return (
    <>
      <header
        className={cn(
          // Mobile: full width (no sidebar offset)
          // Desktop: offset by sidebar width
          "fixed top-0 right-0 z-30 flex h-16 items-center justify-between",
          "border-b border-border bg-card px-4 md:px-6 transition-all duration-200",
          // Mobile: left-0; Desktop: follows sidebar
          "left-0 md:left-auto",
          // Desktop left offset based on collapse state
          !collapsed ? "md:left-60" : "md:left-16"
        )}
      >
        {/* Left: toggle + greeting */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile: hamburger opens drawer */}
          <button
            onClick={onOpenMobileDrawer}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors md:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Desktop: collapse toggle */}
          <button
            onClick={onToggleSidebar}
            className="hidden md:flex rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Greeting — hidden on small screens */}
          <div className="hidden md:flex flex-col leading-tight min-w-0">
            <span className="text-sm font-medium text-foreground truncate">
              {getGreeting(fullName)}
            </span>
            <span className="text-xs text-primary/70 italic truncate max-w-xs lg:max-w-sm">
              "{getDailyQuote()}"
            </span>
          </div>

          {/* Mobile: just show app name */}
          <span className="md:hidden font-heading text-base font-bold text-foreground">
            Sim<span className="text-primary">Track</span>
          </span>
        </div>

        {/* Right: clock, theme, bell, avatar */}
        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          <LiveClock />

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>

          {/* Bell */}
          <button
            onClick={() => setShowNotifications(true)}
            className="relative rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* Avatar / user menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu((p) => !p)}
              className="flex items-center gap-2 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="User menu"
              aria-expanded={showUserMenu}
            >
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary select-none">
                {initials}
              </div>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 top-full mt-2 z-50 w-52 rounded-xl border border-border bg-card shadow-xl py-1 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3 py-2.5 border-b border-border">
                  <p className="text-sm font-semibold text-foreground truncate">{fullName}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  <p className="text-xs text-muted-foreground capitalize mt-0.5">
                    {role.replace(/_/g, " ")}
                  </p>
                </div>

                <button
                  onClick={() => { setShowUserMenu(false); setShowProfile(true); }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
                >
                  <User className="h-4 w-4 shrink-0" /> My Profile
                </button>

                {settingsPath[role] && (
                  <button
                    onClick={() => { setShowUserMenu(false); navigate(settingsPath[role]); }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
                  >
                    <Settings className="h-4 w-4 shrink-0" /> Settings
                  </button>
                )}

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

      <NotificationsPanel open={showNotifications} onClose={() => setShowNotifications(false)} />
      <ProfileModal open={showProfile} onClose={() => setShowProfile(false)} />
    </>
  );
}