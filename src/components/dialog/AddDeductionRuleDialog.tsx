import { useState } from "react";
import { cn } from "@/lib/utils";
import { X, AlertCircle, Loader2 } from "lucide-react";
import type { DeductionRule } from "@/types/commissions.types";

export function AddDeductionRuleDialog({
  open, dealerId, onClose, onAdd,
}: {
  open: boolean;
  dealerId: number;
  onClose: () => void;
  onAdd: (data: Partial<DeductionRule>) => Promise<void>;
}) {
  const [name,           setName]           = useState("");
  const [violationType,  setViolationType]  = useState("");
  const [amountPerUnit,  setAmountPerUnit]  = useState("");
  const [isPerDay,       setIsPerDay]       = useState(false);
  const [thresholdDays,  setThresholdDays]  = useState("");
  const [settlementMode, setSettlementMode] = useState<"commission_deduction" | "standalone">("commission_deduction");
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState("");

  if (!open) return null;

  const isStale = violationType === "stale_sim";
  const isValid = name.trim() && violationType && amountPerUnit && (!isStale || thresholdDays);

  const handleAdd = async () => {
    if (!isValid) return;
    setLoading(true); setError("");
    try {
      await onAdd({
        dealer:          dealerId,
        name:            name.trim(),
        violation_type:  violationType,
        amount_per_unit: amountPerUnit,
        is_per_day:      isPerDay,
        threshold_days:  isStale && thresholdDays ? Number(thresholdDays) : null,
        settlement_mode: settlementMode,
        is_active:       true,
      });
      setName(""); setViolationType(""); setAmountPerUnit("");
      setIsPerDay(false); setThresholdDays(""); onClose();
    } catch (err: unknown) {
      const e = err as { response?: { data?: Record<string, unknown> } };
      const d = e?.response?.data;
      setError(d ? Object.values(d).flat().join(" | ") : "Failed to create rule.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-xl border border-border bg-card shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading text-lg font-semibold">New Deduction Rule</h3>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Rule Name <span className="text-destructive">*</span></label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Stale SIM Penalty"
              className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Violation Type <span className="text-destructive">*</span></label>
            <select value={violationType}
              onChange={e => { setViolationType(e.target.value); setIsPerDay(false); setThresholdDays(""); }}
              className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
              <option value="">— Select type —</option>
              <option value="stale_sim">SIM Held Too Long</option>
              <option value="damaged">Damaged / Defective</option>
              <option value="fraud">Fraud Flagged SIM</option>
              <option value="lost">Lost / Unaccounted SIM</option>
              <option value="manual">Manual Deduction</option>
            </select>
          </div>

          {isStale && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Threshold Days <span className="text-destructive">*</span></label>
              <input type="number" min="1" value={thresholdDays} onChange={e => setThresholdDays(e.target.value)}
                placeholder="e.g. 14"
                className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              <p className="text-xs text-muted-foreground mt-1">Flag BAs who hold SIMs beyond this many days without registering.</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Amount (KES) <span className="text-destructive">*</span></label>
            <input type="number" min="0" value={amountPerUnit} onChange={e => setAmountPerUnit(e.target.value)}
              placeholder="e.g. 100"
              className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>

          {isStale && (
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input type="checkbox" checked={isPerDay} onChange={e => setIsPerDay(e.target.checked)}
                className="h-4 w-4 rounded border-border accent-primary" />
              <span className="text-sm text-foreground">Charge per day (not flat)</span>
            </label>
          )}

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Settlement Mode</label>
            <div className="grid grid-cols-2 gap-2">
              {([
                { value: "commission_deduction", label: "From Commission" },
                { value: "standalone",           label: "Standalone"      },
              ] as const).map(opt => (
                <button key={opt.value} type="button" onClick={() => setSettlementMode(opt.value)}
                  className={cn(
                    "rounded-md border py-2 text-sm font-medium transition-colors",
                    settlementMode === opt.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-accent text-muted-foreground hover:text-foreground"
                  )}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button onClick={onClose}
            className="flex-1 rounded-md border border-border py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors">
            Cancel
          </button>
          <button disabled={!isValid || loading} onClick={handleAdd}
            className="flex-1 flex items-center justify-center gap-2 rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50 hover:opacity-90 transition-opacity">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Creating…" : "Create Rule"}
          </button>
        </div>
      </div>
    </div>
  );
}