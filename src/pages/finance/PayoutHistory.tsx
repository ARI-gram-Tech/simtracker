// src/pages/finance/PayoutHistory.tsx
import { useState, useMemo } from "react";
import {
  History, Search, DollarSign,
  Loader2, AlertCircle, Calendar, CreditCard, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { usePayouts, useCommissionCycles } from "@/hooks/useCommissions";
import type { PayoutRecord } from "@/types/commissions.types";

function fmt(n: number | string | undefined) {
  return Number(n ?? 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d: string | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" });
}

const METHOD_LABELS: Record<string, string> = {
  mpesa:  "M-Pesa",
  bank:   "Bank Transfer",
  cash:   "Cash",
  cheque: "Cheque",
};

// ── Detail Modal ──────────────────────────────────────────────────────────────
function DetailModal({ payout, onClose }: { payout: PayoutRecord; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl border border-border bg-card shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Payout Detail</h3>
              <p className="text-xs text-muted-foreground">Record #{payout.id}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 hover:bg-accent transition-colors text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="rounded-lg border border-border bg-accent/30 px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Amount Paid</span>
          <span className="text-xl font-bold text-emerald-400">KES {fmt(payout.amount)}</span>
        </div>

        <div className="space-y-3 text-sm">
          {([
            ["Agent",     payout.agent_name ?? `Record #${payout.commission_record}`],
            ["Method",    METHOD_LABELS[payout.payment_method ?? ""] ?? payout.payment_method ?? "—"],
            ["Reference", payout.reference  ?? "—"],
            ["Paid On",   fmtDate(payout.paid_at)],
            ["Paid By",   payout.paid_by_name ?? "—"],
            ["Notes",     payout.notes ?? "—"],
          ] as [string, string][]).map(([label, value]) => (
            <div key={label} className="flex items-start justify-between gap-4">
              <span className="text-muted-foreground shrink-0">{label}</span>
              <span className="text-foreground font-medium text-right">{value}</span>
            </div>
          ))}
        </div>

        <button onClick={onClose}
          className="w-full rounded-md border border-border py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors">
          Close
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PayoutHistory() {
  const { user } = useAuth();
  const dealerId = user?.dealer_id ? Number(user.dealer_id) : undefined;

  const [search, setSearch]             = useState("");
  const [methodFilter, setMethodFilter] = useState("all");
  const [detailPayout, setDetailPayout] = useState<PayoutRecord | null>(null);

  const { data: cyclesData } = useCommissionCycles(dealerId);
  const cycles = useMemo(() => cyclesData ?? [], [cyclesData]);

  const { data: payoutsData, isLoading, isError, refetch } = usePayouts();
  const payouts = useMemo(() => payoutsData ?? [], [payoutsData]);

  const filtered = useMemo(() => payouts.filter(p => {
    const matchSearch  = !search || (p.agent_name ?? "").toLowerCase().includes(search.toLowerCase())
      || (p.reference ?? "").toLowerCase().includes(search.toLowerCase());
    const matchMethod  = methodFilter === "all" || p.payment_method === methodFilter;
    return matchSearch && matchMethod;
  }), [payouts, search, methodFilter]);

  const totalPaid  = payouts.reduce((s, p) => s + Number(p.amount ?? 0), 0);
  const mpesaCount = payouts.filter(p => p.payment_method === "mpesa").length;
  const latestDate = payouts.length ? fmtDate(payouts[0]?.paid_at) : "—";

  // suppress unused warning — cycles available for future cycle filter
  void cycles;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Payout History</h1>
        <p className="text-sm text-muted-foreground mt-0.5">All recorded payments to Brand Ambassadors</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Payouts",    value: payouts.length,           color: "text-foreground",      icon: History    },
          { label: "Total Disbursed",  value: `KES ${fmt(totalPaid)}`,  color: "text-emerald-400",     icon: DollarSign },
          { label: "M-Pesa Transfers", value: mpesaCount,               color: "text-blue-400",        icon: CreditCard },
          { label: "Latest Payment",   value: latestDate,               color: "text-muted-foreground",icon: Calendar   },
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
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search agent or reference…"
            className="w-full pl-9 pr-4 py-2 text-sm bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(["all", "mpesa", "bank", "cash", "cheque"] as const).map(m => (
            <button key={m} onClick={() => setMethodFilter(m)}
              className={cn("px-3 py-2 text-xs font-medium rounded-lg capitalize transition-colors",
                methodFilter === m ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground")}>
              {m === "all" ? "All" : METHOD_LABELS[m] ?? m}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /><span className="text-sm">Loading payouts…</span>
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
                <th className="p-4 text-right font-medium">Amount Paid</th>
                <th className="p-4 text-left font-medium">Method</th>
                <th className="p-4 text-left font-medium">Reference</th>
                <th className="p-4 text-left font-medium">Paid On</th>
                <th className="p-4 text-left font-medium">Paid By</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-sm text-muted-foreground">No payout records found.</td></tr>
              ) : filtered.map(p => (
                <tr key={p.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                        {(p.agent_name ?? "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                      </div>
                      <span className="font-medium text-foreground">{p.agent_name ?? `Record #${p.commission_record}`}</span>
                    </div>
                  </td>
                  <td className="p-4 text-right font-bold text-emerald-400">KES {fmt(p.amount)}</td>
                  <td className="p-4">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-400/10 px-2.5 py-1 text-xs font-medium text-blue-400">
                      <CreditCard className="h-3 w-3" />
                      {METHOD_LABELS[p.payment_method ?? ""] ?? p.payment_method ?? "—"}
                    </span>
                  </td>
                  <td className="p-4 text-muted-foreground font-mono text-xs">{p.reference ?? "—"}</td>
                  <td className="p-4 text-muted-foreground">{fmtDate(p.paid_at)}</td>
                  <td className="p-4 text-muted-foreground">{p.paid_by_name ?? "—"}</td>
                  <td className="p-4">
                    <button onClick={() => setDetailPayout(p)}
                      className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent/80 transition-colors">
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-3 border-t border-border">
            <p className="text-xs text-muted-foreground">{filtered.length} of {payouts.length} payouts</p>
          </div>
        </div>
      )}

      {detailPayout && <DetailModal payout={detailPayout} onClose={() => setDetailPayout(null)} />}
    </div>
  );
}