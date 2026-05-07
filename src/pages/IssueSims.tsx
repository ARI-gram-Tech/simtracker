// src/pages/IssueSims.tsx
import { useState, useMemo } from "react";
import {
  Building, Truck, User, Store, Plus, X, Loader2,
  AlertCircle, PackageSearch, Check, Filter, ChevronLeft, ChevronRight,
  ShieldAlert, Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useBranches, useAllVanTeams } from "@/hooks/useDealers";
import { useUsers } from "@/hooks/useUsers";
import { useBulkIssueSIMs, useSIMs, useAllSIMMovements } from "@/hooks/useInventory";
import { showSuccess, showError } from "@/lib/toast";
import type { Branch, VanTeam } from "@/types/dealers.types";
import type { UserProfile } from "@/types/auth.types";
import type { SIM } from "@/types/inventory.types";

// ─── Permission matrix (mirrors Settings.tsx) ─────────────────────────────────

const ISSUE_PERMISSIONS = {
  dealer_owner: {
    canView:          true,
    canIssueToBranch: true,
    canIssueToVan:    true,
    canIssueToBA:     true,
    canIssueToAgent:  true,
  },
  operations_manager: {
    canView:          true,
    canIssueToBranch: true,
    canIssueToVan:    true,
    canIssueToBA:     true,
    canIssueToAgent:  true,
  },
  branch_manager: {
    canView:          true,
    canIssueToBranch: false,
    canIssueToVan:    true,
    canIssueToBA:     true,
    canIssueToAgent:  false,
  },
  van_team_leader: {
    canView:          true,
    canIssueToBranch: false,
    canIssueToVan:    false,
    canIssueToBA:     true,
    canIssueToAgent:  false,
  },
  brand_ambassador: {
    canView:          false,
    canIssueToBranch: false,
    canIssueToVan:    false,
    canIssueToBA:     false,
    canIssueToAgent:  false,
  },
  external_agent: {
    canView:          false,
    canIssueToBranch: false,
    canIssueToVan:    false,
    canIssueToBA:     false,
    canIssueToAgent:  false,
  },
  finance: {
    canView:          false,
    canIssueToBranch: false,
    canIssueToVan:    false,
    canIssueToBA:     false,
    canIssueToAgent:  false,
  },
} as const;

type IssueRole = keyof typeof ISSUE_PERMISSIONS;

// ─── Destination types ────────────────────────────────────────────────────────

const ALL_DEST_TYPES = [
  { id: "branch", label: "Branch",          icon: Building, permKey: "canIssueToBranch" as const },
  { id: "van",    label: "Van Team",         icon: Truck,    permKey: "canIssueToVan"    as const },
  { id: "ba",     label: "Brand Ambassador", icon: User,     permKey: "canIssueToBA"     as const },
  { id: "agent",  label: "External Agent",   icon: Store,    permKey: "canIssueToAgent"  as const },
];

const PICKER_PAGE_SIZE = 20;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcCount(start: string, end: string): number | null {
  const s = parseInt(start), e = parseInt(end);
  if (isNaN(s) || isNaN(e) || e < s) return null;
  return e - s + 1;
}

function buildSerialRange(start: string, end: string): string[] {
  const s = parseInt(start), e = parseInt(end);
  const serials: string[] = [];
  const padLen = Math.max(start.length, end.length);
  for (let i = s; i <= e; i++) serials.push(String(i).padStart(padLen, "0"));
  return serials;
}

// ─── Stock Picker Panel ───────────────────────────────────────────────────────

function StockPickerPanel({
  onClose, simTab, serialList, onAddSerial, onRemoveSerial, onSelectRange,
  branches, scopeParams,
}: {
  onClose: () => void;
  simTab: "single" | "range";
  serialList: string[];
  onAddSerial: (serial: string) => void;
  onRemoveSerial: (serial: string) => void;
  onSelectRange: (start: string, end: string) => void;
  branches: Branch[];
  scopeParams: Record<string, string | number>;
}) {
  const [branchFilter,  setBranchFilter]  = useState("");
  const [searchFilter,  setSearchFilter]  = useState("");
  const [rangeSelected, setRangeSelected] = useState<string[]>([]);
  const [page,          setPage]          = useState(1);

  const filterParams = useMemo(() => ({
    status: "in_stock" as const,
    ...scopeParams,
    ...(!scopeParams.branch && branchFilter ? { branch: Number(branchFilter) } : {}),
    ...(searchFilter.trim() ? { search: searchFilter.trim() } : {}),
    page,
  }), [scopeParams, branchFilter, searchFilter, page]);

  const { data: simsData, isLoading } = useSIMs(filterParams);
  const visibleSIMs: SIM[] = useMemo(() => simsData?.results ?? [], [simsData?.results]);
  const totalCount = simsData?.count ?? 0;
  const totalPages = Math.ceil(totalCount / PICKER_PAGE_SIZE);

  const handleRangeToggle = (serial: string) => {
    setRangeSelected(prev =>
      prev.includes(serial) ? prev.filter(s => s !== serial) : [...prev, serial].sort()
    );
  };

  const applyRange = () => {
    if (rangeSelected.length < 2) return;
    const sorted = [...rangeSelected].sort();
    onSelectRange(sorted[0], sorted[sorted.length - 1]);
    onClose();
  };

  const showBranchFilter = !scopeParams.branch && !scopeParams.van_team;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between border-b border-border px-5 py-4 shrink-0">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <PackageSearch className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="font-heading text-base font-semibold">Select from Stock</h3>
              <p className="text-xs text-muted-foreground">
                {simTab === "single"
                  ? `${serialList.length} selected`
                  : rangeSelected.length < 2
                  ? "Pick at least 2 SIMs to define a range"
                  : `Range: ${rangeSelected[0]} → ${rangeSelected[rangeSelected.length - 1]}`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex gap-2 px-5 py-3 border-b border-border shrink-0">
          <div className="relative flex-1">
            <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input value={searchFilter} onChange={e => { setSearchFilter(e.target.value); setPage(1); }}
              placeholder="Search serial…"
              className="w-full rounded-md border border-border bg-accent py-1.5 pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          {showBranchFilter && (
            <select value={branchFilter} onChange={e => { setBranchFilter(e.target.value); setPage(1); }}
              className="rounded-md border border-border bg-accent py-1.5 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
              <option value="">All Branches</option>
              {branches.map(b => <option key={b.id} value={String(b.id)}>{b.name}</option>)}
            </select>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading stock…</span>
            </div>
          ) : visibleSIMs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
              <PackageSearch className="h-8 w-8 opacity-30" />
              <p className="text-sm">No in-stock SIMs found.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {visibleSIMs.map(sim => {
                const isInList  = serialList.includes(sim.serial_number);
                const isInRange = rangeSelected.includes(sim.serial_number);
                const isSelected = simTab === "single" ? isInList : isInRange;
                return (
                  <button key={sim.id}
                    onClick={() => {
                      if (simTab === "single") {
                        if (isInList) onRemoveSerial(sim.serial_number);
                        else onAddSerial(sim.serial_number);
                      } else {
                        handleRangeToggle(sim.serial_number);
                      }
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-all",
                      isSelected ? "border-primary bg-primary/10" : "border-border bg-background hover:bg-accent/50"
                    )}>
                    <div className={cn(
                      "h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                      isSelected ? "bg-primary border-primary" : "border-border bg-accent"
                    )}>
                      {isSelected && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                    </div>
                    <span className={cn("font-mono text-sm flex-1", isSelected ? "text-primary font-semibold" : "text-foreground")}>
                      {sim.serial_number}
                    </span>
                    {sim.branch_details && (
                      <span className="text-xs text-muted-foreground bg-accent rounded px-2 py-0.5 shrink-0">
                        {sim.branch_details.name}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-border px-5 py-4 shrink-0 space-y-3">
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Page <span className="text-foreground font-medium">{page}</span> of{" "}
                <span className="text-foreground font-medium">{totalPages}</span>{" "}
                ({totalCount.toLocaleString()} total)
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                  <ChevronLeft className="h-3.5 w-3.5" /> Prev
                </button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {totalCount.toLocaleString()} SIMs in stock
              {(branchFilter || searchFilter) ? " (filtered)" : ""}
            </p>
            <div className="flex gap-2">
              <button onClick={onClose}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors">
                {simTab === "single" ? "Done" : "Cancel"}
              </button>
              {simTab === "range" && (
                <button onClick={applyRange} disabled={rangeSelected.length < 2}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50 hover:opacity-90 transition-opacity">
                  Apply Range ({rangeSelected.length} selected)
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function IssueSims() {
  const { user } = useAuth();
  const role     = (user?.role ?? "dealer_owner") as IssueRole;
  const dealerId = user?.dealer_id ? Number(user.dealer_id) : undefined;

  const permissions = ISSUE_PERMISSIONS[role] ?? ISSUE_PERMISSIONS.brand_ambassador;

  // Derive allowed dest types (no hooks — safe to compute before hooks)
  const destTypes = ALL_DEST_TYPES.filter(d => permissions[d.permKey]);

  // ─── ALL hooks unconditionally before any early return ────────────────────

  const scopeParams = useMemo((): Record<string, string | number> => {
    if (role === "branch_manager" && user?.branch_id)
      return { branch: user.branch_id };
    if (role === "van_team_leader" && user?.van_team_id)
      return { van_team: user.van_team_id };
    if (role === "brand_ambassador")
      return { holder: Number(user?.id) };
    return {};
  }, [role, user]);

  const [selectedType, setSelectedType] = useState(destTypes[0]?.id ?? "ba");
  const [selectedDest, setSelectedDest] = useState<number | "">("");

  const [simTab,         setSimTab]         = useState<"single" | "range">("range");
  const [singleSerial,   setSingleSerial]   = useState("");
  const [serialList,     setSerialList]     = useState<string[]>([]);
  const [duplicateError, setDuplicateError] = useState("");
  const [rangeStart,     setRangeStart]     = useState("");
  const [rangeEnd,       setRangeEnd]       = useState("");
  const [notes,          setNotes]          = useState("");
  const [showPicker,     setShowPicker]     = useState(false);
  const [showConfirm,    setShowConfirm]    = useState(false);
  const [logSearch, setLogSearch] = useState("");
  const [logDate,   setLogDate]   = useState<string>(new Date().toISOString().split("T")[0]);

  const { data: branchesData, isLoading: branchesLoading } = useBranches(dealerId);
  const branches = useMemo<Branch[]>(() => branchesData ?? [], [branchesData]);

  const { data: allVanTeamsData, isLoading: vanTeamsLoading } = useAllVanTeams(dealerId, branches);
  const vanTeams = useMemo<VanTeam[]>(() => allVanTeamsData ?? [], [allVanTeamsData]);

  const { data: baData, isLoading: baLoading } = useUsers({
    role: "brand_ambassador",
    ...(dealerId ? { dealer_id: dealerId } : {}),
  });
  const baUsers = useMemo<UserProfile[]>(() => baData?.results ?? [], [baData]);

  const { data: agentData, isLoading: agentsLoading } = useUsers(
    selectedType === "agent"
      ? { role: "external_agent", ...(dealerId ? { dealer_id: dealerId } : {}) }
      : undefined
  );
  const externalAgents = useMemo<UserProfile[]>(() => agentData?.results ?? [], [agentData]);

  const bulkIssue = useBulkIssueSIMs();

  const logParams = useMemo(() => {
    const base: Record<string, string | number> = {
      movement_type: "issue",
      date: logDate,
    };
    if (role !== "dealer_owner" && role !== "operations_manager") {
      // Field roles only see their own issuances
      if (user?.id) base.created_by = user.id;
    }
    return base;
  }, [role, user, logDate]);

  const { data: movementsData, isLoading: movementsLoading } = useAllSIMMovements(logParams);
  const issueMovements = movementsData?.results ?? [];

  interface DestOption {
    label: string; userId?: number; branchId?: number; vanId?: number;
  }

  const destOptions: DestOption[] = useMemo(() => {
    if (selectedType === "branch") {
      return branches.map(b => ({ label: b.name, branchId: b.id }));
    }
    if (selectedType === "van") {
      const allowed =
        role === "branch_manager" && user?.branch_id
          ? vanTeams.filter(v => v.branch === user.branch_id)
          : vanTeams;
      return allowed.map(v => ({
        label:    `${v.name} (${branches.find(b => b.id === v.branch)?.name ?? "—"})`,
        vanId:    v.id,
        branchId: typeof v.branch === "number" ? v.branch : undefined,
      }));
    }
    if (selectedType === "ba") {
      if (role === "van_team_leader" && user?.van_team_id) {
        const myVan = vanTeams.find(v => v.id === user.van_team_id);
        const memberIds = new Set((myVan?.members ?? []).map(m => String(m.agent)));
        return baUsers
          .filter(u => memberIds.has(String(u.id)))
          .map(u => ({ label: `${u.first_name} ${u.last_name}`.trim() || u.email, userId: u.id }));
      }
      if (role === "branch_manager" && user?.branch_id) {
        const myVanIds = new Set(vanTeams.filter(v => v.branch === user.branch_id).map(v => v.id));
        const memberIds = new Set(
          vanTeams.filter(v => myVanIds.has(v.id)).flatMap(v => v.members ?? []).map(m => String(m.agent))
        );
        return baUsers
          .filter(u => memberIds.has(String(u.id)))
          .map(u => ({ label: `${u.first_name} ${u.last_name}`.trim() || u.email, userId: u.id }));
      }
      return baUsers.map(u => ({ label: `${u.first_name} ${u.last_name}`.trim() || u.email, userId: u.id }));
    }
    if (selectedType === "agent") {
      return externalAgents.map(u => ({ label: `${u.first_name} ${u.last_name}`.trim() || u.email, userId: u.id }));
    }
    return [];
  }, [selectedType, branches, vanTeams, baUsers, externalAgents, role, user]);

  // ─── Early return AFTER all hooks ─────────────────────────────────────────
  if (!permissions.canView) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <ShieldAlert className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground">Access Denied</h2>
          <p className="text-muted-foreground mt-2">You don't have permission to issue SIM cards.</p>
        </div>
      </div>
    );
  }

  // ─── Derived values (after guard, no hooks) ───────────────────────────────

  const isLoading =
    branchesLoading || vanTeamsLoading || baLoading ||
    (selectedType === "agent" && agentsLoading);

  const rangeCount = rangeStart && rangeEnd ? calcCount(rangeStart, rangeEnd) : null;
  const rangeValid = rangeCount !== null && rangeCount > 0;
  const rangeError = rangeStart && rangeEnd && !rangeValid
    ? "End serial must be greater than or equal to start." : null;

  const simCount   = simTab === "single" ? serialList.length : (rangeValid ? rangeCount! : 0);
  const simSummary = simTab === "single"
    ? `${serialList.length} individual SIM${serialList.length !== 1 ? "s" : ""}`
    : rangeValid ? `${rangeCount!.toLocaleString()} SIMs (${rangeStart} – ${rangeEnd})` : "";

  const selectedDestNum = typeof selectedDest === "number" ? selectedDest : null;

  const canSubmit =
    selectedDest !== "" &&
    (simTab === "single" ? serialList.length > 0 : rangeValid);

  const scopeLabel =
    role === "branch_manager"  ? "Issuing from your branch's stock" :
    role === "van_team_leader" ? "Issuing from your van's stock"    : null;

  const destLabel =
    selectedType === "ba"    ? "Brand Ambassador" :
    selectedType === "van"   ? "Van Team"         :
    selectedType === "agent" ? "External Agent"   : "Branch";

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleTypeChange = (id: string) => { setSelectedType(id); setSelectedDest(""); };

  const handleAddSerial = (serial?: string) => {
    const trimmed = (serial ?? singleSerial).trim();
    if (!trimmed) return;
    if (serialList.includes(trimmed)) { setDuplicateError(`${trimmed} is already in the list.`); return; }
    setSerialList(prev => [...prev, trimmed]);
    if (!serial) setSingleSerial("");
    setDuplicateError("");
  };

  const handleRemoveSerial = (serial: string) =>
    setSerialList(prev => prev.filter(s => s !== serial));

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleAddSerial();
  };

  const handleSelectRange = (start: string, end: string) => { setRangeStart(start); setRangeEnd(end); };

  const resetForm = () => {
    setSelectedDest(""); setSingleSerial(""); setSerialList([]);
    setRangeStart(""); setRangeEnd(""); setNotes(""); setShowConfirm(false);
  };

  const handleConfirmSubmit = async () => {
    if (selectedDestNum === null) return;
    const opt = destOptions[selectedDestNum];
    if (!opt) return;
    const serials = simTab === "single" ? serialList : buildSerialRange(rangeStart, rangeEnd);
    if (serials.length === 0) return;
    const payload: {
      serial_numbers: string[];
      to_user?: number; to_branch?: number; van_team?: number; notes?: string;
    } = {
      serial_numbers: serials,
      ...(opt.userId   !== undefined ? { to_user:   opt.userId   } : {}),
      ...(opt.branchId !== undefined && !opt.userId ? { to_branch: opt.branchId } : {}),
      ...(opt.vanId    !== undefined && !opt.userId ? { van_team:  opt.vanId    } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    };
    try {
      await bulkIssue.mutateAsync(payload as Parameters<typeof bulkIssue.mutateAsync>[0]);
      showSuccess(`${serials.length.toLocaleString()} SIM${serials.length !== 1 ? "s" : ""} issued successfully!`);
      resetForm();
    } catch {
      showError("Failed to issue SIMs. Please check serials and try again.");
      setShowConfirm(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Issue SIM Cards</h1>
        <p className="text-sm text-muted-foreground">
          {scopeLabel ?? "Distribute SIM cards to branches, van teams, brand ambassadors, or external agents"}
        </p>
      </div>

      {scopeLabel && (
        <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
          <ShieldAlert className="h-4 w-4 text-primary shrink-0" />
          <p className="text-sm text-primary">
            {role === "branch_manager"
              ? "You can issue SIMs to van teams and brand ambassadors within your branch."
              : "You can issue SIMs to brand ambassadors in your van team."}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* ── Issue Form ── */}
        <div className="lg:col-span-2 rounded-lg border border-border bg-card p-5 space-y-5">
          <h3 className="font-heading text-lg font-semibold">New Issuance</h3>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Step 1: Select Destination Type</label>
            <div className="grid grid-cols-2 gap-2">
              {destTypes.map(d => (
                <button key={d.id} onClick={() => handleTypeChange(d.id)}
                  className={cn(
                    "btn-press flex items-center gap-2 rounded-md border p-3 text-sm font-medium transition-all",
                    selectedType === d.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-accent"
                  )}>
                  <d.icon className="h-4 w-4" />
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Step 2: Select {destLabel}</label>
            {isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Loading…</span>
              </div>
            ) : destOptions.length === 0 ? (
              <div className="flex items-center gap-2 rounded-md border border-border bg-accent/30 px-3 py-2.5 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4 shrink-0" />
                No {destLabel.toLowerCase()}s found
                {(role === "branch_manager" || role === "van_team_leader") ? " in your scope." : "."}
              </div>
            ) : (
              <select value={selectedDest}
                onChange={e => setSelectedDest(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="">— Select {destLabel} —</option>
                {destOptions.map((opt, i) => (
                  <option key={i} value={i}>{opt.label}</option>
                ))}
              </select>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-foreground">Step 3: SIM Cards</label>
              <button onClick={() => setShowPicker(true)}
                className="flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition-colors">
                <PackageSearch className="h-3.5 w-3.5" />
                Select from stock
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1 rounded-md border border-border bg-accent p-1 mb-3">
              {(["single", "range"] as const).map(tab => (
                <button key={tab} onClick={() => setSimTab(tab)}
                  className={cn("rounded py-1.5 text-sm font-medium transition-colors capitalize",
                    simTab === tab ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
                  {tab === "single" ? "Single SIM" : "Range"}
                </button>
              ))}
            </div>

            {simTab === "single" && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input value={singleSerial}
                    onChange={e => { setSingleSerial(e.target.value.replace(/\D/g, "")); setDuplicateError(""); }}
                    onKeyDown={handleKeyDown} placeholder="89254000000000"
                    className="flex-1 rounded-md border border-border bg-accent py-2 px-3 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                  <button onClick={() => handleAddSerial()} disabled={!singleSerial}
                    className="flex items-center justify-center rounded-md border border-border bg-accent px-3 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                {duplicateError && <p className="text-xs text-destructive">{duplicateError}</p>}
                <p className="text-xs text-muted-foreground">Type a serial and press Enter, or use "Select from stock" above.</p>
                {serialList.length > 0 && (
                  <div className="rounded-md border border-border bg-accent/30 p-2 space-y-1 max-h-36 overflow-y-auto">
                    {serialList.map(serial => (
                      <div key={serial} className="flex items-center justify-between rounded px-2 py-1 hover:bg-accent transition-colors">
                        <span className="font-mono text-xs text-primary">{serial}</span>
                        <button onClick={() => handleRemoveSerial(serial)} className="text-muted-foreground hover:text-destructive transition-colors">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  {serialList.length === 0
                    ? "No SIMs added yet."
                    : <><span className="text-primary font-medium">{serialList.length}</span> SIM{serialList.length > 1 ? "s" : ""} ready to issue.</>}
                </p>
              </div>
            )}

            {simTab === "range" && (
              <div className="space-y-2">
                <input value={rangeStart} onChange={e => setRangeStart(e.target.value.replace(/\D/g, ""))}
                  placeholder="Start Serial  e.g. 89254000000001"
                  className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                <input value={rangeEnd} onChange={e => setRangeEnd(e.target.value.replace(/\D/g, ""))}
                  placeholder="End Serial  e.g. 89254000000500"
                  className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                {rangeError && <p className="text-xs text-destructive">{rangeError}</p>}
                {rangeValid && rangeCount && (
                  <p className="text-xs text-muted-foreground">
                    <span className="text-primary font-medium">{rangeCount.toLocaleString()}</span> SIMs will be issued.
                  </p>
                )}
                {!rangeStart && !rangeEnd && (
                  <p className="text-xs text-muted-foreground">
                    Type serials manually, or use "Select from stock" to pick and auto-fill the range.
                  </p>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Step 4: Notes <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="e.g. For weekend campaign…"
              className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
          </div>

          <button disabled={!canSubmit} onClick={() => setShowConfirm(true)}
            className="btn-press w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed">
            Issue SIMs
          </button>
        </div>

        {/* ── Info panel ── */}
        <div className="lg:col-span-3 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Branches",    value: branches.length, hidden: !permissions.canIssueToBranch },
              { label: "Van Teams",   value: role === "branch_manager" && user?.branch_id
                  ? vanTeams.filter(v => v.branch === user.branch_id).length
                  : vanTeams.length },
              { label: "Ambassadors", value: baUsers.length },
            ].filter(s => !s.hidden).map(({ label, value }) => (
              <div key={label} className="rounded-lg border border-border bg-card px-4 py-3 text-center">
                <p className="text-xl font-bold text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-border bg-card p-5">
            <h3 className="font-heading text-base font-semibold mb-3">Available {destLabel}s</h3>
            {isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Loading…</span>
              </div>
            ) : destOptions.length === 0 ? (
              <p className="text-sm text-muted-foreground italic py-4">No {destLabel.toLowerCase()}s available in your scope.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {destOptions.map((opt, i) => {
                  const Icon = destTypes.find(d => d.id === selectedType)?.icon ?? Building;
                  const isSelected = selectedDest === i;
                  return (
                    <button key={i} onClick={() => setSelectedDest(i)}
                      className={cn(
                        "w-full flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-all",
                        isSelected ? "border-primary bg-primary/10" : "border-border bg-background hover:bg-accent/50"
                      )}>
                      <div className={cn("h-7 w-7 rounded-md flex items-center justify-center shrink-0",
                        isSelected ? "bg-primary/20" : "bg-accent")}>
                        <Icon className={cn("h-3.5 w-3.5", isSelected ? "text-primary" : "text-muted-foreground")} />
                      </div>
                      <span className={cn("text-sm font-medium truncate", isSelected ? "text-primary" : "text-foreground")}>
                        {opt.label}
                      </span>
                      {isSelected && (
                        <span className="ml-auto text-xs font-semibold text-primary shrink-0">Selected</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Issuance Log */}
          <div className="rounded-lg border border-border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h3 className="font-heading text-base font-semibold">Issuance Log</h3>
              <div className="flex items-center gap-2 flex-wrap">
                <input type="date" value={logDate} onChange={e => setLogDate(e.target.value)}
                  className="rounded-md border border-border bg-accent py-1.5 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input value={logSearch} onChange={e => setLogSearch(e.target.value)} placeholder="Search…"
                    className="rounded-md border border-border bg-accent py-1.5 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary w-36" />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="pb-3 text-left font-medium">Time</th>
                    <th className="pb-3 text-left font-medium">To</th>
                    <th className="pb-3 text-left font-medium">From (Warehouse)</th>
                    <th className="pb-3 text-left font-medium">SIM Serial</th>
                    <th className="pb-3 text-left font-medium">By</th>
                  </tr>
                </thead>
                <tbody>
                  {movementsLoading ? (
                    <tr><td colSpan={5} className="py-8 text-center">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                    </td></tr>
                  ) : issueMovements.length === 0 ? (
                    <tr><td colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                      No issuances found for {logDate === new Date().toISOString().split("T")[0] ? "today" : logDate}.
                    </td></tr>
                  ) : issueMovements
                      .filter(m =>
                        !logSearch ||
                        m.sim?.serial_number?.includes(logSearch) ||
                        m.to_branch?.name?.toLowerCase().includes(logSearch.toLowerCase()) ||
                        m.to_user?.full_name?.toLowerCase().includes(logSearch.toLowerCase())
                      )
                      .map(m => (
                    <tr key={m.id} className="border-b border-border/50 hover:bg-accent/50 transition-colors">
                      <td className="py-3 text-xs text-muted-foreground">
                        {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="py-3 text-sm font-medium text-foreground">
                        {m.to_user?.full_name ?? m.to_branch?.name ?? "—"}
                      </td>
                      <td className="py-3 text-xs text-amber-500">
                        {m.from_branch?.name ?? "Warehouse"}
                      </td>
                      <td className="py-3 font-mono text-xs text-primary">
                        {m.sim?.serial_number ?? "—"}
                      </td>
                      <td className="py-3 text-xs text-muted-foreground">
                        {m.created_by?.full_name ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-muted-foreground">
              {issueMovements.length} issuance{issueMovements.length !== 1 ? "s" : ""} on {logDate}
            </p>
          </div>
        </div>
      </div>

      {showPicker && (
        <StockPickerPanel
          onClose={() => setShowPicker(false)}
          simTab={simTab}
          serialList={serialList}
          onAddSerial={handleAddSerial}
          onRemoveSerial={handleRemoveSerial}
          onSelectRange={handleSelectRange}
          branches={branches}
          scopeParams={scopeParams}
        />
      )}

      {showConfirm && selectedDestNum !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm"
            onClick={() => !bulkIssue.isPending && setShowConfirm(false)} />
          <div className="relative w-full max-w-sm rounded-xl border border-border bg-card shadow-2xl">
            <div className="p-6 space-y-4">
              <div>
                <h3 className="font-heading text-lg font-semibold">Confirm Issuance</h3>
                <p className="text-sm text-muted-foreground mt-1">Please review before issuing.</p>
              </div>
              <div className="rounded-lg border border-border bg-accent/30 divide-y divide-border text-sm">
                <div className="flex justify-between px-4 py-2.5">
                  <span className="text-muted-foreground">Destination type</span>
                  <span className="font-medium text-foreground">{destLabel}</span>
                </div>
                <div className="flex justify-between px-4 py-2.5">
                  <span className="text-muted-foreground">Issued to</span>
                  <span className="font-medium text-foreground truncate max-w-[160px] text-right">
                    {destOptions[selectedDestNum]?.label}
                  </span>
                </div>
                <div className="flex justify-between px-4 py-2.5">
                  <span className="text-muted-foreground">SIMs</span>
                  <span className="font-medium text-primary">{simSummary}</span>
                </div>
                {notes && (
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-muted-foreground">Notes</span>
                    <span className="font-medium text-foreground max-w-[160px] text-right">{notes}</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                This will move <span className="text-primary font-medium">{simCount.toLocaleString()}</span>{" "}
                SIM{simCount !== 1 ? "s" : ""} to{" "}
                <span className="font-medium text-foreground">{destOptions[selectedDestNum]?.label}</span>.
              </p>
            </div>
            <div className="flex gap-2 border-t border-border px-6 py-4">
              <button onClick={() => setShowConfirm(false)} disabled={bulkIssue.isPending}
                className="flex-1 rounded-md border border-border py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50">
                Cancel
              </button>
              <button onClick={handleConfirmSubmit} disabled={bulkIssue.isPending}
                className="flex-1 flex items-center justify-center gap-2 rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50">
                {bulkIssue.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {bulkIssue.isPending ? "Issuing…" : "Confirm & Issue"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}