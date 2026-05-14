// src/pages/DailyPerformance.tsx
import { useState, useMemo } from "react";
import {
  Truck, Users, Building2, AlertTriangle,
  Clock, RefreshCw, Info, Loader2,
  ChevronLeft, ChevronRight, Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar, Cell,
} from "recharts";
import { useLivePerformance, useDailyByDate } from "@/hooks/useReports";
import { useReports, useProcessReport, useResetReport } from "@/hooks/useReconciliation";
import { showSuccess, showError } from "@/lib/toast";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import type { LiveBAItem, LiveBranchItem, LiveVanItem } from "@/types/reports.types";

type GroupBy = "branch" | "van" | "ba";

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n: number) { return n.toLocaleString(); }

function formatDate(d: Date) {
  return d.toISOString().split("T")[0];
}

function displayDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-KE", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });
}

// ── Calendar heatmap ──────────────────────────────────────────────────────────
function CalendarHeatmap({
  data,
  selectedDate,
  onSelect,
}: {
  data: { date: string; registered: number }[];
  selectedDate: string;
  onSelect: (d: string) => void;
}) {
  const max = Math.max(...data.map(d => d.registered), 1);

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-2">Last 30 days — click a day to drill in</p>
      <div className="flex flex-wrap gap-1">
        {data.map(d => {
          const intensity = d.registered / max;
          const isSelected = d.date === selectedDate;
          const isToday = d.date === formatDate(new Date());
          return (
            <button
              key={d.date}
              title={`${d.date}: ${d.registered} registrations`}
              onClick={() => onSelect(d.date)}
              className={cn(
                "h-7 w-7 rounded text-xs font-medium transition-all border",
                isSelected
                  ? "border-primary ring-1 ring-primary"
                  : isToday
                  ? "border-primary/40"
                  : "border-transparent",
              )}
              style={{
                backgroundColor: d.registered === 0
                  ? "hsl(222,40%,14%)"
                  : `hsla(190,100%,50%,${0.15 + intensity * 0.75})`,
                color: intensity > 0.6 ? "hsl(222,45%,10%)" : "hsl(214,32%,70%)",
              }}
            >
              {new Date(d.date + "T00:00:00").getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Table sub-components ──────────────────────────────────────────────────────
function PendingBadge({ pending }: { pending: number }) {
  if (pending <= 0) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning">
      <Clock className="h-3 w-3" />{pending} pending
    </span>
  );
}

function BranchRow({ b }: { b: LiveBranchItem }) {
  const pending = Math.max(0, b.registered - b.confirmed);
  const rate = b.sims_in_field > 0 ? Math.round((b.registered / b.sims_in_field) * 100) : 0;
  return (
    <tr className="border-b border-border/50 hover:bg-accent/40 transition-colors">
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Building2 className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-medium text-sm">{b.name}</p>
            <p className="text-xs text-muted-foreground">{b.van_count} van{b.van_count !== 1 ? "s" : ""}</p>
          </div>
        </div>
      </td>
      <td className="py-3 px-4 text-right text-sm font-medium">{fmt(b.sims_in_field)}</td>
      <td className="py-3 px-4 text-right">
        <p className="text-sm font-medium">{fmt(b.registered)}</p>
        <p className="text-xs text-muted-foreground">{rate}% rate</p>
      </td>
      <td className="py-3 px-4 text-right">
        <p className="text-sm font-medium text-green-500">{fmt(b.confirmed)}</p>
        <PendingBadge pending={pending} />
      </td>
      <td className="py-3 px-4 text-right">
        {b.fraud_flags > 0
          ? <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive"><AlertTriangle className="h-3 w-3" />{b.fraud_flags}</span>
          : <span className="text-xs text-muted-foreground">—</span>}
      </td>
      <td className="py-3 px-4 text-right">
        <p className="text-sm font-semibold text-warning">KES {fmt(b.commission)}</p>
        <p className="text-xs text-muted-foreground italic">confirmed</p>
      </td>
    </tr>
  );
}

function VanRow({ v, showBranch }: { v: LiveVanItem; showBranch: boolean }) {
  const pending = Math.max(0, v.registered - v.confirmed);
  const rate = v.sims_in_field > 0 ? Math.round((v.registered / v.sims_in_field) * 100) : 0;
  return (
    <tr className="border-b border-border/50 hover:bg-accent/40 transition-colors">
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
            <Truck className="h-4 w-4 text-blue-400" />
          </div>
          <div>
            <p className="font-medium text-sm">{v.name}</p>
            {showBranch && <p className="text-xs text-muted-foreground">{v.branch_name}</p>}
          </div>
        </div>
      </td>
      <td className="py-3 px-4 text-right text-sm font-medium">{fmt(v.sims_in_field)}</td>
      <td className="py-3 px-4 text-right">
        <p className="text-sm font-medium">{fmt(v.registered)}</p>
        <p className="text-xs text-muted-foreground">{rate}% rate</p>
      </td>
      <td className="py-3 px-4 text-right">
        <p className="text-sm font-medium text-green-500">{fmt(v.confirmed)}</p>
        <PendingBadge pending={pending} />
      </td>
      <td className="py-3 px-4 text-right">
        {v.fraud_flags > 0
          ? <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive"><AlertTriangle className="h-3 w-3" />{v.fraud_flags}</span>
          : <span className="text-xs text-muted-foreground">—</span>}
      </td>
      <td className="py-3 px-4 text-right">
        <p className="text-sm font-semibold text-warning">KES {fmt(v.commission)}</p>
        <p className="text-xs text-muted-foreground italic">confirmed</p>
      </td>
    </tr>
  );
}

function BARow({ ba, showBranch }: { ba: LiveBAItem; showBranch: boolean }) {
  const pending = Math.max(0, ba.registered - ba.confirmed);
  const rate = ba.sims_in_field > 0 ? Math.round((ba.registered / ba.sims_in_field) * 100) : 0;
  const initials = ba.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  return (
    <tr className={cn("border-b border-border/50 hover:bg-accent/40 transition-colors", ba.fraud_flags > 0 && "bg-destructive/5")}>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
            {initials}
          </div>
          <div>
            <p className="font-medium text-sm">{ba.name}</p>
            <p className="text-xs text-muted-foreground">{showBranch ? ba.branch_name : ba.van_team_name}</p>
          </div>
        </div>
      </td>
      <td className="py-3 px-4 text-right text-sm font-medium">{fmt(ba.sims_in_field)}</td>
      <td className="py-3 px-4 text-right">
        <p className="text-sm font-medium">{fmt(ba.registered)}</p>
        <p className="text-xs text-muted-foreground">{rate}% rate</p>
      </td>
      <td className="py-3 px-4 text-right">
        <p className="text-sm font-medium text-green-500">{fmt(ba.confirmed)}</p>
        <PendingBadge pending={pending} />
      </td>
      <td className="py-3 px-4 text-right">
        {ba.fraud_flags > 0
          ? <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive"><AlertTriangle className="h-3 w-3" />{ba.fraud_flags}</span>
          : <span className="text-xs text-muted-foreground">—</span>}
      </td>
      <td className="py-3 px-4 text-right">
        <p className="text-sm font-semibold text-warning">KES {fmt(ba.commission)}</p>
        <p className="text-xs text-muted-foreground italic">confirmed</p>
      </td>
    </tr>
  );
}

// ── Daily drill-down table ────────────────────────────────────────────────────
function DailyDrillDown({ date, branch, vanTeam, ba, role }: { date: string; branch?: number; vanTeam?: number; ba?: number; role?: string }) {
  const { data, isLoading } = useDailyByDate({ date, branch, van_team: vanTeam, ba });

  if (isLoading) return (
    <div className="flex items-center justify-center py-8">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );

  if (!data) return null;

  const { totals, by_ba } = data;

  return (
    <div className="space-y-4">
      {/* Day totals */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Issued",          value: totals.issued,     color: "text-primary",      fmt: String },
          { label: "Returned",        value: totals.returned,   color: "text-muted-foreground", fmt: String },
          { label: "Registered",      value: totals.registered, color: "text-foreground",   fmt: String },
          { label: "Confirmed",       value: totals.confirmed,  color: "text-green-500",    fmt: String },
          { label: "Est. Commission", value: totals.est_commission ?? 0, color: "text-amber-500", fmt: (v: number) => `KES ${v.toLocaleString()}` },
        ].map(k => (
          <div key={k.label} className="rounded-lg border border-border bg-accent/20 px-3 py-2 text-center">
            <p className="text-xs text-muted-foreground">{k.label}</p>
            <p className={cn("text-xl font-bold font-heading", k.color)}>{k.fmt(k.value)}</p>
          </div>
        ))}
      </div>

      {/* Per-BA breakdown */}
      {role !== "brand_ambassador" && (
        by_ba.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No activity recorded for this day.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground text-xs">
                <th className="py-2 px-3 text-left">Brand Ambassador</th>
                <th className="py-2 px-3 text-right">Issued</th>
                <th className="py-2 px-3 text-right">Returned</th>
                <th className="py-2 px-3 text-right">Registered</th>
                <th className="py-2 px-3 text-right">Transferred</th>
                <th className="py-2 px-3 text-right">Est. Commission</th>
              </tr>
            </thead>
            <tbody>
              {by_ba.map((ba: { id: number; name: string; issued: number; returned: number; registered: number; transferred: number; est_commission: number }) => (
                <tr key={ba.id} className="border-b border-border/50 hover:bg-accent/30">
                  <td className="py-2 px-3 font-medium">{ba.name}</td>
                  <td className="py-2 px-3 text-right text-primary">{ba.issued}</td>
                  <td className="py-2 px-3 text-right text-muted-foreground">{ba.returned}</td>
                  <td className="py-2 px-3 text-right font-medium">{ba.registered}</td>
                  <td className="py-2 px-3 text-right text-muted-foreground">{ba.transferred}</td>
                  <td className="py-2 px-3 text-right font-medium text-amber-500">
                    {ba.est_commission > 0 ? `KES ${ba.est_commission.toLocaleString()}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function DailyPerformance() {
  const { user }   = useAuth();
  const role       = user?.role ?? "dealer_owner";
  const navigate   = useNavigate();
  const qc         = useQueryClient();
  const pageTitle: Record<string, string> = {
    dealer_owner:       "Daily Performance",
    operations_manager: "Daily Performance",
    branch_manager:     "Branch Performance",
    van_team_leader:    "My Van Performance",
    brand_ambassador:   "My Performance",
    finance:            "Performance Overview",
    super_admin:        "Daily Performance",
  };
  const [groupBy, setGroupBy] = useState<GroupBy>(
      role === "branch_manager" ? "van" :
      role === "van_team_leader" ? "ba" :
      "ba"
  );
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [showCalendar, setShowCalendar] = useState(false);

  const scopeParams = useMemo(() => {
    if (role === "branch_manager"  && user?.branch_id)  return { branch: Number(user.branch_id) };
    if (role === "van_team_leader" && user?.van_team_id) return { van_team: Number(user.van_team_id) };
    if (role === "brand_ambassador" && user?.id)         return { ba: Number(user.id) };
    return {};
  }, [role, user]);

  const { data: reports = [] } = useReports();
  const processReport = useProcessReport();
  const resetReport   = useResetReport();
  const [showNoReportDialog, setShowNoReportDialog] = useState(false);
  const [isRunningRecon, setIsRunningRecon] = useState(false);

  const pendingReports  = reports.filter(r => r.status === "pending");
  const doneReports     = reports.filter(r => r.status === "done");
  const latestPending   = pendingReports[0] ?? null;
  const latestDone      = doneReports[0] ?? null;
  const latestRunnable  = latestPending ?? null;
  const latestRerunnable = latestDone ?? null;

  const handleRunReconciliation = async () => {
    const toRun = latestRunnable ?? latestRerunnable;
    if (!toRun) { setShowNoReportDialog(true); return; }
    setIsRunningRecon(true);
    try {
      // If report is already done, reset it first then reprocess
      if (toRun.status === "done") {
        await resetReport.mutateAsync(toRun.id);
      }
      const result = await processReport.mutateAsync(toRun.id);
      showSuccess(`Done — ${result.matched} matched, ${result.unmatched} unmatched.`);
      qc.invalidateQueries({ queryKey: ["livePerformance"] });
      qc.invalidateQueries({ queryKey: ["reports"] });
    } catch {
      showError("Reconciliation failed. Check the report and try again.");
    }
    setIsRunningRecon(false);
  };

  const { data, isLoading, isFetching } = useLivePerformance(scopeParams);
  const { data: dailyData } = useDailyByDate({ date: selectedDate, ...scopeParams });

  const kpis     = data?.kpis;
  const byBA     = data?.by_ba     ?? [];
  const byBranch = data?.by_branch ?? [];
  const byVan    = data?.by_van    ?? [];
  const trend    = data?.trend     ?? [];
  const calendar = dailyData?.calendar ?? [];

  const lastReconDate = kpis?.last_recon_date ?? "—";
  const isToday = selectedDate === formatDate(new Date());

  const topBAData = [...byBA]
    .sort((a, b) => b.confirmed - a.confirmed)
    .slice(0, 6)
    .map(b => ({ name: b.name.split(" ")[0], value: b.confirmed }));

  const canSeeBranches = ["dealer_owner", "operations_manager", "super_admin", "finance"].includes(role);
  const canSeeVans     = canSeeBranches || role === "branch_manager" || role === "van_team_leader";
  const showGroupTabs  = role !== "brand_ambassador";

  const availableGroups: { id: GroupBy; label: string; icon: typeof Truck }[] = !showGroupTabs ? [] : [
    ...(canSeeBranches ? [{ id: "branch" as GroupBy, label: "Branch", icon: Building2 }] : []),
    ...(canSeeVans     ? [{ id: "van"    as GroupBy, label: "Van",    icon: Truck      }] : []),
    { id: "ba" as GroupBy, label: "BA", icon: Users },
  ];

  const tableRows = groupBy === "branch" ? byBranch.length : groupBy === "van" ? byVan.length : byBA.length;

  function handleRefresh() {
    qc.invalidateQueries({ queryKey: ["livePerformance"] });
    qc.invalidateQueries({ queryKey: ["dailyByDate"] });
  }

  function navigateDate(dir: -1 | 1) {
    const d = new Date(selectedDate + "T00:00:00");
    d.setDate(d.getDate() + dir);
    if (d <= new Date()) setSelectedDate(formatDate(d));
  }

return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold">{pageTitle[role] ?? "Daily Performance"}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Live field data · Last Safaricom reconciliation:{" "}
            <span className="text-foreground font-medium">{lastReconDate === "—" ? "Not run yet" : lastReconDate}</span>
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isFetching}
          className="self-start flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
          Refresh
        </button>
      </div>

      {/* ── HERO: Money + SIMs at a glance ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Commission — biggest number, left */}
        <div className="lg:col-span-2 rounded-xl border border-warning/30 bg-card px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Today's Estimated Earnings</p>
            <p className="text-4xl font-bold font-heading text-warning">
              KES {fmt(kpis?.estimated_commission ?? 0)}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Based on {kpis?.registered ?? 0} internal registrations · rate from commission rules
            </p>
          </div>
          <div className="sm:text-right shrink-0">
            <p className="text-xs text-muted-foreground mb-1">Confirmed payable</p>
            <p className="text-2xl font-bold font-heading text-green-500">
              KES {fmt(kpis?.confirmed_commission ?? 0)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {lastReconDate === "—" ? "No reconciliation run yet" : `from ${lastReconDate} recon`}
            </p>
          </div>
        </div>

        {/* SIMs still in field — right */}
        <div className="rounded-xl border border-border bg-card px-6 py-5 flex flex-col justify-between">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">SIMs Still in Field</p>
          <p className="text-4xl font-bold font-heading text-foreground">{fmt(kpis?.in_field ?? 0)}</p>
          <div className="mt-3 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Registered (internal)</span>
              <span className="font-medium text-primary">{fmt(kpis?.registered ?? 0)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Pending Safaricom</span>
              <span className="font-medium text-warning">{fmt(kpis?.pending ?? 0)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Confirmed active</span>
              <span className="font-medium text-green-500">{fmt(kpis?.confirmed ?? 0)}</span>
            </div>
            {(kpis?.fraud ?? 0) > 0 && (
              <div className="flex justify-between text-xs mt-1 pt-1 border-t border-border">
                <span className="text-destructive">⚠ Fraud flags</span>
                <span className="font-medium text-destructive">{fmt(kpis?.fraud ?? 0)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Disclaimer — small, not a banner */}
      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        <Info className="h-3.5 w-3.5 shrink-0" />
        Registered and commission figures are internal estimates only — not verified by Safaricom.
        {lastReconDate !== "—" && ` Last confirmed: ${lastReconDate}.`}
      </p>

      {/* Calendar + daily drill-down */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-heading text-base font-semibold">
              Daily Activity —{" "}
              <span className="text-primary">
                {isToday ? "Today" : displayDate(selectedDate)}
              </span>
            </h3>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => navigateDate(-1)} className="rounded-md border border-border p-1.5 hover:bg-accent transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setSelectedDate(formatDate(new Date()))}
              className={cn(
                "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                isToday ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent text-muted-foreground"
              )}
            >
              Today
            </button>
            <button onClick={() => navigateDate(1)} disabled={isToday} className="rounded-md border border-border p-1.5 hover:bg-accent transition-colors disabled:opacity-30">
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => setShowCalendar(s => !s)}
              className={cn(
                "ml-1 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                showCalendar ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent text-muted-foreground"
              )}
            >
              {showCalendar ? "Hide calendar" : "Show calendar"}
            </button>
          </div>
        </div>

        {showCalendar && calendar.length > 0 && (
          <CalendarHeatmap data={calendar} selectedDate={selectedDate} onSelect={setSelectedDate} />
        )}

        <DailyDrillDown
          date={selectedDate}
          branch={scopeParams.branch}
          vanTeam={scopeParams.van_team}
          ba={scopeParams.ba}
          role={role}
        />
      </div>

      {/* Trend chart + Top BAs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-lg border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading text-base font-semibold">Registrations — Last 7 Days</h3>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full bg-primary" />Internal</span>
              <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full bg-green-500" />Confirmed</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,40%,22%)" />
              <XAxis dataKey="label" tick={{ fill: "hsl(215,17%,47%)", fontSize: 11 }} />
              <YAxis tick={{ fill: "hsl(215,17%,47%)", fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(222,45%,10%)", border: "1px solid hsl(222,40%,22%)", borderRadius: 8, color: "hsl(214,32%,91%)" }} />
              <Area type="monotone" dataKey="registered" name="Internal" stroke="hsl(190,100%,50%)" fill="hsl(190,100%,50%)" fillOpacity={0.12} strokeWidth={2} />
              <Area type="monotone" dataKey="confirmed" name="Confirmed" stroke="hsl(160,60%,45%)" fill="hsl(160,60%,45%)" fillOpacity={0.12} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className={cn("rounded-lg border border-border bg-card p-5", role === "brand_ambassador" && "hidden")}>
          <h3 className="font-heading text-base font-semibold mb-4">Top BAs (Confirmed)</h3>
          {isLoading || topBAData.length === 0 ? (
            <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "No data yet"}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={topBAData} layout="vertical">
                <XAxis type="number" tick={{ fill: "hsl(215,17%,47%)", fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fill: "hsl(215,17%,47%)", fontSize: 11 }} width={52} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(222,45%,10%)", border: "1px solid hsl(222,40%,22%)", borderRadius: 8, color: "hsl(214,32%,91%)" }} />
                <Bar dataKey="value" name="Confirmed" radius={[0, 4, 4, 0]}>
                  {topBAData.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? "hsl(190,100%,50%)" : i === 1 ? "hsl(190,100%,40%)" : "hsl(190,100%,30%)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Performance table — sorted by rate descending */}
      {showGroupTabs && (
        <div className="rounded-lg border border-border bg-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-border">
            <h3 className="font-heading text-base font-semibold">
              Performance by {groupBy === "branch" ? "Branch" : groupBy === "van" ? "Van" : "Brand Ambassador"}
            </h3>
            <div className="flex items-center gap-1 rounded-lg border border-border bg-accent p-1">
              {availableGroups.map(g => (
                <button
                  key={g.id}
                  onClick={() => setGroupBy(g.id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                    groupBy === g.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <g.icon className="h-3.5 w-3.5" />{g.label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-xs">
                  <th className="py-3 px-4 text-left font-medium">
                    {groupBy === "branch" ? "Branch" : groupBy === "van" ? "Van" : "Ambassador"}
                  </th>
                  <th className="py-3 px-4 text-right font-medium">SIMs in Field</th>
                  <th className="py-3 px-4 text-right font-medium">Registered <span className="text-warning">(internal)</span></th>
                  <th className="py-3 px-4 text-right font-medium">Confirmed <span className="text-green-500">(Safaricom)</span></th>
                  <th className="py-3 px-4 text-right font-medium">Fraud</th>
                  <th className="py-3 px-4 text-right font-medium">Commission</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="py-12 text-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-auto" /></td></tr>
                ) : tableRows === 0 ? (
                  <tr><td colSpan={6} className="py-12 text-center text-sm text-muted-foreground">No data available. Issue SIMs to BAs to see performance here.</td></tr>
                ) : (
                  <>
                    {groupBy === "branch" && [...byBranch].sort((a, b) => {
                      const rA = a.sims_in_field > 0 ? a.registered / a.sims_in_field : 0;
                      const rB = b.sims_in_field > 0 ? b.registered / b.sims_in_field : 0;
                      return rB - rA;
                    }).map(b => <BranchRow key={b.id} b={b} />)}
                    {groupBy === "van" && [...byVan].sort((a, b) => {
                      const rA = a.sims_in_field > 0 ? a.registered / a.sims_in_field : 0;
                      const rB = b.sims_in_field > 0 ? b.registered / b.sims_in_field : 0;
                      return rB - rA;
                    }).map(v => <VanRow key={v.id} v={v} showBranch={role !== "branch_manager"} />)}
                    {groupBy === "ba" && [...byBA].sort((a, b) => b.confirmed - a.confirmed)
                      .map(ba => <BARow key={ba.id} ba={ba} showBranch={role !== "branch_manager"} />)}
                  </>
                )}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Showing {tableRows} {groupBy === "branch" ? "branches" : groupBy === "van" ? "vans" : "brand ambassadors"} · sorted by registration rate
            </p>
          </div>
        </div>
      )}

      {/* No-report dialog */}
      {showNoReportDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={() => setShowNoReportDialog(false)} />
          <div className="relative w-full max-w-sm rounded-xl border border-border bg-card shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-warning" />
              </div>
              <div>
                <h3 className="font-heading font-semibold text-foreground">No Reports Available</h3>
                <p className="text-xs text-muted-foreground mt-0.5">No pending Safaricom reports found.</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              You need to upload a Safaricom activation report first. Would you like to go to the reports page?
            </p>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowNoReportDialog(false)}
                className="flex-1 rounded-md border border-border py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors">
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowNoReportDialog(false);
                  if (role === "dealer_owner")            navigate("/owner/reports");
                  else if (role === "operations_manager") navigate("/operations/reconciliation");
                  else if (role === "finance")            navigate("/finance/reports");
                  else navigate("/owner/reports");
                }}
                className="flex-1 rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity">
                Upload Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reconciliation prompt */}
      {["dealer_owner", "operations_manager", "branch_manager", "finance"].includes(role) && (
        <div className="rounded-lg border border-border bg-card px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <RefreshCw className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">
                {latestPending
                  ? `${pendingReports.length} pending report${pendingReports.length > 1 ? "s" : ""} ready to process`
                  : latestDone
                  ? "Reprocess latest Safaricom report"
                  : "Ready to confirm these numbers?"}
              </p>
              <p className="text-xs text-muted-foreground">
                {latestPending
                  ? `Latest: ${latestPending.filename || `Report #${latestPending.id}`} — click to run`
                  : latestDone
                  ? `Latest: ${latestDone.filename || `Report #${latestDone.id}`} — click to reprocess`
                  : "Upload a Safaricom report to convert estimated figures to confirmed payable amounts."}
              </p>
            </div>
          </div>
          <button
            onClick={handleRunReconciliation}
            disabled={isRunningRecon}
            className="shrink-0 flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {isRunningRecon
              ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Running…</>
              : <><RefreshCw className="h-3.5 w-3.5" /> Run Reconciliation</>
            }
          </button>
        </div>
      )}
    </div>
  );
}