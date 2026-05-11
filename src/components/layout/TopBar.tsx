// src/components/TopBar.tsx
import { useState, useEffect } from "react";
import { Bell, Menu, X, LogOut, User, Settings, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationsPanel } from "@/components/NotificationsPanel";
import { ProfileModal } from "@/components/ProfileModal";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useUnreadCount } from "@/hooks/useNotifications";
import { useTheme } from "@/contexts/ThemeContext";

interface TopBarProps {
  collapsed: boolean;
  onToggleSidebar: () => void;
  isMobile?: boolean;
}

const settingsPath: Record<string, string> = {
  dealer_owner:       "/owner/settings",
  operations_manager: "/operations/settings",
  branch_manager:     "/branch/settings",
  van_team_leader:    "/van/settings",
  finance:            "/finance/settings",
};

function getGreeting(name: string): string {
  const hour = new Date().getHours();
  const firstName = name?.split(" ")[0] ?? "there";
  if (hour < 12) return `Good morning, ${firstName} 👋`;
  if (hour < 17) return `Good afternoon, ${firstName} 👋`;
  return `Good evening, ${firstName} 👋`;
}

function getFormattedDate(): string {
  return new Date().toLocaleDateString("en-KE", {
    weekday: "long",
    year:    "numeric",
    month:   "long",
    day:     "numeric",
  });
}

function getFormattedTime(): string {
  return new Date().toLocaleTimeString("en-KE", {
    hour: "2-digit", minute: "2-digit",
  });
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
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  return DAILY_QUOTES[dayOfYear % DAILY_QUOTES.length];
}

export function TopBar({ collapsed, onToggleSidebar, isMobile = false }: TopBarProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu,      setShowUserMenu]       = useState(false);
  const [showProfile,       setShowProfile]        = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const { data: unreadData } = useUnreadCount();
  const unreadCount = unreadData?.unread_count ?? 0;

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const fullName = user?.name ?? "";
  const role     = user?.role ?? "dealer_owner";
  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .map(n => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "??";

  return (
    <>
      <header
        className={cn(
          "fixed top-0 right-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card px-4 md:px-6 transition-all duration-200",
          isMobile
            ? "left-0"
            : collapsed
            ? "left-16"
            : "left-60"
        )}
      >
        {/* Left side */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            {(!isMobile && !collapsed) ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {/* Greeting + quote — hidden on small screens */}
          <div className="hidden md:flex flex-col leading-tight">
            <span className="text-sm font-medium text-foreground">
              {getGreeting(fullName)}
            </span>
            <span className="text-xs text-primary/70 italic truncate max-w-md">
              "{getDailyQuote()}"
            </span>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* Date + time — hidden on mobile */}
          <div className="hidden md:flex flex-col items-end leading-tight">
            <span className="text-xs font-medium text-foreground">{getFormattedTime()}</span>
            <span className="text-xs text-muted-foreground">{getFormattedDate()}</span>
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>

          {/* Bell */}
          <button
            onClick={() => setShowNotifications(true)}
            className="relative rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(p => !p)}
              className="flex items-center gap-2"
            >
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
                {initials}
              </div>
            </button>

            {showUserMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                <div className="absolute right-0 top-full mt-2 z-50 w-52 rounded-md border border-border bg-card shadow-xl py-1">
                  <div className="px-3 py-2 border-b border-border">
                    <p className="text-sm font-medium text-foreground">{fullName}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                    <p className="text-xs text-muted-foreground capitalize mt-0.5">
                      {role.replace(/_/g, " ")}
                    </p>
                  </div>

                  <button
                    onClick={() => { setShowUserMenu(false); setShowProfile(true); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent"
                  >
                    <User className="h-4 w-4" /> My Profile
                  </button>

                  {settingsPath[role] && (
                    <button
                      onClick={() => { setShowUserMenu(false); navigate(settingsPath[role]); }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent"
                    >
                      <Settings className="h-4 w-4" /> Settings
                    </button>
                  )}
                  <div className="border-t border-border my-1" />
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-accent"
                  >
                    <LogOut className="h-4 w-4" /> Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <NotificationsPanel open={showNotifications} onClose={() => setShowNotifications(false)} />
      <ProfileModal open={showProfile} onClose={() => setShowProfile(false)} />
    </>
  );
}