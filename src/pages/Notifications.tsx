// src/pages/Notifications.tsx
import { useState } from "react";
import {
  Bell, CheckCheck, Loader2, AlertCircle, Info, DollarSign,
  Package, CornerDownLeft, RefreshCw, Send, Users, Mail,
  MessageSquare, ToggleLeft, ToggleRight, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications, useMarkRead, useMarkAllRead, useSendNotification } from "@/hooks/useNotifications";
import { useUsers } from "@/hooks/useUsers";
import { showSuccess, showError } from "@/lib/toast";
import type { Notification, NotificationType } from "@/types/notifications.types";

// ── Type config ───────────────────────────────────────────────────────────────

const typeConfig: Record<NotificationType, { icon: React.ElementType; bg: string; text: string; label: string }> = {
  alert:   { icon: AlertCircle,    bg: "bg-destructive/15",  text: "text-destructive", label: "Alert"    },
  system:  { icon: Info,           bg: "bg-primary/15",      text: "text-primary",     label: "System"   },
  finance: { icon: DollarSign,     bg: "bg-teal-500/15",     text: "text-teal-400",    label: "Finance"  },
  issue:   { icon: Package,        bg: "bg-blue-500/15",     text: "text-blue-400",    label: "Issued"   },
  return:  { icon: CornerDownLeft, bg: "bg-amber-500/15",    text: "text-amber-500",   label: "Return"   },
  receive: { icon: RefreshCw,      bg: "bg-green-500/15",    text: "text-green-500",   label: "Received" },
};

function timeAgo(dateStr: string): string {
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 1)  return "just now";
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  < 7)  return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
}

// ── Detail drawer ─────────────────────────────────────────────────────────────

function NotificationDetail({ notification, onClose }: { notification: Notification; onClose: () => void }) {
  const cfg  = typeConfig[notification.type] ?? typeConfig.system;
  const Icon = cfg.icon;
  return (
    <>
      <div className="fixed inset-0 z-40 bg-background/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm border-l border-border bg-card shadow-2xl flex flex-col">
        <div className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0">
          <div className="flex items-center gap-2">
            <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", cfg.bg)}>
              <Icon className={cn("h-4 w-4", cfg.text)} />
            </div>
            <span className={cn("text-xs font-semibold rounded-full px-2 py-0.5", cfg.bg, cfg.text)}>
              {cfg.label}
            </span>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            Close
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <h3 className="font-heading text-lg font-semibold text-foreground">{notification.title}</h3>
            <p className="text-xs text-muted-foreground mt-1">{timeAgo(notification.created_at)}</p>
          </div>
          <div className="rounded-lg border border-border bg-background p-4">
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{notification.message}</p>
          </div>
          <div className="rounded-lg border border-border bg-accent/30 px-4 py-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Status</span>
              <span className={cn("font-medium", notification.is_read ? "text-muted-foreground" : "text-primary")}>
                {notification.is_read ? "Read" : "Unread"}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Received</span>
              <span className="text-foreground">
                {new Date(notification.created_at).toLocaleString("en-KE", {
                  day: "numeric", month: "short", year: "numeric",
                  hour: "2-digit", minute: "2-digit",
                })}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Inbox tab ─────────────────────────────────────────────────────────────────

function InboxTab() {
  const [filter,     setFilter]     = useState<"all" | "unread">("all");
  const [typeFilter, setTypeFilter] = useState<NotificationType | "">("");
  const [selected,   setSelected]   = useState<Notification | null>(null);

  const { data, isLoading, isError, refetch } = useNotifications();
  const markRead    = useMarkRead();
  const markAllRead = useMarkAllRead();

  const raw = data as unknown;
  const notifications: Notification[] = Array.isArray(raw)
    ? raw
    : (raw as { results?: Notification[] })?.results ?? [];

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const displayed = notifications.filter(n => {
    if (filter === "unread" && n.is_read)    return false;
    if (typeFilter && n.type !== typeFilter)  return false;
    return true;
  });

  const handleRowClick = (n: Notification) => {
    setSelected(n);
    if (!n.is_read) markRead.mutate(n.id);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading notifications…</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span>Failed to load notifications.</span>
        <button onClick={() => refetch()} className="ml-auto underline text-xs">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex rounded-md border border-border overflow-hidden text-sm">
            {(["all", "unread"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={cn(
                  "px-3 py-1.5 font-medium transition-colors capitalize",
                  filter === f ? "bg-primary text-primary-foreground" : "bg-accent text-muted-foreground hover:text-foreground"
                )}>
                {f}
                {f === "unread" && unreadCount > 0 && (
                  <span className="ml-1.5 rounded-full bg-primary-foreground text-primary text-[10px] font-bold px-1.5 py-0.5">
                    {unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as NotificationType | "")}
            className="rounded-md border border-border bg-accent py-1.5 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
            <option value="">All Types</option>
            {Object.entries(typeConfig).map(([val, cfg]) => (
              <option key={val} value={val}>{cfg.label}</option>
            ))}
          </select>
        </div>
        {unreadCount > 0 && (
          <button onClick={() => markAllRead.mutate()} disabled={markAllRead.isPending}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent border border-border transition-colors disabled:opacity-50">
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </button>
        )}
      </div>

      {/* Empty */}
      {displayed.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-14 w-14 rounded-full bg-accent flex items-center justify-center mb-4">
            <Bell className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">
            {filter === "unread" ? "No unread notifications" : "No notifications"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {filter === "unread" ? "You're all caught up!" : "System updates will appear here."}
          </p>
        </div>
      )}

      {/* List */}
      {displayed.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          {displayed.map((n, i) => {
            const cfg  = typeConfig[n.type] ?? typeConfig.system;
            const Icon = cfg.icon;
            return (
              <div key={n.id} onClick={() => handleRowClick(n)}
                className={cn(
                  "flex items-start gap-3 p-4 cursor-pointer transition-colors hover:bg-accent/50",
                  i !== displayed.length - 1 && "border-b border-border/50",
                  !n.is_read && "bg-primary/5"
                )}>
                <div className="mt-1.5 shrink-0">
                  {!n.is_read
                    ? <span className="h-2 w-2 rounded-full bg-primary block" />
                    : <span className="h-2 w-2 rounded-full bg-transparent block" />}
                </div>
                <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", cfg.bg)}>
                  <Icon className={cn("h-4 w-4", cfg.text)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={cn("text-sm", !n.is_read ? "font-semibold text-foreground" : "font-normal text-foreground")}>
                      {n.title}
                    </p>
                    <span className={cn("text-[10px] font-medium rounded-full px-1.5 py-0.5 shrink-0", cfg.bg, cfg.text)}>
                      {cfg.label}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{n.message}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{timeAgo(n.created_at)}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-2" />
              </div>
            );
          })}
        </div>
      )}

      {notifications.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Showing {displayed.length} of {notifications.length} notification{notifications.length !== 1 ? "s" : ""}
        </p>
      )}

      {selected && <NotificationDetail notification={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

// ── Compose tab ───────────────────────────────────────────────────────────────

const NOTIFICATION_TYPES: { value: NotificationType; label: string }[] = [
  { value: "system",  label: "System"   },
  { value: "alert",   label: "Alert"    },
  { value: "finance", label: "Finance"  },
  { value: "issue",   label: "Issued"   },
  { value: "return",  label: "Return"   },
  { value: "receive", label: "Received" },
];

function ComposeTab() {
  const { user } = useAuth();
  const dealerId = user?.dealer_id ? Number(user.dealer_id) : undefined;

  const [recipientId, setRecipientId] = useState("");
  const [title,       setTitle]       = useState("");
  const [message,     setMessage]     = useState("");
  const [type,        setType]        = useState<NotificationType>("system");
  const [emailCopy,   setEmailCopy]   = useState(false);

  const sendNotification = useSendNotification();
  const { data: usersData, isLoading: usersLoading } = useUsers(
    dealerId ? { dealer_id: dealerId } : undefined
  );
  const recipients = (usersData?.results ?? []).filter(u => u.is_active && String(u.id) !== String(user?.id));

  const isValid = recipientId && title.trim() && message.trim();
  const selectedRecipient = recipients.find(u => String(u.id) === recipientId);
  const recipientInitials = selectedRecipient
    ? `${selectedRecipient.first_name[0] ?? ""}${selectedRecipient.last_name[0] ?? ""}`.toUpperCase()
    : null;

  const handleSend = async () => {
    if (!isValid) return;
    try {
      await sendNotification.mutateAsync({
        recipient_id:    Number(recipientId),
        title:           title.trim(),
        message:         message.trim(),
        type,
        send_email_copy: emailCopy,
      });
      showSuccess("Notification sent successfully!");
      setRecipientId(""); setTitle(""); setMessage(""); setType("system"); setEmailCopy(false);
    } catch {
      showError("Failed to send notification. Please try again.");
    }
  };

  return (
    <div className="max-w-lg space-y-5">
      <div className="rounded-lg border border-border bg-accent/30 px-4 py-3">
        <p className="text-sm text-muted-foreground">
          Send an in-app notification to any active user in your organisation. Optionally include an email copy.
        </p>
      </div>

      {/* Recipient */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          <Users className="inline h-3.5 w-3.5 mr-1 text-muted-foreground" />
          Recipient <span className="text-destructive">*</span>
        </label>
        {usersLoading ? (
          <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading users…
          </div>
        ) : (
          <select value={recipientId} onChange={e => setRecipientId(e.target.value)}
            className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
            <option value="">— Select recipient —</option>
            {recipients.map(u => (
              <option key={u.id} value={String(u.id)}>
                {u.first_name} {u.last_name} — {u.role.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        )}
        {selectedRecipient && (
          <div className="mt-2 flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2">
            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
              {recipientInitials}
            </div>
            <div>
              <p className="text-xs font-medium text-foreground">
                {selectedRecipient.first_name} {selectedRecipient.last_name}
              </p>
              <p className="text-[10px] text-muted-foreground">{selectedRecipient.email}</p>
            </div>
          </div>
        )}
      </div>

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          <MessageSquare className="inline h-3.5 w-3.5 mr-1 text-muted-foreground" />
          Title <span className="text-destructive">*</span>
        </label>
        <input value={title} onChange={e => setTitle(e.target.value)}
          placeholder="e.g. Urgent: SIM return required" maxLength={200}
          className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
      </div>

      {/* Message */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Message <span className="text-destructive">*</span>
        </label>
        <textarea rows={4} value={message} onChange={e => setMessage(e.target.value)}
          placeholder="Write your message here…"
          className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
        <p className="text-xs text-muted-foreground mt-1">{message.length} characters</p>
      </div>

      {/* Type */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Notification Type</label>
        <div className="flex flex-wrap gap-2">
          {NOTIFICATION_TYPES.map(t => {
            const cfg = typeConfig[t.value];
            return (
              <button key={t.value} onClick={() => setType(t.value)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium border transition-colors",
                  type === t.value
                    ? cn(cfg.bg, cfg.text, "border-transparent")
                    : "border-border text-muted-foreground hover:text-foreground hover:bg-accent"
                )}>
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Email copy toggle */}
      <div className="flex items-center justify-between rounded-lg border border-border bg-accent/30 px-4 py-3">
        <div className="flex items-center gap-3">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium text-foreground">Send email copy</p>
            <p className="text-xs text-muted-foreground">Also send this to the recipient's email inbox</p>
          </div>
        </div>
        <button onClick={() => setEmailCopy(e => !e)} className="shrink-0">
          {emailCopy
            ? <ToggleRight className="h-6 w-6 text-primary" />
            : <ToggleLeft  className="h-6 w-6 text-muted-foreground" />}
        </button>
      </div>

      {/* Preview */}
      {isValid && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-2">
          <p className="text-xs font-semibold text-primary uppercase tracking-wide">Preview</p>
          <div className="flex items-start gap-3">
            <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", typeConfig[type].bg)}>
              {(() => { const Icon = typeConfig[type].icon; return <Icon className={cn("h-4 w-4", typeConfig[type].text)} />; })()}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{title}</p>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{message}</p>
            </div>
          </div>
          {emailCopy && selectedRecipient && (
            <p className="text-xs text-muted-foreground">
              📧 Email copy → <span className="font-medium text-foreground">{selectedRecipient.email}</span>
            </p>
          )}
        </div>
      )}

      {/* Send */}
      <button onClick={handleSend} disabled={!isValid || sendNotification.isPending}
        className="flex items-center gap-2 rounded-md bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity">
        {sendNotification.isPending
          ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</>
          : <><Send className="h-4 w-4" /> Send Notification</>}
      </button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Notifications() {
  const { user } = useAuth();
  const role = user?.role;
  const canCompose = role === "dealer_owner" || role === "operations_manager" || role === "super_admin";

  const [activeTab, setActiveTab] = useState<"inbox" | "compose">("inbox");

  const { data, isLoading } = useNotifications();
  const raw = data as unknown;
  const notifications: Notification[] = Array.isArray(raw)
    ? raw
    : (raw as { results?: Notification[] })?.results ?? [];
  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {canCompose
              ? "View your inbox and send notifications to your team"
              : "Your system notifications and alerts"}
          </p>
        </div>
        {!isLoading && unreadCount > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2">
            <Bell className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">{unreadCount} unread</span>
          </div>
        )}
      </div>

      {canCompose && (
        <div className="flex gap-2">
          {([
            { id: "inbox"   as const, label: "Inbox",   Icon: Bell },
            { id: "compose" as const, label: "Compose", Icon: Send },
          ]).map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={cn(
                "btn-press flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-accent text-muted-foreground hover:text-foreground"
              )}>
              <tab.Icon className="h-4 w-4" />
              {tab.label}
              {tab.id === "inbox" && unreadCount > 0 && (
                <span className={cn(
                  "rounded-full text-[10px] font-bold px-1.5 py-0.5",
                  activeTab === "inbox"
                    ? "bg-primary-foreground text-primary"
                    : "bg-primary text-primary-foreground"
                )}>
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-border bg-card p-6">
        {(!canCompose || activeTab === "inbox")   && <InboxTab />}
        {canCompose  && activeTab === "compose"   && <ComposeTab />}
      </div>
    </div>
  );
}