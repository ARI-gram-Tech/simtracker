// src/components/settings/NotificationsTab.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell, Send, Inbox, Users, Mail, AlertCircle,
  CheckCircle2, Loader2, ChevronRight, MessageSquare,
  Info, AlertTriangle, DollarSign, Settings2, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useUsers } from "@/hooks/useUsers";
import { useNotifications, useUnreadCount, useSendNotification } from "@/hooks/useNotifications";
import { showSuccess, showError } from "@/lib/toast";
import type { NotificationType } from "@/types/notifications.types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface NotificationsTabProps {
  dealerId?: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const NOTIFICATION_TYPES: { value: NotificationType; label: string; icon: React.ElementType; color: string }[] = [
  { value: "system",  label: "System",  icon: Settings2,    color: "text-blue-400"   },
  { value: "alert",   label: "Alert",   icon: AlertTriangle, color: "text-amber-500" },
  { value: "finance", label: "Finance", icon: DollarSign,   color: "text-teal-400"   },
  { value: "issue",   label: "Issue",   icon: AlertCircle,  color: "text-destructive" },
  { value: "return",  label: "Return",  icon: RefreshCw,    color: "text-purple-400" },
  { value: "receive", label: "Receive", icon: Info,         color: "text-green-400"  },
];

const TYPE_COLORS: Record<NotificationType, string> = {
  system:  "bg-blue-500/10 text-blue-400 border-blue-500/20",
  alert:   "bg-amber-500/10 text-amber-500 border-amber-500/20",
  finance: "bg-teal-500/10 text-teal-400 border-teal-500/20",
  issue:   "bg-destructive/10 text-destructive border-destructive/20",
  return:  "bg-purple-500/10 text-purple-400 border-purple-500/20",
  receive: "bg-green-500/10 text-green-400 border-green-500/20",
};

// ─── Inbox Preview ────────────────────────────────────────────────────────────

function InboxPreview({ onViewAll }: { onViewAll: () => void }) {
    const { data: notificationsData, isLoading } = useNotifications();
    const { data: unreadData } = useUnreadCount();

    const unreadCount = unreadData?.unread_count ?? 0;

    const raw = notificationsData as unknown;
    const notifications = Array.isArray(raw)
    ? raw
    : (raw as { results?: unknown[] })?.results ?? [];
    const recent = notifications.slice(0, 3);
    
  return (
    <div className="rounded-xl border border-border bg-accent/20 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-accent/30">
        <div className="flex items-center gap-2">
          <Inbox className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Your Inbox</span>
          {unreadCount > 0 && (
            <span className="flex items-center justify-center h-5 min-w-5 rounded-full bg-primary text-primary-foreground text-xs font-bold px-1.5">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </div>
        <button
          onClick={onViewAll}
          className="flex items-center gap-1 text-xs text-primary hover:underline font-medium"
        >
          View all <ChevronRight className="h-3 w-3" />
        </button>
      </div>

      {/* Content */}
      <div className="divide-y divide-border/50">
        {isLoading ? (
          <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-xs">Loading…</span>
          </div>
        ) : recent.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
            <Bell className="h-6 w-6 opacity-40" />
            <p className="text-xs">No notifications yet</p>
          </div>
        ) : (
          recent.map((n) => {
            const typeInfo = NOTIFICATION_TYPES.find(t => t.value === n.type);
            const Icon = typeInfo?.icon ?? Bell;
            return (
              <div
                key={n.id}
                className={cn(
                  "flex items-start gap-3 px-4 py-3 transition-colors",
                  !n.is_read && "bg-primary/5"
                )}
              >
                <div className={cn(
                  "mt-0.5 h-7 w-7 rounded-lg flex items-center justify-center shrink-0 border",
                  TYPE_COLORS[n.type] ?? "bg-accent text-muted-foreground border-border"
                )}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground truncate">{n.title}</p>
                    {!n.is_read && (
                      <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{n.message}</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    {new Date(n.created_at).toLocaleDateString("en-KE", {
                      month: "short", day: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      {recent.length > 0 && (
        <div className="px-4 py-2.5 border-t border-border bg-accent/20">
          <button
            onClick={onViewAll}
            className="w-full flex items-center justify-center gap-1.5 text-xs text-primary font-medium hover:underline py-0.5"
          >
            <Inbox className="h-3.5 w-3.5" />
            Open full inbox
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Compose Panel ────────────────────────────────────────────────────────────

function ComposePanel({ dealerId }: { dealerId?: number }) {
  const [recipientId, setRecipientId] = useState("");
  const [title,       setTitle]       = useState("");
  const [message,     setMessage]     = useState("");
  const [type,        setType]        = useState<NotificationType>("system");
  const [emailCopy,   setEmailCopy]   = useState(false);
  const [sent,        setSent]        = useState(false);

  const sendNotification = useSendNotification();

  // Load all dealer users as recipients
  const { data: usersData, isLoading: usersLoading } = useUsers(
    dealerId ? { dealer_id: dealerId } : {}
  );
  const recipients = (usersData?.results ?? []).filter(u => u.is_active);

  const selectedRecipient = recipients.find(u => String(u.id) === recipientId);
  const isValid = recipientId && title.trim().length >= 3 && message.trim().length >= 5;

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
      setSent(true);
      // Reset after brief success state
      setTimeout(() => {
        setSent(false);
        setRecipientId("");
        setTitle("");
        setMessage("");
        setType("system");
        setEmailCopy(false);
      }, 2500);
    } catch {
      showError("Failed to send notification. Please try again.");
    }
  };

  const selectedTypeInfo = NOTIFICATION_TYPES.find(t => t.value === type);
  const TypeIcon = selectedTypeInfo?.icon ?? Bell;

  return (
    <div className="rounded-xl border border-border bg-accent/20 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-accent/30">
        <MessageSquare className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Send Notification</span>
      </div>

      <div className="p-4 space-y-4">
        {/* Recipient */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
            <Users className="inline h-3 w-3 mr-1" />
            Recipient
          </label>
          <select
            value={recipientId}
            onChange={e => setRecipientId(e.target.value)}
            disabled={usersLoading}
            className="w-full rounded-lg border border-border bg-accent py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
          >
            <option value="">
              {usersLoading ? "Loading users…" : "— Select a recipient —"}
            </option>
            {recipients.map(u => (
              <option key={u.id} value={String(u.id)}>
                {[u.first_name, u.last_name].filter(Boolean).join(" ") || u.email}
                {" "}({u.role.replace(/_/g, " ")})
              </option>
            ))}
          </select>
          {selectedRecipient && (
            <p className="text-xs text-muted-foreground mt-1.5">
              <Mail className="inline h-3 w-3 mr-1" />
              {selectedRecipient.email}
            </p>
          )}
        </div>

        {/* Type */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
            Type
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {NOTIFICATION_TYPES.map(t => {
              const TIcon = t.icon;
              return (
                <button
                  key={t.value}
                  onClick={() => setType(t.value)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-medium transition-all",
                    type === t.value
                      ? cn("border-primary/40 bg-primary/10 text-primary")
                      : "border-border bg-accent/50 text-muted-foreground hover:text-foreground hover:border-border/80"
                  )}
                >
                  <TIcon className={cn("h-3.5 w-3.5 shrink-0", type === t.value ? "text-primary" : t.color)} />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
            Title
          </label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={120}
            placeholder="e.g. Action required: SIM returns overdue"
            className="w-full rounded-lg border border-border bg-accent py-2 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <p className="text-xs text-muted-foreground mt-1 text-right">{title.length}/120</p>
        </div>

        {/* Message */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
            Message
          </label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={4}
            maxLength={1000}
            placeholder="Write your message here…"
            className="w-full rounded-lg border border-border bg-accent py-2 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
          />
          <p className="text-xs text-muted-foreground mt-1 text-right">{message.length}/1000</p>
        </div>

        {/* Email copy toggle */}
        {selectedRecipient && (
          <label className="flex items-center gap-3 cursor-pointer select-none rounded-lg border border-border bg-background/60 px-3 py-2.5">
            <div className="relative">
              <input
                type="checkbox"
                checked={emailCopy}
                onChange={e => setEmailCopy(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-muted rounded-full peer peer-checked:bg-primary transition-colors" />
              <div className="absolute top-0.5 left-0.5 h-4 w-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Also send via email</p>
              <p className="text-xs text-muted-foreground">Deliver a copy to {selectedRecipient.email}</p>
            </div>
            <Mail className="h-4 w-4 text-muted-foreground ml-auto shrink-0" />
          </label>
        )}

        {/* Preview */}
        {isValid && (
          <div className="rounded-lg border border-border bg-background/60 p-3 space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Preview</p>
            <div className="flex items-start gap-2">
              <div className={cn(
                "mt-0.5 h-6 w-6 rounded-md flex items-center justify-center shrink-0 border",
                TYPE_COLORS[type]
              )}>
                <TypeIcon className="h-3 w-3" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{message}</p>
              </div>
            </div>
          </div>
        )}

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!isValid || sendNotification.isPending || sent}
          className={cn(
            "w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all",
            sent
              ? "bg-success/10 text-success border border-success/30 cursor-default"
              : "bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {sendNotification.isPending ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</>
          ) : sent ? (
            <><CheckCircle2 className="h-4 w-4" /> Notification Sent!</>
          ) : (
            <><Send className="h-4 w-4" /> Send Notification</>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Main NotificationsTab ────────────────────────────────────────────────────

export function NotificationsTab({ dealerId }: NotificationsTabProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const canCompose = ["super_admin", "dealer_owner", "operations_manager"].includes(user?.role ?? "");

  const handleViewAll = () => {
    // Navigate to the notifications page for the user's role
    const roleRoutes: Record<string, string> = {
      super_admin:        "/admin/notifications",
      dealer_owner:       "/owner/notifications",
      operations_manager: "/owner/notifications",
      branch_manager:     "/owner/notifications",
      van_team_leader:    "/owner/notifications",
      finance:            "/owner/notifications",
    };
    const route = roleRoutes[user?.role ?? ""] ?? "/owner/notifications";
    navigate(route);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Description */}
      <div>
        <p className="text-sm text-muted-foreground">
          View recent notifications and send messages to your team members directly from here.
        </p>
      </div>

      {/* Two-column layout on wider screens, stacked on narrow */}
      <div className={cn(
        "grid gap-4",
        canCompose ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1 max-w-md"
      )}>
        {/* Inbox preview — always shown */}
        <InboxPreview onViewAll={handleViewAll} />

        {/* Compose panel — only for roles that can send */}
        {canCompose && <ComposePanel dealerId={dealerId} />}
      </div>

      {/* Info footer */}
      <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-accent/20 px-4 py-3">
        <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          Notifications are delivered in-app to the recipient's bell icon in real time.
          {canCompose && " Email copies are optional and require a valid recipient email address."}
        </p>
      </div>
    </div>
  );
}