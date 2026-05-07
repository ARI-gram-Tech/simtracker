// src/pages/branch/Dashboard.tsx
import { useMemo } from "react";
import { Package, Send, CornerDownLeft, Users, Truck } from "lucide-react";
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
import { useBranch } from "@/hooks/useDealers";

// ── Movement type → dot colour ────────────────────────────────────────────────
const TYPE_COLORS: Record<string, string> = {
  issue:    "bg-primary",
  return:   "bg-success",
  receive:  "bg-blue-500",
  transfer: "bg-secondary",
};

function movementLabel(m: { movement_type: string; quantity?: number; serial_number?: string }): string {
  const qty = m.quantity ?? 1;
  switch (m.movement_type) {
    case "issue":    return `Issued ${qty} SIM${qty !== 1 ? "s" : ""}`;
    case "return":   return `${qty} SIM${qty !== 1 ? "s" : ""} returned`;
    case "receive":  return `Received ${qty} SIM${qty !== 1 ? "s" : ""} from warehouse`;
    case "transfer": return `Transferred ${qty} SIM${qty !== 1 ? "s" : ""}`;
    default:         return m.movement_type.replace(/_/g, " ");
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BranchDashboard() {
  const { user } = useAuth();
  const dealerId = user?.dealer_id  ? Number(user.dealer_id)  : undefined;
  const branchId = user?.branch_id  ? Number(user.branch_id)  : undefined;

  // ── Data fetching ─────────────────────────────────────────────────────────
  const { data: branch }                          = useBranch(dealerId, branchId);
  const { data: live,  isLoading: liveLoading }   = useLivePerformance({ branch: branchId });
  const { data: simsData }                        = useSIMs({ branch: branchId, page_size: 1 } as never);
  const { data: vanTeams = [], isLoading: vansLoading } = useVanTeams(dealerId, branchId);
  const { data: movementsData, isLoading: movLoading }  = useAllSIMMovements({ from_branch: branchId });

  // ── Derived values ────────────────────────────────────────────────────────
  const kpis    = live?.kpis;
  const byBA  = useMemo(() => live?.by_ba  ?? [], [live?.by_ba]);
  const trend = useMemo(() => live?.trend  ?? [], [live?.trend]);

  const stockCount   = simsData?.count            ?? 0;
  const inField      = kpis?.in_field             ?? 0;
  const registered   = kpis?.registered           ?? 0;
  const confirmed    = kpis?.confirmed            ?? 0;
  const activeVans   = vanTeams.filter(v => v.is_active).length;

  // Count unique BAs across all van members + direct BAs in by_ba
  const totalBAs = useMemo(() => {
    const vanMemberIds = new Set(
      vanTeams.flatMap(v => v.members.map(m => m.agent))
    );
    const directBAs = byBA.filter(ba => !vanMemberIds.has(ba.id));
    return vanMemberIds.size + directBAs.length;
  }, [vanTeams, byBA]);

  // ── Trend chart ───────────────────────────────────────────────────────────
  const chartData = useMemo(() =>
    trend.map(t => ({
      day:        t.label,
      issued:     t.registered,   // closest proxy — issued→field
      registered: t.confirmed,
    })),
    [trend]
  );

  // ── Activity feed (top 6 most recent movements) ───────────────────────────
  const activities = useMemo(() => {
    const raw = Array.isArray(movementsData)
      ? movementsData
      : (movementsData as { results?: unknown[] })?.results ?? [];
    return [...raw]
      .sort((a: never, b: never) =>
        new Date((b as { created_at: string }).created_at).getTime() -
        new Date((a as { created_at: string }).created_at).getTime()
      )
      .slice(0, 6)
      .map((m: never) => {
        const mv = m as { movement_type: string; created_at: string; quantity?: number };
        return {
          type:  mv.movement_type,
          text:  movementLabel(mv),
          time:  new Date(mv.created_at).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" }),
        };
      });
  }, [movementsData]);

  // ── Van table rows ────────────────────────────────────────────────────────
  const vanRows = useMemo(() =>
    vanTeams.map(v => {
      const ba = byBA.find(b => {
        // match by van_team_id if available
        return (b as { van_team_id?: number }).van_team_id === v.id;
      });
      return {
        id:           v.id,
        name:         v.name,
        leader:       v.leader_details?.full_name ?? "—",
        memberCount:  v.members.length,
        confirmed:    ba?.confirmed     ?? 0,
        inField:      ba?.sims_in_field ?? 0,
        isActive:     v.is_active,
      };
    }),
    [vanTeams, byBA]
  );

  // ── BA rows (branch-scoped) ───────────────────────────────────────────────
  const baRows = useMemo(() =>
    [...byBA]
      .sort((a, b) => b.confirmed - a.confirmed)
      .slice(0, 8),
    [byBA]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Branch Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {branch?.name ?? "Loading…"} — full branch overview
        </p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          icon={Package} iconColor="text-primary"
          value={liveLoading ? "—" : stockCount.toLocaleString()}
          label="SIMs at Branch"
          sub="In stock"
        />
        <KpiCard
          icon={Send} iconColor="text-blue-500"
          value={liveLoading ? "—" : inField.toLocaleString()}
          label="Distributed"
          sub="To vans & BAs"
        />
        <KpiCard
          icon={Truck} iconColor="text-secondary"
          value={vansLoading ? "—" : String(activeVans)}
          label="Active Vans"
          sub="Under this branch"
        />
        <KpiCard
          icon={Users} iconColor="text-success"
          value={liveLoading ? "—" : String(totalBAs)}
          label="Brand Ambassadors"
          sub="Direct + via vans"
        />
        <KpiCard
          icon={CornerDownLeft} iconColor="text-warning"
          value={liveLoading ? "—" : registered.toLocaleString()}
          label="Registered"
          sub={confirmed ? `${confirmed.toLocaleString()} confirmed` : "Safaricom confirmed"}
        />
      </div>

      {/* Chart + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 rounded-lg border border-border bg-card p-5">
          <h3 className="font-heading text-lg font-semibold mb-4 text-foreground">
            Issued vs Registered — This Week
          </h3>
          {liveLoading ? (
            <div className="flex items-center justify-center h-[240px] text-muted-foreground text-sm">
              Loading chart…
            </div>
          ) : chartData.length === 0 ? (
            <div className="flex items-center justify-center h-[240px] text-muted-foreground text-sm italic">
              No trend data available yet.
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
          <h3 className="font-heading text-lg font-semibold mb-4 text-foreground">Today's Activity</h3>
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

      {/* Vans table */}
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="font-heading text-lg font-semibold mb-4 text-foreground">Vans Under This Branch</h3>
        {vansLoading ? (
          <p className="text-sm text-muted-foreground text-center py-6">Loading vans…</p>
        ) : vanRows.length === 0 ? (
          <p className="text-sm text-muted-foreground italic text-center py-6">No vans assigned to this branch.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="pb-3 text-left font-medium">Van</th>
                  <th className="pb-3 text-left font-medium">Team Leader</th>
                  <th className="pb-3 text-right font-medium">Members</th>
                  <th className="pb-3 text-right font-medium">In Field</th>
                  <th className="pb-3 text-right font-medium">Confirmed</th>
                  <th className="pb-3 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {vanRows.map(van => (
                  <tr key={van.id} className="border-b border-border/50 hover:bg-accent/50 transition-colors">
                    <td className="py-3 font-mono text-xs text-primary">{van.name}</td>
                    <td className="py-3 font-medium text-foreground">{van.leader}</td>
                    <td className="py-3 text-right">{van.memberCount}</td>
                    <td className="py-3 text-right">{van.inField}</td>
                    <td className="py-3 text-right text-success font-medium">{van.confirmed}</td>
                    <td className="py-3">
                      {van.isActive
                        ? <span className="text-xs text-success">Active</span>
                        : <span className="text-xs text-muted-foreground">Inactive</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* BAs table */}
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="font-heading text-lg font-semibold mb-4 text-foreground">Top BAs — This Branch</h3>
        {liveLoading ? (
          <p className="text-sm text-muted-foreground text-center py-6">Loading…</p>
        ) : baRows.length === 0 ? (
          <p className="text-sm text-muted-foreground italic text-center py-6">No BA data available.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="pb-3 text-left font-medium">Name</th>
                  <th className="pb-3 text-left font-medium">Van Team</th>
                  <th className="pb-3 text-right font-medium">In Field</th>
                  <th className="pb-3 text-right font-medium">Registered</th>
                  <th className="pb-3 text-right font-medium">Confirmed</th>
                  <th className="pb-3 text-right font-medium">Fraud Flags</th>
                </tr>
              </thead>
              <tbody>
                {baRows.map(ba => (
                  <tr key={ba.id} className={cn(
                    "border-b border-border/50 hover:bg-accent/50 transition-colors",
                    ba.fraud_flags > 0 && "bg-destructive/5"
                  )}>
                    <td className="py-3 font-medium text-foreground">{ba.name}</td>
                    <td className="py-3 text-muted-foreground">{ba.van_team_name || "Direct"}</td>
                    <td className="py-3 text-right">{ba.sims_in_field}</td>
                    <td className="py-3 text-right">{ba.registered}</td>
                    <td className="py-3 text-right text-success font-medium">{ba.confirmed}</td>
                    <td className="py-3 text-right">
                      {ba.fraud_flags > 0
                        ? <span className="text-destructive font-medium">{ba.fraud_flags}</span>
                        : <span className="text-muted-foreground">—</span>
                      }
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