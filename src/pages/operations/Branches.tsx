// src/pages/operations/Branches.tsx
import { useMemo, useState } from "react";
import { Building2, Users, Truck, Phone, MapPin, Plus, MoreVertical, Search, CheckCircle, XCircle, Warehouse } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useBranches } from "@/hooks/useDealers";
import { useAllVanTeams } from "@/hooks/useDealers";
import { useSIMs } from "@/hooks/useInventory";
import { cn } from "@/lib/utils";

// ── helpers ──────────────────────────────────────────────────────────────────
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

// ── main ─────────────────────────────────────────────────────────────────────
export default function BranchesPage() {
  const { user } = useAuth();
  const dealerId = user?.dealer_id ?? undefined;

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");

  const { data: branches = [], isLoading } = useBranches(dealerId);
  const { data: allVans = [], isLoading: vansLoading } = useAllVanTeams(dealerId, branches);

  // SIM counts per branch — one call each using branch filter
  const simQueries = branches.map(b => ({ branchId: b.id }));
  // We'll derive van counts from allVans
  const vanCountByBranch = useMemo(() => {
    const map: Record<number, number> = {};
    for (const van of allVans) {
      map[van.branch] = (map[van.branch] ?? 0) + 1;
    }
    return map;
  }, [allVans]);

  const memberCountByBranch = useMemo(() => {
    const map: Record<number, number> = {};
    for (const van of allVans) {
      map[van.branch] = (map[van.branch] ?? 0) + (van.members?.length ?? 0);
    }
    return map;
  }, [allVans]);

  const filtered = useMemo(() => {
    return branches.filter(b => {
      const matchSearch =
        b.name.toLowerCase().includes(search.toLowerCase()) ||
        b.address?.toLowerCase().includes(search.toLowerCase()) ||
        b.manager_details?.full_name?.toLowerCase().includes(search.toLowerCase());
      const matchFilter =
        filter === "all" ||
        (filter === "active" && b.is_active) ||
        (filter === "inactive" && !b.is_active);
      return matchSearch && matchFilter;
    });
  }, [branches, search, filter]);

  const stats = useMemo(() => ({
    total: branches.length,
    active: branches.filter(b => b.is_active).length,
    warehouse: branches.filter(b => b.is_warehouse).length,
    totalVans: allVans.length,
  }), [branches, allVans]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Branches</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            All branches under your dealership
          </p>
        </div>
      </div>

      {/* Summary KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Branches", value: fmt(stats.total), icon: Building2, color: "text-primary" },
          { label: "Active", value: fmt(stats.active), icon: CheckCircle, color: "text-emerald-400" },
          { label: "Warehouses", value: fmt(stats.warehouse), icon: Warehouse, color: "text-amber-400" },
          { label: "Total Van Teams", value: vansLoading ? "—" : fmt(stats.totalVans), icon: Truck, color: "text-blue-400" },
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
            placeholder="Search branches…"
            className="w-full pl-9 pr-4 py-2 text-sm bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "active", "inactive"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-2 text-xs font-medium rounded-lg capitalize transition-colors",
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Branch cards grid */}
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
          <Building2 className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm">No branches found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(branch => {
            const vanCount = vanCountByBranch[branch.id] ?? 0;
            const memberCount = memberCountByBranch[branch.id] ?? 0;
            return (
              <div
                key={branch.id}
                className="bg-card border border-border rounded-xl p-5 space-y-4 hover:border-primary/40 transition-colors"
              >
                {/* Card header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-lg",
                      branch.is_warehouse ? "bg-amber-500/10" : "bg-primary/10"
                    )}>
                      {branch.is_warehouse
                        ? <Warehouse className="w-4 h-4 text-amber-400" />
                        : <Building2 className="w-4 h-4 text-primary" />
                      }
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground text-sm leading-tight">
                        {branch.name}
                      </h3>
                      {branch.is_warehouse && (
                        <span className="text-xs text-amber-400">Warehouse</span>
                      )}
                    </div>
                  </div>
                  <StatusChip active={branch.is_active} />
                </div>

                {/* Meta info */}
                <div className="space-y-1.5">
                  {branch.manager_details ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Users className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{branch.manager_details.full_name}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground/50 italic">
                      <Users className="w-3.5 h-3.5 shrink-0" />
                      <span>No manager assigned</span>
                    </div>
                  )}
                  {branch.phone && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Phone className="w-3.5 h-3.5 shrink-0" />
                      <span>{branch.phone}</span>
                    </div>
                  )}
                  {branch.address && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{branch.address}</span>
                    </div>
                  )}
                </div>

                {/* Stats row */}
                <div className="flex items-center gap-4 pt-2 border-t border-border">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Truck className="w-3.5 h-3.5 text-blue-400" />
                    <span><span className="font-semibold text-foreground">{vanCount}</span> vans</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Users className="w-3.5 h-3.5 text-emerald-400" />
                    <span><span className="font-semibold text-foreground">{memberCount}</span> BAs</span>
                  </div>
                  <div className="ml-auto text-xs text-muted-foreground">
                    Since {new Date(branch.created_at).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}