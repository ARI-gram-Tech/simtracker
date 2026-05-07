// src/pages/finance/Dashboard.tsx
import { useState, useMemo } from "react";
import { DollarSign, CheckCircle, Clock, AlertTriangle, X } from "lucide-react";
import { KpiCard } from "@/components/KpiCard";
import { cn } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import {
  useCommissionCycles, useCommissionRecords,
  useApproveCommissionRecord, useCreatePayout,
  usePayoutByRecord,
} from "@/hooks/useCommissions";
import { usePayouts } from "@/hooks/useCommissions";
import type { CommissionRecord, PayoutRecord } from "@/types/commissions.types";

// ── Status styling ────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  pending:  "bg-warning/20 text-warning",
  approved: "bg-blue-500/20 text-blue-400",
  paid:     "bg-success/20 text-success",
  rejected: "bg-destructive/20 text-destructive",
};

const ACTION_LABELS: Record<string, string> = {
  pending:  "Approve",
  approved: "Pay",
  paid:     "Receipt",
  rejected: "Review",
};

function fmtKES(n: number) {
  return `KES ${n.toLocaleString()}`;
}

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

// ── Drawer component ──────────────────────────────────────────────────────────

function RecordDrawer({
  record,
  onClose,
  onApprove,
  onPay,
}: {
  record: CommissionRecord;
  onClose: () => void;
  onApprove: (id: number) => void;
  onPay: (id: number) => void;
}) {
  const { data: payoutsRaw } = usePayoutByRecord(record.id);
  const payouts = (Array.isArray(payoutsRaw) ? payoutsRaw : []) as PayoutRecord[];

  const gross    = parseFloat(record.gross_amount  ?? "0");
  const net      = parseFloat(record.net_amount    ?? "0");
  const deduct   = parseFloat(record.deductions    ?? "0");
  const rate     = parseFloat(record.rate_per_sim  ?? "0");

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-background/50 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-md border-l border-border bg-card shadow-xl overflow-y-auto">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="font-heading text-lg font-semibold text-foreground">Payment Details</h2>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Agent header */}
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center text-lg font-bold text-primary">
              {initials(record.agent_name)}
            </div>
            <div>
              <p className="text-foreground font-semibold">{record.agent_name}</p>
              <p className="text-sm text-muted-foreground capitalize">{record.status}</p>
            </div>
          </div>

          {/* Breakdown */}
          <div className="rounded-md bg-accent p-4 space-y-2">
            <h4 className="text-sm font-medium text-foreground">This Cycle Breakdown</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">Claimed SIMs</span>
              <span className="text-foreground text-right">{record.claimed_sims}</span>

              <span className="text-muted-foreground">Active SIMs</span>
              <span className="text-success text-right">{record.active_sims}</span>

              <span className="text-muted-foreground">Fraud Flagged</span>
              <span className="text-destructive text-right">{record.fraud_sims}</span>

              <span className="text-muted-foreground">Rejected</span>
              <span className="text-warning text-right">{record.rejected_sims}</span>

              <span className="text-muted-foreground">Disputed</span>
              <span className="text-warning text-right">{record.disputed_sims}</span>

              <span className="text-muted-foreground">Rate / SIM</span>
              <span className="text-foreground text-right">{fmtKES(rate)}</span>

              <span className="text-muted-foreground">Gross</span>
              <span className="text-foreground text-right">{fmtKES(gross)}</span>

              {deduct > 0 && (
                <>
                  <span className="text-muted-foreground">Deductions</span>
                  <span className="text-destructive text-right">− {fmtKES(deduct)}</span>
                </>
              )}

              <span className="text-muted-foreground font-medium border-t border-border pt-2">Net Payable</span>
              <span className="text-success font-bold text-right border-t border-border pt-2">{fmtKES(net)}</span>
            </div>
          </div>

          {/* Payment history */}
          <div className="rounded-md bg-accent p-4 space-y-2">
            <h4 className="text-sm font-medium text-foreground">Payment History</h4>
            {payouts.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No payouts yet for this record.</p>
            ) : (
              payouts.map(p => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {new Date(p.paid_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
                    {" — "}{p.method.toUpperCase()}
                  </span>
                  <span className="text-success font-medium">{fmtKES(parseFloat(p.amount))}</span>
                </div>
              ))
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            {record.status === "pending" && (
              <button
                onClick={() => onApprove(record.id)}
                className="flex-1 rounded-md bg-success py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
              >
                Approve
              </button>
            )}
            {record.status === "approved" && (
              <button
                onClick={() => onPay(record.id)}
                className="flex-1 rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
              >
                Mark Paid
              </button>
            )}
            {record.status === "paid" && (
              <div className="flex-1 rounded-md bg-success/20 text-success py-2.5 text-sm font-semibold text-center">
                ✓ Paid
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FinanceDashboard() {
  const { user } = useAuth();
  const dealerId = user?.dealer_id ? Number(user.dealer_id) : undefined;

  const [drawerRecord, setDrawerRecord] = useState<CommissionRecord | null>(null);
  const [selected,     setSelected]     = useState<Set<number>>(new Set());

  // ── Data fetching ─────────────────────────────────────────────────────────
  const { data: cyclesRaw, isLoading: cyclesLoading } = useCommissionCycles(dealerId);
  const { data: payoutsRaw,  isLoading: payoutsLoading } = usePayouts();

  const cycles  = useMemo(() => (Array.isArray(cyclesRaw)  ? cyclesRaw  : []), [cyclesRaw]);
  const payouts = useMemo(() => (Array.isArray(payoutsRaw) ? payoutsRaw : []) as PayoutRecord[], [payoutsRaw]);

  // Current open cycle (most recent open/closed/approved — not yet paid)
  const currentCycle = useMemo(() =>
    cycles.find(c => c.status === "open") ??
    cycles.find(c => c.status === "approved") ??
    cycles.find(c => c.status === "closed") ??
    cycles[0],
    [cycles]
  );

  const { data: recordsRaw, isLoading: recordsLoading } = useCommissionRecords(
    currentCycle ? { cycle: currentCycle.id } : undefined
  );

  const records = useMemo<CommissionRecord[]>(
    () => (Array.isArray(recordsRaw) ? recordsRaw : []),
    [recordsRaw]
  );

  const approveRecord = useApproveCommissionRecord();
  const createPayout  = useCreatePayout();

  // ── KPI derivations ───────────────────────────────────────────────────────
  const totalPayable = useMemo(
    () => records.reduce((s, r) => s + parseFloat(r.net_amount ?? "0"), 0),
    [records]
  );
  const alreadyPaid = useMemo(
    () => records
      .filter(r => r.status === "paid")
      .reduce((s, r) => s + parseFloat(r.net_amount ?? "0"), 0),
    [records]
  );
  const pendingAmount = useMemo(
    () => records
      .filter(r => r.status === "pending" || r.status === "approved")
      .reduce((s, r) => s + parseFloat(r.net_amount ?? "0"), 0),
    [records]
  );
  const disputedCount = useMemo(
    () => records.filter(r => r.disputed_sims > 0).length,
    [records]
  );
  const paidCount    = useMemo(() => records.filter(r => r.status === "paid").length,    [records]);
  const pendingCount = useMemo(() => records.filter(r => r.status !== "paid").length,    [records]);

  // ── Monthly payouts chart — group by month ────────────────────────────────
  const chartData = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of payouts) {
      const month = new Date(p.paid_at).toLocaleDateString("en-KE", { month: "short", year: "2-digit" });
      map.set(month, (map.get(month) ?? 0) + parseFloat(p.amount ?? "0"));
    }
    return [...map.entries()]
      .map(([month, amount]) => ({ month, amount }))
      .slice(-6);
  }, [payouts]);

  // ── Selection helpers ─────────────────────────────────────────────────────
  const toggleSelect = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === records.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(records.map(r => r.id)));
    }
  };

  // ── Action handlers ───────────────────────────────────────────────────────
  const handleApprove = (id: number) => {
    approveRecord.mutate({ id });
  };

  const handlePay = (id: number) => {
    const record = records.find(r => r.id === id);
    if (!record) return;
    createPayout.mutate({
      commission_record: id,
      method:            "mpesa",
      amount:            parseFloat(record.net_amount ?? "0"),
    });
  };

  const handleApproveSelected = () => {
    records
      .filter(r => selected.has(r.id) && r.status === "pending")
      .forEach(r => approveRecord.mutate({ id: r.id }));
  };

  const handlePaySelected = () => {
    records
      .filter(r => selected.has(r.id) && r.status === "approved")
      .forEach(r => handlePay(r.id));
  };

  const isLoading = cyclesLoading || recordsLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Commission Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {currentCycle
            ? `Payout summary — ${currentCycle.name}`
            : cyclesLoading ? "Loading cycle…" : "No active cycle"}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          icon={DollarSign} iconColor="text-success"
          value={isLoading ? "—" : fmtKES(totalPayable)}
          label="Total Payable"
          sub={`${records.length} BAs this cycle`}
        />
        <KpiCard
          icon={CheckCircle} iconColor="text-primary"
          value={isLoading ? "—" : fmtKES(alreadyPaid)}
          label="Already Paid"
          sub={`${paidCount} BA${paidCount !== 1 ? "s" : ""} paid`}
        />
        <KpiCard
          icon={Clock} iconColor="text-warning"
          value={isLoading ? "—" : fmtKES(pendingAmount)}
          label="Pending Payment"
          sub={`${pendingCount} BA${pendingCount !== 1 ? "s" : ""} awaiting payment`}
        />
        <KpiCard
          icon={AlertTriangle} iconColor="text-destructive"
          value={isLoading ? "—" : String(disputedCount)}
          label="Disputed Claims"
          sub="Requires review"
        />
      </div>

      {/* Monthly Payouts Chart */}
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="font-heading text-lg font-semibold text-foreground mb-4">
          Monthly Payouts — Last 6 Months
        </h3>
        {payoutsLoading ? (
          <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">Loading…</div>
        ) : chartData.length === 0 ? (
          <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm italic">No payout data yet.</div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 40%, 22%)" />
              <XAxis dataKey="month" tick={{ fill: "hsl(215, 17%, 47%)", fontSize: 12 }} />
              <YAxis
                tickFormatter={v => `KES ${(v / 1000).toFixed(0)}k`}
                tick={{ fill: "hsl(215, 17%, 47%)", fontSize: 12 }}
              />
              <Tooltip
                formatter={(v: number) => [fmtKES(v), "Payout"]}
                contentStyle={{ backgroundColor: "hsl(222, 45%, 10%)", border: "1px solid hsl(222, 40%, 22%)", borderRadius: 8, color: "hsl(214, 32%, 91%)" }}
              />
              <Bar dataKey="amount" fill="hsl(160, 60%, 45%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Commission Table */}
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-heading text-lg font-semibold text-foreground">BA Commission This Cycle</h3>
            <p className="text-sm text-muted-foreground">
              {currentCycle
                ? `${new Date(currentCycle.start_date).toLocaleDateString("en-KE", { day: "numeric", month: "short" })} — ${new Date(currentCycle.end_date).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}`
                : "—"}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleApproveSelected}
              disabled={selected.size === 0}
              className="btn-press rounded-md bg-success/20 text-success px-3 py-1.5 text-xs font-medium hover:bg-success/30 disabled:opacity-40"
            >
              Approve Selected
            </button>
            <button
              onClick={handlePaySelected}
              disabled={selected.size === 0}
              className="btn-press rounded-md bg-primary/20 text-primary px-3 py-1.5 text-xs font-medium hover:bg-primary/30 disabled:opacity-40"
            >
              Mark as Paid
            </button>
          </div>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-8">Loading records…</p>
        ) : records.length === 0 ? (
          <p className="text-sm text-muted-foreground italic text-center py-8">No commission records for this cycle.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="pb-3 text-left font-medium">
                    <input
                      type="checkbox"
                      onChange={toggleAll}
                      checked={selected.size === records.length && records.length > 0}
                      className="rounded border-border"
                    />
                  </th>
                  <th className="pb-3 text-left font-medium">BA Name</th>
                  <th className="pb-3 text-right font-medium">Active SIMs</th>
                  <th className="pb-3 text-right font-medium">Rate</th>
                  <th className="pb-3 text-right font-medium">Net Commission</th>
                  <th className="pb-3 text-left font-medium">Status</th>
                  <th className="pb-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {records.map(r => (
                  <tr
                    key={r.id}
                    onClick={() => setDrawerRecord(r)}
                    className="border-b border-border/50 hover:bg-accent/50 transition-colors cursor-pointer"
                  >
                    <td className="py-3" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(r.id)}
                        onChange={() => toggleSelect(r.id)}
                        className="rounded border-border"
                      />
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
                          {initials(r.agent_name)}
                        </div>
                        <span className="text-foreground font-medium">{r.agent_name}</span>
                      </div>
                    </td>
                    <td className="py-3 text-right text-foreground">{r.active_sims}</td>
                    <td className="py-3 text-right text-muted-foreground">
                      {fmtKES(parseFloat(r.rate_per_sim ?? "0"))}
                    </td>
                    <td className="py-3 text-right text-success font-medium">
                      {fmtKES(parseFloat(r.net_amount ?? "0"))}
                    </td>
                    <td className="py-3">
                      <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium capitalize", STATUS_COLORS[r.status] ?? "bg-muted/40 text-muted-foreground")}>
                        {r.status}{r.status === "paid" && " ✓"}
                      </span>
                    </td>
                    <td className="py-3 text-right" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => {
                          if (r.status === "pending") handleApprove(r.id);
                          else if (r.status === "approved") handlePay(r.id);
                          else setDrawerRecord(r);
                        }}
                        className="btn-press rounded-md bg-primary/20 text-primary px-3 py-1 text-xs font-medium hover:bg-primary/30"
                      >
                        {ACTION_LABELS[r.status] ?? "View"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Drawer */}
      {drawerRecord && (
        <RecordDrawer
          record={drawerRecord}
          onClose={() => setDrawerRecord(null)}
          onApprove={handleApprove}
          onPay={handlePay}
        />
      )}
    </div>
  );
}