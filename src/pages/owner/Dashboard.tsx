// src/pages/owner/Dashboard.tsx
import { useMemo } from "react";
import { Layers, Send, CheckCircle, XCircle, TrendingUp, DollarSign } from "lucide-react";
import { KpiCard } from "@/components/KpiCard";
import { StatusBadge } from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { useLivePerformance } from "@/hooks/useReports";
import { useFraudSummary } from "@/hooks/useReconciliation";
import { useSIMs } from "@/hooks/useInventory";
import { useAuth } from "@/contexts/AuthContext";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) { return n.toLocaleString(); }
function fmtKES(n: number) { return `KES ${n.toLocaleString()}`; }

const SEVERITY_COLORS = {
  critical: "bg-destructive/20 text-destructive border-destructive/30",
  high:     "bg-destructive/20 text-destructive border-destructive/30",
  medium:   "bg-warning/20 text-warning border-warning/30",
  low:      "bg-success/20 text-success border-success/30",
} as const;

const SEVERITY_DOTS = {
  critical: "bg-destructive",
  high:     "bg-destructive",
  medium:   "bg-warning",
  low:      "bg-success",
} as const;

const MEDALS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };
const SEVERITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

// ─── Component ────────────────────────────────────────────────────────────────

export default function OwnerDashboard() {
  const { user } = useAuth();
  const dealerId = user?.dealer_id ? Number(user.dealer_id) : undefined;

  // ── Data fetching ─────────────────────────────────────────────────────────
  const { data: live,  isLoading: liveLoading  } = useLivePerformance();
  const { data: fraud, isLoading: fraudLoading } = useFraudSummary();
  const { data: simsData                       } = useSIMs({ page_size: 1 } as never);

  const kpis   = live?.kpis;
  const trend  = useMemo(() => live?.trend  ?? [], [live?.trend]);
  const byBA   = useMemo(() => live?.by_ba  ?? [], [live?.by_ba]);

  // ── KPI values ────────────────────────────────────────────────────────────
  const totalInventory      = simsData?.count ?? 0;
  const simsIssued          = kpis?.in_field           ?? 0;
  const confirmedActive     = kpis?.confirmed          ?? 0;
  const pendingCount        = kpis?.pending            ?? 0;
  const estimatedCommission = kpis?.estimated_commission ?? 0;
  const confirmedCommission = kpis?.confirmed_commission ?? 0;
  const commissionVariance  = estimatedCommission - confirmedCommission;

  // ── Pie chart data ────────────────────────────────────────────────────────
  const fraudKpis = fraud?.kpis;
  const claimNumbers = useMemo(() => [
    { name: "Confirmed",  value: confirmedActive,              color: "hsl(160, 60%, 45%)" },
    { name: "Pending",    value: pendingCount,                 color: "hsl(38, 92%, 50%)"  },
    { name: "Fraud",      value: fraudKpis?.fraud_flagged_safaricom ?? 0, color: "hsl(0, 84%, 60%)" },
    { name: "Disputed",   value: fraudKpis?.disputed           ?? 0, color: "hsl(263, 84%, 52%)" },
  ], [confirmedActive, pendingCount, fraudKpis]);

  // ── Top BAs (sorted by confirmed desc, top 5) ─────────────────────────────
  const topBAs = useMemo(() =>
    [...byBA]
      .sort((a, b) => b.confirmed - a.confirmed)
      .slice(0, 5)
      .map((ba, i) => ({ ...ba, rank: i + 1 })),
    [byBA]
  );

  
  const alerts = useMemo(() => {
    const incidents = fraud?.incidents ?? [];
    return [...incidents]
      .sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9))
      .slice(0, 4)
      .map(inc => ({
        severity: inc.severity as keyof typeof SEVERITY_COLORS,
        title:    inc.type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
        desc:     inc.description || `SIM ${inc.serial_number} — ${inc.ba_name ?? "Unknown BA"}`,
        time:     new Date(inc.created_at).toLocaleString("en-KE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }),
        action:   "Investigate",
      }));
  }, [fraud]);

  // ── Trend chart data ──────────────────────────────────────────────────────
  const chartData = useMemo(() =>
    trend.map(t => ({
      week:       t.label,
      registered: t.registered,
      activated:  t.confirmed,
    })),
    [trend]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Business Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">Here is your business summary for today</p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard
          icon={Layers} iconColor="text-primary"
          value={liveLoading ? "—" : fmt(totalInventory)}
          label="Total SIM Inventory"
          sub={liveLoading ? "Loading…" : `${fmt(simsIssued)} issued`}
          subColor="text-muted-foreground"
        />
        <KpiCard
          icon={Send} iconColor="text-secondary"
          value={liveLoading ? "—" : fmt(simsIssued)}
          label="SIMs Issued"
          sub={totalInventory ? `${Math.round((simsIssued / totalInventory) * 100)}% of total` : "—"}
          subColor="text-muted-foreground"
        />
        <KpiCard
          icon={CheckCircle} iconColor="text-success"
          value={liveLoading ? "—" : fmt(confirmedActive)}
          label="Confirmed Active"
          sub={kpis?.last_recon_date ? `Last recon ${new Date(kpis.last_recon_date).toLocaleDateString("en-KE", { day: "numeric", month: "short" })}` : "No recon yet"}
          subColor="text-success"
        />
        <KpiCard
          icon={XCircle} iconColor="text-warning"
          value={liveLoading ? "—" : fmt(pendingCount)}
          label="Pending / Inactive"
          sub={fraudKpis ? `${fmt(fraudKpis.fraud_flagged_safaricom)} fraud flagged` : "—"}
          subColor="text-warning"
        />
        <KpiCard
          icon={TrendingUp} iconColor="text-primary"
          value={liveLoading ? "—" : fmtKES(estimatedCommission)}
          label="Estimated Commission"
          sub="Current cycle"
          subColor="text-muted-foreground"
        />
        <KpiCard
          icon={DollarSign} iconColor="text-success"
          value={liveLoading ? "—" : fmtKES(confirmedCommission)}
          label="Confirmed Commission"
          sub={commissionVariance > 0 ? `Variance: ${fmtKES(commissionVariance)}` : "Fully reconciled"}
          subColor={commissionVariance > 0 ? "text-warning" : "text-success"}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 rounded-lg border border-border bg-card p-5">
          <h3 className="font-heading text-lg font-semibold text-foreground mb-4">
            SIM Registrations vs Activations
          </h3>
          {liveLoading ? (
            <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
              Loading chart…
            </div>
          ) : chartData.length === 0 ? (
            <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
              No trend data available yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 40%, 22%)" />
                <XAxis dataKey="week" tick={{ fill: "hsl(215, 17%, 47%)", fontSize: 12 }} />
                <YAxis tick={{ fill: "hsl(215, 17%, 47%)", fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(222, 45%, 10%)", border: "1px solid hsl(222, 40%, 22%)", borderRadius: 8, color: "hsl(214, 32%, 91%)" }} />
                <Legend />
                <Area type="monotone" dataKey="registered" name="Registrations" stroke="hsl(190, 100%, 50%)" fill="hsl(190, 100%, 50%)" fillOpacity={0.2} />
                <Area type="monotone" dataKey="activated"  name="Activations"   stroke="hsl(160, 60%, 45%)"  fill="hsl(160, 60%, 45%)"  fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="lg:col-span-2 rounded-lg border border-border bg-card p-5">
          <h3 className="font-heading text-lg font-semibold text-foreground mb-4">
            Reconciliation Breakdown
          </h3>
          {fraudLoading ? (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
              Loading…
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={claimNumbers} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                    {claimNumbers.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "hsl(222, 45%, 10%)", border: "1px solid hsl(222, 40%, 22%)", borderRadius: 8, color: "hsl(214, 32%, 91%)" }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {claimNumbers.map(s => (
                  <div key={s.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ background: s.color }} />
                      <span className="text-muted-foreground">{s.name}</span>
                    </div>
                    <span className="text-foreground font-medium">{s.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 rounded-lg border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading text-lg font-semibold text-foreground">Top Performing BAs</h3>
            <button className="text-sm text-primary hover:underline">View All BAs</button>
          </div>
          {liveLoading ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Loading…</p>
          ) : topBAs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center italic">No BA data available yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="pb-3 text-left font-medium">Rank</th>
                    <th className="pb-3 text-left font-medium">Name</th>
                    <th className="pb-3 text-left font-medium">Branch</th>
                    <th className="pb-3 text-right font-medium">In Field</th>
                    <th className="pb-3 text-right font-medium">Confirmed</th>
                    <th className="pb-3 text-right font-medium">Commission</th>
                  </tr>
                </thead>
                <tbody>
                  {topBAs.map(ba => (
                    <tr key={ba.id} className="border-b border-border/50 hover:bg-accent/50 transition-colors">
                      <td className="py-3">{MEDALS[ba.rank] || ba.rank}</td>
                      <td className="py-3 text-foreground font-medium">{ba.name}</td>
                      <td className="py-3 text-muted-foreground">{ba.branch_name || "—"}</td>
                      <td className="py-3 text-right text-foreground">{ba.sims_in_field}</td>
                      <td className="py-3 text-right text-foreground">{ba.confirmed}</td>
                      <td className="py-3 text-right text-success font-medium">{fmtKES(ba.commission)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 rounded-lg border border-border bg-card p-5">
          <h3 className="font-heading text-lg font-semibold text-foreground mb-4">Alerts & Warnings</h3>
          {fraudLoading ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Loading…</p>
          ) : alerts.length === 0 ? (
            <p className="text-sm text-muted-foreground italic py-4 text-center">No active alerts.</p>
          ) : (
            <div className="space-y-3">
              {alerts.map((a, i) => (
                <div key={i} className={cn("rounded-lg border p-3", SEVERITY_COLORS[a.severity])}>
                  <div className="flex items-start gap-2">
                    <div className={cn("mt-1 h-2 w-2 rounded-full shrink-0", SEVERITY_DOTS[a.severity])} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{a.title}</p>
                      <p className="text-xs opacity-80 mt-0.5 truncate">{a.desc}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs opacity-60">{a.time}</span>
                        <button className="text-xs font-medium hover:underline">[{a.action}]</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}