// src/pages/AgentPerformance.tsx
import { useState, useMemo } from "react";
import {
  AlertTriangle, Clock, CheckCircle2, RefreshCw,
  Info, ChevronRight, MapPin, Calendar, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar, Cell,
} from "recharts";
import { useAgentPerformanceLive } from "@/hooks/useReports";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

// ── Types ─────────────────────────────────────────────────────────────────────
interface AgentItem {
  id: number;
  name: string;
  phone: string;
  branch_name: string;
  van_team_name: string;
  sims_in_field: number;
  registered: number;
  confirmed: number | null;
  fraud_flags: number;
  commission: number;
  last_issuance_date: string | null;
  days_since_issuance: number;
  trend: number[];
}

// ── Activity config ───────────────────────────────────────────────────────────
const ACT = {
  active:  { label: "Active",  color: "text-green-500",    bg: "bg-green-500/15",    dot: "bg-green-500",    threshold: "< 7 days"  },
  idle:    { label: "Idle",    color: "text-amber-500",    bg: "bg-amber-500/15",    dot: "bg-amber-500",    threshold: "7–30 days" },
  dormant: { label: "Dormant", color: "text-destructive",  bg: "bg-destructive/15",  dot: "bg-destructive",  threshold: "> 30 days" },
} as const;

type ActivityKey = keyof typeof ACT;

function activityOf(days: number): ActivityKey {
  if (days <= 7)  return "active";
  if (days <= 30) return "idle";
  return "dormant";
}

const BAR_COLORS: Record<ActivityKey, string> = {
  active:  "hsl(160,60%,45%)",
  idle:    "hsl(38,92%,50%)",
  dormant: "hsl(0,84%,60%)",
};

// ── Sparkline ─────────────────────────────────────────────────────────────────
function Sparkline({ data, activity }: { data: number[]; activity: ActivityKey }) {
  const color = BAR_COLORS[activity];
  const min = Math.min(...data);
  const max = Math.max(...data);
  const h = 28, w = 72;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = max === min ? h / 2 : h - ((v - min) / (max - min)) * h;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Days badge ────────────────────────────────────────────────────────────────
function DaysBadge({ days }: { days: number }) {
  const act = activityOf(days);
  const cfg = ACT[act];
  const label = days >= 999 ? "Never" : `${days}d ago`;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", cfg.bg, cfg.color)}>
      <Clock className="h-3 w-3" />{label}
    </span>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AgentPerformance() {
  const { user }   = useAuth();
  const role       = user?.role ?? "dealer_owner";
  const navigate   = useNavigate();
  const qc         = useQueryClient();

  const [filter, setFilter] = useState<"all" | ActivityKey>("all");

  const scopeParams = useMemo(() => {
    if (role === "branch_manager" && user?.branch_id) {
      return { branch: Number(user.branch_id) };
    }
    return {};
  }, [role, user]);

  const { data, isLoading, isFetching, error } = useAgentPerformanceLive(scopeParams);

  const agents: AgentItem[] = useMemo(() => data?.agents ?? [], [data]);
  const trend = data?.trend ?? [];
  const lastReconDate = data?.last_recon_date ?? "—";

  // ── Derived ───────────────────────────────────────────────────────────────
  const filteredAgents = useMemo(() => {
    if (filter === "all") return agents;
    return agents.filter(a => activityOf(a.days_since_issuance) === filter);
  }, [agents, filter]);

  const activeCount  = agents.filter(a => activityOf(a.days_since_issuance) === "active").length;
  const idleCount    = agents.filter(a => activityOf(a.days_since_issuance) === "idle").length;
  const dormantCount = agents.filter(a => activityOf(a.days_since_issuance) === "dormant").length;

  const totalInField   = agents.reduce((s, a) => s + a.sims_in_field, 0);
  const totalRegistered = agents.reduce((s, a) => s + a.registered, 0);
  const totalConfirmed  = agents.reduce((s, a) => s + (a.confirmed ?? 0), 0);
  const totalPending    = Math.max(0, totalRegistered - totalConfirmed);
  const totalFraud      = agents.reduce((s, a) => s + a.fraud_flags, 0);
  const totalCommission = agents.reduce((s, a) => s + a.commission, 0);
  const unreconciledCount = agents.filter(a => a.confirmed === null).length;

  const topData = [...agents]
    .sort((a, b) => b.registered - a.registered)
    .slice(0, 8)
    .map(a => ({
      name:     a.name.split(" ")[0],
      value:    a.registered,
      activity: activityOf(a.days_since_issuance),
    }));

  function handleRefresh() {
    qc.invalidateQueries({ queryKey: ["agentPerformanceLive"] });
  }

  function handleNavigateRecon() {
    if (role === "dealer_owner")            navigate("/owner/reports");
    else if (role === "operations_manager") navigate("/operations/reconciliation");
    else if (role === "finance")            navigate("/finance/reports");
    else navigate("/owner/reports");
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold">Agent Performance</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Field data · Last Safaricom reconciliation:{" "}
            <span className="text-foreground font-medium">{lastReconDate}</span>
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

      {/* Disclaimer */}
      <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/8 px-4 py-3">
        <Info className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-500/90">
          <span className="font-semibold">Registered figures are internal only</span> and have not been
          verified by Safaricom. Confirmed figures reflect the last reconciliation on{" "}
          <span className="font-medium">{lastReconDate}</span>.
          Agents showing <span className="font-semibold">N/A</span> have not been reconciled yet.
        </p>
      </div>

      {/* Loading / Error */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load agent data. Check your connection and try again.
        </div>
      )}

      {data && (
        <>
          {/* Activity buckets + KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            {(["active", "idle", "dormant"] as ActivityKey[]).map(s => {
              const cfg = ACT[s];
              const count = s === "active" ? activeCount : s === "idle" ? idleCount : dormantCount;
              return (
                <div
                  key={s}
                  onClick={() => setFilter(filter === s ? "all" : s)}
                  className={cn(
                    "rounded-lg border border-border bg-card px-4 py-4 cursor-pointer transition-all hover:bg-accent/40",
                    filter === s && "ring-1 ring-primary"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn("h-2 w-2 rounded-full shrink-0", cfg.dot)} />
                    <p className="text-xs text-muted-foreground">{cfg.label}</p>
                  </div>
                  <p className={cn("text-2xl font-bold font-heading", cfg.color)}>{count}</p>
                  <p className="text-xs text-muted-foreground mt-1">{cfg.threshold}</p>
                </div>
              );
            })}
            <div className="rounded-lg border border-border bg-card px-4 py-4">
              <p className="text-xs text-muted-foreground mb-1">SIMs in Field</p>
              <p className="text-2xl font-bold font-heading">{totalInField.toLocaleString()}</p>
            </div>
            <div className="rounded-lg border border-border bg-card px-4 py-4">
              <p className="text-xs text-muted-foreground mb-1">Pending Safaricom</p>
              <p className="text-2xl font-bold font-heading text-amber-500">{totalPending.toLocaleString()}</p>
            </div>
            <div className="rounded-lg border border-border bg-card px-4 py-4">
              <p className="text-xs text-muted-foreground mb-1">Fraud Flags</p>
              <p className={cn("text-2xl font-bold font-heading", totalFraud > 0 ? "text-destructive" : "text-green-500")}>
                {totalFraud}
              </p>
            </div>
          </div>

          {/* Commission summary */}
          <div className="rounded-lg border border-amber-500/40 bg-card px-5 py-4 flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Confirmed Commission (Safaricom)</p>
              <p className="text-3xl font-bold font-heading text-amber-500 mt-1">
                KES {totalCommission.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-1 italic">
                from {lastReconDate} reconciliation · payable records only
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Internal registered</p>
              <p className="text-2xl font-bold font-heading text-foreground">
                {totalRegistered.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-1">not yet confirmed</p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 rounded-lg border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading text-base font-semibold">Registrations — Last 7 Days</h3>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="inline-block h-2 w-2 rounded-full bg-primary" />Internal
                </span>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,40%,22%)" />
                  <XAxis dataKey="label" tick={{ fill: "hsl(215,17%,47%)", fontSize: 11 }} />
                  <YAxis tick={{ fill: "hsl(215,17%,47%)", fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(222,45%,10%)", border: "1px solid hsl(222,40%,22%)", borderRadius: 8, color: "hsl(214,32%,91%)" }} />
                  <Area type="monotone" dataKey="registered" name="Registered"
                    stroke="hsl(190,100%,50%)" fill="hsl(190,100%,50%)" fillOpacity={0.12} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-lg border border-border bg-card p-5">
              <h3 className="font-heading text-base font-semibold mb-4">Registrations by Agent</h3>
              {topData.length === 0 ? (
                <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
                  No data yet
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={topData} layout="vertical">
                      <XAxis type="number" tick={{ fill: "hsl(215,17%,47%)", fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" tick={{ fill: "hsl(215,17%,47%)", fontSize: 11 }} width={52} />
                      <Tooltip contentStyle={{ backgroundColor: "hsl(222,45%,10%)", border: "1px solid hsl(222,40%,22%)", borderRadius: 8, color: "hsl(214,32%,91%)" }} />
                      <Bar dataKey="value" name="Registered" radius={[0, 4, 4, 0]}>
                        {topData.map((d, i) => (
                          <Cell key={i} fill={BAR_COLORS[d.activity]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
                    {(["active", "idle", "dormant"] as ActivityKey[]).map(s => (
                      <span key={s} className="flex items-center gap-1">
                        <span className="inline-block h-2 w-2 rounded-full" style={{ background: BAR_COLORS[s] }} />
                        {ACT[s].label}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Agent table */}
          <div className="rounded-lg border border-border bg-card">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-border">
              <h3 className="font-heading text-base font-semibold">
                All Agents
                {filter !== "all" && (
                  <span className={cn("ml-2 text-xs font-medium rounded-full px-2 py-0.5", ACT[filter].bg, ACT[filter].color)}>
                    {ACT[filter].label}
                  </span>
                )}
              </h3>
              <div className="flex items-center gap-1 rounded-lg border border-border bg-accent p-1">
                {(["all", "active", "idle", "dormant"] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                      filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {f === "all" ? "All" : ACT[f].label}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-xs">
                    <th className="py-3 px-4 text-left font-medium">Agent</th>
                    <th className="py-3 px-4 text-left font-medium">Team / Branch</th>
                    <th className="py-3 px-4 text-left font-medium">Last Issuance</th>
                    <th className="py-3 px-4 text-right font-medium">SIMs in Field</th>
                    <th className="py-3 px-4 text-right font-medium">Registered <span className="text-amber-500">(internal)</span></th>
                    <th className="py-3 px-4 text-right font-medium">Confirmed <span className="text-green-500">(Safaricom)</span></th>
                    <th className="py-3 px-4 text-right font-medium">Fraud</th>
                    <th className="py-3 px-4 text-right font-medium">Commission</th>
                    <th className="py-3 px-4 text-left font-medium">7d Trend</th>
                    <th className="py-3 px-2" />
                  </tr>
                </thead>
                <tbody>
                  {filteredAgents.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-sm text-muted-foreground">
                        {agents.length === 0
                          ? "No external agents found. Add external agents in Settings to see their performance here."
                          : "No agents match the selected filter."}
                      </td>
                    </tr>
                  ) : (
                    filteredAgents.map(agent => {
                      const activity = activityOf(agent.days_since_issuance);
                      const cfg      = ACT[activity];
                      const pending  = agent.confirmed !== null
                        ? Math.max(0, agent.registered - agent.confirmed)
                        : null;
                      const initials = agent.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
                      const rate = agent.sims_in_field > 0
                        ? Math.round((agent.registered / agent.sims_in_field) * 100)
                        : 0;

                      return (
                        <tr
                          key={agent.id}
                          className={cn(
                            "border-b border-border/50 hover:bg-accent/40 transition-colors cursor-pointer group",
                            activity === "dormant" && "bg-destructive/5",
                            activity === "idle"    && "bg-amber-500/5",
                            agent.fraud_flags > 0  && "bg-destructive/8",
                          )}
                        >
                          {/* Name */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="relative shrink-0">
                                <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                                  {initials}
                                </div>
                                <span className={cn("absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card", cfg.dot)} />
                              </div>
                              <div>
                                <p className="font-medium text-sm">{agent.name}</p>
                                <p className="text-xs text-muted-foreground">{agent.phone}</p>
                              </div>
                            </div>
                          </td>

                          {/* Team / Branch */}
                          <td className="py-3 px-4">
                            <p className="text-xs text-foreground">{agent.van_team_name}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <MapPin className="h-3 w-3 shrink-0" />{agent.branch_name}
                            </p>
                          </td>

                          {/* Last issuance */}
                          <td className="py-3 px-4">
                            <div className="space-y-1">
                              {agent.last_issuance_date ? (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Calendar className="h-3 w-3 shrink-0" />
                                  {new Date(agent.last_issuance_date + "T00:00:00").toLocaleDateString("en-KE", {
                                    day: "numeric", month: "short",
                                  })}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground italic">No issuance</span>
                              )}
                              <DaysBadge days={agent.days_since_issuance} />
                            </div>
                          </td>

                          {/* SIMs in field */}
                          <td className="py-3 px-4 text-right">
                            <p className="font-medium text-sm">{agent.sims_in_field}</p>
                          </td>

                          {/* Registered */}
                          <td className="py-3 px-4 text-right">
                            <p className="font-medium text-sm">{agent.registered}</p>
                            <p className="text-xs text-muted-foreground">{rate}% rate</p>
                          </td>

                          {/* Confirmed */}
                          <td className="py-3 px-4 text-right">
                            {agent.confirmed !== null ? (
                              <div>
                                <p className="text-sm font-medium text-green-500">{agent.confirmed}</p>
                                {pending !== null && pending > 0 && (
                                  <span className="inline-flex items-center gap-1 text-xs text-amber-500">
                                    <Clock className="h-3 w-3" />{pending} pending
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">N/A — no recon</span>
                            )}
                          </td>

                          {/* Fraud */}
                          <td className="py-3 px-4 text-right">
                            {agent.fraud_flags > 0
                              ? <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
                                  <AlertTriangle className="h-3 w-3" />{agent.fraud_flags}
                                </span>
                              : <CheckCircle2 className="h-4 w-4 text-green-500 inline" />
                            }
                          </td>

                          {/* Commission */}
                          <td className="py-3 px-4 text-right">
                            {agent.commission > 0 ? (
                              <>
                                <p className="text-sm font-semibold text-amber-500">KES {agent.commission.toLocaleString()}</p>
                                <p className="text-xs text-muted-foreground italic">confirmed</p>
                              </>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>

                          {/* Sparkline */}
                          <td className="py-3 px-4">
                            <Sparkline data={agent.trend} activity={activity} />
                          </td>

                          <td className="py-3 px-2">
                            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between px-5 py-3 border-t border-border">
              <p className="text-xs text-muted-foreground">
                {filteredAgents.length} of {agents.length} agents
                {filter !== "all" && ` · filtered by ${ACT[filter].label.toLowerCase()}`}
              </p>
            </div>
          </div>

          {/* Recon CTA */}
          {unreconciledCount > 0 && (
            <div className="rounded-lg border border-border bg-card px-5 py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <RefreshCw className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Confirm these figures with Safaricom</p>
                  <p className="text-xs text-muted-foreground">
                    {unreconciledCount} agent{unreconciledCount !== 1 ? "s" : ""} have no reconciliation data yet.
                    Upload a report to resolve pending registrations.
                  </p>
                </div>
              </div>
              <button
                onClick={handleNavigateRecon}
                className="shrink-0 rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
              >
                Run Reconciliation
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}