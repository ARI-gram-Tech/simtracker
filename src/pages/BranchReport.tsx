// src/pages/BranchReport.tsx
// Read-only branch performance summary for Branch Manager
// Shows SIM performance, BA breakdown, reconciliation results scoped to their branch

import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  useCommissionRecords,
} from "@/hooks/useCommissions";

// Extend the base user type to include branch_id for branch managers
interface BranchUser {
  branch?: number;
}
import { cn } from "@/lib/utils";
import {
  Layers, Users, TrendingUp, AlertTriangle,
  CheckCircle2, XCircle, Clock, BarChart3,
  ShieldAlert, HelpCircle, Activity,
} from "lucide-react";

// ── Helpers ──────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex items-start gap-4">
      <div className={cn("rounded-lg p-2.5 shrink-0", accent ?? "bg-accent")}>
        <Icon className={cn("h-4 w-4", accent ? "text-white" : "text-muted-foreground")} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold text-foreground mt-0.5">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h2 className="font-heading text-sm font-semibold text-foreground">{title}</h2>
      {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
    </div>
  );
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-1.5 w-full rounded-full bg-accent overflow-hidden">
      <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ── Chip ──────────────────────────────────────────────────────────────────────

function StatusChip({ status }: { status: string }) {
  const map: Record<string, string> = {
    paid:     "bg-green-500/10 text-green-500 border-green-500/20",
    approved: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    pending:  "bg-amber-500/10 text-amber-500 border-amber-500/20",
    rejected: "bg-destructive/10 text-destructive border-destructive/20",
  };
  return (
    <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize", map[status] ?? "bg-accent text-muted-foreground border-border")}>
      {status}
    </span>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function BranchReport() {
  const { user } = useAuth();

  // Pull commission records scoped to this branch manager's branch
  // branch_manager has a branch_id on their user profile
  const branchId = (user as unknown as BranchUser)?.branch ?? undefined;

  const { data: records = [], isLoading } = useCommissionRecords(
    branchId ? { branch: branchId } : {}
  );

  // ── Aggregate stats ────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    if (!records.length) return null;

    const totalClaimed      = records.reduce((s, r) => s + (r.claimed_sims          ?? 0), 0);
    const totalActive       = records.reduce((s, r) => s + (r.active_sims           ?? 0), 0);
    const totalFraud        = records.reduce((s, r) => s + (r.fraud_sims            ?? 0), 0);
    const totalRejected     = records.reduce((s, r) => s + (r.rejected_sims         ?? 0), 0);
    const totalDisputed     = records.reduce((s, r) => s + (r.disputed_sims         ?? 0), 0);
    const totalNotInReport  = records.reduce((s, r) => s + (r.not_in_report_sims    ?? 0), 0);
    const totalNotInInv     = records.reduce((s, r) => s + (r.not_in_inventory_sims ?? 0), 0);
    const totalGross        = records.reduce((s, r) => s + Number(r.gross_amount    ?? 0), 0);
    const totalNet          = records.reduce((s, r) => s + Number(r.net_amount      ?? 0), 0);
    const totalDeductions   = records.reduce((s, r) => s + Number(r.deductions      ?? 0), 0);
    const activationRate    = totalClaimed > 0 ? Math.round((totalActive / totalClaimed) * 100) : 0;

    // unique BAs
    const uniqueBAs = new Set(records.map(r => r.agent)).size;

    return {
      totalClaimed, totalActive, totalFraud, totalRejected,
      totalDisputed, totalNotInReport, totalNotInInv,
      totalGross, totalNet, totalDeductions, activationRate, uniqueBAs,
    };
  }, [records]);

  // ── Per-BA breakdown ───────────────────────────────────────────────────────

  const baRows = useMemo(() => {
    const map = new Map<number, {
      agentId: number; agentName: string;
      claimed: number; active: number; fraud: number;
      net: number; status: string; recordCount: number;
    }>();

    for (const r of records) {
      const existing = map.get(r.agent);
      if (existing) {
        existing.claimed      += r.claimed_sims   ?? 0;
        existing.active       += r.active_sims    ?? 0;
        existing.fraud        += r.fraud_sims      ?? 0;
        existing.net          += Number(r.net_amount ?? 0);
        existing.recordCount  += 1;
        // keep latest status
        existing.status = r.status;
      } else {
        map.set(r.agent, {
          agentId:     r.agent,
          agentName:   r.agent_name ?? `Agent #${r.agent}`,
          claimed:     r.claimed_sims   ?? 0,
          active:      r.active_sims    ?? 0,
          fraud:       r.fraud_sims      ?? 0,
          net:         Number(r.net_amount ?? 0),
          status:      r.status,
          recordCount: 1,
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => b.active - a.active);
  }, [records]);

  // ── Loading ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Activity className="h-6 w-6 animate-pulse text-primary" />
          <p className="text-sm text-muted-foreground">Loading branch report…</p>
        </div>
      </div>
    );
  }

  // ── Empty ──────────────────────────────────────────────────────────────────

  if (!records.length) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">My Branch Report</h1>
          <p className="text-sm text-muted-foreground mt-1">SIM performance summary for your branch</p>
        </div>
        <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-border gap-3">
          <BarChart3 className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No commission records found for your branch yet.</p>
          <p className="text-xs text-muted-foreground/60">Records appear once a commission cycle has been generated.</p>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8 p-6 max-w-5xl">

      {/* Page header */}
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">My Branch Report</h1>
        <p className="text-sm text-muted-foreground mt-1">
          SIM performance summary for your branch · {records.length} commission record{records.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* ── Overview stats ──────────────────────────────────────────────────── */}
      <section>
        <SectionHeader title="Overview" subtitle="Aggregated across all cycles and BAs in your branch" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="BAs in Branch"
            value={stats?.uniqueBAs ?? 0}
            icon={Users}
          />
          <StatCard
            label="Activation Rate"
            value={`${stats?.activationRate ?? 0}%`}
            sub={`${stats?.totalActive ?? 0} / ${stats?.totalClaimed ?? 0} SIMs`}
            icon={TrendingUp}
            accent="bg-primary"
          />
          <StatCard
            label="Fraud Flagged"
            value={stats?.totalFraud ?? 0}
            sub="SIMs not paid"
            icon={ShieldAlert}
            accent="bg-destructive"
          />
          <StatCard
            label="Net Commission"
            value={`KES ${(stats?.totalNet ?? 0).toLocaleString()}`}
            sub={`Gross: KES ${(stats?.totalGross ?? 0).toLocaleString()}`}
            icon={Layers}
            accent="bg-green-600"
          />
        </div>
      </section>

      {/* ── SIM Breakdown ───────────────────────────────────────────────────── */}
      <section>
        <SectionHeader title="SIM Breakdown" subtitle="How SIMs are classified across your branch" />
        <div className="rounded-xl border border-border bg-card divide-y divide-border/50 overflow-hidden">
          {[
            {
              label: "Confirmed Active",
              count: stats?.totalActive ?? 0,
              max:   stats?.totalClaimed ?? 1,
              color: "bg-green-500",
              icon:  CheckCircle2,
              textColor: "text-green-500",
            },
            {
              label: "Not in Safaricom Report",
              count: stats?.totalNotInReport ?? 0,
              max:   stats?.totalClaimed ?? 1,
              color: "bg-amber-500",
              icon:  HelpCircle,
              textColor: "text-amber-500",
            },
            {
              label: "Fraud Flagged",
              count: stats?.totalFraud ?? 0,
              max:   stats?.totalClaimed ?? 1,
              color: "bg-destructive",
              icon:  ShieldAlert,
              textColor: "text-destructive",
            },
            {
              label: "Rejected (Low Topup)",
              count: stats?.totalRejected ?? 0,
              max:   stats?.totalClaimed ?? 1,
              color: "bg-orange-500",
              icon:  XCircle,
              textColor: "text-orange-500",
            },
            {
              label: "Disputed",
              count: stats?.totalDisputed ?? 0,
              max:   stats?.totalClaimed ?? 1,
              color: "bg-yellow-500",
              icon:  AlertTriangle,
              textColor: "text-yellow-500",
            },
            {
              label: "Not in Dealer Inventory",
              count: stats?.totalNotInInv ?? 0,
              max:   stats?.totalClaimed ?? 1,
              color: "bg-muted-foreground",
              icon:  Clock,
              textColor: "text-muted-foreground",
            },
          ].map(row => (
            <div key={row.label} className={cn("px-5 py-3.5", row.count === 0 && "opacity-40")}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <row.icon className={cn("h-3.5 w-3.5", row.textColor)} />
                  <span className="text-xs text-muted-foreground">{row.label}</span>
                </div>
                <span className={cn("text-xs font-bold", row.textColor)}>
                  {row.count} SIM{row.count !== 1 ? "s" : ""}
                </span>
              </div>
              <ProgressBar value={row.count} max={row.max} color={row.color} />
            </div>
          ))}
        </div>
      </section>

      {/* ── Commission Summary ──────────────────────────────────────────────── */}
      <section>
        <SectionHeader title="Commission Summary" subtitle="Financial breakdown across all cycles" />
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Gross Earnings",  value: `KES ${(stats?.totalGross ?? 0).toLocaleString()}`,      color: "text-foreground"  },
            { label: "Total Deductions",value: `− KES ${(stats?.totalDeductions ?? 0).toLocaleString()}`, color: "text-destructive" },
            { label: "Net Payable",     value: `KES ${(stats?.totalNet ?? 0).toLocaleString()}`,          color: "text-green-500"   },
          ].map(k => (
            <div key={k.label} className="rounded-xl border border-border bg-card px-4 py-4 text-center">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className={cn("text-lg font-bold mt-1", k.color)}>{k.value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── BA Breakdown table ──────────────────────────────────────────────── */}
      <section>
        <SectionHeader title="BA Performance" subtitle="Individual breakdown for each Brand Ambassador in your branch" />
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-accent/30">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Brand Ambassador</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Claimed</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Active</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Rate</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Fraud</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Net (KES)</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {baRows.map(ba => {
                const rate = ba.claimed > 0 ? Math.round((ba.active / ba.claimed) * 100) : 0;
                return (
                  <tr key={ba.agentId} className="hover:bg-accent/20 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground text-xs">{ba.agentName}</p>
                      <p className="text-[10px] text-muted-foreground">{ba.recordCount} cycle{ba.recordCount !== 1 ? "s" : ""}</p>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-muted-foreground">{ba.claimed}</td>
                    <td className="px-4 py-3 text-right text-xs text-green-500 font-semibold">{ba.active}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={cn(
                        "text-xs font-bold",
                        rate >= 80 ? "text-green-500" : rate >= 50 ? "text-amber-500" : "text-destructive"
                      )}>
                        {rate}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-destructive font-semibold">
                      {ba.fraud > 0 ? ba.fraud : <span className="text-muted-foreground/40">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-xs font-semibold text-foreground">
                      {ba.net.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <StatusChip status={ba.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
}