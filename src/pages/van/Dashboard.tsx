// src/pages/van/Dashboard.tsx
import { useMemo } from "react";
import { Package, Send, CornerDownLeft, Users } from "lucide-react";
import { KpiCard } from "@/components/KpiCard";
import { cn } from "@/lib/utils";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { useLivePerformance } from "@/hooks/useReports";
import { useSIMs, useAllSIMMovements } from "@/hooks/useInventory";
import { useVanTeams } from "@/hooks/useDealers";

// ── Movement dot colours ──────────────────────────────────────────────────────
const TYPE_COLORS: Record<string, string> = {
  issue:    "bg-primary",
  return:   "bg-success",
  receive:  "bg-blue-500",
  transfer: "bg-secondary",
  flag:     "bg-destructive",
  register: "bg-warning",
};

function movementLabel(m: {
  movement_type: string;
  from_user?: { full_name: string } | null;
  to_user?:   { full_name: string } | null;
}): string {
  const from = m.from_user?.full_name ?? "—";
  const to   = m.to_user?.full_name   ?? "—";
  switch (m.movement_type) {
    case "issue":    return `Issued SIMs to ${to}`;
    case "return":   return `${from} returned SIMs`;
    case "receive":  return `Received SIMs from warehouse`;
    case "transfer": return `Transferred from ${from} to ${to}`;
    case "register": return `SIM registered by ${from}`;
    case "flag":     return `SIM flagged`;
    default:         return m.movement_type.replace(/_/g, " ");
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function VanDashboard() {
  const { user } = useAuth();
  const dealerId  = user?.dealer_id   ? Number(user.dealer_id)   : undefined;
  const branchId  = user?.branch_id   ? Number(user.branch_id)   : undefined;
  const vanTeamId = user?.van_team_id ? Number(user.van_team_id) : undefined;

  // ── Data fetching ─────────────────────────────────────────────────────────
  const { data: live,        isLoading: liveLoading  } = useLivePerformance({ branch: branchId });
  const { data: simsData                             } = useSIMs({ van_team: vanTeamId, page_size: 1 } as never);
  const { data: vanTeams = []                        } = useVanTeams(dealerId, branchId);
  const { data: movementsRaw, isLoading: movLoading  } = useAllSIMMovements({ from_branch: branchId });

  // ── My van details ────────────────────────────────────────────────────────
  const myVan = useMemo(
    () => vanTeams.find(v => v.id === vanTeamId),
    [vanTeams, vanTeamId]
  );

  // ── Derived from live performance ─────────────────────────────────────────
  const kpis   = live?.kpis;
  const byBA   = useMemo(() => live?.by_ba   ?? [], [live?.by_ba]);
  const byVan  = useMemo(() => live?.by_van  ?? [], [live?.by_van]);
  const trend  = useMemo(() => live?.trend   ?? [], [live?.trend]);

  // My van's performance from by_van
  const myVanStats = useMemo(
    () => byVan.find(v => v.id === vanTeamId),
    [byVan, vanTeamId]
  );

  // My van members' IDs
  const memberIds = useMemo(
    () => new Set(myVan?.members.map(m => m.agent) ?? []),
    [myVan]
  );

  // BAs belonging to my van
  const myBAs = useMemo(
    () => byBA.filter(ba => memberIds.has(ba.id)),
    [byBA, memberIds]
  );

  // ── KPI values ────────────────────────────────────────────────────────────
  const simsWithVan  = (simsData as { count?: number } | undefined)?.count ?? myVanStats?.sims_in_field ?? 0;
  const memberCount  = myVan?.members.length ?? 0;
  const registered   = myVanStats?.registered ?? 0;
  const confirmed    = myVanStats?.confirmed  ?? 0;

  // ── Trend chart ───────────────────────────────────────────────────────────
  const chartData = useMemo(() =>
    trend.map(t => ({
      day:        t.label,
      issued:     t.registered,
      registered: t.confirmed,
    })),
    [trend]
  );

  // ── Activity feed ─────────────────────────────────────────────────────────
  const activities = useMemo(() => {
    const raw = Array.isArray(movementsRaw)
      ? movementsRaw
      : (movementsRaw as { results?: unknown[] } | undefined)?.results ?? [];
    return [...raw]
      .sort((a, b) =>
        new Date((b as { created_at: string }).created_at).getTime() -
        new Date((a as { created_at: string }).created_at).getTime()
      )
      .slice(0, 6)
      .map((m) => {
        const mv = m as {
          movement_type: string;
          created_at: string;
          from_user?: { full_name: string } | null;
          to_user?:   { full_name: string } | null;
        };
        return {
          type: mv.movement_type,
          text: movementLabel(mv),
          time: new Date(mv.created_at).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" }),
        };
      });
  }, [movementsRaw]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Van Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {myVan?.name ?? "My Van"} — full van overview
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={Package} iconColor="text-primary"
          value={liveLoading ? "—" : simsWithVan.toLocaleString()}
          label="SIMs With Van"
          sub="Currently held"
        />
        <KpiCard
          icon={Send} iconColor="text-blue-500"
          value={liveLoading ? "—" : registered.toLocaleString()}
          label="Registered"
          sub="By my BAs"
        />
        <KpiCard
          icon={Users} iconColor="text-success"
          value={String(memberCount)}
          label="My BAs"
          sub="Van team members"
        />
        <KpiCard
          icon={CornerDownLeft} iconColor="text-warning"
          value={liveLoading ? "—" : confirmed.toLocaleString()}
          label="Confirmed Active"
          sub="Safaricom confirmed"
        />
      </div>

      {/* Chart + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 rounded-lg border border-border bg-card p-5">
          <h3 className="font-heading text-lg font-semibold text-foreground mb-4">
            Issued vs Registered — This Week
          </h3>
          {liveLoading ? (
            <div className="flex items-center justify-center h-[240px] text-muted-foreground text-sm">
              Loading chart…
            </div>
          ) : chartData.length === 0 ? (
            <div className="flex items-center justify-center h-[240px] text-muted-foreground text-sm italic">
              No trend data yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 40%, 22%)" />
                <XAxis dataKey="day"        tick={{ fill: "hsl(215, 17%, 47%)", fontSize: 12 }} />
                <YAxis                      tick={{ fill: "hsl(215, 17%, 47%)", fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(222, 45%, 10%)", border: "1px solid hsl(222, 40%, 22%)", borderRadius: 8, color: "hsl(214, 32%, 91%)" }} />
                <Area type="monotone" dataKey="issued"     name="Issued"     stroke="hsl(190,100%,50%)" fill="hsl(190,100%,50%)" fillOpacity={0.15} />
                <Area type="monotone" dataKey="registered" name="Registered" stroke="hsl(160,60%,45%)"  fill="hsl(160,60%,45%)"  fillOpacity={0.15} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="lg:col-span-2 rounded-lg border border-border bg-card p-5">
          <h3 className="font-heading text-lg font-semibold text-foreground mb-4">Today's Activity</h3>
          {movLoading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Loading…</p>
          ) : activities.length === 0 ? (
            <p className="text-sm text-muted-foreground italic text-center py-8">No activity today.</p>
          ) : (
            <div className="space-y-4">
              {activities.map((e, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={cn("h-2.5 w-2.5 rounded-full mt-1 shrink-0", TYPE_COLORS[e.type] ?? "bg-muted-foreground")} />
                    {i < activities.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
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

      {/* My BAs table */}
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="font-heading text-lg font-semibold text-foreground mb-4">My BAs</h3>
        {liveLoading ? (
          <p className="text-sm text-muted-foreground text-center py-6">Loading…</p>
        ) : myBAs.length === 0 ? (
          <p className="text-sm text-muted-foreground italic text-center py-6">
            No BAs assigned to this van yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="pb-3 text-left font-medium">Name</th>
                  <th className="pb-3 text-right font-medium">SIMs In Field</th>
                  <th className="pb-3 text-right font-medium">Registered</th>
                  <th className="pb-3 text-right font-medium">Confirmed</th>
                  <th className="pb-3 text-right font-medium">Fraud Flags</th>
                  <th className="pb-3 text-right font-medium">Commission</th>
                </tr>
              </thead>
              <tbody>
                {myBAs.map(ba => (
                  <tr
                    key={ba.id}
                    className={cn(
                      "border-b border-border/50 hover:bg-accent/50 transition-colors",
                      ba.fraud_flags > 0 && "bg-destructive/5"
                    )}
                  >
                    <td className="py-3 font-medium text-foreground">{ba.name}</td>
                    <td className="py-3 text-right">{ba.sims_in_field}</td>
                    <td className="py-3 text-right">{ba.registered}</td>
                    <td className="py-3 text-right text-success font-medium">{ba.confirmed}</td>
                    <td className="py-3 text-right">
                      {ba.fraud_flags > 0
                        ? <span className="text-destructive font-medium">{ba.fraud_flags}</span>
                        : <span className="text-muted-foreground">—</span>
                      }
                    </td>
                    <td className="py-3 text-right text-success font-medium">
                      KES {ba.commission.toLocaleString()}
                    </td>
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