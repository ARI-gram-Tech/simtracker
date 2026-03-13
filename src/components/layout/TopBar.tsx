import { useState } from "react";
import { Search, Bell, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationsPanel } from "@/components/NotificationsPanel";

interface TopBarProps {
  collapsed: boolean;
  onToggleSidebar: () => void;
}

export function TopBar({ collapsed, onToggleSidebar }: TopBarProps) {
  const [showNotifications, setShowNotifications] = useState(false);

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
          <span className="text-sm text-foreground hidden md:block">Good morning, James 👋</span>
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
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              3
            </span>
          </button>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
              JM
            </div>
          </div>
        </div>
      </header>
      <NotificationsPanel open={showNotifications} onClose={() => setShowNotifications(false)} />
    </>
  );
}
