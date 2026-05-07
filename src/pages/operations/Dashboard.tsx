// src/pages/operations/Dashboard.tsx
import { useMemo } from "react";
import { Package, Send, CornerDownLeft, CheckSquare } from "lucide-react";
import { KpiCard } from "@/components/KpiCard";
import { cn } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { useLivePerformance } from "@/hooks/useReports";
import { useSIMs, useAllSIMMovements } from "@/hooks/useInventory";

// ── Movement dot colours ──────────────────────────────────────────────────────
const MOVE_COLORS: Record<string, string> = {
  issue:    "bg-primary",
  return:   "bg-success",
  receive:  "bg-blue-500",
  transfer: "bg-secondary",
  flag:     "bg-destructive",
  register: "bg-warning",
};

function movementText(m: {
  movement_type: string;
  from_user?:   { full_name: string } | null;
  to_user?:     { full_name: string } | null;
  from_branch?: { name: string } | null;
  to_branch?:   { name: string } | null;
  van_team?:    number | null;
}): string {
  const from = m.from_user?.full_name ?? m.from_branch?.name ?? "—";
  const to   = m.to_user?.full_name   ?? m.to_branch?.name   ?? "—";
  switch (m.movement_type) {
    case "issue":    return `${from} issued SIMs to ${to}`;
    case "return":   return `${from} returned SIMs`;
    case "receive":  return `${to} received SIMs from warehouse`;
    case "transfer": return `Transferred from ${from} to ${to}`;
    case "flag":     return `SIM flagged by ${from}`;
    case "register": return `SIM registered by ${from}`;
    default:         return m.movement_type.replace(/_/g, " ");
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function OperationsDashboard() {
  const { user } = useAuth();
  const dealerId = user?.dealer_id ? Number(user.dealer_id) : undefined;

  // ── Data fetching ─────────────────────────────────────────────────────────
  const { data: live,       isLoading: liveLoading } = useLivePerformance();
  const { data: simsData                           } = useSIMs({ page_size: 1 } as never);
  const { data: issuedData                         } = useSIMs({ status: "issued", page_size: 1 } as never);
  const { data: movementsRaw, isLoading: movLoading} = useAllSIMMovements();

  // ── KPI values ────────────────────────────────────────────────────────────
  const kpis        = live?.kpis;
  const inStock     = kpis?.in_stock    ?? (simsData as { count?: number } | undefined)?.count ?? 0;
  const inField     = kpis?.in_field    ?? (issuedData as { count?: number } | undefined)?.count ?? 0;
  const registered  = kpis?.registered  ?? 0;

  // ── Trend → bar chart (last 7 data points) ────────────────────────────────
  const trend = useMemo(() => live?.trend ?? [], [live?.trend]);

  const chartData = useMemo(() =>
    trend.slice(-7).map(t => ({
      day:   t.label,
      count: t.registered,
    })),
    [trend]
  );

  // ── Activity timeline (latest 7 movements) ────────────────────────────────
  const movements = useMemo(() => {
    const raw = Array.isArray(movementsRaw)
      ? movementsRaw
      : (movementsRaw as { results?: unknown[] } | undefined)?.results ?? [];
    return [...raw]
      .sort((a, b) =>
        new Date((b as { created_at: string }).created_at).getTime() -
        new Date((a as { created_at: string }).created_at).getTime()
      )
      .slice(0, 7)
      .map((m) => {
        const mv = m as {
          movement_type: string;
          created_at: string;
          from_user?: { full_name: string } | null;
          to_user?:   { full_name: string } | null;
          from_branch?:{ name: string } | null;
          to_branch?:  { name: string } | null;
          van_team?:   number | null;
        };
        return {
          type: mv.movement_type,
          time: new Date(mv.created_at).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" }),
          text: movementText(mv),
        };
      });
  }, [movementsRaw]);

  // ── Pending returns — SIMs still "issued", grouped by holder ─────────────
  const { data: issuedSims, isLoading: issuedLoading } = useSIMs({ status: "issued" } as never);

  const pendingReturns = useMemo(() => {
    const results = Array.isArray(issuedSims)
      ? issuedSims
      : (issuedSims as { results?: unknown[] } | undefined)?.results ?? [];

    const map = new Map<number, {
      name: string; location: string; count: number;
    }>();

    for (const sim of results as {
      current_holder: number | null;
      current_holder_details: { first_name: string; last_name: string } | null;
      branch_details: { name: string } | null;
      van_team_details: { name: string } | null;
    }[]) {
      if (!sim.current_holder) continue;
      const existing = map.get(sim.current_holder);
      const name = sim.current_holder_details
        ? `${sim.current_holder_details.first_name} ${sim.current_holder_details.last_name}`.trim()
        : `User #${sim.current_holder}`;
      const location = sim.van_team_details?.name ?? sim.branch_details?.name ?? "—";
      if (existing) {
        existing.count++;
      } else {
        map.set(sim.current_holder, { name, location, count: 1 });
      }
    }

    return [...map.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [issuedSims]);

  // Today's returned count — movements of type "return" from today
  const returnedToday = useMemo(() => {
    const raw = Array.isArray(movementsRaw)
      ? movementsRaw
      : (movementsRaw as { results?: unknown[] } | undefined)?.results ?? [];
    const today = new Date().toDateString();
    return (raw as { movement_type: string; created_at: string }[])
      .filter(m => m.movement_type === "return" && new Date(m.created_at).toDateString() === today)
      .length;
  }, [movementsRaw]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Operations Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">Here is what needs your attention today</p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          icon={Package} iconColor="text-primary"
          value={liveLoading ? "—" : inStock.toLocaleString()}
          label="SIMs In Stock"
          sub="Available to issue"
        />
        <KpiCard
          icon={Send} iconColor="text-blue-500"
          value={liveLoading ? "—" : inField.toLocaleString()}
          label="In Field"
          sub="Issued to BAs & vans"
        />
        <KpiCard
          icon={CornerDownLeft} iconColor="text-success"
          value={movLoading ? "—" : returnedToday.toLocaleString()}
          label="Returned Today"
          sub="From movements today"
        />
        <KpiCard
          icon={CheckSquare} iconColor="text-secondary"
          value={liveLoading ? "—" : registered.toLocaleString()}
          label="Registered"
          sub="Net registrations"
        />
      </div>

      {/* Chart + Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="font-heading text-lg font-semibold text-foreground mb-4">
            Daily Registrations — Last 7 Days
          </h3>
          {liveLoading ? (
            <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
              Loading chart…
            </div>
          ) : chartData.length === 0 ? (
            <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm italic">
              No trend data yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 40%, 22%)" />
                <XAxis dataKey="day"   tick={{ fill: "hsl(215, 17%, 47%)", fontSize: 12 }} />
                <YAxis                 tick={{ fill: "hsl(215, 17%, 47%)", fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(222, 45%, 10%)", border: "1px solid hsl(222, 40%, 22%)", borderRadius: 8, color: "hsl(214, 32%, 91%)" }} />
                <Bar dataKey="count" name="Registrations" fill="hsl(190, 100%, 50%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="font-heading text-lg font-semibold text-foreground mb-4">Activity Timeline</h3>
          {movLoading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Loading…</p>
          ) : movements.length === 0 ? (
            <p className="text-sm text-muted-foreground italic text-center py-8">No activity yet.</p>
          ) : (
            <div className="space-y-4 overflow-y-auto max-h-[280px] pr-2">
              {movements.map((e, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={cn("h-2.5 w-2.5 rounded-full mt-1.5 shrink-0", MOVE_COLORS[e.type] ?? "bg-muted-foreground")} />
                    {i < movements.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{e.time}</p>
                    <p className="text-sm text-foreground">{e.text}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pending Returns */}
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="font-heading text-lg font-semibold text-foreground">Pending SIM Returns</h3>
        <p className="text-sm text-muted-foreground mb-4">BAs who currently have issued SIMs</p>
        {issuedLoading ? (
          <p className="text-sm text-muted-foreground text-center py-6">Loading…</p>
        ) : pendingReturns.length === 0 ? (
          <p className="text-sm text-muted-foreground italic text-center py-6">No outstanding SIMs — all clear!</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="pb-3 text-left font-medium">BA Name</th>
                  <th className="pb-3 text-left font-medium">Branch / Van</th>
                  <th className="pb-3 text-right font-medium">Outstanding SIMs</th>
                </tr>
              </thead>
              <tbody>
                {pendingReturns.map((r, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-accent/50 transition-colors">
                    <td className="py-3 text-foreground font-medium">{r.name}</td>
                    <td className="py-3 text-muted-foreground">{r.location}</td>
                    <td className="py-3 text-right font-medium text-warning">{r.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}