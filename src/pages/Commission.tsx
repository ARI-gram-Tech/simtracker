// src/pages/Commission.tsx
// Full commission management page: Rules (read), Cycles, Records, Payouts
// Role-gated: BA gets personal view, Van/Branch get scoped records, Owner/Finance/Ops get full access

import React, { useState, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import { ENDPOINTS } from "@/constants/endpoints";
import { useAuth } from "@/contexts/AuthContext";
import { StatusBadge } from "@/components/StatusBadge";
import { showSuccess, showError } from "@/lib/toast";
import { useMutation } from "@tanstack/react-query";
import { commissionsService } from "@/api/commissions.service";
import {
  useCommissionRules,
  useCommissionCycles,
  usePayoutByRecord,
  useCreateCommissionCycle,
  useCloseCycle,
  useCommissionRecords,
  useApproveCommissionRecord,
  useRejectCommissionRecord,
  usePayouts,
  useCreatePayout,
  useDeductionRules,
  useBASimBreakdown,
  useAgentApprovedDeductions,
  useAvailableReportsForCycle,
} from "@/hooks/useCommissions";
import type { CommissionCycle, CommissionRecord, BASimBreakdownResponse, BASimRow, CycleAvailableReport, PaginatedResponse } from "@/types/commissions.types";
import {
  Loader2, AlertCircle, Plus, X, DollarSign,
  CheckCircle2, XCircle, Clock, CreditCard,
  Lock, Banknote, Smartphone,
  Calendar, TrendingUp, BarChart3,
  RefreshCw, AlertTriangle, Search,
} from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(val: string | number) {
  return `KES ${Number(val).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-KE", { year: "numeric", month: "short", day: "numeric" });
}

const STATUS_COLORS: Record<string, string> = {
  open:     "bg-blue-500/15 text-blue-400",
  closed:   "bg-amber-500/15 text-amber-500",
  approved: "bg-green-500/15 text-green-500",
  paid:     "bg-teal-500/15 text-teal-400",
  pending:  "bg-amber-500/15 text-amber-500",
  rejected: "bg-destructive/15 text-destructive",
};

const VIOLATION_LABELS: Record<string, string> = {
  stale_sim: "SIM Held Too Long",
  damaged:   "Damaged / Defective",
  fraud:     "Fraud Flagged SIM",
  lost:      "Lost / Unaccounted",
  manual:    "Manual Deduction",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  open:     <Clock        className="h-3 w-3" />,
  closed:   <Lock         className="h-3 w-3" />,
  approved: <CheckCircle2 className="h-3 w-3" />,
  paid:     <CreditCard   className="h-3 w-3" />,
  pending:  <Clock        className="h-3 w-3" />,
  rejected: <XCircle      className="h-3 w-3" />,
};

function StatusChip({ status }: { status: string }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium capitalize",
      STATUS_COLORS[status] ?? "bg-accent text-muted-foreground"
    )}>
      {STATUS_ICONS[status]}
      {status}
    </span>
  );
}

// ── Add Cycle Dialog ──────────────────────────────────────────────────────────

function AddCycleDialog({
  open, dealerId, onClose, onSuccess,
}: {
  open: boolean; dealerId: number; onClose: () => void; onSuccess: () => void;
}) {
  const [name,      setName]      = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate,   setEndDate]   = useState("");
  const [error,     setError]     = useState("");
  const createCycle = useCreateCommissionCycle();

  if (!open) return null;

  const isValid = name.trim() && startDate && endDate && endDate >= startDate;

  const handleAdd = async () => {
    if (!isValid) return;
    setError("");
    try {
      await createCycle.mutateAsync({ dealer: dealerId, name: name.trim(), start_date: startDate, end_date: endDate });
      showSuccess("Cycle created successfully!");
      setName(""); setStartDate(""); setEndDate("");
      onSuccess();
    } catch (err: unknown) {
      const e = err as { response?: { data?: Record<string, unknown> } };
      const d = e?.response?.data;
      setError(d ? Object.values(d).flat().join(" | ") : "Failed to create cycle.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-xl border border-border bg-card shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading text-lg font-semibold">New Commission Cycle</h3>
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
            <label className="block text-sm font-medium text-foreground mb-1.5">Cycle Name <span className="text-destructive">*</span></label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. April 2026"
              className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Start Date <span className="text-destructive">*</span></label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">End Date <span className="text-destructive">*</span></label>
              <input type="date" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)}
                className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button onClick={onClose} className="flex-1 rounded-md border border-border py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors">
            Cancel
          </button>
          <button
            disabled={!isValid || createCycle.isPending}
            onClick={handleAdd}
            className="flex-1 flex items-center justify-center gap-2 rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50 hover:opacity-90 transition-opacity">
            {createCycle.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {createCycle.isPending ? "Creating…" : "Create Cycle"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Approve / Reject Dialog ───────────────────────────────────────────────────

function ApproveRejectDialog({
  record, action, onClose,
}: {
  record: CommissionRecord | null;
  action: "approve" | "reject" | null;
  onClose: () => void;
}) {
  const [notes, setNotes] = useState("");
  const approve = useApproveCommissionRecord();
  const reject  = useRejectCommissionRecord();
  const loading = approve.isPending || reject.isPending;

  if (!record || !action) return null;

  const handleSubmit = async () => {
    try {
      if (action === "approve") {
        await approve.mutateAsync({ id: record.id, data: { notes } });
        showSuccess(`Commission approved for ${record.agent_name}.`);
      } else {
        await reject.mutateAsync({ id: record.id, data: { notes } });
        showSuccess(`Commission rejected for ${record.agent_name}.`);
      }
      setNotes("");
      onClose();
    } catch {
      showError("Action failed. Please try again.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-xl border border-border bg-card shadow-2xl p-6">
        <h3 className="font-heading text-lg font-semibold mb-1">
          {action === "approve" ? "Approve Commission" : "Reject Commission"}
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          {action === "approve"
            ? `Approve KES ${Number(record.net_amount).toLocaleString()} for ${record.agent_name}?`
            : `Reject commission for ${record.agent_name}?`}
        </p>

        <div className="mb-4">
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Notes <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)}
            placeholder={action === "approve" ? "Add approval notes…" : "Reason for rejection…"}
            className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} disabled={loading}
            className="flex-1 rounded-md border border-border py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={loading}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 rounded-md py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-50",
              action === "approve" ? "bg-green-600 hover:opacity-90" : "bg-destructive hover:opacity-90"
            )}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Processing…" : action === "approve" ? "Approve" : "Reject"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Payout Dialog ─────────────────────────────────────────────────────────────

function PayoutDialog({
  record, onClose,
}: {
  record: CommissionRecord | null;
  onClose: () => void;
}) {
  const [method, setMethod] = useState<"mpesa" | "bank" | "cash">("mpesa");
  const [txRef,  setTxRef]  = useState("");
  const [notes,  setNotes]  = useState("");
  const createPayout = useCreatePayout();
  const { data: deductions = [], isLoading: deductionsLoading } = useAgentApprovedDeductions(
    record?.agent ?? undefined
  );

  if (!record) return null;

  const handlePay = async () => {
    try {
      await createPayout.mutateAsync({
        commission_record: record.id,
        method,
        transaction_ref:   txRef.trim(),
        amount:            Number(record.net_amount),
        notes:             notes.trim(),
      });
      showSuccess(`Payout recorded for ${record.agent_name}.`);
      setMethod("mpesa"); setTxRef(""); setNotes("");
      onClose();
    } catch {
      showError("Failed to record payout. Please try again.");
    }
  };

  const METHOD_ICONS: Record<string, React.ReactNode> = {
    mpesa: <Smartphone className="h-4 w-4" />,
    bank:  <Banknote   className="h-4 w-4" />,
    cash:  <DollarSign className="h-4 w-4" />,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-xl border border-border bg-card shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading text-lg font-semibold">Record Payout</h3>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Commission summary */}
        <div className="rounded-lg border border-border bg-accent/30 px-4 py-3 mb-4 space-y-2">
          <p className="text-sm font-medium text-foreground">{record.agent_name}</p>

          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">{record.active_sims} active SIMs × KES {Number(record.rate_per_sim).toLocaleString()}</span>
            <span className="font-medium text-foreground">{fmt(record.gross_amount)}</span>
          </div>

          {/* Deduction lines */}
          {deductionsLoading && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Loading deductions…
            </div>
          )}
          {!deductionsLoading && deductions.length > 0 && (
            <div className="space-y-1 border-t border-border/50 pt-2">
              {deductions.map((d: { id: number; rule_name: string; violation_type: string; sims_count: number; amount: number }) => (
                <div key={d.id} className="flex justify-between text-xs">
                  <span className="text-muted-foreground">
                    {d.rule_name ?? VIOLATION_LABELS[d.violation_type] ?? d.violation_type}
                    {d.sims_count > 1 ? ` (×${d.sims_count})` : ""}
                  </span>
                  <span className="text-destructive font-medium">− {fmt(d.amount)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Divider + net */}
          <div className="border-t border-border pt-2 flex justify-between items-center">
            <span className="text-sm font-semibold text-foreground">Net Payable</span>
            <span className="text-lg font-bold text-green-500">{fmt(record.net_amount)}</span>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Payment Method</label>
            <div className="grid grid-cols-3 gap-2">
              {(["mpesa", "bank", "cash"] as const).map(m => (
                <button key={m} onClick={() => setMethod(m)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-lg border py-2.5 text-xs font-medium transition-colors",
                    method === m
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-accent text-muted-foreground hover:text-foreground"
                  )}>
                  {METHOD_ICONS[m]}
                  {m === "mpesa" ? "M-Pesa" : m === "bank" ? "Bank" : "Cash"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Transaction Ref <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <input value={txRef} onChange={e => setTxRef(e.target.value)} placeholder="e.g. QHX72KA19B"
              className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Notes <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
              className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button onClick={onClose} disabled={createPayout.isPending}
            className="flex-1 rounded-md border border-border py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button onClick={handlePay} disabled={createPayout.isPending || deductionsLoading}
            className="flex-1 flex items-center justify-center gap-2 rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50 hover:opacity-90 transition-opacity">
            {createPayout.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {createPayout.isPending ? "Recording…" : "Record Payout"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Generate Records Modal ────────────────────────────────────────────────────

function GenerateRecordsModal({
  cycle,
  onClose,
  onSuccess,
}: {
  cycle: CommissionCycle;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { data: reports = [], isLoading, isError } = useAvailableReportsForCycle(cycle.id);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [generating, setGenerating] = useState(false);

  // Pre-select all unlocked reports once they load
  useEffect(() => {
    if (reports.length) {
      const unlockedIds = reports.filter((r) => !r.is_locked).map((r) => r.id);
      setSelected(new Set(unlockedIds));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const selectableIds = reports.filter(r => !r.is_locked).map(r => r.id);
  const allSelected   = selectableIds.length > 0 && selectableIds.every(id => selected.has(id));

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(selectableIds));
  };

  const toggle = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleGenerate = async () => {
    if (selected.size === 0) { showError("Select at least one report."); return; }
    setGenerating(true);
    try {
      const res = await commissionsService.generateCycleRecords(cycle.id, Array.from(selected));
      showSuccess(res.detail);
      onSuccess();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string; locked_report_ids?: number[] } } };
      const detail = e?.response?.data?.detail ?? "Failed to generate records.";
      const locked = e?.response?.data?.locked_report_ids;
      showError(locked ? `${detail} (locked: ${locked.join(", ")})` : detail);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h3 className="font-heading text-lg font-semibold">Generate Commission Records</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Select reports to include in <strong>{cycle.name}</strong>
            </p>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {isLoading && (
            <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /><span className="text-sm">Loading reports…</span>
            </div>
          )}
          {isError && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />Failed to load available reports.
            </div>
          )}
          {!isLoading && !isError && reports.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No processed reports available.</p>
          )}
          {!isLoading && !isError && reports.length > 0 && (
            <>
              {/* Select-all */}
              <div className="flex items-center gap-3 pb-2 border-b border-border">
                <input type="checkbox" id="select-all" checked={allSelected} onChange={toggleAll}
                  disabled={selectableIds.length === 0}
                  className="h-4 w-4 rounded border-border accent-primary" />
                <label htmlFor="select-all" className="text-sm font-medium text-foreground cursor-pointer">
                  Select all unlocked ({selectableIds.length})
                </label>
              </div>

              {/* Report rows — newest first from backend */}
              {reports.map(r => {
                const isSelectable = !r.is_locked;
                const isChecked    = selected.has(r.id);
                return (
                  <div key={r.id} onClick={() => isSelectable && toggle(r.id)}
                    className={cn(
                      "flex items-start gap-3 rounded-lg border px-4 py-3 transition-colors",
                      isSelectable
                        ? isChecked
                          ? "border-primary/40 bg-primary/5 cursor-pointer"
                          : "border-border hover:bg-accent/50 cursor-pointer"
                        : "border-border/50 bg-accent/20 opacity-60 cursor-not-allowed",
                    )}>
                    <input type="checkbox" checked={isChecked} disabled={!isSelectable}
                      onChange={() => toggle(r.id)} onClick={e => e.stopPropagation()}
                      className="mt-0.5 h-4 w-4 rounded border-border accent-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-foreground truncate">{r.filename}</p>
                        {r.is_used && (
                          <span className="rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 text-[10px] font-medium shrink-0">
                            Used before
                          </span>
                        )}
                        {r.is_locked && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 text-[10px] font-medium shrink-0">
                            <Lock className="h-2.5 w-2.5" />
                            Locked ({r.locked_ba_count} BA{r.locked_ba_count !== 1 ? "s" : ""} approved/paid)
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {r.period || "No period set"} · {r.total_records.toLocaleString()} rows · {r.matched} matched
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Uploaded {new Date(r.uploaded_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    {isChecked && isSelectable && <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />}
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border shrink-0 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">{selected.size} report{selected.size !== 1 ? "s" : ""} selected</p>
          <div className="flex gap-2">
            <button onClick={onClose} disabled={generating}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50">
              Cancel
            </button>
            <button onClick={handleGenerate} disabled={generating || selected.size === 0}
              className="flex items-center gap-2 rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity">
              {generating && <Loader2 className="h-4 w-4 animate-spin" />}
              {generating ? "Generating…" : `Generate from ${selected.size} report${selected.size !== 1 ? "s" : ""}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Cycles Tab ────────────────────────────────────────────────────────────────
// Make sure these are in your imports at the top of Commission.tsx:
//   import api from "@/lib/api";
//   import { useMutation } from "@tanstack/react-query";   ← likely already imported

function CyclesTab({ dealerId, canManage, onGenerated }: { dealerId: number; canManage: boolean; onGenerated?: () => void }) {
  const [showAdd,         setShowAdd]         = useState(false);
  const [deleteConfirm,   setDeleteConfirm]   = useState<CommissionCycle | null>(null);  // already existed
  const [closeConfirm,    setCloseConfirm]    = useState<CommissionCycle | null>(null);
  const [generateTarget,  setGenerateTarget]  = useState<CommissionCycle | null>(null);

  const { data: cycles = [], isLoading, isError, refetch } = useCommissionCycles(dealerId);

  const closeCycle = useCloseCycle();

  // ── NEW: delete mutation ───────────────────────────────────────────────────
  const deleteCycle = useMutation({
    mutationFn: (id: number) =>
      api.delete(ENDPOINTS.DELETE_CYCLE(id)).then(r => r.data),
    onSuccess: () => refetch(),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-lg font-semibold">Commission Cycles</h3>
        {canManage && (
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity">
            <Plus className="h-4 w-4" /> New Cycle
          </button>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading cycles…</span>
        </div>
      )}

      {isError && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Failed to load cycles.</span>
          <button onClick={() => refetch()} className="ml-auto underline text-xs">Retry</button>
        </div>
      )}

      {!isLoading && !isError && cycles.length === 0 && (
        <div className="rounded-lg border border-dashed border-border py-16 text-center">
          <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No commission cycles yet.</p>
          {canManage && (
            <button onClick={() => setShowAdd(true)} className="mt-3 text-sm text-primary underline">
              Create your first cycle
            </button>
          )}
        </div>
      )}

      {!isLoading && !isError && cycles.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-accent/30 text-muted-foreground text-xs">
                <th className="py-3 px-4 text-left font-medium">Cycle</th>
                <th className="py-3 px-4 text-left font-medium">Period</th>
                <th className="py-3 px-4 text-left font-medium">Status</th>
                <th className="py-3 px-4 text-left font-medium">Created</th>
                {canManage && <th className="py-3 px-4 text-left font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {cycles.map(c => (
                <tr key={c.id} className="border-b border-border/50 hover:bg-accent/40 transition-colors">
                  <td className="py-3 px-4 font-medium text-foreground">{c.name}</td>
                  <td className="py-3 px-4 text-xs text-muted-foreground">
                    {fmtDate(c.start_date)} → {fmtDate(c.end_date)}
                  </td>
                  <td className="py-3 px-4"><StatusChip status={c.status} /></td>
                  <td className="py-3 px-4 text-xs text-muted-foreground">{fmtDate(c.created_at)}</td>
                  {canManage && (
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        {c.status === "open" && (
                          <button
                            onClick={() => setGenerateTarget(c)}
                            className="flex items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition-colors">
                            <RefreshCw className="h-3 w-3" /> Generate Records
                          </button>
                        )}
                        {c.status === "open" && (
                          <button
                            onClick={() => setCloseConfirm(c)}
                            disabled={closeCycle.isPending}
                            className="flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-600 hover:bg-amber-500/20 transition-colors disabled:opacity-50">
                            <Lock className="h-3 w-3" /> Close Cycle
                          </button>
                        )}
                        {/* ── NEW: Delete button (open cycles only) ── */}
                        {(c.status === "open" || c.status === "closed") && (
                          <button
                            onClick={() => setDeleteConfirm(c)}
                            disabled={deleteCycle.isPending}
                            className="flex items-center gap-1 rounded-md border border-destructive/40 bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive hover:bg-destructive/20 transition-colors disabled:opacity-50">
                            <X className="h-3 w-3" /> Delete
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AddCycleDialog
        open={showAdd}
        dealerId={dealerId}
        onClose={() => setShowAdd(false)}
        onSuccess={() => setShowAdd(false)}
      />

      {generateTarget && (
        <GenerateRecordsModal
          cycle={generateTarget}
          onClose={() => setGenerateTarget(null)}
          onSuccess={() => { setGenerateTarget(null); refetch(); onGenerated?.(); }}
        />
      )}

      {/* ── Close Cycle confirmation modal (unchanged) ── */}
      {closeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={() => setCloseConfirm(null)} />
          <div className="relative w-full max-w-sm rounded-xl border border-border bg-card shadow-2xl p-6">
            <h3 className="font-heading text-lg font-semibold mb-2">Close Cycle</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Close <strong>{closeConfirm.name}</strong>? No new records can be added after closing.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setCloseConfirm(null)}
                className="flex-1 rounded-md border border-border py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors">
                Cancel
              </button>
              <button
                disabled={closeCycle.isPending}
                onClick={async () => {
                  try {
                    await closeCycle.mutateAsync(closeConfirm.id);
                    showSuccess(`Cycle "${closeConfirm.name}" closed.`);
                    setCloseConfirm(null);
                  } catch {
                    showError("Failed to close cycle.");
                  }
                }}
                className="flex-1 flex items-center justify-center gap-2 rounded-md bg-amber-600 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity">
                {closeCycle.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Close Cycle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── NEW: Delete Cycle confirmation modal ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm"
            onClick={() => setDeleteConfirm(null)} />
          <div className="relative w-full max-w-sm rounded-xl border border-destructive/40 bg-card shadow-2xl p-6">
            <h3 className="font-heading text-lg font-semibold mb-2">Delete Cycle</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Delete <strong>{deleteConfirm.name}</strong>? This will permanently remove
              the cycle and all its commission records.
            </p>
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-2.5 mb-5 space-y-1">
              {deleteConfirm.status === "closed" && (
                <p className="text-xs font-semibold text-destructive">
                  ⚠️ This cycle is closed — deleting it will undo the close action.
                </p>
              )}
              <p className="text-xs text-destructive">
                All pending and rejected records will be permanently deleted.
                Cycles with approved or paid records cannot be deleted.
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 rounded-md border border-border py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors">
                Cancel
              </button>
              <button
                disabled={deleteCycle.isPending}
                onClick={async () => {
                  try {
                    await deleteCycle.mutateAsync(deleteConfirm.id);
                    showSuccess(`Cycle "${deleteConfirm.name}" deleted.`);
                    setDeleteConfirm(null);
                  } catch {
                    showError("Cannot delete this cycle. It may have approved or paid records.");
                  }
                }}
                className="flex-1 flex items-center justify-center gap-2 rounded-md bg-destructive py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity">
                {deleteCycle.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Delete Cycle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Commission Breakdown Modal ────────────────────────────────────────────────

function BreakdownModal({ record, onClose }: { record: CommissionRecord | null; onClose: () => void }) {
  if (!record) return null;

  const rate = Number(record.rate_per_sim);

  const rows = [
    { label: "Claimed by BA",           count: record.claimed_sims,          amount: null,                         color: "text-foreground",   description: "SIMs BA marked as registered in the system" },
    { label: "Confirmed by Safaricom",  count: record.active_sims,           amount: record.active_sims * rate,    color: "text-green-500",    description: "Activated with topup ≥ KES 50 — these are paid" },
    { label: "Not in Safaricom Report", count: record.not_in_report_sims,    amount: -(record.not_in_report_sims * rate), color: "text-amber-500", description: "BA claimed registered but Safaricom has no record" },
    { label: "Not in Dealer Inventory", count: record.not_in_inventory_sims, amount: 0,                            color: "text-orange-400",   description: "Serial appeared in report but not in your inventory" },
    { label: "Fraud Flagged",           count: record.fraud_sims,            amount: 0,                            color: "text-destructive",  description: "Flagged by Safaricom — not paid" },
    { label: "Rejected (low topup)",    count: record.rejected_sims,         amount: 0,                            color: "text-destructive",  description: "Topup below minimum threshold" },
    { label: "Disputed",                count: record.disputed_sims,         amount: 0,                            color: "text-yellow-500",   description: "SIM held by different BA than Safaricom reports" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-heading text-lg font-semibold">Commission Breakdown</h3>
            <p className="text-sm text-muted-foreground">{record.agent_name}</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="rounded-lg bg-accent/30 border border-border px-4 py-2.5 mb-4 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Rate per SIM</span>
          <span className="text-sm font-semibold text-foreground">KES {rate.toLocaleString()}</span>
        </div>

        <div className="space-y-2 mb-4">
          {rows.map(row => (
            <div key={row.label} className={cn("rounded-lg border border-border px-4 py-3", row.count === 0 ? "opacity-40" : "")}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className={cn("text-sm font-medium", row.color)}>{row.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{row.description}</p>
                </div>
                <div className="text-right ml-4 shrink-0">
                  <p className={cn("text-sm font-bold", row.color)}>{row.count} SIM{row.count !== 1 ? "s" : ""}</p>
                  {row.amount !== null && row.count > 0 && (
                    <p className={cn("text-xs font-medium", row.amount >= 0 ? "text-green-500" : "text-amber-500")}>
                      {row.amount >= 0 ? "+" : ""}KES {Math.abs(row.amount).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-border bg-accent/20 divide-y divide-border">
          <div className="flex justify-between px-4 py-2.5">
            <span className="text-sm text-muted-foreground">Gross Payable</span>
            <span className="text-sm font-semibold text-foreground">KES {Number(record.gross_amount).toLocaleString()}</span>
          </div>
          <div className="flex justify-between px-4 py-2.5">
            <span className="text-sm text-muted-foreground">Deductions</span>
            <span className="text-sm font-semibold text-amber-500">− KES {Number(record.deductions).toLocaleString()}</span>
          </div>
          <div className="flex justify-between px-4 py-2.5">
            <span className="text-sm font-semibold text-foreground">Net Payable</span>
            <span className="text-base font-bold text-green-500">KES {Number(record.net_amount).toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Records Tab ───────────────────────────────────────────────────────────────

function RecordsTab({
  dealerId,
  canApprove,
  canViewSIMDetail,
  scopeRole,
  scopeBranchId,
  scopeVanId,
}: {
  dealerId: number;
  canApprove: boolean;
  canViewSIMDetail: boolean;
  scopeRole?: string;
  scopeBranchId?: number;
  scopeVanId?: number;
}) {
  const [cycleFilter,     setCycleFilter]     = useState<number | undefined>(undefined);
  const [statusFilter,    setStatusFilter]    = useState<string>("");
  const [searchFilter,    setSearchFilter]    = useState<string>("");
  const [page,            setPage]            = useState(1);
  const PAGE_SIZE = 20;
  const [actionRecord,    setActionRecord]    = useState<CommissionRecord | null>(null);
  const [actionType,      setActionType]      = useState<"approve" | "reject" | null>(null);
  const [payoutRecord,    setPayoutRecord]    = useState<CommissionRecord | null>(null);
  const [breakdownRecord,  setBreakdownRecord]  = useState<CommissionRecord | null>(null);
  const [simBreakdownTarget, setSimBreakdownTarget] = useState<{
    baId: number; baName: string; cycleId?: number; startDate?: string; endDate?: string;
  } | null>(null);

  // Scoped roles see filtered records, no dropdowns needed
  const isScoped = scopeRole === "branch_manager" || scopeRole === "van_team_leader";

  const { data: cycles  = [] } = useCommissionCycles(dealerId);
  const recordsQueryParams = useMemo(() => ({
    ...(cycleFilter  ? { cycle:  cycleFilter }                                : {}),
    ...(statusFilter ? { status: statusFilter as CommissionRecord["status"] } : {}),
    ...(searchFilter.trim() ? { search: searchFilter.trim() }                 : {}),
    ...(scopeRole === "branch_manager"  && scopeBranchId ? { branch:   scopeBranchId } : {}),
    ...(scopeRole === "van_team_leader" && scopeVanId    ? { van_team: scopeVanId    } : {}),
    page,
  }), [cycleFilter, statusFilter, searchFilter, scopeRole, scopeBranchId, scopeVanId, page]);

  const { data: recordsData, isLoading, isError, refetch } = useCommissionRecords(recordsQueryParams);
  const records    = recordsData?.results ?? [];
  const totalCount = recordsData?.count   ?? 0;

  useEffect(() => { setPage(1); }, [cycleFilter, statusFilter, searchFilter]);

  const totalNet         = records.reduce((s, r) => s + Number(r.net_amount),  0);
  const totalGross       = records.reduce((s, r) => s + Number(r.gross_amount), 0);
  const pending          = records.filter(r => r.status === "pending").length;
  const approved         = records.filter(r => r.status === "approved").length;
  const totalPages       = Math.ceil(totalCount / PAGE_SIZE);
  const paginatedRecords = records; // backend already sliced the page

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-lg font-semibold">Commission Records</h3>
        {isScoped && (
          <span className="text-xs text-muted-foreground bg-accent px-2.5 py-1 rounded-full">
            {scopeRole === "branch_manager" ? "Your branch only" : "Your van team only"}
          </span>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Gross", value: fmt(totalGross),       color: "text-foreground" },
          { label: "Total Net",   value: fmt(totalNet),         color: "text-green-500"  },
          { label: "Pending",     value: `${pending} records`,  color: "text-amber-500"  },
          { label: "Approved",    value: `${approved} records`, color: "text-green-500"  },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-lg border border-border bg-accent/30 px-4 py-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={cn("text-base font-bold mt-0.5", color)}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filters — hidden for scoped roles */}
      {!isScoped && (
        <div className="flex flex-wrap gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              placeholder="Search agent…"
              className="rounded-md border border-border bg-accent py-1.5 pl-9 pr-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-48" />
          </div>
          <select
            value={cycleFilter ?? ""}
            onChange={e => setCycleFilter(e.target.value ? Number(e.target.value) : undefined)}
            className="rounded-md border border-border bg-accent py-1.5 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
            <option value="">All Cycles</option>
            {cycles.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="rounded-md border border-border bg-accent py-1.5 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="paid">Paid</option>
          </select>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading records…</span>
        </div>
      )}

      {isError && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Failed to load records.</span>
          <button onClick={() => refetch()} className="ml-auto underline text-xs">Retry</button>
        </div>
      )}

      {!isLoading && !isError && records.length === 0 && (
        <div className="rounded-lg border border-dashed border-border py-16 text-center">
          <BarChart3 className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No records found.</p>
        </div>
      )}

      {!isLoading && !isError && records.length > 0 && (
        <div className="rounded-lg border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-accent/30 text-muted-foreground text-xs">
                <th className="py-3 px-4 text-left font-medium">Agent</th>
                <th className="py-3 px-4 text-left font-medium">Cycle</th>
                <th className="py-3 px-4 text-left font-medium">Active SIMs</th>
                <th className="py-3 px-4 text-left font-medium">Gross</th>
                <th className="py-3 px-4 text-left font-medium">Deductions</th>
                <th className="py-3 px-4 text-left font-medium">Net</th>
                <th className="py-3 px-4 text-left font-medium">Status</th>
                {canApprove && <th className="py-3 px-4 text-left font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {paginatedRecords.map(r => {
                const cycleName = cycles.find(c => c.id === r.cycle)?.name ?? `#${r.cycle}`;
                return (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-accent/40 transition-colors">
                    <td className="py-3 px-4 font-medium text-foreground">{r.agent_name}</td>
                    <td className="py-3 px-4 text-xs text-muted-foreground">{cycleName}</td>
                    <td className="py-3 px-4 text-center font-medium text-foreground">{r.active_sims}</td>
                    <td className="py-3 px-4 text-xs text-muted-foreground">{fmt(r.gross_amount)}</td>
                    <td className="py-3 px-4 text-xs text-destructive">{fmt(r.deductions)}</td>
                    <td className="py-3 px-4 font-semibold text-green-500">{fmt(r.net_amount)}</td>
                    <td className="py-3 px-4"><StatusChip status={r.status} /></td>
                    {canApprove && (
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setBreakdownRecord(r)}
                            className="rounded-md bg-accent border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                            Details
                          </button>
                          {canViewSIMDetail && (
                            <button
                              onClick={() => {
                                const cycle = cycles.find(c => c.id === r.cycle);
                                setSimBreakdownTarget({
                                  baId:      r.agent,
                                  baName:    r.agent_name,
                                  cycleId:   r.cycle,        // ← add this
                                  startDate: cycle?.start_date,
                                  endDate:   cycle?.end_date,
                                });
                              }}
                              className="rounded-md bg-accent border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                              SIM Detail
                            </button>
                          )}
                          {r.status === "pending" && (
                            <>
                              <button
                                onClick={() => { setActionRecord(r); setActionType("approve"); }}
                                className="rounded-md bg-green-600/10 border border-green-600/20 px-2.5 py-1 text-xs font-medium text-green-600 hover:bg-green-600/20 transition-colors">
                                Approve
                              </button>
                              <button
                                onClick={() => { setActionRecord(r); setActionType("reject"); }}
                                className="rounded-md bg-destructive/10 border border-destructive/20 px-2.5 py-1 text-xs font-medium text-destructive hover:bg-destructive/20 transition-colors">
                                Reject
                              </button>
                            </>
                          )}
                          {r.status === "approved" && (
                            <button
                              onClick={() => setPayoutRecord(r)}
                              className="rounded-md bg-primary/10 border border-primary/20 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition-colors">
                              Pay Out
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && !isError && totalCount > PAGE_SIZE && (
        <div className="flex items-center justify-between pt-2 flex-wrap gap-3">
          <p className="text-xs text-muted-foreground">
            Showing {Math.min((page - 1) * PAGE_SIZE + 1, totalCount)}–{Math.min(page * PAGE_SIZE, totalCount)} of {totalCount} records
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-md border border-border bg-accent px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent/80 disabled:opacity-40 transition-colors">
              ← Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push("...");
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === "..." ? (
                  <span key={`e-${i}`} className="px-1 text-xs text-muted-foreground">…</span>
                ) : (
                  <button key={p} onClick={() => setPage(p as number)}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-xs font-medium transition-colors min-w-[2rem]",
                      page === p
                        ? "bg-primary text-primary-foreground"
                        : "border border-border bg-accent text-foreground hover:bg-accent/80"
                    )}>
                    {p}
                  </button>
                )
              )}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-md border border-border bg-accent px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent/80 disabled:opacity-40 transition-colors">
              Next →
            </button>
          </div>
        </div>
      )}

      <ApproveRejectDialog
        record={actionRecord}
        action={actionType}
        onClose={() => { setActionRecord(null); setActionType(null); }}
      />
      <PayoutDialog   record={payoutRecord}    onClose={() => setPayoutRecord(null)} />
      <BreakdownModal record={breakdownRecord} onClose={() => setBreakdownRecord(null)} />
      {simBreakdownTarget && (
        <BASimBreakdownModal
          baId={simBreakdownTarget.baId}
          baName={simBreakdownTarget.baName}
          cycleId={simBreakdownTarget.cycleId}
          startDate={simBreakdownTarget.startDate}
          endDate={simBreakdownTarget.endDate}
          onClose={() => setSimBreakdownTarget(null)}
        />
      )}
    </div>
  );
}

// ── Payouts Tab ───────────────────────────────────────────────────────────────

function PayoutsTab() {
  const { data: payouts = [], isLoading, isError, refetch } = usePayouts();
  const totalPaid = payouts.reduce((s, p) => s + Number(p.amount), 0);

  const METHOD_LABELS: Record<string, string> = { mpesa: "M-Pesa", bank: "Bank", cash: "Cash" };

  return (
    <div className="space-y-4">
      <h3 className="font-heading text-lg font-semibold">Payout History</h3>

      <div className="rounded-lg border border-border bg-accent/30 px-6 py-4 inline-flex items-center gap-3">
        <CreditCard className="h-5 w-5 text-primary" />
        <div>
          <p className="text-xs text-muted-foreground">Total Paid Out</p>
          <p className="text-xl font-bold text-foreground">{fmt(totalPaid)}</p>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading payouts…</span>
        </div>
      )}

      {isError && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Failed to load payouts.</span>
          <button onClick={() => refetch()} className="ml-auto underline text-xs">Retry</button>
        </div>
      )}

      {!isLoading && !isError && payouts.length === 0 && (
        <div className="rounded-lg border border-dashed border-border py-16 text-center">
          <CreditCard className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No payouts recorded yet.</p>
        </div>
      )}

      {!isLoading && !isError && payouts.length > 0 && (
        <div className="rounded-lg border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-accent/30 text-muted-foreground text-xs">
                <th className="py-3 px-4 text-left font-medium">Agent</th>
                <th className="py-3 px-4 text-left font-medium">Amount</th>
                <th className="py-3 px-4 text-left font-medium">Method</th>
                <th className="py-3 px-4 text-left font-medium">Reference</th>
                <th className="py-3 px-4 text-left font-medium">Paid At</th>
                <th className="py-3 px-4 text-left font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map(p => (
                <tr key={p.id} className="border-b border-border/50 hover:bg-accent/40 transition-colors">
                  <td className="py-3 px-4 font-medium text-foreground">{p.agent_name}</td>
                  <td className="py-3 px-4 font-semibold text-green-500">{fmt(p.amount)}</td>
                  <td className="py-3 px-4">
                    <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-muted-foreground">
                      {METHOD_LABELS[p.method] ?? p.method}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-xs text-muted-foreground font-mono">{p.transaction_ref || "—"}</td>
                  <td className="py-3 px-4 text-xs text-muted-foreground">{fmtDate(p.paid_at)}</td>
                  <td className="py-3 px-4 text-xs text-muted-foreground">{p.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Rules Tab ─────────────────────────────────────────────────────────────────

function RulesTab({ dealerId }: { dealerId: number }) {
  const { data: rules = [], isLoading } = useCommissionRules(dealerId);

  return (
    <div className="space-y-4">
      <h3 className="font-heading text-lg font-semibold">Active Commission Rules</h3>
      <p className="text-sm text-muted-foreground">Commission rules are configured in Settings → Commission Rules.</p>

      {isLoading && (
        <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading rules…</span>
        </div>
      )}

      {!isLoading && rules.length === 0 && (
        <div className="rounded-lg border border-dashed border-border py-16 text-center">
          <TrendingUp className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No commission rules configured.</p>
        </div>
      )}

      {!isLoading && rules.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          {rules.map(r => (
            <div key={r.id} className={cn(
              "rounded-lg border p-4 space-y-2",
              r.is_active ? "border-border bg-card" : "border-border/50 bg-accent/20 opacity-60"
            )}>
              <div className="flex items-center justify-between">
                <p className="font-semibold text-foreground text-base">
                  {fmt(r.rate_per_active)}<span className="text-sm font-normal text-muted-foreground"> / active SIM</span>
                </p>
                <StatusBadge status={r.is_active ? "activated" : "Inactive"} />
              </div>
              <p className="text-xs text-muted-foreground">Min top-up: KES {Number(r.minimum_topup).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">
                Effective: {fmtDate(r.effective_from)}{r.effective_to ? ` → ${fmtDate(r.effective_to)}` : " (open-ended)"}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Deductions Tab ────────────────────────────────────────────────────────────

function DeductionsTab({ dealerId }: { dealerId: number }) {
  const { data: rules = [], isLoading, isError, refetch } = useDeductionRules(dealerId);
  const activeRules   = rules.filter(r => r.is_active);
  const inactiveRules = rules.filter(r => !r.is_active);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-heading text-lg font-semibold">Deduction Rules</h3>
        <p className="text-sm text-muted-foreground mt-0.5">Penalties applied to agents for violations. Configured in Settings → Commission Rules.</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Rules", value: rules.length,         color: "text-foreground" },
          { label: "Active",      value: activeRules.length,   color: "text-green-500"  },
          { label: "Inactive",    value: inactiveRules.length, color: "text-muted-foreground" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-lg border border-border bg-accent/30 px-4 py-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={cn("text-xl font-bold mt-0.5", color)}>{value}</p>
          </div>
        ))}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading deduction rules…</span>
        </div>
      )}

      {isError && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Failed to load deduction rules.</span>
          <button onClick={() => refetch()} className="ml-auto underline text-xs">Retry</button>
        </div>
      )}

      {!isLoading && !isError && rules.length === 0 && (
        <div className="rounded-lg border border-dashed border-border py-16 text-center">
          <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No deduction rules configured.</p>
          <p className="text-xs text-muted-foreground mt-1">Add rules in Settings → Commission Rules → Deduction Rules.</p>
        </div>
      )}

      {!isLoading && !isError && rules.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          {rules.map(r => (
            <div key={r.id} className={cn(
              "rounded-lg border p-4 space-y-3",
              r.is_active ? "border-border bg-card" : "border-border/50 bg-accent/20 opacity-60"
            )}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-foreground text-sm">{r.name}</p>
                  <span className={cn(
                    "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium mt-1",
                    r.violation_type === "stale_sim" && "bg-amber-500/10 text-amber-500 border-amber-500/20",
                    r.violation_type === "fraud"     && "bg-red-500/10 text-red-400 border-red-500/20",
                    r.violation_type === "damaged"   && "bg-orange-500/10 text-orange-400 border-orange-500/20",
                    r.violation_type === "lost"      && "bg-purple-500/10 text-purple-400 border-purple-500/20",
                    r.violation_type === "manual"    && "bg-blue-500/10 text-blue-400 border-blue-500/20",
                  )}>
                    {VIOLATION_LABELS[r.violation_type] ?? r.violation_type}
                  </span>
                </div>
                <StatusBadge status={r.is_active ? "activated" : "Inactive"} />
              </div>

              <div className="flex items-center justify-between rounded-lg bg-accent/40 px-3 py-2">
                <span className="text-xs text-muted-foreground">Penalty</span>
                <span className="text-sm font-bold text-destructive">
                  − {fmt(r.amount_per_unit)}
                  {r.is_per_day && <span className="text-xs font-normal text-muted-foreground"> / day</span>}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-muted-foreground">
                {r.threshold_days && (
                  <div className="flex justify-between">
                    <span>Threshold</span>
                    <span className="font-medium text-foreground">{r.threshold_days} days</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Settlement</span>
                  <span className="font-medium text-foreground">
                    {r.settlement_mode === "commission_deduction" ? "From commission" : "Standalone"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── BA Record Detail Modal ────────────────────────────────────────────────────

function BARecordDetailModal({
  record,
  cycles,
  onClose,
}: {
  record: CommissionRecord;
  cycles: CommissionCycle[];
  onClose: () => void;
}) {
  const { data: payouts = [], isLoading: payLoading } = usePayoutByRecord(record.id);

  const cycleName = cycles.find(c => c.id === record.cycle)?.name ?? `Cycle #${record.cycle}`;
  const isPaid    = record.status === "paid";
  const payout    = payouts[0] ?? null;

  const METHOD_LABELS: Record<string, string> = {
    mpesa: "M-Pesa", bank: "Bank Transfer", cash: "Cash",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h3 className="font-heading text-base font-semibold">{cycleName}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Commission details</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">

          {/* Summary strip */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Gross",       value: `KES ${Number(record.gross_amount).toLocaleString()}`, color: "text-foreground"  },
              { label: "Deductions",  value: `− KES ${Number(record.deductions).toLocaleString()}`, color: "text-destructive" },
              { label: "Net Payable", value: `KES ${Number(record.net_amount).toLocaleString()}`,   color: isPaid ? "text-green-500" : "text-amber-400" },
            ].map(k => (
              <div key={k.label} className="rounded-lg border border-border bg-accent/20 px-3 py-2.5 text-center">
                <p className="text-xs text-muted-foreground">{k.label}</p>
                <p className={cn("text-sm font-bold mt-0.5", k.color)}>{k.value}</p>
              </div>
            ))}
          </div>

          {/* SIM breakdown */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">SIM Breakdown</p>
            <div className="rounded-lg border border-border bg-accent/20 divide-y divide-border/50">
              {[
                { label: "Claimed by you",           count: record.claimed_sims,          color: "text-foreground"  },
                { label: "Confirmed by Safaricom",   count: record.active_sims,           color: "text-green-500"   },
                { label: "Not in Safaricom report",  count: record.not_in_report_sims,    color: "text-amber-500"   },
                { label: "Not in dealer inventory",  count: record.not_in_inventory_sims, color: "text-orange-400"  },
                { label: "Fraud flagged",            count: record.fraud_sims,            color: "text-destructive" },
                { label: "Rejected (low topup)",     count: record.rejected_sims,         color: "text-destructive" },
                { label: "Disputed",                 count: record.disputed_sims,         color: "text-yellow-500"  },
              ].map(row => (
                <div key={row.label} className={cn("flex justify-between px-4 py-2.5", row.count === 0 && "opacity-40")}>
                  <span className="text-xs text-muted-foreground">{row.label}</span>
                  <span className={cn("text-xs font-semibold", row.color)}>{row.count} SIM{row.count !== 1 ? "s" : ""}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Deduction summary */}
          {Number(record.deductions) > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Deduction Summary</p>
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 divide-y divide-border/50">
                {record.fraud_sims > 0 && (
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-xs text-muted-foreground">Fraud flagged SIMs</span>
                    <span className="text-xs font-semibold text-destructive">{record.fraud_sims} SIMs — not paid</span>
                  </div>
                )}
                {record.rejected_sims > 0 && (
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-xs text-muted-foreground">Rejected (low topup)</span>
                    <span className="text-xs font-semibold text-amber-500">{record.rejected_sims} SIMs — not paid</span>
                  </div>
                )}
                {record.not_in_report_sims > 0 && (
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-xs text-muted-foreground">Not in Safaricom report</span>
                    <span className="text-xs font-semibold text-amber-500">{record.not_in_report_sims} SIMs — not paid</span>
                  </div>
                )}
                <div className="flex justify-between px-4 py-2.5 border-t border-destructive/20">
                  <span className="text-xs font-semibold text-foreground">Total Deducted</span>
                  <span className="text-xs font-bold text-destructive">− KES {Number(record.deductions).toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          {/* Payment info — only if paid */}
          {payLoading && (
            <div className="flex items-center gap-2 text-muted-foreground py-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-xs">Loading payment info…</span>
            </div>
          )}

          {!payLoading && isPaid && payout && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Payment Info</p>
              <div className="rounded-lg border border-green-500/20 bg-green-500/5 divide-y divide-border/50">
                <div className="flex justify-between px-4 py-2.5">
                  <span className="text-xs text-muted-foreground">Method</span>
                  <span className="text-xs font-semibold text-foreground">{METHOD_LABELS[payout.method] ?? payout.method}</span>
                </div>
                {payout.transaction_ref && (
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-xs text-muted-foreground">Transaction Ref</span>
                    <span className="text-xs font-mono font-medium text-foreground">{payout.transaction_ref}</span>
                  </div>
                )}
                <div className="flex justify-between px-4 py-2.5">
                  <span className="text-xs text-muted-foreground">Paid On</span>
                  <span className="text-xs font-medium text-foreground">
                    {new Date(payout.paid_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </div>
                {payout.notes && (
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-xs text-muted-foreground">Notes</span>
                    <span className="text-xs text-foreground">{payout.notes}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {!payLoading && isPaid && !payout && (
            <div className="rounded-lg border border-green-500/20 bg-green-500/5 px-4 py-3">
              <p className="text-xs text-green-500">Payment recorded — reference not available.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border shrink-0">
          <button onClick={onClose}
            className="w-full rounded-md border border-border py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── BA: My Commission View (no tabs — personal card layout) ───────────────────

function BACommissionView({ userId, dealerId }: { userId: number; dealerId: number }) {
  const { data: rawRecords, isLoading, isError } = useCommissionRecords({ agent: userId });
  const records = rawRecords?.results ?? [];
  const { data: rules   = [] } = useCommissionRules(dealerId);
  const { data: cycles  = [] } = useCommissionCycles(dealerId);
  const [detailRecord, setDetailRecord] = useState<CommissionRecord | null>(null);

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin" />
      <p className="text-sm">Loading your commission…</p>
    </div>
  );

  if (isError) return (
    <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
      <AlertCircle className="h-4 w-4 shrink-0" />
      Failed to load commission. Please refresh.
    </div>
  );

  return (
    <div className="space-y-6 max-w-2xl">

      {/* Active rate card */}
      {rules.length > 0 && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Your Commission Rate</p>
            <p className="text-2xl font-bold font-heading text-primary mt-1">
              KES {Number(rules[0].rate_per_active).toLocaleString()}
              <span className="text-sm font-normal text-muted-foreground ml-1">/ active SIM</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Min top-up: KES {Number(rules[0].minimum_topup).toLocaleString()} ·{" "}
              Valid until: {rules[0].effective_to ? fmtDate(rules[0].effective_to) : "Open-ended"}
            </p>
          </div>
          <TrendingUp className="h-8 w-8 text-primary/40 shrink-0" />
        </div>
      )}

      {/* No records yet */}
      {records.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground rounded-xl border border-dashed border-border">
          <BarChart3 className="h-8 w-8 opacity-30" />
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">No commission records yet</p>
            <p className="text-xs mt-1">Records appear here after your manager generates a commission cycle.</p>
          </div>
        </div>
      )}

      {/* Commission record cards */}
      {records.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">My Commission Records</h3>
          {records.map(r => {
            const isPaid     = r.status === "paid";
            const isApproved = r.status === "approved";
            const isPending  = r.status === "pending";
            const cycleName  = cycles.find((c: CommissionCycle) => c.id === r.cycle)?.name ?? `Cycle #${r.cycle}`;

            return (
              <div key={r.id} className={cn(
                "rounded-xl border bg-card overflow-hidden",
                isPaid     && "border-green-500/20",
                isApproved && "border-primary/20",
                isPending  && "border-border",
              )}>
                {/* Card header */}
                <div className={cn(
                  "px-5 py-3 flex items-center justify-between border-b border-border",
                  isPaid     && "bg-green-500/5",
                  isApproved && "bg-primary/5",
                  isPending  && "bg-accent/20",
                )}>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{cycleName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{r.active_sims} SIMs confirmed by Safaricom</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusChip status={r.status} />
                    <button
                      onClick={() => setDetailRecord(r)}
                      className="rounded-md border border-border bg-accent px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors shrink-0">
                      Details
                    </button>
                  </div>
                </div>

                {/* Amounts */}
                <div className="px-5 py-4 grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Gross</p>
                    <p className="text-base font-bold text-foreground mt-0.5">KES {Number(r.gross_amount).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Deductions</p>
                    <p className="text-base font-bold text-destructive mt-0.5">− KES {Number(r.deductions).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Net Payable</p>
                    <p className={cn("text-base font-bold mt-0.5", isPaid ? "text-green-500" : "text-amber-400")}>
                      KES {Number(r.net_amount).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* SIM breakdown strip */}
                <div className="px-5 pb-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-foreground inline-block" />
                    {r.claimed_sims} claimed
                  </span>
                  <span className="flex items-center gap-1 text-green-500">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500 inline-block" />
                    {r.active_sims} confirmed
                  </span>
                  {r.fraud_sims > 0 && (
                    <span className="flex items-center gap-1 text-destructive">
                      <span className="h-1.5 w-1.5 rounded-full bg-destructive inline-block" />
                      {r.fraud_sims} fraud
                    </span>
                  )}
                  {r.rejected_sims > 0 && (
                    <span className="flex items-center gap-1 text-amber-500">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 inline-block" />
                      {r.rejected_sims} rejected
                    </span>
                  )}
                </div>

                {/* Status footer */}
                {isPaid && (
                  <div className="px-5 py-2.5 border-t border-green-500/20 bg-green-500/5 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    <p className="text-xs text-green-500 font-medium">Payment recorded</p>
                  </div>
                )}
                {isPending && (
                  <div className="px-5 py-2.5 border-t border-border bg-accent/10 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                    <p className="text-xs text-muted-foreground">Awaiting approval from your manager</p>
                  </div>
                )}
                {isApproved && (
                  <div className="px-5 py-2.5 border-t border-primary/20 bg-primary/5 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    <p className="text-xs text-primary font-medium">Approved — awaiting payout</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {/* Detail modal */}
      {detailRecord && (
        <BARecordDetailModal
          record={detailRecord}
          cycles={cycles}
          onClose={() => setDetailRecord(null)}
        />
      )}
    </div>
  );
}

// ── Tab config ────────────────────────────────────────────────────────────────

const ALL_TABS = [
  { id: "rules",      label: "Rules",      icon: TrendingUp,  roles: ["dealer_owner", "operations_manager", "finance"] },
  { id: "cycles",     label: "Cycles",     icon: Calendar,    roles: ["dealer_owner", "operations_manager"] },
  { id: "records",    label: "Records",    icon: BarChart3,   roles: ["dealer_owner", "operations_manager", "branch_manager", "van_team_leader", "finance"] },
  { id: "payouts",    label: "Payouts",    icon: CreditCard,  roles: ["dealer_owner", "operations_manager", "finance"] },
  { id: "deductions", label: "Deductions", icon: AlertCircle, roles: ["dealer_owner", "operations_manager", "finance"] },
];

// ─── BA SIM Breakdown Modal ───────────────────────────────────────────────────

const RECON_COLORS: Record<string, string> = {
  payable:       "bg-green-500/10 text-green-500 border-green-500/20",
  rejected:      "bg-red-500/10 text-red-400 border-red-500/20",
  fraud:         "bg-orange-500/10 text-orange-400 border-orange-500/20",
  dispute:       "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  not_in_report: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  ghost_sim:     "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

const SIM_STATUS_COLORS: Record<string, string> = {
  in_stock:      "text-blue-400",
  issued:        "text-amber-500",
  registered:    "text-green-500",
  activated:     "text-emerald-400",
  returned:      "text-purple-400",
  fraud_flagged: "text-destructive",
  lost:          "text-orange-400",
  faulty:        "text-yellow-400",
  replaced:      "text-muted-foreground",
};

function BASimBreakdownModal({
  baId, baName, cycleId, startDate, endDate, onClose,
}: {
  baId: number; baName: string;
  cycleId?: number;
  startDate?: string; endDate?: string;
  onClose: () => void;
}) {
  const [search, setSearch]             = useState("");
  const [filterResult, setFilterResult] = useState("");

  const { data, isLoading, isError } = useBASimBreakdown({
    ba_id:      baId,
    cycle_id:   cycleId,
    start_date: startDate,
    end_date:   endDate,
  });

  const rows = useMemo(() => {
    if (!data?.sims) return [];
    return data.sims.filter(r => {
      const matchSearch = !search       || r.serial_number.includes(search);
      const matchFilter = !filterResult || r.recon_result === filterResult;
      return matchSearch && matchFilter;
    });
  }, [data, search, filterResult]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-5xl rounded-xl border border-border bg-card shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0">
          <div>
            <h3 className="font-heading text-lg font-semibold text-foreground">
              SIM Accountability — {baName}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {data?.cycle_name
                ? `Cycle: ${data.cycle_name}`
                : data?.period ?? "Every SIM issued to this BA cross-referenced with Safaricom's reports"}
            </p>
          </div>
          <button onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* KPI strip */}
        {data && (
          <div className="grid grid-cols-6 gap-0 border-b border-border shrink-0">
            {[
              { label: "Total Issued",       value: data.total_issued,         color: "text-foreground"  },
              { label: "Confirmed ✅",        value: data.confirmed,            color: "text-green-500"   },
              { label: "Missing 🔍",          value: data.not_in_report,        color: "text-amber-500"   },
              { label: "Overdue ⚠️",          value: data.overdue_count,        color: data.overdue_count > 0 ? "text-red-500" : "text-muted-foreground" },
              { label: "Rejected ❌",         value: data.rejected,             color: "text-destructive" },
              { label: "Commission",          value: `KES ${data.total_commission.toLocaleString()}`, color: "text-primary" },
            ].map(({ label, value, color }) => (
              <div key={label} className="px-4 py-3 border-r border-border last:border-r-0 text-center">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className={cn("text-lg font-bold font-heading mt-0.5", color)}>{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Reports used in this period */}
        {data && data.reports_seen.length > 0 && (
          <div className="px-6 py-2 border-b border-border shrink-0 flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Reports in period:</span>
            {data.reports_seen.map((r: { id: number; filename: string; period: string }) => (
              <span key={r.id}
                className="text-xs bg-accent border border-border rounded-full px-2 py-0.5 text-muted-foreground"
                title={r.period}>
                {r.filename}
              </span>
            ))}
            {data.total_reports_in_period === 0 && (
              <span className="text-xs text-amber-500">No Safaricom reports found for this period</span>
            )}
          </div>
        )}

        {/* Missing SIMs alert */}
        {data && data.not_in_report > 0 && (
          <div className="mx-6 mt-3 flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 shrink-0">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-500">
              <span className="font-semibold">{data.not_in_report} SIM(s)</span> issued to {baName} do not appear
              in any Safaricom report for this period. These cannot be paid commission until accounted for.
            </p>
          </div>
        )}

        {/* Overdue alert */}
        {data && data.overdue_count > 0 && (
          <div className="mx-6 mt-2 flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 shrink-0">
            <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-500">
              <span className="font-semibold">{data.overdue_count} SIM(s)</span> have passed through{" "}
              <span className="font-semibold">2 or more</span> Safaricom reports without appearing.
              These require immediate escalation — mark as lost or investigate with Safaricom.
            </p>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-3 px-6 py-3 shrink-0">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search serial…"
              className="w-full rounded-md border border-border bg-accent py-1.5 pl-8 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <select value={filterResult} onChange={e => setFilterResult(e.target.value)}
            className="rounded-md border border-border bg-accent px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
            <option value="">All Results</option>
            <option value="not_in_report">Not in Report</option>
            <option value="payable">Payable</option>
            <option value="rejected">Rejected</option>
            <option value="fraud">Fraud</option>
            <option value="dispute">Disputed</option>
          </select>
          <p className="text-xs text-muted-foreground self-center ml-auto">
            {rows.length} SIM{rows.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {isLoading && (
            <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Loading SIM data…</span>
            </div>
          )}
          {isError && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive mt-4">
              <AlertCircle className="h-4 w-4 shrink-0" />
              Failed to load SIM breakdown.
            </div>
          )}
          {!isLoading && !isError && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-xs">
                  <th className="pb-3 px-2 text-left font-medium">Serial Number</th>
                  <th className="pb-3 px-2 text-left font-medium">Issued At</th>
                  <th className="pb-3 px-2 text-left font-medium">Inventory Status</th>
                  <th className="pb-3 px-2 text-left font-medium">Safaricom Result</th>
                  <th className="pb-3 px-2 text-left font-medium">Confirmed By</th>
                  <th className="pb-3 px-2 text-left font-medium">Reports Seen</th>
                  <th className="pb-3 px-2 text-right font-medium">Commission</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                      No SIMs match your filter.
                    </td>
                  </tr>
                ) : rows.map(row => (
                  <tr key={row.serial_number}
                    className={cn(
                      "border-b border-border/50 transition-colors hover:bg-accent/40",
                      row.overdue         && "border-l-2 border-l-red-500",
                      !row.overdue && row.recon_result === "not_in_report" && "border-l-2 border-l-amber-500",
                    )}>
                    <td className="py-3 px-2">
                      <span className="font-mono text-xs text-primary">{row.serial_number}</span>
                    </td>
                    <td className="py-3 px-2 text-xs text-muted-foreground">
                      {new Date(row.issued_at).toLocaleDateString("en-KE", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </td>
                    <td className="py-3 px-2">
                      <span className={cn("text-xs font-medium capitalize",
                        SIM_STATUS_COLORS[row.current_status] ?? "text-muted-foreground")}>
                        {row.current_status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-1.5">
                        <span className={cn(
                          "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                          RECON_COLORS[row.recon_result] ?? "bg-accent text-muted-foreground border-border"
                        )}>
                          {row.verdict}
                        </span>
                        {row.overdue && (
                          <span className="inline-flex items-center rounded-full border border-red-500/30 bg-red-500/10 px-1.5 py-0.5 text-[10px] font-medium text-red-500">
                            Overdue
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-2 text-xs text-muted-foreground">
                      {row.confirmed_by_report
                        ? <span title={row.confirmed_by_report.period} className="text-xs text-foreground">
                            {row.confirmed_by_report.filename}
                          </span>
                        : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="py-3 px-2 text-xs text-muted-foreground">
                      {row.reports_seen_count} / {row.total_reports_in_period}
                    </td>
                    <td className="py-3 px-2 text-right text-xs">
                      {row.commission_amount > 0
                        ? <span className="text-green-500 font-medium">
                            KES {row.commission_amount.toLocaleString()}
                          </span>
                        : <span className="text-muted-foreground">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Commission Page ──────────────────────────────────────────────────────

export default function Commission() {
  const { user } = useAuth();
  const dealerId = user?.dealer_id ? Number(user.dealer_id) : undefined;
  const role     = user?.role;

  const canManageCycles = role === "dealer_owner" || role === "operations_manager";
  const canApprove      = role === "dealer_owner" || role === "finance";
  const canViewSIMDetail = role === "dealer_owner" || role === "finance" || role === "operations_manager";

  // Filter tabs to only those the current role can see
  const tabs = ALL_TABS.filter(t => t.roles.includes(role ?? ""));

  // Default to "records" for van/branch since that's their only tab
  const defaultTab = (role === "van_team_leader" || role === "branch_manager") ? "records" : (tabs[0]?.id ?? "rules");
  const [activeTab, setActiveTab] = useState(defaultTab);

  if (!dealerId) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No dealer context found.</p>
        </div>
      </div>
    );
  }

  // ── BA gets a completely separate personal view, no tabs ──
  if (role === "brand_ambassador") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-bold">My Commission</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Your earnings, payment status, and commission rate
          </p>
        </div>
        <BACommissionView
          userId={user?.id ? Number(user.id) : 0}
          dealerId={dealerId}
        />
      </div>
    );
  }

  // ── All other roles: tabbed view ──
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Commissions</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage commission cycles, records, and payouts
        </p>
      </div>

      {/* Tabs — only render if more than one tab is visible */}
      {tabs.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-accent text-muted-foreground hover:text-foreground"
              )}>
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-border bg-card p-6">
        {activeTab === "rules"      && <RulesTab      dealerId={dealerId} />}
        {activeTab === "cycles"     && <CyclesTab dealerId={dealerId} canManage={canManageCycles} onGenerated={() => setActiveTab("records")} />}
        {activeTab === "records"    && (
          <RecordsTab
            dealerId={dealerId}
            canApprove={canApprove}
            canViewSIMDetail={canViewSIMDetail}
            scopeRole={role}
            scopeBranchId={user?.branch_id ? Number(user.branch_id) : undefined}
            scopeVanId={user?.van_team_id  ? Number(user.van_team_id)  : undefined}
          />
        )}
        {activeTab === "payouts"    && <PayoutsTab />}
        {activeTab === "deductions" && <DeductionsTab dealerId={dealerId} />}
      </div>
    </div>
  );
}