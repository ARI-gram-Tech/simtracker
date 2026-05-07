// src/pages/finance/ApprovePayouts.tsx
import { useState, useMemo } from "react";
import {
  CheckCircle2, XCircle, Clock, Search, Loader2,
  AlertCircle, BarChart2, AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import {
  useCommissionRecords,
  useCommissionCycles,
  useApproveCommissionRecord,
  useRejectCommissionRecord,
} from "@/hooks/useCommissions";
import { showSuccess, showError } from "@/lib/toast";

function fmt(n: number | string | undefined) {
  return Number(n ?? 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Approve / Reject Modal ────────────────────────────────────────────────────
function ActionModal({
  record,
  action,
  onClose,
  onDone,
}: {
  record: { id: number; agent_name: string; net_amount: string | number };
  action: "approve" | "reject";
  onClose: () => void;
  onDone: () => void;
}) {
  const approveCommission = useApproveCommissionRecord();
  const rejectCommission  = useRejectCommissionRecord();
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const isApprove = action === "approve";

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (isApprove) {
        await approveCommission.mutateAsync({ id: record.id, data: { notes: notes.trim() } });
        showSuccess(`Commission approved for ${record.agent_name}`);
      } else {
        await rejectCommission.mutateAsync({ id: record.id, data: { notes: notes.trim() } });
        showSuccess(`Commission rejected for ${record.agent_name}`);
      }
      onDone();
      onClose();
    } catch {
      showError(`Failed to ${action} commission.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl border border-border bg-card shadow-2xl p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className={cn("h-10 w-10 rounded-full flex items-center justify-center",
            isApprove ? "bg-blue-500/10" : "bg-red-500/10")}>
            {isApprove
              ? <CheckCircle2 className="h-5 w-5 text-blue-400" />
              : <XCircle className="h-5 w-5 text-red-400" />}
          </div>
          <div>
            <h3 className="font-semibold text-foreground capitalize">{action} Commission</h3>
            <p className="text-xs text-muted-foreground">{record.agent_name}</p>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-accent/30 px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Net Payable</span>
          <span className={cn("text-xl font-bold", isApprove ? "text-blue-400" : "text-red-400")}>
            KES {fmt(record.net_amount)}
          </span>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Notes {isApprove ? "(optional)" : "(required for rejection)"}
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder={isApprove ? "Add approval notes…" : "Reason for rejection…"}
            className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-md border border-border py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || (!isApprove && !notes.trim())}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 rounded-md py-2 text-sm font-semibold text-white disabled:opacity-50 transition-colors",
              isApprove ? "bg-blue-500 hover:bg-blue-600" : "bg-red-500 hover:bg-red-600"
            )}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Processing…" : isApprove ? "Approve" : "Reject"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ApprovePayouts() {
  const { user } = useAuth();
  const dealerId = user?.dealer_id ? Number(user.dealer_id) : undefined;

  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<{
    record: { id: number; agent_name: string; net_amount: string | number };
    action: "approve" | "reject";
  } | null>(null);

  const { data: cyclesData } = useCommissionCycles(dealerId);
  const cycles = useMemo(() => cyclesData ?? [], [cyclesData]);
  const currentCycle =
    cycles.find(c => c.status === "open") ??
    cycles.find(c => c.status === "approved") ??
    cycles[0];

  const { data: recordsData, isLoading, isError, refetch } = useCommissionRecords(
    currentCycle ? { cycle: currentCycle.id, status: "pending" } : undefined
  );
  const records = useMemo(() => recordsData ?? [], [recordsData]);

  const filtered = useMemo(() =>
    records.filter(r =>
      !search || r.agent_name?.toLowerCase().includes(search.toLowerCase())
    ), [records, search]);

  const totalPending    = records.reduce((s, r) => s + Number(r.net_amount), 0);
  const totalActiveSims = records.reduce((s, r) => s + Number(r.active_sims ?? 0), 0);
  const flagged         = records.filter(r => Number(r.fraud_sims ?? 0) > 0 || Number(r.disputed_sims ?? 0) > 0).length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Approve Payouts</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {currentCycle ? `Cycle: ${currentCycle.name}` : "No active cycle"} — pending approval
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Pending Records",   value: records.length,            color: "text-amber-400",  icon: Clock         },
          { label: "Total Active SIMs", value: totalActiveSims,           color: "text-foreground", icon: BarChart2     },
          { label: "Total to Approve",  value: `KES ${fmt(totalPending)}`,color: "text-blue-400",   icon: CheckCircle2  },
          { label: "Flagged Records",   value: flagged,                   color: "text-red-400",    icon: AlertTriangle },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <div className={cn("p-2 rounded-lg bg-muted", color)}>
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={cn("text-lg font-bold", color)}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search agent…"
          className="w-full pl-9 pr-4 py-2 text-sm bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /><span className="text-sm">Loading records…</span>
        </div>
      )}
      {isError && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" /><span>Failed to load.</span>
          <button onClick={() => refetch()} className="ml-auto underline text-xs">Retry</button>
        </div>
      )}

      {!isLoading && !isError && (
        <div className="rounded-xl border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground text-xs">
                <th className="p-4 text-left font-medium">Agent</th>
                <th className="p-4 text-right font-medium">Active SIMs</th>
                <th className="p-4 text-right font-medium">Fraud / Disputed</th>
                <th className="p-4 text-right font-medium">Gross</th>
                <th className="p-4 text-right font-medium">Deductions</th>
                <th className="p-4 text-right font-medium">Net Payable</th>
                <th className="p-4 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-sm text-muted-foreground">No pending records.</td></tr>
              ) : filtered.map(r => {
                const hasFraud = Number(r.fraud_sims ?? 0) > 0 || Number(r.disputed_sims ?? 0) > 0;
                return (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                          {(r.agent_name ?? "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                        </div>
                        <span className="font-medium text-foreground">{r.agent_name ?? `Agent #${r.agent}`}</span>
                      </div>
                    </td>
                    <td className="p-4 text-right font-medium">{r.active_sims}</td>
                    <td className="p-4 text-right">
                      {hasFraud ? (
                        <span className="inline-flex items-center gap-1 text-red-400 text-xs font-medium">
                          <AlertTriangle className="h-3 w-3" />
                          {Number(r.fraud_sims ?? 0)} / {Number(r.disputed_sims ?? 0)}
                        </span>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="p-4 text-right">KES {fmt(r.gross_amount)}</td>
                    <td className="p-4 text-right text-red-400">
                      {Number(r.deductions ?? 0) > 0 ? `-KES ${fmt(r.deductions)}` : "—"}
                    </td>
                    <td className="p-4 text-right font-bold text-blue-400">KES {fmt(r.net_amount)}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setModal({ record: { id: r.id, agent_name: r.agent_name ?? `Agent #${r.agent}`, net_amount: r.net_amount }, action: "approve" })}
                          className="flex items-center gap-1.5 rounded-md bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 text-xs font-semibold text-blue-400 hover:bg-blue-500/20 transition-colors">
                          <CheckCircle2 className="h-3.5 w-3.5" />Approve
                        </button>
                        <button
                          onClick={() => setModal({ record: { id: r.id, agent_name: r.agent_name ?? `Agent #${r.agent}`, net_amount: r.net_amount }, action: "reject" })}
                          className="flex items-center gap-1.5 rounded-md bg-red-500/10 border border-red-500/20 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition-colors">
                          <XCircle className="h-3.5 w-3.5" />Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="px-4 py-3 border-t border-border">
            <p className="text-xs text-muted-foreground">{filtered.length} of {records.length} records</p>
          </div>
        </div>
      )}

      {modal && (
        <ActionModal record={modal.record} action={modal.action} onClose={() => setModal(null)} onDone={() => refetch()} />
      )}
    </div>
  );
}