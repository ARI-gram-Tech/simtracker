// src/pages/finance/BAPayments.tsx
import { useState, useMemo } from "react";
import {
  DollarSign, Search, CheckCircle2, Clock, XCircle,
  Loader2, AlertCircle, CreditCard, User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import {
  useCommissionRecords,
  useCommissionCycles,
  useCreatePayout,
} from "@/hooks/useCommissions";
import { showSuccess, showError } from "@/lib/toast";
import type { PayoutMethod } from "@/types/commissions.types";

function fmt(n: number | string | undefined) {
  return Number(n ?? 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const STATUS_CFG = {
  pending:  { label: "Pending",  color: "text-amber-400",   bg: "bg-amber-400/10",   icon: Clock         },
  approved: { label: "Approved", color: "text-blue-400",    bg: "bg-blue-400/10",    icon: CheckCircle2  },
  paid:     { label: "Paid",     color: "text-emerald-400", bg: "bg-emerald-400/10", icon: CheckCircle2  },
  rejected: { label: "Rejected", color: "text-red-400",     bg: "bg-red-400/10",     icon: XCircle       },
} as const;

type StatusKey = keyof typeof STATUS_CFG;

// ── Pay Modal ─────────────────────────────────────────────────────────────────
function PayModal({
  record,
  onClose,
  onPaid,
}: {
  record: { id: number; agent_name: string; net_amount: string | number };
  onClose: () => void;
  onPaid: () => void;
}) {
  const createPayout = useCreatePayout();
  const [method, setMethod] = useState("mpesa");
  const [ref, setRef]       = useState("");
  const [notes, setNotes]   = useState("");
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    setLoading(true);
    try {
        await createPayout.mutateAsync({
        commission_record: record.id,
        method: method as PayoutMethod,  
        transaction_ref: ref.trim(),     
        amount: Number(record.net_amount), 
        notes: notes.trim(),
        });
      showSuccess(`Payment recorded for ${record.agent_name}`);
      onPaid();
      onClose();
    } catch {
      showError("Failed to record payment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl border border-border bg-card shadow-2xl p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <CreditCard className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Record Payment</h3>
            <p className="text-xs text-muted-foreground">{record.agent_name}</p>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-accent/30 px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Amount to Pay</span>
          <span className="text-xl font-bold text-emerald-400">KES {fmt(record.net_amount)}</span>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Payment Method</label>
            <select value={method} onChange={e => setMethod(e.target.value)}
              className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
              <option value="mpesa">M-Pesa</option>
              <option value="bank">Bank Transfer</option>
              <option value="cash">Cash</option>
              <option value="cheque">Cheque</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Reference / Transaction ID</label>
            <input value={ref} onChange={e => setRef(e.target.value)} placeholder="e.g. QK12345678"
              className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Notes (optional)</label>
            <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
              className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button onClick={onClose} disabled={loading}
            className="flex-1 rounded-md border border-border py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button onClick={handlePay} disabled={loading || !ref.trim()}
            className="flex-1 flex items-center justify-center gap-2 rounded-md bg-emerald-500 py-2 text-sm font-semibold text-white disabled:opacity-50 hover:bg-emerald-600 transition-colors">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Processing…" : "Mark as Paid"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function BAPayments() {
  const { user } = useAuth();
  const dealerId = user?.dealer_id ? Number(user.dealer_id) : undefined;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | StatusKey>("all");
  const [payRecord, setPayRecord] = useState<{ id: number; agent_name: string; net_amount: string | number } | null>(null);

  const { data: cyclesData } = useCommissionCycles(dealerId);
  const cycles = useMemo(() => cyclesData ?? [], [cyclesData]);
  const currentCycle = cycles.find(c => c.status === "open") ?? cycles.find(c => c.status === "approved") ?? cycles[0];

  const { data: recordsData, isLoading, isError, refetch } = useCommissionRecords(
    currentCycle ? { cycle: currentCycle.id } : undefined
  );
  // ← wrapped in useMemo to stabilise the reference (fixes exhaustive-deps warning)
  const records = useMemo(() => recordsData ?? [], [recordsData]);

  const filtered = useMemo(() =>
    records.filter(r => {
      const matchSearch = !search || r.agent_name?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || r.status === statusFilter;
      return matchSearch && matchStatus;
    }),
  [records, search, statusFilter]);

  const totalPending = records.filter(r => r.status === "approved").reduce((s, r) => s + Number(r.net_amount), 0);
  const totalPaid    = records.filter(r => r.status === "paid").reduce((s, r) => s + Number(r.net_amount), 0);
  const pendingCount = records.filter(r => r.status === "approved").length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">BA Payments</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {currentCycle ? `Cycle: ${currentCycle.name}` : "No active cycle"}
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total BAs",       value: records.length,              color: "text-foreground",   icon: User         },
          { label: "Ready to Pay",    value: pendingCount,                color: "text-blue-400",     icon: CheckCircle2 },
          { label: "Pending Payout",  value: `KES ${fmt(totalPending)}`,  color: "text-amber-400",    icon: Clock        },
          { label: "Paid This Cycle", value: `KES ${fmt(totalPaid)}`,     color: "text-emerald-400",  icon: DollarSign   },
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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search agent…"
            className="w-full pl-9 pr-4 py-2 text-sm bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(["all", "pending", "approved", "paid", "rejected"] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={cn("px-3 py-2 text-xs font-medium rounded-lg capitalize transition-colors",
                statusFilter === s ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground")}>
              {s === "all" ? "All" : STATUS_CFG[s as StatusKey]?.label ?? s}
            </button>
          ))}
        </div>
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
                <th className="p-4 text-right font-medium">Rate</th>
                <th className="p-4 text-right font-medium">Gross</th>
                <th className="p-4 text-right font-medium">Net Payable</th>
                <th className="p-4 text-left font-medium">Status</th>
                <th className="p-4 text-left font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-sm text-muted-foreground">No records found.</td></tr>
              ) : filtered.map(r => {
                const cfg  = STATUS_CFG[r.status as StatusKey] ?? STATUS_CFG.pending;
                const Icon = cfg.icon;
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
                    <td className="p-4 text-right text-muted-foreground">KES {fmt(r.rate_per_sim)}</td>
                    <td className="p-4 text-right">KES {fmt(r.gross_amount)}</td>
                    <td className="p-4 text-right font-bold text-emerald-400">KES {fmt(r.net_amount)}</td>
                    <td className="p-4">
                      <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", cfg.bg, cfg.color)}>
                        <Icon className="h-3 w-3" />{cfg.label}
                      </span>
                    </td>
                    <td className="p-4">
                      {r.status === "approved" && (
                        <button
                          onClick={() => setPayRecord({ id: r.id, agent_name: r.agent_name ?? `Agent #${r.agent}`, net_amount: r.net_amount })}
                          className="flex items-center gap-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-colors">
                          <DollarSign className="h-3.5 w-3.5" />Pay
                        </button>
                      )}
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

      {payRecord && (
        <PayModal record={payRecord} onClose={() => setPayRecord(null)} onPaid={() => refetch()} />
      )}
    </div>
  );
}