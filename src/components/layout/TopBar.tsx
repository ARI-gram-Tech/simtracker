import { useState } from "react";
import { Search, Bell, Menu, X, LogOut, User, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationsPanel } from "@/components/NotificationsPanel";
import { useAuth, getRoleDashboard } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface TopBarProps {
  collapsed: boolean;
  onToggleSidebar: () => void;
}

const greetings: Record<string, string> = {
  dealer_owner: "Good morning, James 👋",
  operations_manager: "Good morning, Alice 👋",
  brand_ambassador: "Hey John 👋",
  finance: "Good morning, Grace 👋",
};

export function TopBar({ collapsed, onToggleSidebar }: TopBarProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const initials = user?.name?.split(" ").map(n => n[0]).join("").slice(0, 2) || "??";

  return (
    <>
      <header
        className={cn(
          "fixed top-0 right-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card px-6 transition-all duration-200",
          collapsed ? "left-16" : "left-60"
        )}
      >
        <div className="flex items-center gap-4">
          <button onClick={onToggleSidebar} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
            {collapsed ? <Menu className="h-5 w-5" /> : <X className="h-5 w-5" />}
          </button>
          <span className="text-sm text-foreground hidden md:block">{greetings[user?.role || "dealer_owner"]}</span>
        </div>

        <div className="hidden md:flex items-center max-w-md flex-1 mx-8">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search SIMs, BAs, reports..."
              className="w-full rounded-md border border-border bg-accent py-2 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowNotifications(true)}
            className="relative rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">3</span>
          </button>
          <div className="relative">
            <button onClick={() => setShowUserMenu(!showUserMenu)} className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">{initials}</div>
            </button>
            {showUserMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                <div className="absolute right-0 top-full mt-2 z-50 w-48 rounded-md border border-border bg-card shadow-xl py-1">
                  <div className="px-3 py-2 border-b border-border">
                    <p className="text-sm font-medium text-foreground">{user?.name}</p>
                    <p className="text-xs text-muted-foreground">{user?.role?.replace("_", " ")}</p>
                  </div>
                  <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent">
                    <User className="h-4 w-4" /> My Profile
                  </button>
                  {user?.role !== "brand_ambassador" && (
                    <button onClick={() => { setShowUserMenu(false); navigate(`/${user?.role === "dealer_owner" ? "owner" : user?.role === "operations_manager" ? "operations" : "finance"}/settings`); }} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent">
                      <Settings className="h-4 w-4" /> Settings
                    </button>
                  )}
                  <div className="border-t border-border my-1" />
                  <button onClick={handleLogout} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-accent">
                    <LogOut className="h-4 w-4" /> Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>
      <NotificationsPanel open={showNotifications} onClose={() => setShowNotifications(false)} />
    </>
  );
}
