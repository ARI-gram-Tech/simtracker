// /src/pages/super-admin/RecycleBin.tsx
import { useState } from "react";
import { Trash2, RotateCcw, X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

type ItemType = "client" | "invoice" | "user" | "notification";

interface DeletedItem {
  id: string;
  type: ItemType;
  name: string;
  detail: string;
  deletedAt: string;
  deletedBy: string;
  expiresIn: string;
}

const MOCK_DELETED: DeletedItem[] = [
  { id: "d1", type: "client",       name: "Rift Valley Comms",      detail: "Dealer Code: D-R005 · Basic Plan",                 deletedAt: "2025-04-05 14:30", deletedBy: "Admin Kariuki", expiresIn: "25 days" },
  { id: "d2", type: "invoice",      name: "Invoice inv_cancelled",  detail: "Rift Valley Comms · KES 4,999 · Basic · Mar 2025", deletedAt: "2025-04-05 14:32", deletedBy: "Admin Kariuki", expiresIn: "25 days" },
  { id: "d3", type: "user",         name: "Peter Otieno (Finance)", detail: "Enlight Communications Ltd · Finance role",        deletedAt: "2025-03-28 09:15", deletedBy: "Admin Kariuki", expiresIn: "17 days" },
  { id: "d4", type: "notification", name: "Old Maintenance Notice", detail: "Sent to all clients · Feb 15, 2025",              deletedAt: "2025-03-20 11:00", deletedBy: "Admin Kariuki", expiresIn: "9 days"  },
];

const typeColors: Record<ItemType, string> = {
  client:       "bg-primary/10 text-primary",
  invoice:      "bg-warning/10 text-warning",
  user:         "bg-blue-500/10 text-blue-400",
  notification: "bg-muted/40 text-muted-foreground",
};

export default function RecycleBin() {
  const [items,   setItems]   = useState(MOCK_DELETED);
  const [confirm, setConfirm] = useState<{ action: "restore" | "delete"; item: DeletedItem } | null>(null);

  const handleEmptyBin = () => {
    if (window.confirm("Permanently delete all items? This cannot be undone.")) {
      setItems([]);
    }
  };

  const handleRestore = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const handleDelete = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Recycle Bin</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Deleted items are permanently removed after 30 days</p>
        </div>
        {items.length > 0 && (
          <button
            onClick={handleEmptyBin}
            className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/5 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Trash2 className="h-4 w-4" /> Empty Bin
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-border bg-card flex flex-col items-center justify-center py-20 text-center">
          <div className="h-16 w-16 rounded-full bg-accent flex items-center justify-center mb-4">
            <Trash2 className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="font-medium text-foreground">Recycle bin is empty</p>
          <p className="text-sm text-muted-foreground mt-1">Deleted items will appear here for 30 days</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-3 border-b border-border bg-destructive/5">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
            <p className="text-sm text-destructive">{items.length} item{items.length !== 1 ? "s" : ""} awaiting permanent deletion. Items auto-delete after 30 days.</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground text-xs">
                <th className="py-3 px-5 text-left font-medium">Item</th>
                <th className="py-3 px-4 text-left font-medium">Type</th>
                <th className="py-3 px-4 text-left font-medium">Details</th>
                <th className="py-3 px-4 text-left font-medium">Deleted</th>
                <th className="py-3 px-4 text-left font-medium">Expires</th>
                <th className="py-3 px-4 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                  <td className="py-3 px-5 font-medium text-foreground text-xs">{item.name}</td>
                  <td className="py-3 px-4">
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium capitalize", typeColors[item.type])}>
                      {item.type}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-xs text-muted-foreground max-w-xs">{item.detail}</td>
                  <td className="py-3 px-4">
                    <p className="text-xs text-muted-foreground">{item.deletedAt}</p>
                    <p className="text-xs text-muted-foreground">by {item.deletedBy}</p>
                  </td>
                  <td className="py-3 px-4">
                    <span className={cn("text-xs font-medium", parseInt(item.expiresIn) <= 10 ? "text-destructive" : "text-muted-foreground")}>
                      {item.expiresIn}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setConfirm({ action: "restore", item })}
                        className="flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                      >
                        <RotateCcw className="h-3 w-3" /> Restore
                      </button>
                      <button
                        onClick={() => setConfirm({ action: "delete", item })}
                        className="flex items-center gap-1 rounded-md bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive hover:bg-destructive/20 transition-colors"
                      >
                        <X className="h-3 w-3" /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirm dialog */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={() => setConfirm(null)} />
          <div className="relative w-full max-w-sm rounded-xl border border-border bg-card shadow-2xl p-6">
            <h3 className="font-heading text-lg font-semibold text-foreground mb-2">
              {confirm.action === "restore" ? "Restore Item" : "Permanently Delete"}
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              {confirm.action === "restore"
                ? `Restore "${confirm.item.name}"? It will return to its original location.`
                : `Permanently delete "${confirm.item.name}"? This cannot be undone.`}
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirm(null)} className="flex-1 rounded-md border border-border py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors">Cancel</button>
              <button
                onClick={() => {
                  if (confirm.action === "restore") {
                    handleRestore(confirm.item.id);
                  } else {
                    handleDelete(confirm.item.id);
                  }
                  setConfirm(null);
                }}
                className={cn(
                  "flex-1 rounded-md py-2 text-sm font-semibold text-white",
                  confirm.action === "delete" ? "bg-destructive hover:bg-destructive/90" : "bg-primary hover:opacity-90"
                )}
              >
                {confirm.action === "restore" ? "Restore" : "Delete Forever"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}