// /src/components/dialog/AddVanDialog.tsx
import { useState } from "react";
import { X, Truck } from "lucide-react";
import { cn } from "@/lib/utils";

export interface VanFormData {
  name:     string;
  branchId: number;
}

interface AddVanDialogProps {
  open:     boolean;
  onClose:  () => void;
  onAdd:    (data: VanFormData) => Promise<void>;
  branches: { id: number; name: string }[];
}

export function AddVanDialog({ open, onClose, onAdd, branches }: AddVanDialogProps) {
  const [name,     setName]     = useState("");
  const [branchId, setBranchId] = useState<number | "">("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  if (!open) return null;

  const isValid = name.trim() && branchId !== "";

  const handleAdd = async () => {
    if (!isValid) return;
    setLoading(true); setError("");
    try {
      await onAdd({ name: name.trim(), branchId: Number(branchId) });
      reset();
    } catch (err: unknown) {
      const e = err as { response?: { data?: Record<string, unknown> } };
      const detail = e?.response?.data;
      setError(detail ? Object.values(detail).flat().join(" | ") : "Failed to create van team.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setName(""); setBranchId(""); setError("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={reset} />
      <div className="relative w-full max-w-md rounded-xl border border-border bg-card shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Truck className="h-4 w-4 text-primary" />
            </div>
            <h3 className="font-heading text-lg font-semibold">Add Van Team</h3>
          </div>
          <button onClick={reset} className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Van Team Name <span className="text-destructive">*</span>
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Van KCK 005"
              className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Answers to Branch <span className="text-destructive">*</span>
            </label>
            <p className="text-xs text-muted-foreground mb-2">
              Determines which branch manager oversees this van and from where it receives SIM stock.
            </p>
            <select
              value={branchId}
              onChange={e => setBranchId(Number(e.target.value))}
              className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">— Select branch —</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 border-t border-border px-6 py-4">
          <button
            onClick={reset}
            disabled={loading}
            className="flex-1 rounded-md border border-border py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!isValid || loading}
            className={cn(
              "flex-1 rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity",
              (!isValid || loading) && "opacity-50 cursor-not-allowed"
            )}
          >
            {loading ? "Adding…" : "Add Van Team"}
          </button>
        </div>
      </div>
    </div>
  );
}