// src/pages/ReturnSims.tsx
import { useState, useMemo, useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  RotateCcw, Search, Plus, X, CheckCircle2, AlertCircle,
  Clock, Loader2, PackageSearch, Check, ChevronLeft, ChevronRight, Filter,
  ShieldAlert, Building, Truck, User, Store,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useBranches, useAllVanTeams } from "@/hooks/useDealers";
import { useUsers } from "@/hooks/useUsers";
import { useBulkReturnSIMs, useSIMs, useAllSIMMovements } from "@/hooks/useInventory";
import { showSuccess, showError } from "@/lib/toast";
import api from "@/lib/api";
import { ENDPOINTS } from "@/constants/endpoints";
import type { Branch, VanTeam } from "@/types/dealers.types";
import type { UserProfile } from "@/types/auth.types";
import type { SIM } from "@/types/inventory.types";

// ─── Permission matrix ────────────────────────────────────────────────────────

const RETURN_PERMISSIONS = {
  dealer_owner:       { canView: true,  canReturnFromBranch: true,  canReturnFromVan: true,  canReturnFromBA: true,  canReturnFromAgent: true  },
  operations_manager: { canView: true,  canReturnFromBranch: true,  canReturnFromVan: true,  canReturnFromBA: true,  canReturnFromAgent: true  },
  branch_manager:     { canView: true,  canReturnFromBranch: false, canReturnFromVan: true,  canReturnFromBA: true,  canReturnFromAgent: false },
  van_team_leader:    { canView: true,  canReturnFromBranch: false, canReturnFromVan: false, canReturnFromBA: true,  canReturnFromAgent: false },
  brand_ambassador:   { canView: false, canReturnFromBranch: false, canReturnFromVan: false, canReturnFromBA: false, canReturnFromAgent: false },
  external_agent:     { canView: false, canReturnFromBranch: false, canReturnFromVan: false, canReturnFromBA: false, canReturnFromAgent: false },
  finance:            { canView: false, canReturnFromBranch: false, canReturnFromVan: false, canReturnFromBA: false, canReturnFromAgent: false },
} as const;

type ReturnRole = keyof typeof RETURN_PERMISSIONS;

// ─── Holder types ─────────────────────────────────────────────────────────────

const ALL_HOLDER_TYPES = [
  { id: "branch", label: "Branch",          icon: Building, permKey: "canReturnFromBranch" as const },
  { id: "van",    label: "Van Team",         icon: Truck,    permKey: "canReturnFromVan"    as const },
  { id: "ba",     label: "Brand Ambassador", icon: User,     permKey: "canReturnFromBA"     as const },
  { id: "agent",  label: "External Agent",   icon: Store,    permKey: "canReturnFromAgent"  as const },
];

// ─── Constants ────────────────────────────────────────────────────────────────

const RETURN_REASONS = [
  "Damaged / Defective",
  "Unregistered – Expired",
  "BA Resigned / Terminated",
  "Branch Closing",
  "Excess Stock",
  "Other",
];

const PICKER_PAGE_SIZE = 20;
type HolderType = "branch" | "van" | "ba" | "agent";

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
  holderUserId, holderIsVan, holderIsBranch, vanTeamId, branchId,
}: {
  onClose: () => void;
  simTab: "single" | "range";
  serialList: string[];
  onAddSerial: (serial: string) => void;
  onRemoveSerial: (serial: string) => void;
  onSelectRange: (start: string, end: string) => void;
  holderUserId: number;
  holderIsVan: boolean;
  holderIsBranch: boolean;
  vanTeamId?: number;
  branchId?: number;
}) {
  const [searchFilter,  setSearchFilter]  = useState("");
  const [rangeSelected, setRangeSelected] = useState<string[]>([]);
  const [page,          setPage]          = useState(1);
  const [selectingAll,  setSelectingAll]  = useState(false);

  const filterParams = useMemo(() => ({
    ...(holderIsVan && vanTeamId
      ? { van_team: vanTeamId }
      : holderIsBranch && branchId
      ? { branch: branchId, status: "in_stock" as const }
      : { status: "issued" as const, holder: holderUserId }),
    ...(searchFilter.trim() ? { search: searchFilter.trim() } : {}),
    page,
  }), [holderUserId, holderIsVan, holderIsBranch, vanTeamId, branchId, searchFilter, page]);

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

  const handleSelectAll = async () => {
    if (visibleSIMs.length === 0) return;
    if (totalPages === 1) {
      const allSerials = visibleSIMs.map(s => s.serial_number).sort();
      onSelectRange(allSerials[0], allSerials[allSerials.length - 1]);
      onClose();
      return;
    }
    setSelectingAll(true);
    try {
      const baseParams = {
        ...(holderIsVan && vanTeamId
          ? { van_team: String(vanTeamId) }
          : holderIsBranch && branchId
          ? { branch: String(branchId), status: "in_stock" }
          : { status: "issued", holder: String(holderUserId) }),
        ...(searchFilter.trim() ? { search: searchFilter.trim() } : {}),
        page_size: "500",
      };
      const allSerials: string[] = [];
      let currentPage = 1;
      let hasMore = true;
      while (hasMore) {
        const res = await api.get<{ results: SIM[]; count: number; next: string | null }>(
          ENDPOINTS.SIMS,
          { params: { ...baseParams, page: String(currentPage) } }
        );
        allSerials.push(...res.data.results.map(s => s.serial_number));
        hasMore = res.data.next !== null;
        currentPage++;
      }
      allSerials.sort();
      onSelectRange(allSerials[0], allSerials[allSerials.length - 1]);
      onClose();
    } catch {
      const pageSerials = visibleSIMs.map(s => s.serial_number).sort();
      setRangeSelected(pageSerials);
    } finally {
      setSelectingAll(false);
    }
  };

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
              <h3 className="font-heading text-base font-semibold">Select SIMs to Return</h3>
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
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading SIMs…</span>
            </div>
          ) : visibleSIMs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
              <PackageSearch className="h-8 w-8 opacity-30" />
              <p className="text-sm">No SIMs found for this holder.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {visibleSIMs.map(sim => {
                const isInList   = serialList.includes(sim.serial_number);
                const isInRange  = rangeSelected.includes(sim.serial_number);
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
              {totalCount.toLocaleString()} SIM{totalCount !== 1 ? "s" : ""}
              {searchFilter ? " (filtered)" : ""}
            </p>
            <div className="flex gap-2">
              <button onClick={onClose}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors">
                {simTab === "single" ? "Done" : "Cancel"}
              </button>
              {simTab === "range" && (
                <>
                  <button onClick={handleSelectAll} disabled={visibleSIMs.length === 0 || selectingAll}
                    className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                    {selectingAll ? (
                      <span className="flex items-center gap-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin" />Fetching…</span>
                    ) : `Select All (${totalCount})`}
                  </button>
                  <button onClick={applyRange} disabled={rangeSelected.length < 2}
                    className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50 hover:opacity-90 transition-opacity">
                    Apply Range ({rangeSelected.length} selected)
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ReturnSims() {
  const { user }  = useAuth();
  const role      = (user?.role ?? "dealer_owner") as ReturnRole;
  const dealerId  = user?.dealer_id ? Number(user.dealer_id) : undefined;

  const permissions = RETURN_PERMISSIONS[role] ?? RETURN_PERMISSIONS.brand_ambassador;

  const holderTypes = ALL_HOLDER_TYPES.filter(h => permissions[h.permKey]);

  // ─── Hooks (all unconditional) ────────────────────────────────────────────

  const { data: branchesData, isLoading: branchesLoading } = useBranches(dealerId);
  const branches = useMemo<Branch[]>(() => branchesData ?? [], [branchesData]);

  const { data: allVanTeamsData, isLoading: vanTeamsLoading } = useAllVanTeams(dealerId, branches);
  const vanTeams = useMemo<VanTeam[]>(() => allVanTeamsData ?? [], [allVanTeamsData]);

  const { data: baData, isLoading: baLoading } = useUsers({
    role: "brand_ambassador",
    ...(dealerId ? { dealer_id: dealerId } : {}),
  });
  const baUsers = useMemo<UserProfile[]>(() => baData?.results ?? [], [baData]);

  const [selectedType, setSelectedType] = useState<HolderType>(holderTypes[0]?.id as HolderType ?? "ba");

  const { data: agentData, isLoading: agentsLoading } = useUsers(
    selectedType === "agent"
      ? { role: "external_agent", ...(dealerId ? { dealer_id: dealerId } : {}) }
      : undefined
  );
  const externalAgents = useMemo<UserProfile[]>(() => agentData?.results ?? [], [agentData]);

  const bulkReturn = useBulkReturnSIMs();
  const location   = useLocation();

  interface HolderOption {
    label: string;
    userId: number;
    vanTeamId?: number;
    branchId?: number;
    holderType: HolderType;
  }

  const holderOptions: HolderOption[] = useMemo(() => {
    if (selectedType === "branch") {
      const allowed = role === "branch_manager" && user?.branch_id
        ? branches.filter(b => b.id === Number(user.branch_id))
        : branches;
      return allowed.map(b => ({ label: b.name, userId: b.manager as number ?? 0, branchId: b.id, holderType: "branch" }));
    }
    if (selectedType === "van") {
      const allowed = role === "branch_manager" && user?.branch_id
        ? vanTeams.filter(v => v.branch === Number(user.branch_id))
        : role === "van_team_leader" && user?.van_team_id
        ? vanTeams.filter(v => v.id === Number(user.van_team_id))
        : vanTeams;
      return allowed.filter(v => v.leader !== null).map(v => ({
        label: `${v.name} (${branches.find(b => b.id === v.branch)?.name ?? "—"})`,
        userId: v.leader as number,
        vanTeamId: v.id,
        holderType: "van" as HolderType,
      }));
    }
    if (selectedType === "ba") {
      const allowed = role === "van_team_leader" && user?.van_team_id
        ? (() => {
            const myVan = vanTeams.find(v => v.id === user.van_team_id);
            const memberIds = new Set((myVan?.members ?? []).map(m => String(m.agent)));
            return baUsers.filter(u => memberIds.has(String(u.id)));
          })()
        : role === "branch_manager" && user?.branch_id
        ? (() => {
            const myVanIds = new Set(vanTeams.filter(v => v.branch === user.branch_id).map(v => v.id));
            const memberIds = new Set(
              vanTeams.filter(v => myVanIds.has(v.id)).flatMap(v => v.members ?? []).map(m => String(m.agent))
            );
            return baUsers.filter(u => memberIds.has(String(u.id)));
          })()
        : baUsers;
      return allowed.map(u => ({
        label: `${u.first_name} ${u.last_name}`.trim() || u.email,
        userId: u.id,
        holderType: "ba" as HolderType,
      }));
    }
    if (selectedType === "agent") {
      return externalAgents.map(u => ({
        label: `${u.first_name} ${u.last_name}`.trim() || u.email,
        userId: u.id,
        holderType: "agent" as HolderType,
      }));
    }
    return [];
  }, [selectedType, branches, vanTeams, baUsers, externalAgents, role, user]);

  const [selectedDest,   setSelectedDest]   = useState<number | "">("");
  const [reason,         setReason]         = useState("");
  const [notes,          setNotes]          = useState("");
  const [simTab,         setSimTab]         = useState<"single" | "range">("single");
  const [singleSerial,   setSingleSerial]   = useState("");
  const [serialList,     setSerialList]     = useState<string[]>([]);
  const [duplicateError, setDuplicateError] = useState("");
  const [rangeStart,     setRangeStart]     = useState("");
  const [rangeEnd,       setRangeEnd]       = useState("");
  const [showPicker,     setShowPicker]     = useState(false);
  const [showConfirm,    setShowConfirm]    = useState(false);
  const [successMsg,     setSuccessMsg]     = useState("");
  const [logSearch,      setLogSearch]      = useState("");
  const [logDate,        setLogDate]        = useState<string>(new Date().toISOString().split("T")[0]);
  const [prefillBanner,  setPrefillBanner]  = useState<string | null>(null);

  // ── Pre-fill from IssueSims unresolved alert redirect ─────────────────────
  useEffect(() => {
    const state = location.state as {
      prefill_ba_id?:   number;
      prefill_ba_name?: string;
      prefill_serials?: string[];
    } | null;

    if (!state?.prefill_ba_id || !state?.prefill_serials?.length) return;

    // Switch to BA tab and single SIM mode
    setSelectedType("ba");
    setSimTab("single");
    setSerialList(state.prefill_serials);
    setReason("BA Resigned / Terminated");
    setPrefillBanner(
      `Pre-filled from unresolved alert: returning ${state.prefill_serials.length} SIM(s) from ${state.prefill_ba_name ?? "BA"}.`
    );

    // Auto-select the BA in the dropdown once holderOptions are ready
    // We store the ba_id and match it after options load
    setPrefillBaId(state.prefill_ba_id);

    // Clear location state so refreshing doesn't re-trigger
    window.history.replaceState({}, "");
  }, [location.state]);

  const [prefillBaId, setPrefillBaId] = useState<number | null>(null);

  // Once holderOptions are loaded, find and select the pre-filled BA
  useEffect(() => {
    if (prefillBaId === null || selectedType !== "ba" || holderOptions.length === 0) return;
    const idx = holderOptions.findIndex(o => o.userId === prefillBaId);
    if (idx !== -1) {
      setSelectedDest(idx);
      setPrefillBaId(null); // done, clear it
    }
  }, [prefillBaId, holderOptions, selectedType]);

  const { data: movementsData, isLoading: movementsLoading } = useAllSIMMovements({
    movement_type: "return",
    date: logDate,
  });
  const returnMovements = movementsData?.results ?? [];

  // ─── Early return after all hooks ─────────────────────────────────────────

  if (!permissions.canView) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <ShieldAlert className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground">Access Denied</h2>
          <p className="text-muted-foreground mt-2">You don't have permission to process SIM returns.</p>
        </div>
      </div>
    );
  }

  // ─── Derived values ───────────────────────────────────────────────────────

  const isLoading = branchesLoading || vanTeamsLoading || baLoading || (selectedType === "agent" && agentsLoading);

  const selectedDestNum = typeof selectedDest === "number" ? selectedDest : null;
  const selectedHolder  = selectedDestNum !== null ? holderOptions[selectedDestNum] ?? null : null;

  const rangeCount = rangeStart && rangeEnd ? calcCount(rangeStart, rangeEnd) : null;
  const rangeValid = rangeCount !== null && rangeCount > 0;
  const rangeError = rangeStart && rangeEnd && !rangeValid ? "End serial must be greater than start." : null;

  const simCount   = simTab === "single" ? serialList.length : (rangeValid ? rangeCount! : 0);
  const simSummary = simTab === "single"
    ? `${serialList.length} individual SIM${serialList.length !== 1 ? "s" : ""}`
    : rangeValid ? `${rangeCount!.toLocaleString()} SIMs (${rangeStart} – ${rangeEnd})` : "";

  const canSubmit = selectedDest !== "" && reason !== "" && (simTab === "single" ? serialList.length > 0 : rangeValid);

  const totalReturned = returnMovements.length;
  const fromBAsCount  = returnMovements.filter(m => m.from_user !== null && m.from_branch === null).length;
  const fromVansCount = returnMovements.filter(m => m.van_team !== null).length;

  const scopeLabel =
    role === "branch_manager"  ? "Processing returns within your branch" :
    role === "van_team_leader" ? "Processing returns from your van team's BAs" : null;

  const destLabel =
    selectedType === "ba"     ? "Brand Ambassador" :
    selectedType === "van"    ? "Van Team"          :
    selectedType === "agent"  ? "External Agent"    : "Branch";

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleTypeChange = (id: HolderType) => { setSelectedType(id); setSelectedDest(""); setSerialList([]); setRangeStart(""); setRangeEnd(""); };

  const handleAddSerial = (serial?: string) => {
    const trimmed = (serial ?? singleSerial).trim();
    if (!trimmed) return;
    if (serialList.includes(trimmed)) { setDuplicateError(`${trimmed} already in list.`); return; }
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

  const handleConfirmSubmit = async () => {
    if (!selectedHolder) return;
    const serials = simTab === "single" ? serialList : buildSerialRange(rangeStart, rangeEnd);
    if (serials.length === 0) return;
    try {
      await bulkReturn.mutateAsync({
        serial_numbers: serials,
        ...(selectedType === "branch" && selectedHolder.branchId
          ? { from_branch: selectedHolder.branchId }
          : selectedType === "van" && selectedHolder.vanTeamId
          ? { van_team: selectedHolder.vanTeamId, from_user: selectedHolder.userId }
          : { from_user: selectedHolder.userId }),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
      const msg = `${simCount} SIM${simCount !== 1 ? "s" : ""} successfully returned to warehouse.`;
      showSuccess(msg);
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(""), 4000);
      setSelectedDest(""); setReason(""); setNotes("");
      setSingleSerial(""); setSerialList([]);
      setRangeStart(""); setRangeEnd("");
      setShowConfirm(false);
      setPrefillBanner(null);
      setPrefillBaId(null);
    } catch (err: unknown) {
      const detail =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined;
      showError(detail ?? "Return failed. Ensure SIMs are currently issued to this holder.");
      setShowConfirm(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
            <RotateCcw className="h-6 w-6 text-primary" />
            Return SIMs
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {scopeLabel ?? "Return SIM cards from branches, van teams, brand ambassadors, or external agents"}
          </p>
        </div>
      </div>

      {scopeLabel && (
        <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
          <ShieldAlert className="h-4 w-4 text-primary shrink-0" />
          <p className="text-sm text-primary">
            {role === "branch_manager"
              ? "You can process returns from van teams and brand ambassadors within your branch."
              : "You can process returns from brand ambassadors in your van team."}
          </p>
        </div>
      )}

      {prefillBanner && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
          <p className="text-sm font-medium text-amber-500 flex-1">{prefillBanner}</p>
          <button onClick={() => setPrefillBanner(null)}
            className="text-amber-500 hover:text-amber-400 transition-colors shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-3 rounded-lg border border-success/30 bg-success/10 px-4 py-3">
          <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
          <p className="text-sm font-medium text-success">{successMsg}</p>
        </div>
      )}

      {/* KPI strip */}
      <div className={cn("grid gap-4", permissions.canReturnFromVan ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-2 lg:grid-cols-3")}>
        {[
          { label: "Returned Today",  value: totalReturned,  color: "text-primary"    },
          { label: "Pending Returns", value: 0,              color: "text-warning"    },
          { label: "From BAs",        value: fromBAsCount,   color: "text-foreground" },
          ...(permissions.canReturnFromVan
            ? [{ label: "From Vans", value: fromVansCount, color: "text-foreground" }]
            : []),
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-lg border border-border bg-card px-4 py-4">
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className={cn("text-2xl font-bold font-heading", color)}>{value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* ── Return Form ── */}
        <div className="lg:col-span-2 rounded-lg border border-border bg-card p-5 space-y-5">
          <h3 className="font-heading text-lg font-semibold">New Return</h3>

          {/* Step 1 — card grid like IssueSims */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Step 1: Returning From</label>
            <div className="grid grid-cols-2 gap-2">
              {holderTypes.map(h => (
                <button key={h.id} onClick={() => handleTypeChange(h.id as HolderType)}
                  className={cn(
                    "btn-press flex items-center gap-2 rounded-md border p-3 text-sm font-medium transition-all",
                    selectedType === h.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-accent"
                  )}>
                  <h.icon className="h-4 w-4" />
                  {h.label}
                </button>
              ))}
            </div>
          </div>

          {/* Step 2 */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Step 2: Select {destLabel}</label>
            {isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Loading…</span>
              </div>
            ) : holderOptions.length === 0 ? (
              <div className="flex items-center gap-2 rounded-md border border-border bg-accent/30 px-3 py-2.5 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4 shrink-0" />
                No {destLabel.toLowerCase()}s found
                {(role === "branch_manager" || role === "van_team_leader") ? " in your scope." : "."}
              </div>
            ) : (
              <select value={selectedDest}
                onChange={e => { setSelectedDest(e.target.value === "" ? "" : Number(e.target.value)); setSerialList([]); setRangeStart(""); setRangeEnd(""); }}
                className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="">— Select {destLabel} —</option>
                {holderOptions.map((opt, i) => (
                  <option key={i} value={i}>{opt.label}</option>
                ))}
              </select>
            )}
          </div>

          {/* Step 3 */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Step 3: Reason for Return</label>
            <select value={reason} onChange={e => setReason(e.target.value)}
              className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
              <option value="">— Select reason —</option>
              {RETURN_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          {/* Step 4 */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-foreground">Step 4: SIM Cards</label>
              <button onClick={() => setShowPicker(true)} disabled={!selectedHolder}
                title={!selectedHolder ? "Select a holder first" : "Browse SIMs"}
                className={cn(
                  "flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                  selectedHolder
                    ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
                    : "border-border bg-accent/50 text-muted-foreground cursor-not-allowed opacity-50"
                )}>
                <PackageSearch className="h-3.5 w-3.5" />
                Select from issued
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1 rounded-md border border-border bg-accent p-1 mb-3">
              {(["single", "range"] as const).map(t => (
                <button key={t} onClick={() => setSimTab(t)}
                  className={cn("rounded py-1.5 text-sm font-medium capitalize transition-colors",
                    simTab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
                  {t === "single" ? "Single SIM" : "Range"}
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
                <p className="text-xs text-muted-foreground">Press Enter or + to add multiple serials.</p>
                {serialList.length > 0 && (
                  <div className="rounded-md border border-border bg-accent/30 p-2 space-y-1 max-h-36 overflow-y-auto">
                    {serialList.map(s => (
                      <div key={s} className="flex items-center justify-between rounded px-2 py-1 hover:bg-accent">
                        <span className="font-mono text-xs text-primary">{s}</span>
                        <button onClick={() => handleRemoveSerial(s)} className="text-muted-foreground hover:text-destructive transition-colors">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  {serialList.length === 0 ? "No SIMs added yet." :
                    <><span className="text-primary font-medium">{serialList.length}</span> SIM{serialList.length > 1 ? "s" : ""} ready to return.</>}
                </p>
              </div>
            )}

            {simTab === "range" && (
              <div className="space-y-2">
                <input value={rangeStart} onChange={e => setRangeStart(e.target.value.replace(/\D/g, ""))}
                  placeholder="Start Serial"
                  className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                <input value={rangeEnd} onChange={e => setRangeEnd(e.target.value.replace(/\D/g, ""))}
                  placeholder="End Serial"
                  className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                {rangeError && <p className="text-xs text-destructive">{rangeError}</p>}
                {rangeValid && rangeCount && (
                  <p className="text-xs text-muted-foreground">
                    <span className="text-primary font-medium">{rangeCount.toLocaleString()}</span> SIMs will be returned.
                  </p>
                )}
                {!rangeStart && !rangeEnd && (
                  <p className="text-xs text-muted-foreground">Type serials manually, or use "Select from issued" above.</p>
                )}
              </div>
            )}
          </div>

          {/* Step 5 */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Step 5: Notes <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Any additional context…"
              className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
          </div>

          <button disabled={!canSubmit || bulkReturn.isPending} onClick={() => setShowConfirm(true)}
            className="btn-press w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed">
            Return SIMs
          </button>
        </div>

        {/* ── Right panel: available holders + log ── */}
        <div className="lg:col-span-3 space-y-4">

          {/* Available holders card — mirrors IssueSims info panel */}
          <div className="rounded-lg border border-border bg-card p-5">
            <h3 className="font-heading text-base font-semibold mb-3">Available {destLabel}s</h3>
            {isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Loading…</span>
              </div>
            ) : holderOptions.length === 0 ? (
              <p className="text-sm text-muted-foreground italic py-4">No {destLabel.toLowerCase()}s available in your scope.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {holderOptions.map((opt, i) => {
                  const Icon = holderTypes.find(h => h.id === selectedType)?.icon ?? Building;
                  const isSelected = selectedDest === i;
                  return (
                    <button key={i} onClick={() => { setSelectedDest(i); setSerialList([]); setRangeStart(""); setRangeEnd(""); }}
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

          {/* Returns Log */}
          <div className="rounded-lg border border-border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h3 className="font-heading text-base font-semibold">Returns Log</h3>
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
                    <th className="pb-3 text-left font-medium">From</th>
                    <th className="pb-3 text-left font-medium">To (Warehouse)</th>
                    <th className="pb-3 text-left font-medium">SIM Serial</th>
                    <th className="pb-3 text-left font-medium">By</th>
                  </tr>
                </thead>
                <tbody>
                  {movementsLoading ? (
                    <tr><td colSpan={5} className="py-8 text-center">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                    </td></tr>
                  ) : returnMovements.length === 0 ? (
                    <tr><td colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                      No returns found for {logDate === new Date().toISOString().split("T")[0] ? "today" : logDate}.
                    </td></tr>
                  ) : returnMovements
                      .filter(m =>
                        !logSearch ||
                        m.sim?.serial_number?.includes(logSearch) ||
                        m.from_branch?.name?.toLowerCase().includes(logSearch.toLowerCase()) ||
                        m.from_user?.full_name?.toLowerCase().includes(logSearch.toLowerCase())
                      )
                      .map(m => (
                    <tr key={m.id} className="border-b border-border/50 hover:bg-accent/50 transition-colors">
                      <td className="py-3 text-xs text-muted-foreground">
                        {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="py-3 text-sm font-medium text-foreground">
                        {m.from_user?.full_name ?? m.from_branch?.name ?? "—"}
                      </td>
                      <td className="py-3 text-xs text-amber-500">
                        {m.to_branch?.name ?? "Warehouse"}
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
              {returnMovements.length} return{returnMovements.length !== 1 ? "s" : ""} on {logDate}
            </p>
          </div>
        </div>
      </div>

      {/* Stock Picker */}
      {showPicker && selectedHolder && (
        <StockPickerPanel
          onClose={() => setShowPicker(false)}
          simTab={simTab}
          serialList={serialList}
          onAddSerial={handleAddSerial}
          onRemoveSerial={handleRemoveSerial}
          onSelectRange={handleSelectRange}
          holderUserId={selectedHolder.userId}
          holderIsVan={selectedType === "van"}
          holderIsBranch={selectedType === "branch"}
          vanTeamId={selectedHolder.vanTeamId}
          branchId={selectedHolder.branchId}
        />
      )}

      {/* Confirm dialog */}
      {showConfirm && selectedHolder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm"
            onClick={() => !bulkReturn.isPending && setShowConfirm(false)} />
          <div className="relative w-full max-w-sm rounded-xl border border-border bg-card shadow-2xl">
            <div className="p-6 space-y-4">
              <div>
                <h3 className="font-heading text-lg font-semibold">Confirm Return</h3>
                <p className="text-sm text-muted-foreground mt-1">Review before processing.</p>
              </div>
              <div className="rounded-lg border border-border bg-accent/30 divide-y divide-border text-sm">
                <div className="flex justify-between px-4 py-2.5">
                  <span className="text-muted-foreground">Returning from</span>
                  <span className="font-medium text-foreground">{destLabel}</span>
                </div>
                <div className="flex justify-between px-4 py-2.5">
                  <span className="text-muted-foreground">Holder</span>
                  <span className="font-medium text-foreground truncate max-w-[160px] text-right">{selectedHolder.label}</span>
                </div>
                <div className="flex justify-between px-4 py-2.5">
                  <span className="text-muted-foreground">Reason</span>
                  <span className="font-medium text-foreground text-right max-w-[160px]">{reason}</span>
                </div>
                <div className="flex justify-between px-4 py-2.5">
                  <span className="text-muted-foreground">SIMs</span>
                  <span className="font-medium text-primary">{simSummary}</span>
                </div>
                {notes && (
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-muted-foreground">Notes</span>
                    <span className="font-medium text-foreground text-right max-w-[160px]">{notes}</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                <span className="text-primary font-medium">{simCount.toLocaleString()}</span>{" "}
                SIM{simCount !== 1 ? "s" : ""} will be moved back to warehouse stock.
              </p>
            </div>
            <div className="flex gap-2 border-t border-border px-6 py-4">
              <button onClick={() => setShowConfirm(false)} disabled={bulkReturn.isPending}
                className="flex-1 rounded-md border border-border py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50">
                Cancel
              </button>
              <button onClick={handleConfirmSubmit} disabled={bulkReturn.isPending}
                className="flex-1 flex items-center justify-center gap-2 rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50">
                {bulkReturn.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {bulkReturn.isPending ? "Processing…" : "Confirm Return"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}