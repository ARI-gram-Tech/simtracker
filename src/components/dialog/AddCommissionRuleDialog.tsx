// src/components/dialog/AddCommissionRuleDialog.tsx
// Fields aligned to backend CommissionRule:
//   dealer, rate_per_active, minimum_topup, effective_from, effective_to, is_active

import { useState } from "react";
import { X, DollarSign, Calendar, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CommissionRuleFormData {
  dealer:          number;
  rate_per_active: number;   // KES per active SIM
  minimum_topup:   number;   // Minimum topup to qualify (default 50)
  effective_from:  string;   // "YYYY-MM-DD"
  effective_to:    string;   // "YYYY-MM-DD" or ""
  is_active:       boolean;
}

interface AddCommissionRuleDialogProps {
  open:     boolean;
  dealerId: number;
  onClose:  () => void;
  onAdd:    (data: CommissionRuleFormData) => Promise<void>;
}

export function AddCommissionRuleDialog({
  open,
  dealerId,
  onClose,
  onAdd,
}: AddCommissionRuleDialogProps) {
  const today = new Date().toISOString().split("T")[0];

  const [ratePerActive, setRatePerActive] = useState("");
  const [minimumTopup,  setMinimumTopup]  = useState("50");
  const [effectiveFrom, setEffectiveFrom] = useState(today);
  const [effectiveTo,   setEffectiveTo]   = useState("");
  const [isActive,      setIsActive]      = useState(true);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState("");

  if (!open) return null;

  const rateNum   = parseFloat(ratePerActive);
  const topupNum  = parseFloat(minimumTopup);
  const rateValid = !isNaN(rateNum) && rateNum > 0;
  const topupValid = !isNaN(topupNum) && topupNum >= 0;
  const isValid    = rateValid && topupValid && effectiveFrom !== "";

  const handleAdd = async () => {
    if (!isValid) return;
    setLoading(true);
    setError("");
    try {
      await onAdd({
        dealer:          dealerId,
        rate_per_active: rateNum,
        minimum_topup:   topupNum,
        effective_from:  effectiveFrom,
        effective_to:    effectiveTo || "",
        is_active:       isActive,
      });
      reset();
    } catch (err: unknown) {
      const e = err as { response?: { data?: Record<string, unknown> } };
      const detail = e?.response?.data;
      setError(
        detail ? Object.values(detail).flat().join(" | ") : "Failed to create commission rule."
      );
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setRatePerActive("");
    setMinimumTopup("50");
    setEffectiveFrom(today);
    setEffectiveTo("");
    setIsActive(true);
    setError("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={reset} />
      <div className="relative w-full max-w-md rounded-xl border border-border bg-card shadow-2xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 sticky top-0 bg-card z-10">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
            <h3 className="font-heading text-lg font-semibold">Add Commission Rule</h3>
          </div>
          <button onClick={reset} className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Rate */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Commission Rate</p>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Rate per Active SIM (KES) <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">KES</span>
                <input
                  value={ratePerActive}
                  onChange={e => setRatePerActive(e.target.value.replace(/[^\d.]/g, ""))}
                  placeholder="e.g. 150"
                  className="w-full rounded-md border border-border bg-accent py-2 pl-12 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              {ratePerActive && !rateValid && (
                <p className="text-xs text-destructive mt-1">Rate must be greater than 0.</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Commission paid per SIM that meets the minimum top-up requirement.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Minimum Top-up to Qualify (KES) <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">KES</span>
                <input
                  value={minimumTopup}
                  onChange={e => setMinimumTopup(e.target.value.replace(/[^\d.]/g, ""))}
                  placeholder="50"
                  className="w-full rounded-md border border-border bg-accent py-2 pl-12 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              {minimumTopup && !topupValid && (
                <p className="text-xs text-destructive mt-1">Minimum top-up must be 0 or greater.</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                A SIM must be topped up by at least this amount to count as active.
              </p>
            </div>
          </div>

          {/* Validity */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Validity Period</p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  <Calendar className="inline h-3.5 w-3.5 mr-1 text-muted-foreground" />
                  Effective From <span className="text-destructive">*</span>
                </label>
                <input
                  type="date"
                  value={effectiveFrom}
                  onChange={e => setEffectiveFrom(e.target.value)}
                  className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  <Calendar className="inline h-3.5 w-3.5 mr-1 text-muted-foreground" />
                  Effective To <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <input
                  type="date"
                  value={effectiveTo}
                  min={effectiveFrom}
                  onChange={e => setEffectiveTo(e.target.value)}
                  className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Leave "Effective To" blank for an open-ended rule.</p>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Status</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={isActive} onChange={() => setIsActive(true)} className="h-4 w-4 accent-primary" />
                <span className="text-sm text-foreground">Active</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={!isActive} onChange={() => setIsActive(false)} className="h-4 w-4 accent-primary" />
                <span className="text-sm text-foreground">Inactive</span>
              </label>
            </div>
          </div>

          {/* Preview */}
          {isValid && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-1">
              <p className="text-xs font-medium text-primary">Rule Preview</p>
              <p className="text-sm text-foreground font-medium">
                KES {Number(ratePerActive).toLocaleString()} per active SIM
              </p>
              <p className="text-xs text-muted-foreground">
                Minimum top-up: KES {Number(minimumTopup).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">
                Valid from {new Date(effectiveFrom).toLocaleDateString("en-KE", { year: "numeric", month: "long", day: "numeric" })}
                {effectiveTo
                  ? ` to ${new Date(effectiveTo).toLocaleDateString("en-KE", { year: "numeric", month: "long", day: "numeric" })}`
                  : " (open-ended)"}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 border-t border-border px-6 py-4 sticky bottom-0 bg-card">
          <button onClick={reset} disabled={loading}
            className="flex-1 rounded-md border border-border py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!isValid || loading}
            className="flex-1 flex items-center justify-center gap-2 rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Adding…" : "Add Rule"}
          </button>
        </div>
      </div>
    </div>
  );
}