// /src/pages/super-admin/Notifications.tsx
import { useState } from "react";
import { Bell, Send, CheckCircle2, AlertTriangle, Info, X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type NotiType   = "info" | "warning" | "success" | "error";
type NotiTarget = "all" | "plan-based" | "specific";

interface SystemNotification {
  id: string;
  title: string;
  message: string;
  type: NotiType;
  target: NotiTarget;
  targetLabel: string;
  sentAt: string;
  sentBy: string;
}

const MOCK_NOTIS: SystemNotification[] = [
  { id: "n1", title: "Scheduled Maintenance",       message: "SimTrack will be down for maintenance on April 15 from 2am to 4am EAT.",  type: "warning", target: "all",        targetLabel: "All clients",    sentAt: "2025-04-08 09:00", sentBy: "Admin Kariuki" },
  { id: "n2", title: "New Feature: Agent Reports",  message: "Agent Performance Reports are now available on Pro and Enterprise plans.", type: "info",    target: "plan-based", targetLabel: "Pro + Enterprise", sentAt: "2025-04-05 14:30", sentBy: "Admin Kariuki" },
  { id: "n3", title: "Invoice Overdue Reminder",    message: "Your invoice #inv_004 is overdue. Please settle to avoid suspension.",     type: "error",   target: "specific",   targetLabel: "Coast Telecom",  sentAt: "2025-04-03 10:00", sentBy: "Admin Kariuki" },
  { id: "n4", title: "Trial Ending Soon",            message: "Your 30-day trial expires on May 1, 2025. Upgrade to continue.",          type: "warning", target: "specific",   targetLabel: "Airtel Kenya",   sentAt: "2025-04-01 08:00", sentBy: "Admin Kariuki" },
];

const typeStyle: Record<NotiType, { icon: React.ElementType; color: string; bg: string }> = {
  info:    { icon: Info,         color: "text-primary",     bg: "bg-primary/10"     },
  warning: { icon: AlertTriangle,color: "text-warning",     bg: "bg-warning/10"     },
  success: { icon: CheckCircle2, color: "text-success",     bg: "bg-success/10"     },
  error:   { icon: X,            color: "text-destructive", bg: "bg-destructive/10" },
};

function SendNotificationDialog({ open, onClose, onSend }: {
  open: boolean; onClose: () => void; onSend: (n: Omit<SystemNotification,"id"|"sentAt"|"sentBy">) => void;
}) {
  const [title,    setTitle]    = useState("");
  const [message,  setMessage]  = useState("");
  const [type,     setType]     = useState<NotiType>("info");
  const [target,   setTarget]   = useState<NotiTarget>("all");
  const [targetLabel, setTargetLabel] = useState("");
  const [loading,  setLoading]  = useState(false);

  if (!open) return null;
  const isValid = title.trim() && message.trim() && (target === "all" || targetLabel);

  const CLIENTS = ["Enlight Communications Ltd","Safaricom Retail Ltd","Airtel Kenya","Coast Telecom Ltd","Western Digital Co"];

  const handleSend = async () => {
    if (!isValid) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    onSend({ title, message, type, target, targetLabel: target === "all" ? "All clients" : targetLabel });
    setLoading(false);
    reset();
  };

  const reset = () => {
    setTitle(""); setMessage(""); setType("info"); setTarget("all"); setTargetLabel("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={reset} />
      <div className="relative w-full max-w-md rounded-xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center"><Bell className="h-4 w-4 text-primary" /></div>
            <h3 className="font-heading text-lg font-semibold">Send Notification</h3>
          </div>
          <button onClick={reset} className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Type</label>
            <div className="flex gap-2">
              {(["info","success","warning","error"] as NotiType[]).map(t => {
                const s = typeStyle[t];
                return (
                  <button key={t} onClick={() => setType(t)}
                    className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium capitalize border transition-colors",
                      type === t ? "border-primary bg-primary/5 text-primary" : "border-border bg-accent/30 text-muted-foreground hover:bg-accent/60")}>
                    <s.icon className="h-3.5 w-3.5" /> {t}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Title <span className="text-destructive">*</span></label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Scheduled Maintenance"
              className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Message <span className="text-destructive">*</span></label>
            <textarea rows={3} value={message} onChange={e => setMessage(e.target.value)} placeholder="Describe the notification..."
              className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Send To</label>
            <div className="flex gap-1 rounded-lg border border-border bg-accent p-1 mb-3">
              {(["all","plan-based","specific"] as NotiTarget[]).map(t => (
                <button key={t} onClick={() => { setTarget(t); setTargetLabel(""); }}
                  className={cn("flex-1 rounded-md py-1.5 text-xs font-medium capitalize transition-colors",
                    target === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
                  {t === "plan-based" ? "By Plan" : t}
                </button>
              ))}
            </div>
            {target === "plan-based" && (
              <select value={targetLabel} onChange={e => setTargetLabel(e.target.value)}
                className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="">— Select plan —</option>
                <option value="Basic">Basic clients only</option>
                <option value="Pro">Pro clients only</option>
                <option value="Enterprise">Enterprise clients only</option>
                <option value="Pro + Enterprise">Pro + Enterprise</option>
              </select>
            )}
            {target === "specific" && (
              <select value={targetLabel} onChange={e => setTargetLabel(e.target.value)}
                className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="">— Select client —</option>
                {CLIENTS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
          </div>
        </div>
        <div className="flex gap-2 border-t border-border px-6 py-4">
          <button onClick={reset} disabled={loading} className="flex-1 rounded-md border border-border py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50">Cancel</button>
          <button onClick={handleSend} disabled={!isValid || loading}
            className="flex-1 flex items-center justify-center gap-2 rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity">
            <Send className="h-4 w-4" /> {loading ? "Sending…" : "Send Notification"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Notifications() {
  const [notis,    setNotis]    = useState(MOCK_NOTIS);
  const [showSend, setShowSend] = useState(false);

  const handleSend = (data: Omit<SystemNotification,"id"|"sentAt"|"sentBy">) => {
    setNotis(prev => [{
      id: "n" + Date.now(),
      ...data,
      sentAt: new Date().toLocaleString(),
      sentBy: "Admin Kariuki",
    }, ...prev]);
    setShowSend(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Send system-wide messages to your dealer clients</p>
        </div>
        <button onClick={() => setShowSend(true)} className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity">
          <Plus className="h-4 w-4" /> Send Notification
        </button>
      </div>

      <div className="space-y-3">
        {notis.map(n => {
          const style = typeStyle[n.type];
          return (
            <div key={n.id} className="rounded-lg border border-border bg-card px-5 py-4 flex items-start gap-4">
              <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg shrink-0 mt-0.5", style.bg)}>
                <style.icon className={cn("h-4 w-4", style.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <p className="font-medium text-foreground text-sm">{n.title}</p>
                  <span className="text-xs text-muted-foreground shrink-0">{n.sentAt}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{n.message}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs text-muted-foreground">
                    <Send className="h-3 w-3" /> {n.targetLabel}
                  </span>
                  <span className="text-xs text-muted-foreground">by {n.sentBy}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <SendNotificationDialog open={showSend} onClose={() => setShowSend(false)} onSend={handleSend} />
    </div>
  );
}