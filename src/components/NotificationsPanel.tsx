import { X, AlertCircle, Info, Bell } from "lucide-react";
import { notifications } from "@/data/mockData";
import { cn } from "@/lib/utils";

interface NotificationsPanelProps {
  open: boolean;
  onClose: () => void;
}

export function NotificationsPanel({ open, onClose }: NotificationsPanelProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-background/50" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-sm border-l border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="font-heading text-lg font-semibold">Notifications</h2>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-2">
          <button className="text-xs text-primary hover:underline px-2 py-1">Mark all as read</button>
        </div>
        <div className="overflow-y-auto p-2 space-y-1" style={{ height: "calc(100vh - 120px)" }}>
          {notifications.map((n) => (
            <div
              key={n.id}
              className={cn(
                "flex items-start gap-3 rounded-md p-3 transition-colors hover:bg-accent",
                !n.read && "bg-accent/50"
              )}
            >
              <div className={cn("mt-0.5 rounded-full p-1.5", n.type === "alert" ? "bg-destructive/20 text-destructive" : "bg-primary/20 text-primary")}>
                {n.type === "alert" ? <AlertCircle className="h-3.5 w-3.5" /> : <Info className="h-3.5 w-3.5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground truncate">{n.title}</p>
                  {!n.read && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{n.description}</p>
                <p className="text-xs text-muted-foreground mt-1">{n.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
