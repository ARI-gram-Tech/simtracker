// src/components/NotificationToast.tsx
// Top-right pop-up notification toasts with icon, title, message preview.
// Mount once in your root layout — it self-manages via the global event bus.
//
// Usage:
//   1. In your root layout/app: <NotificationToast />
//   2. That's it — useNotificationToast() fires automatically via useNotifications polling.
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect, useCallback, useRef } from "react";
import { X, AlertCircle, Info, DollarSign, Package, CornerDownLeft, RefreshCw, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { subscribeToToasts, useNotificationToast } from "@/hooks/useNotificationToast";
import type { ToastNotification } from "@/hooks/useNotificationToast";
import type { NotificationType } from "@/types/notifications.types";

// ─── Type config ──────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<NotificationType, {
  icon: React.ElementType;
  bg: string;
  border: string;
  iconBg: string;
  iconColor: string;
  bar: string;
}> = {
  alert: {
    icon: AlertCircle,
    bg: "bg-card",
    border: "border-destructive/40",
    iconBg: "bg-destructive/10",
    iconColor: "text-destructive",
    bar: "bg-destructive",
  },
  system: {
    icon: Info,
    bg: "bg-card",
    border: "border-primary/40",
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    bar: "bg-primary",
  },
  finance: {
    icon: DollarSign,
    bg: "bg-card",
    border: "border-teal-500/40",
    iconBg: "bg-teal-500/10",
    iconColor: "text-teal-400",
    bar: "bg-teal-500",
  },
  issue: {
    icon: Package,
    bg: "bg-card",
    border: "border-blue-500/40",
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-400",
    bar: "bg-blue-500",
  },
  return: {
    icon: CornerDownLeft,
    bg: "bg-card",
    border: "border-amber-500/40",
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-500",
    bar: "bg-amber-500",
  },
  receive: {
    icon: RefreshCw,
    bg: "bg-card",
    border: "border-green-500/40",
    iconBg: "bg-green-500/10",
    iconColor: "text-green-500",
    bar: "bg-green-500",
  },
};

const FALLBACK_CONFIG = TYPE_CONFIG.system;
const AUTO_DISMISS_MS = 5000;

// ─── Single toast item ────────────────────────────────────────────────────────

function ToastItem({
  notification,
  onDismiss,
}: {
  notification: ToastNotification;
  onDismiss: (id: string) => void;
}) {
  const [visible,  setVisible]  = useState(false);
  const [leaving,  setLeaving]  = useState(false);
  const [progress, setProgress] = useState(100);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef    = useRef<number>(Date.now());

  const dismiss = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setLeaving(true);
    setTimeout(() => onDismiss(notification.toastId), 350);
  }, [notification.toastId, onDismiss]);

  // Slide in on mount
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 20);
    return () => clearTimeout(t);
  }, []);

  // Auto-dismiss countdown
  useEffect(() => {
    startRef.current = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const remaining = Math.max(0, 100 - (elapsed / AUTO_DISMISS_MS) * 100);
      setProgress(remaining);
      if (remaining === 0) dismiss();
    }, 50);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [dismiss]);

  const cfg  = TYPE_CONFIG[notification.type] ?? FALLBACK_CONFIG;
  const Icon = cfg.icon;

  // Truncate message to ~80 chars for preview
  const messagePreview = notification.message.length > 90
    ? notification.message.slice(0, 87).trimEnd() + "…"
    : notification.message;

  return (
    <div
      className={cn(
        "relative w-[340px] rounded-xl border shadow-2xl overflow-hidden",
        "transition-all duration-350 ease-out",
        cfg.bg, cfg.border,
        visible && !leaving
          ? "translate-x-0 opacity-100"
          : "translate-x-full opacity-0",
      )}
      style={{ transition: "transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.35s ease" }}
    >
      {/* Progress bar at top */}
      <div className="absolute top-0 left-0 h-0.5 w-full bg-border/30">
        <div
          className={cn("h-full transition-none", cfg.bar)}
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex items-start gap-3 px-4 py-3.5 pt-4">
        {/* Icon */}
        <div className={cn(
          "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
          cfg.iconBg
        )}>
          <Icon className={cn("h-4 w-4", cfg.iconColor)} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground leading-snug">
            {notification.title}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            {messagePreview}
          </p>
        </div>

        {/* Close */}
        <button
          onClick={dismiss}
          className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors mt-0.5"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Toast container ──────────────────────────────────────────────────────────

export function NotificationToast() {
  const { user } = useAuth();
  useNotificationToast();

  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  useEffect(() => {
    const unsub = subscribeToToasts(n => {
      setToasts(prev => {
        const next = [n, ...prev];
        return next.slice(0, 4);
      });
    });
    return () => { unsub(); };
  }, []);

  const dismiss = useCallback((toastId: string) => {
    setToasts(prev => prev.filter(t => t.toastId !== toastId));
  }, []);

  if (!user || toasts.length === 0) return null;

  return (
    <div
      className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 pointer-events-none"
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map(t => (
        <div key={t.toastId} className="pointer-events-auto">
          <ToastItem notification={t} onDismiss={dismiss} />
        </div>
      ))}
    </div>
  );
}