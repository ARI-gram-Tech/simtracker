// src/components/NotificationsPanel.tsx
import { useState } from "react";
import { X, Bell, BellOff, Trash2, CheckCheck, Loader2, AlertCircle, Info, DollarSign, Package, CornerDownLeft, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";import { useNotifications, useMarkRead, useMarkAllRead, useClearAll, useSilentMode } from "@/hooks/useNotifications";
import type { Notification, NotificationType } from "@/types/notifications.types";

interface NotificationsPanelProps {
  open: boolean;
  onClose: () => void;
}

// ── Type → icon/color mapping ─────────────────────────────────────────────────

const typeConfig: Record<NotificationType, { icon: React.ElementType; bg: string; text: string }> = {
  alert:   { icon: AlertCircle,    bg: "bg-destructive/15",  text: "text-destructive"  },
  system:  { icon: Info,           bg: "bg-primary/15",      text: "text-primary"      },
  finance: { icon: DollarSign,     bg: "bg-teal-500/15",     text: "text-teal-400"     },
  issue:   { icon: Package,        bg: "bg-blue-500/15",     text: "text-blue-400"     },
  return:  { icon: CornerDownLeft, bg: "bg-amber-500/15",    text: "text-amber-500"    },
  receive: { icon: RefreshCw,      bg: "bg-green-500/15",    text: "text-green-500"    },
};

function typeLabel(type: NotificationType): string {
  const labels: Record<NotificationType, string> = {
    alert: "Alert", system: "System", finance: "Finance",
    issue: "Issued", return: "Return", receive: "Received",
  };
  return labels[type] ?? type;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 1)  return "just now";
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  < 7)  return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-KE", { day: "numeric", month: "short" });
}

// ── Single notification row ───────────────────────────────────────────────────

function NotificationRow({
  notification,
  onMarkRead,
}: {
  notification: Notification;
  onMarkRead: (id: number) => void;
}) {
  const cfg = typeConfig[notification.type] ?? typeConfig.system;
  const Icon = cfg.icon;

  return (
    <div
      className={cn(
        "group flex items-start gap-3 rounded-lg p-3 transition-colors cursor-pointer",
        notification.is_read
          ? "hover:bg-accent/50"
          : "bg-primary/5 hover:bg-primary/10 border-l-2 border-primary"
      )}
      onClick={() => !notification.is_read && onMarkRead(notification.id)}
    >
      {/* Icon */}
      <div className={cn("mt-0.5 h-7 w-7 rounded-lg flex items-center justify-center shrink-0", cfg.bg)}>
        <Icon className={cn("h-3.5 w-3.5", cfg.text)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn("text-sm leading-snug", notification.is_read ? "font-normal text-foreground" : "font-semibold text-foreground")}>
            {notification.title}
          </p>
          {!notification.is_read && (
            <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notification.message}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <span className={cn("text-[10px] font-medium rounded-full px-1.5 py-0.5", cfg.bg, cfg.text)}>
            {typeLabel(notification.type)}
          </span>
          <span className="text-[10px] text-muted-foreground">{timeAgo(notification.created_at)}</span>
        </div>
      </div>
    </div>
  );
}

function SilentToggle() {
  const { silent, toggle } = useSilentMode();
  return (
    <button
      onClick={toggle}
      title={silent ? "Notifications muted — click to unmute" : "Mute toast notifications"}
      className={cn(
        "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
        silent
          ? "bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20"
          : "text-muted-foreground hover:text-foreground hover:bg-accent"
      )}
    >
      {silent ? <BellOff className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
      {silent ? "Muted" : "Mute"}
    </button>
  );
}

function ClearAllButton() {
  const clearAll = useClearAll();
  const [confirm, setConfirm] = useState(false);

  if (confirm) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground">Sure?</span>
        <button
          onClick={async () => { await clearAll.mutateAsync(); setConfirm(false); }}
          disabled={clearAll.isPending}
          className="rounded-md px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
        >
          {clearAll.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Yes"}
        </button>
        <button
          onClick={() => setConfirm(false)}
          className="rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors"
        >
          No
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      title="Clear all notifications"
      className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
    >
      <Trash2 className="h-3.5 w-3.5" />
      Clear
    </button>
  );
}

// ── Panel ─────────────────────────────────────────────────────────────────────

export function NotificationsPanel({ open, onClose }: NotificationsPanelProps) {
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const { data, isLoading, isError, refetch } = useNotifications();
  const markRead    = useMarkRead();
  const markAllRead = useMarkAllRead();

  if (!open) return null;

  // The API returns a paginated or plain array — handle both
  const raw = data as unknown;
  const notifications: Notification[] = Array.isArray(raw)
    ? raw
    : (raw as { results?: Notification[] })?.results ?? [];

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const displayed = filter === "unread"
    ? notifications.filter(n => !n.is_read)
    : notifications;

  const handleMarkRead = (id: number) => {
    markRead.mutate(id);
  };

  const handleMarkAllRead = () => {
    markAllRead.mutate();
  };

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/50 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="absolute right-0 top-0 h-full w-full max-w-sm border-l border-border bg-card shadow-2xl flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Bell className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="font-heading text-base font-semibold text-foreground">Notifications</h2>
              {unreadCount > 0 && (
                <p className="text-xs text-muted-foreground">{unreadCount} unread</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {/* Silent mode toggle */}
            <SilentToggle />

            {/* Clear all */}
            <ClearAllButton />

            {/* Mark all read */}
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={markAllRead.isPending}
                title="Mark all as read"
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-50"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex border-b border-border px-5 shrink-0">
          {(["all", "unread"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "py-2.5 px-1 mr-4 text-sm font-medium border-b-2 transition-colors capitalize",
                filter === f
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {f}
              {f === "unread" && unreadCount > 0 && (
                <span className="ml-1.5 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3">
          {isLoading && (
            <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Loading notifications…</span>
            </div>
          )}

          {isError && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 m-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Failed to load notifications.</span>
              <button onClick={() => refetch()} className="ml-auto underline text-xs">Retry</button>
            </div>
          )}

          {!isLoading && !isError && displayed.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-12 w-12 rounded-full bg-accent flex items-center justify-center mb-3">
                <Bell className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">
                {filter === "unread" ? "No unread notifications" : "No notifications yet"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {filter === "unread" ? "You're all caught up!" : "System updates will appear here."}
              </p>
            </div>
          )}

          {!isLoading && !isError && displayed.length > 0 && (
            <div className="space-y-1">
              {displayed.map(n => (
                <NotificationRow
                  key={n.id}
                  notification={n}
                  onMarkRead={handleMarkRead}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {!isLoading && !isError && notifications.length > 0 && (
          <div className="border-t border-border px-5 py-3 shrink-0">
            <p className="text-xs text-muted-foreground text-center">
              {notifications.length} notification{notifications.length !== 1 ? "s" : ""} total
            </p>
          </div>
        )}
      </div>
    </div>
  );
}