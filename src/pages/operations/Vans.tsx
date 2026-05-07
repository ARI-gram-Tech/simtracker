// src/pages/operations/Vans.tsx
import { useMemo, useState } from "react";
import { Truck, Users, Building2, Search, CheckCircle, XCircle, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useBranches, useAllVanTeams } from "@/hooks/useDealers";
import { cn } from "@/lib/utils";

function fmt(n?: number) {
  if (n == null) return "—";
  return n.toLocaleString();
}

function StatusChip({ active }: { active: boolean }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
      active
        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
        : "bg-red-500/10 text-red-400 border border-red-500/20"
    )}>
      {active
        ? <><CheckCircle className="w-3 h-3" /> Active</>
        : <><XCircle className="w-3 h-3" /> Inactive</>
      }
    </span>
  );
}

export default function VansPage() {
  const { user } = useAuth();
  const dealerId = user?.dealer_id ?? undefined;

  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState<number | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const { data: branches = [], isLoading: branchesLoading } = useBranches(dealerId);
  const { data: allVans = [], isLoading: vansLoading } = useAllVanTeams(dealerId, branches);

  // Map branch id → name for display
  const branchMap = useMemo(() => {
    const map: Record<number, string> = {};
    for (const b of branches) map[b.id] = b.name;
    return map;
  }, [branches]);

  const filtered = useMemo(() => {
    return allVans.filter(van => {
      const matchSearch =
        van.name.toLowerCase().includes(search.toLowerCase()) ||
        van.leader_details?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        branchMap[van.branch]?.toLowerCase().includes(search.toLowerCase());
      const matchBranch = branchFilter === "all" || van.branch === branchFilter;
      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && van.is_active) ||
        (statusFilter === "inactive" && !van.is_active);
      return matchSearch && matchBranch && matchStatus;
    });
  }, [allVans, search, branchFilter, statusFilter, branchMap]);

  const stats = useMemo(() => ({
    total: allVans.length,
    active: allVans.filter(v => v.is_active).length,
    totalMembers: allVans.reduce((acc, v) => acc + (v.members?.length ?? 0), 0),
    withLeader: allVans.filter(v => v.leader != null).length,
  }), [allVans]);

  const isLoading = branchesLoading || vansLoading;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Van Teams</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          All van teams across all branches
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Vans", value: fmt(stats.total), icon: Truck, color: "text-primary" },
          { label: "Active", value: fmt(stats.active), icon: CheckCircle, color: "text-emerald-400" },
          { label: "Total BAs", value: fmt(stats.totalMembers), icon: Users, color: "text-blue-400" },
          { label: "With Leader", value: fmt(stats.withLeader), icon: User, color: "text-amber-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <div className={cn("p-2 rounded-lg bg-muted", color)}>
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-xl font-bold text-foreground">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search van teams…"
            className="w-full pl-9 pr-4 py-2 text-sm bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* Branch filter */}
        <select
          value={branchFilter}
          onChange={e => setBranchFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
          className="px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="all">All Branches</option>
          {branches.map(b => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>

        {/* Status filter */}
        <div className="flex gap-2">
          {(["all", "active", "inactive"] as const).map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={cn(
                "px-3 py-2 text-xs font-medium rounded-lg capitalize transition-colors",
                statusFilter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Van cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-5 animate-pulse space-y-3">
              <div className="h-4 bg-muted rounded w-1/2" />
              <div className="h-3 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Truck className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm">No van teams found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(van => (
            <div
              key={van.id}
              className="bg-card border border-border rounded-xl p-5 space-y-4 hover:border-primary/40 transition-colors"
            >
              {/* Card header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Truck className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">{van.name}</h3>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <Building2 className="w-3 h-3" />
                      <span>{branchMap[van.branch] ?? `Branch ${van.branch}`}</span>
                    </div>
                  </div>
                </div>
                <StatusChip active={van.is_active} />
              </div>

              {/* Leader */}
              <div className="flex items-center gap-2 text-xs">
                <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                {van.leader_details ? (
                  <span className="text-foreground font-medium">{van.leader_details.full_name}</span>
                ) : (
                  <span className="text-muted-foreground/50 italic">No leader assigned</span>
                )}
              </div>

              {/* Members list (first 3) */}
              {van.members && van.members.length > 0 ? (
                <div className="space-y-1">
                  {van.members.slice(0, 3).map(m => (
                    <div key={m.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-foreground shrink-0">
                        {m.agent_details?.full_name?.[0] ?? "?"}
                      </div>
                      <span className="truncate">{m.agent_details?.full_name ?? `Agent ${m.agent}`}</span>
                    </div>
                  ))}
                  {van.members.length > 3 && (
                    <p className="text-xs text-muted-foreground pl-7">
                      +{van.members.length - 3} more
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground/50 italic">No members yet</p>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Users className="w-3.5 h-3.5 text-blue-400" />
                  <span>
                    <span className="font-semibold text-foreground">{van.members?.length ?? 0}</span> members
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Since {new Date(van.created_at).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}