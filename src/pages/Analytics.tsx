// src/pages/Analytics.tsx
// Dealer Owner analytics: Revenue, BA Performance, Commission Trends, SIM Performance
// Scoped by commission cycle

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import {
  useCommissionCycles,
  useCommissionRecords,
  usePayouts,
} from "@/hooks/useCommissions";
import type { CommissionCycle, CommissionRecord } from "@/types/commissions.types";
import {
  TrendingUp, TrendingDown, DollarSign, Users, Smartphone,
  AlertTriangle, CheckCircle2, XCircle, BarChart3, CreditCard,
  ChevronDown, Loader2, AlertCircle, Award, ShieldAlert,
} from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(val: string | number) {
  return `KES ${Number(val).toLocaleString("en-KE", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function pct(num: number, den: number) {
  if (!den) return "0%";
  return `${Math.round((num / den) * 100)}%`;
}

function trend(current: number, previous: number) {
  if (!previous) return null;
  const diff = ((current - previous) / previous) * 100;
  return { value: Math.abs(Math.round(diff)), up: diff >= 0 };
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KPICard({
  label, value, sub, icon: Icon, color, trendData,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  color: string;
  trendData?: { value: number; up: boolean } | null;
}) {
  return (
    <div className="rounded-xl border border-border bg-card px-5 py-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        <div className={cn("rounded-lg p-2", color)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold font-heading text-foreground">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      {trendData && (
        <div className={cn(
          "flex items-center gap-1 text-xs font-medium",
          trendData.up ? "text-green-500" : "text-destructive"
        )}>
          {trendData.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {trendData.value}% vs previous cycle
        </div>
      )}
    </div>
  );
}

// ── Bar Chart (pure CSS) ──────────────────────────────────────────────────────

function SimpleBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pctVal = max ? Math.round((value / max) * 100) : 0;
  return (
    <div className="h-2 w-full rounded-full bg-accent overflow-hidden">
      <div
        className={cn("h-full rounded-full transition-all duration-500", color)}
        style={{ width: `${pctVal}%` }}
      />
    </div>
  );
}

// ── Cycle Selector ────────────────────────────────────────────────────────────

function CycleSelector({
  cycles, selectedId, onChange,
}: {
  cycles: CommissionCycle[];
  selectedId: number | null;
  onChange: (id: number) => void;
}) {
  const selected = cycles.find(c => c.id === selectedId);

  return (
    <div className="relative">
      <select
        value={selectedId ?? ""}
        onChange={e => onChange(Number(e.target.value))}
        className="appearance-none rounded-lg border border-border bg-accent pl-4 pr-10 py-2 text-sm font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
      >
        <option value="" disabled>Select cycle</option>
        {cycles.map(c => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
    </div>
  );
}

// ── Revenue Section ───────────────────────────────────────────────────────────

function RevenueSection({ records, prevRecords, payouts }: {
  records: CommissionRecord[];
  prevRecords: CommissionRecord[];
  payouts: ReturnType<typeof usePayouts>["data"];
}) {
  const totalGross   = records.reduce((s, r) => s + Number(r.gross_amount), 0);
  const totalNet     = records.reduce((s, r) => s + Number(r.net_amount), 0);
  const totalDeduct  = records.reduce((s, r) => s + Number(r.deductions), 0);
  const totalPaid    = (payouts ?? []).reduce((s, p) => s + Number(p.amount), 0);
  const outstanding  = totalNet - totalPaid;

  const prevGross = prevRecords.reduce((s, r) => s + Number(r.gross_amount), 0);
  const prevNet   = prevRecords.reduce((s, r) => s + Number(r.net_amount), 0);

  return (
    <div className="space-y-4">
      <h2 className="font-heading text-lg font-semibold text-foreground">Revenue & Financial Summary</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard
          label="Total Gross"
          value={fmt(totalGross)}
          sub={`${records.length} agents`}
          icon={DollarSign}
          color="bg-primary/10 text-primary"
          trendData={trend(totalGross, prevGross)}
        />
        <KPICard
          label="Total Net Payable"
          value={fmt(totalNet)}
          sub="After deductions"
          icon={TrendingUp}
          color="bg-green-500/10 text-green-500"
          trendData={trend(totalNet, prevNet)}
        />
        <KPICard
          label="Total Deductions"
          value={fmt(totalDeduct)}
          sub="Fraud + rejected"
          icon={TrendingDown}
          color="bg-destructive/10 text-destructive"
        />
        <KPICard
          label="Outstanding"
          value={fmt(outstanding)}
          sub="Approved, not yet paid"
          icon={CreditCard}
          color="bg-amber-500/10 text-amber-500"
        />
      </div>

      {/* Payment status breakdown */}
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-sm font-semibold text-foreground mb-4">Payment Status Breakdown</p>
        <div className="space-y-3">
          {[
            { label: "Paid",     count: records.filter(r => r.status === "paid").length,     color: "bg-green-500",   textColor: "text-green-500"   },
            { label: "Approved", count: records.filter(r => r.status === "approved").length, color: "bg-primary",     textColor: "text-primary"     },
            { label: "Pending",  count: records.filter(r => r.status === "pending").length,  color: "bg-amber-500",   textColor: "text-amber-500"   },
            { label: "Rejected", count: records.filter(r => r.status === "rejected").length, color: "bg-destructive", textColor: "text-destructive" },
          ].map(row => (
            <div key={row.label} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-16">{row.label}</span>
              <div className="flex-1">
                <SimpleBar value={row.count} max={records.length} color={row.color} />
              </div>
              <span className={cn("text-xs font-semibold w-12 text-right", row.textColor)}>
                {row.count} / {records.length}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── BA Performance Section ────────────────────────────────────────────────────

function BAPerformanceSection({ records }: { records: CommissionRecord[] }) {
  const [sortBy, setSortBy] = useState<"net" | "active" | "fraud">("net");

  const sorted = useMemo(() => {
    return [...records].sort((a, b) => {
      if (sortBy === "net")    return Number(b.net_amount)  - Number(a.net_amount);
      if (sortBy === "active") return b.active_sims         - a.active_sims;
      if (sortBy === "fraud")  return b.fraud_sims          - a.fraud_sims;
      return 0;
    });
  }, [records, sortBy]);

  const maxNet    = Math.max(...records.map(r => Number(r.net_amount)), 1);
  const maxActive = Math.max(...records.map(r => r.active_sims), 1);

  if (records.length === 0) return (
    <div className="space-y-4">
      <h2 className="font-heading text-lg font-semibold text-foreground">BA Performance Comparison</h2>
      <div className="rounded-xl border border-dashed border-border py-16 text-center">
        <Users className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">No records for this cycle yet.</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold text-foreground">BA Performance Comparison</h2>
        <div className="flex gap-1.5">
          {(["net", "active", "fraud"] as const).map(s => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                sortBy === s ? "bg-primary text-primary-foreground" : "bg-accent text-muted-foreground hover:text-foreground"
              )}>
              {s === "net" ? "By Earnings" : s === "active" ? "By Active SIMs" : "By Fraud"}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-12 gap-2 px-5 py-3 border-b border-border bg-accent/30 text-xs font-medium text-muted-foreground uppercase tracking-wide">
          <span className="col-span-1">#</span>
          <span className="col-span-3">Agent</span>
          <span className="col-span-2 text-center">Active SIMs</span>
          <span className="col-span-2 text-center">Claimed</span>
          <span className="col-span-2 text-right">Net Earnings</span>
          <span className="col-span-2 text-right">Status</span>
        </div>

        {sorted.map((r, i) => {
          const isTop = i === 0;
          const hasFraud = r.fraud_sims > 0;
          return (
            <div key={r.id} className={cn(
              "grid grid-cols-12 gap-2 px-5 py-3.5 border-b border-border/50 hover:bg-accent/30 transition-colors items-center",
              isTop && "bg-primary/5"
            )}>
              <span className="col-span-1">
                {isTop
                  ? <Award className="h-4 w-4 text-amber-400" />
                  : <span className="text-xs text-muted-foreground">{i + 1}</span>
                }
              </span>
              <div className="col-span-3">
                <p className="text-sm font-medium text-foreground truncate">{r.agent_name}</p>
                {hasFraud && (
                  <p className="text-xs text-destructive flex items-center gap-1 mt-0.5">
                    <ShieldAlert className="h-3 w-3" />{r.fraud_sims} fraud
                  </p>
                )}
              </div>
              <div className="col-span-2 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-green-500 font-medium">{r.active_sims}</span>
                </div>
                <SimpleBar value={r.active_sims} max={maxActive} color="bg-green-500" />
              </div>
              <div className="col-span-2 text-center">
                <span className="text-xs text-muted-foreground">{r.claimed_sims}</span>
              </div>
              <div className="col-span-2 text-right">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">{fmt(r.net_amount)}</p>
                  <SimpleBar value={Number(r.net_amount)} max={maxNet} color="bg-primary" />
                </div>
              </div>
              <div className="col-span-2 text-right">
                <span className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                  r.status === "paid"     && "bg-green-500/15 text-green-500",
                  r.status === "approved" && "bg-primary/15 text-primary",
                  r.status === "pending"  && "bg-amber-500/15 text-amber-500",
                  r.status === "rejected" && "bg-destructive/15 text-destructive",
                )}>
                  {r.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Commission Trends Section ─────────────────────────────────────────────────

function CommissionTrendsSection({ allCycles, allRecords }: {
  allCycles: CommissionCycle[];
  allRecords: CommissionRecord[];
}) {
  // Group records by cycle
  const cycleData = useMemo(() => {
    return allCycles.map(cycle => {
      const recs = allRecords.filter(r => r.cycle === cycle.id);
      return {
        name:  cycle.name,
        gross: recs.reduce((s, r) => s + Number(r.gross_amount), 0),
        net:   recs.reduce((s, r) => s + Number(r.net_amount), 0),
        agents: recs.length,
        active: recs.reduce((s, r) => s + r.active_sims, 0),
      };
    }).filter(c => c.agents > 0);
  }, [allCycles, allRecords]);

  const maxGross = Math.max(...cycleData.map(c => c.gross), 1);

  if (cycleData.length === 0) return (
    <div className="space-y-4">
      <h2 className="font-heading text-lg font-semibold text-foreground">Commission Trends</h2>
      <div className="rounded-xl border border-dashed border-border py-16 text-center">
        <BarChart3 className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">No cycle data to compare yet.</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <h2 className="font-heading text-lg font-semibold text-foreground">Commission Trends</h2>

      {/* Cycle comparison chart */}
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-sm font-semibold text-foreground mb-5">Gross vs Net by Cycle</p>
        <div className="space-y-4">
          {cycleData.map(cycle => (
            <div key={cycle.name} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground">{cycle.name}</span>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span className="text-green-500 font-semibold">{fmt(cycle.net)}</span>
                  <span>/ {fmt(cycle.gross)} gross</span>
                  <span>{cycle.agents} agents</span>
                </div>
              </div>
              {/* Gross bar */}
              <div className="h-2 w-full rounded-full bg-accent overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary/30 transition-all duration-500"
                  style={{ width: `${Math.round((cycle.gross / maxGross) * 100)}%` }}
                />
              </div>
              {/* Net bar overlaid */}
              <div className="h-2 w-full rounded-full bg-accent overflow-hidden -mt-1">
                <div
                  className="h-full rounded-full bg-green-500 transition-all duration-500"
                  style={{ width: `${Math.round((cycle.net / maxGross) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-4 mt-4 pt-4 border-t border-border">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-2 w-4 rounded-full bg-primary/30 inline-block" />Gross
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-2 w-4 rounded-full bg-green-500 inline-block" />Net
          </span>
        </div>
      </div>

      {/* Cycle summary table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-accent/30 text-muted-foreground text-xs">
              <th className="py-3 px-5 text-left font-medium">Cycle</th>
              <th className="py-3 px-5 text-center font-medium">Agents</th>
              <th className="py-3 px-5 text-center font-medium">Active SIMs</th>
              <th className="py-3 px-5 text-right font-medium">Gross</th>
              <th className="py-3 px-5 text-right font-medium">Net</th>
              <th className="py-3 px-5 text-right font-medium">Efficiency</th>
            </tr>
          </thead>
          <tbody>
            {cycleData.map(cycle => (
              <tr key={cycle.name} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                <td className="py-3 px-5 font-medium text-foreground">{cycle.name}</td>
                <td className="py-3 px-5 text-center text-muted-foreground">{cycle.agents}</td>
                <td className="py-3 px-5 text-center text-green-500 font-medium">{cycle.active}</td>
                <td className="py-3 px-5 text-right text-muted-foreground">{fmt(cycle.gross)}</td>
                <td className="py-3 px-5 text-right text-green-500 font-semibold">{fmt(cycle.net)}</td>
                <td className="py-3 px-5 text-right">
                  <span className={cn(
                    "text-xs font-semibold",
                    cycle.gross > 0 && (cycle.net / cycle.gross) >= 0.8 ? "text-green-500" : "text-amber-500"
                  )}>
                    {pct(cycle.net, cycle.gross)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── SIM Performance Section ───────────────────────────────────────────────────

function SIMPerformanceSection({ records }: { records: CommissionRecord[] }) {
  const totals = useMemo(() => {
    return records.reduce((acc, r) => ({
      claimed:    acc.claimed    + r.claimed_sims,
      active:     acc.active     + r.active_sims,
      fraud:      acc.fraud      + r.fraud_sims,
      rejected:   acc.rejected   + r.rejected_sims,
      disputed:   acc.disputed   + r.disputed_sims,
      notInReport: acc.notInReport + r.not_in_report_sims,
      notInInv:   acc.notInInv   + r.not_in_inventory_sims,
    }), { claimed: 0, active: 0, fraud: 0, rejected: 0, disputed: 0, notInReport: 0, notInInv: 0 });
  }, [records]);

  const total = totals.claimed || 1;

  const categories = [
    { label: "Confirmed Active",      count: totals.active,      icon: CheckCircle2, color: "text-green-500",   bar: "bg-green-500",   desc: "Safaricom confirmed + topup met" },
    { label: "Fraud Flagged",         count: totals.fraud,       icon: AlertTriangle, color: "text-destructive", bar: "bg-destructive",  desc: "Flagged by Safaricom" },
    { label: "Rejected (low topup)",  count: totals.rejected,    icon: XCircle,       color: "text-amber-500",   bar: "bg-amber-500",    desc: "Below minimum top-up threshold" },
    { label: "Disputed",              count: totals.disputed,    icon: ShieldAlert,   color: "text-yellow-500",  bar: "bg-yellow-500",   desc: "BA mismatch with Safaricom" },
    { label: "Not in Safaricom Report", count: totals.notInReport, icon: AlertCircle, color: "text-orange-400", bar: "bg-orange-400",   desc: "Claimed but not confirmed" },
    { label: "Not in Inventory",      count: totals.notInInv,    icon: Smartphone,    color: "text-purple-400",  bar: "bg-purple-500",   desc: "In report but not in system" },
  ];

  return (
    <div className="space-y-4">
      <h2 className="font-heading text-lg font-semibold text-foreground">SIM Performance</h2>

      {/* Top KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard
          label="Total Claimed"
          value={totals.claimed.toLocaleString()}
          sub="By all BAs"
          icon={Smartphone}
          color="bg-accent text-muted-foreground"
        />
        <KPICard
          label="Confirmed Active"
          value={totals.active.toLocaleString()}
          sub={pct(totals.active, totals.claimed) + " activation rate"}
          icon={CheckCircle2}
          color="bg-green-500/10 text-green-500"
        />
        <KPICard
          label="Fraud Flagged"
          value={totals.fraud.toLocaleString()}
          sub={pct(totals.fraud, totals.claimed) + " of claimed"}
          icon={AlertTriangle}
          color="bg-destructive/10 text-destructive"
        />
        <KPICard
          label="Disputed"
          value={totals.disputed.toLocaleString()}
          sub={pct(totals.disputed, totals.claimed) + " of claimed"}
          icon={ShieldAlert}
          color="bg-yellow-500/10 text-yellow-500"
        />
      </div>

      {/* Breakdown bars */}
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-sm font-semibold text-foreground mb-5">SIM Result Breakdown</p>
        <div className="space-y-4">
          {categories.map(cat => (
            <div key={cat.label} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <cat.icon className={cn("h-3.5 w-3.5", cat.color)} />
                  <span className="text-xs font-medium text-foreground">{cat.label}</span>
                  <span className="text-xs text-muted-foreground hidden sm:inline">— {cat.desc}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn("text-xs font-semibold", cat.color)}>{pct(cat.count, total)}</span>
                  <span className="text-xs text-muted-foreground w-12 text-right">{cat.count.toLocaleString()}</span>
                </div>
              </div>
              <SimpleBar value={cat.count} max={total} color={cat.bar} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Analytics Page ───────────────────────────────────────────────────────

export default function Analytics() {
  const { user } = useAuth();
  const dealerId = user?.dealer_id ? Number(user.dealer_id) : undefined;

  const { data: cycles = [], isLoading: cyclesLoading } = useCommissionCycles(dealerId);
  const { data: allRecords = [], isLoading: recordsLoading } = useCommissionRecords();
  const { data: payouts = [] } = usePayouts();

  // Default to the most recent cycle
  const [selectedCycleId, setSelectedCycleId] = useState<number | null>(null);

  const resolvedCycleId = selectedCycleId ?? cycles[0]?.id ?? null;

  const currentCycleRecords = useMemo(
    () => allRecords.filter(r => r.cycle === resolvedCycleId),
    [allRecords, resolvedCycleId]
  );

  // Previous cycle for trend comparison
  const currentCycleIndex = cycles.findIndex(c => c.id === resolvedCycleId);
  const prevCycle = cycles[currentCycleIndex + 1] ?? null;
  const prevCycleRecords = useMemo(
    () => allRecords.filter(r => r.cycle === prevCycle?.id),
    [allRecords, prevCycle]
  );

  const isLoading = cyclesLoading || recordsLoading;

  if (!dealerId) return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No dealer context found.</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Performance insights across your dealer network
          </p>
        </div>

        {!cyclesLoading && cycles.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Viewing cycle:</span>
            <CycleSelector
              cycles={cycles}
              selectedId={resolvedCycleId}
              onChange={setSelectedCycleId}
            />
          </div>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-24 gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-sm">Loading analytics…</span>
        </div>
      )}

      {!isLoading && cycles.length === 0 && (
        <div className="rounded-xl border border-dashed border-border py-24 text-center">
          <BarChart3 className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
          <p className="text-sm font-medium text-foreground">No commission cycles yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Create a cycle in the Commission page and generate records to see analytics.
          </p>
        </div>
      )}

      {!isLoading && cycles.length > 0 && currentCycleRecords.length === 0 && (
        <div className="rounded-xl border border-dashed border-border py-24 text-center">
          <BarChart3 className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
          <p className="text-sm font-medium text-foreground">No records for this cycle</p>
          <p className="text-xs text-muted-foreground mt-1">
            Generate commission records from the Commission → Cycles tab first.
          </p>
        </div>
      )}

      {!isLoading && currentCycleRecords.length > 0 && (
        <div className="space-y-10">
          <RevenueSection
            records={currentCycleRecords}
            prevRecords={prevCycleRecords}
            payouts={payouts}
          />
          <BAPerformanceSection records={currentCycleRecords} />
          <CommissionTrendsSection allCycles={cycles} allRecords={allRecords} />
          <SIMPerformanceSection records={currentCycleRecords} />
        </div>
      )}
    </div>
  );
}