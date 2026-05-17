// src/pages/SimInventory.tsx
// Full inventory page — adds Edit modal, single/bulk delete for owner/ops/super_admin
// FIXES:
//   1. Download button respects active filters — exports filtered SIMs as CSV
//   2. BA/Agent dropdowns now fetch all users (page_size=1000) instead of first page only
import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Search, Download, Eye, Layers, Plus, X, ChevronRight,
  AlertCircle, Loader2, RefreshCw, ArrowRightLeft,
  Package, ArrowDownLeft, ShieldAlert,
  Building2, User, ChevronLeft,
  CheckCircle2, Trash2, CheckSquare, Square,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import {
  useSIMs, useSIMMovements, useCreateSIMBatch,
  useDeleteSIM, useBulkDeleteSIMs,
} from "@/hooks/useInventory";
import { useBranches, useVanTeams, useAllVanTeams } from "@/hooks/useDealers";
import { useUsers } from "@/hooks/useUsers";
import { showSuccess, showError } from "@/lib/toast";
import api from "@/lib/api";
import type { SIM, SIMStatus, MovementType, SIMMovement } from "@/types/inventory.types";
import { ENDPOINTS } from "@/constants/endpoints";

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;
const CAN_ADD_STOCK   = new Set(["dealer_owner", "operations_manager"]);
const CAN_EDIT_DELETE = new Set(["dealer_owner", "operations_manager", "super_admin"]);

const STATUS_COLORS: Record<SIMStatus, string> = {
  in_stock:      "bg-blue-500/10 text-blue-400 border-blue-500/20",
  issued:        "bg-amber-500/10 text-amber-500 border-amber-500/20",
  registered:    "bg-green-500/10 text-green-500 border-green-500/20",
  activated:     "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  returned:      "bg-purple-500/10 text-purple-400 border-purple-500/20",
  fraud_flagged: "bg-destructive/10 text-destructive border-destructive/20",
  lost:          "bg-orange-500/10 text-orange-400 border-orange-500/20",
  faulty:        "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  replaced:      "bg-muted text-muted-foreground border-border",
};

const STATUS_LABELS: Record<SIMStatus, string> = {
  in_stock:      "In Stock",
  issued:        "Issued",
  registered:    "Registered",
  activated:     "Activated",
  returned:      "Returned",
  fraud_flagged: "Fraud Flagged",
  lost:          "Lost",
  faulty:        "Faulty",
  replaced:      "Replaced",
};

const MOVEMENT_ICONS: Record<MovementType, React.ElementType> = {
  receive:  Package,
  issue:    ArrowRightLeft,
  return:   ArrowDownLeft,
  transfer: RefreshCw,
  flag:     ShieldAlert,
  replace:  RefreshCw,
  register: CheckCircle2,
  lost:     ShieldAlert,
  faulty:   AlertCircle,
};

const MOVEMENT_COLORS: Record<MovementType, string> = {
  receive:  "bg-blue-500/10 text-blue-400",
  issue:    "bg-amber-500/10 text-amber-500",
  return:   "bg-purple-500/10 text-purple-400",
  transfer: "bg-primary/10 text-primary",
  flag:     "bg-destructive/10 text-destructive",
  replace:  "bg-muted text-muted-foreground",
  register: "bg-green-500/10 text-green-500",
  lost:     "bg-orange-500/10 text-orange-400",
  faulty:   "bg-yellow-500/10 text-yellow-400",
};

const PAGE_TITLE: Record<string, string> = {
  dealer_owner:       "SIM Inventory",
  operations_manager: "SIM Inventory",
  branch_manager:     "Branch Inventory",
  van_team_leader:    "My SIM Stock",
  brand_ambassador:   "My SIMs",
  finance:            "SIM Inventory",
};

// ─── CSV Export Helper ────────────────────────────────────────────────────────

// Columns that must be forced as text in Excel to prevent scientific notation
// or leading-zero stripping. Values are wrapped with ="..." so Excel preserves them.
const TEXT_FORCE_COLUMNS = new Set(["Serial Number", "Batch ID"]);

function escapeCsv(val: unknown, colName?: string): string {
  const s = val === null || val === undefined ? "" : String(val);
  // Force text format for serial/ID columns — Excel reads ="12345" as literal text
  if (colName && TEXT_FORCE_COLUMNS.has(colName) && s !== "" && s !== "—") {
    return `="` + s.replace(/"/g, '""') + `"`;
  }
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function downloadCsv(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map(r => headers.map(h => escapeCsv(r[h], h)).join(",")),
  ];
  // UTF-8 BOM ensures Excel opens with correct encoding
  const bom = "\uFEFF";
  const blob = new Blob([bom + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── SIM Status Badge ─────────────────────────────────────────────────────────

function SIMStatusBadge({ label, colorClass }: { label: string; colorClass: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium", colorClass)}>
      {label}
    </span>
  );
}

function getDisplayStatus(
  sim: SIM, viewerRole: string,
  viewerUserId?: number, viewerBranchId?: number | null, viewerVanTeamId?: number | null,
): { label: string; colorClass: string } {
  const raw = sim.status;
  if (["registered","activated","fraud_flagged","replaced","returned","lost","faulty"].includes(raw)) {
    return { label: STATUS_LABELS[raw], colorClass: STATUS_COLORS[raw] };
  }
  if (["dealer_owner","operations_manager","super_admin"].includes(viewerRole)) {
    if (raw === "in_stock" && sim.van_team_details) return { label: "Issued Out", colorClass: STATUS_COLORS.issued };
    return { label: STATUS_LABELS[raw], colorClass: STATUS_COLORS[raw] };
  }
  if (viewerRole === "branch_manager") {
    if (raw === "in_stock" && sim.van_team_details) return { label: "Issued Out", colorClass: STATUS_COLORS.issued };
    if (raw === "issued") return { label: "Issued Out", colorClass: STATUS_COLORS.issued };
  }
  if (viewerRole === "van_team_leader") {
    if (raw === "in_stock" && sim.van_team === viewerVanTeamId)
      return { label: "In My Van", colorClass: STATUS_COLORS.in_stock };
    if (raw === "issued")
      return { label: "Issued Out", colorClass: STATUS_COLORS.issued };
  }
  if (viewerRole === "brand_ambassador" || viewerRole === "external_agent") {
    if (raw === "issued" && sim.current_holder === viewerUserId) return { label: "In My Hands", colorClass: STATUS_COLORS.issued };
  }
  return { label: STATUS_LABELS[raw], colorClass: STATUS_COLORS[raw] };
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

function DeleteConfirmModal({ serials, onConfirm, onClose, isPending }: {
  serials: string[]; onConfirm: () => void; onClose: () => void; isPending: boolean;
}) {
  const isBulk = serials.length > 1;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-xl border border-destructive/30 bg-card shadow-2xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
            <Trash2 className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <h3 className="font-heading font-semibold text-foreground">
              {isBulk ? `Delete ${serials.length} SIMs?` : "Delete SIM?"}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">This action is permanent and cannot be undone.</p>
          </div>
        </div>

        <div className="rounded-md bg-accent/50 border border-border px-3 py-2 max-h-28 overflow-y-auto space-y-0.5">
          {serials.map(s => <p key={s} className="font-mono text-xs text-primary">{s}</p>)}
        </div>

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 rounded-md border border-border py-2 text-sm font-medium hover:bg-accent transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={isPending}
            className="flex-1 flex items-center justify-center gap-2 rounded-md bg-destructive py-2 text-sm font-semibold text-white disabled:opacity-50 hover:opacity-90 transition-opacity">
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isPending ? "Deleting…" : isBulk ? `Delete ${serials.length} SIMs` : "Delete SIM"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── SIM Detail Drawer ────────────────────────────────────────────────────────

function SIMDetailDrawer({ sim, onClose }: { sim: SIM; onClose: () => void }) {
  const { data: movementsData, isLoading } = useSIMMovements(sim.serial_number);
  const movements = Array.isArray(movementsData)
    ? movementsData
    : (movementsData as { results?: SIMMovement[] })?.results ?? [];

  const holderName = sim.current_holder_details
    ? `${sim.current_holder_details.first_name} ${sim.current_holder_details.last_name}`.trim()
    : "—";

  return (
    <>
      <div className="fixed inset-0 z-40 bg-background/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm border-l border-border bg-card shadow-2xl flex flex-col">
        <div className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Layers className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-mono text-sm font-semibold text-foreground">{sim.serial_number}</p>
              <SIMStatusBadge label={STATUS_LABELS[sim.status]} colorClass={STATUS_COLORS[sim.status]} />
            </div>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Details</p>
            <div className="rounded-lg border border-border bg-background p-3 space-y-3">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Current Holder</p>
                  {sim.current_holder_details ? (
                    <>
                      <p className="text-sm font-medium text-foreground">{holderName}</p>
                      <p className="text-xs text-muted-foreground capitalize">{sim.current_holder_details.role.replace(/_/g, " ")}</p>
                    </>
                  ) : sim.van_team_details ? (
                    <>
                      <p className="text-sm font-medium text-foreground">{sim.van_team_details.name}</p>
                      <p className="text-xs text-muted-foreground">Van Stock</p>
                    </>
                  ) : sim.branch_details ? (
                    <>
                      <p className="text-sm font-medium text-foreground">{sim.branch_details.name}</p>
                      <p className="text-xs text-muted-foreground">Branch Stock</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-foreground">Warehouse</p>
                      <p className="text-xs text-muted-foreground">Unassigned</p>
                    </>
                  )}
                </div>
              </div>
              {sim.branch_details && (
                <div className="flex items-center gap-3">
                  <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Branch</p>
                    <p className="text-sm font-medium text-foreground">{sim.branch_details.name}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Layers className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Batch ID</p>
                  <p className="text-sm font-medium text-foreground">#{sim.batch}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <p className="text-xs text-muted-foreground">Added</p>
                  <p className="text-xs font-medium text-foreground">
                    {new Date(sim.created_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Last Updated</p>
                  <p className="text-xs font-medium text-foreground">
                    {new Date(sim.updated_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Movement History</p>
            {isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground py-4 justify-center">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-xs">Loading history…</span>
              </div>
            ) : !movements || movements.length === 0 ? (
              <p className="text-sm text-muted-foreground italic py-4 text-center">No movement history yet.</p>
            ) : (
              <div className="space-y-2">
                {movements.map((m) => {
                  const Icon = MOVEMENT_ICONS[m.movement_type] ?? ArrowRightLeft;
                  return (
                    <div key={m.id} className="flex items-start gap-3">
                      <div className={cn("mt-0.5 h-7 w-7 rounded-lg flex items-center justify-center shrink-0", MOVEMENT_COLORS[m.movement_type])}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground capitalize">{m.movement_type.replace(/_/g, " ")}</p>
                        {m.notes && <p className="text-xs text-muted-foreground mt-0.5">{m.notes}</p>}
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(m.created_at).toLocaleString("en-KE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Add Batch Modal ──────────────────────────────────────────────────────────

function AddBatchModal({ onClose, dealerId, branches }: {
  onClose: () => void; dealerId?: number; branches: { id: number; name: string }[];
}) {
  const [step, setStep] = useState<"summary" | "carryforward" | "form">("summary");
  const [batchSummary, setBatchSummary] = useState<{
    id: number; batch_number: string; received_at: string;
    total: number; in_stock: number; in_vans: number; with_ba: number;
    registered: number; activated: number; lost_faulty: number; returned: number;
  }[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [newBatchId, setNewBatchId] = useState<number | null>(null);
  const [carryingForward, setCarryingForward] = useState(false);

  const [tab, setTab]                   = useState<"single" | "range">("range");
  const [batchNumber, setBatchNumber]   = useState("");
  const [branchId, setBranchId]         = useState("");
  const [notes, setNotes]               = useState("");
  const [singleSerial, setSingleSerial] = useState("");
  const [serialList, setSerialList]     = useState<string[]>([]);
  const [dupError, setDupError]         = useState("");
  const [rangeStart, setRangeStart]     = useState("");
  const [rangeEnd, setRangeEnd]         = useState("");
  const createBatch = useCreateSIMBatch();

  useEffect(() => {
    api.get(ENDPOINTS.BATCH_SUMMARY)
      .then(r => {
        setBatchSummary(Array.isArray(r.data) ? r.data : []);
        setSummaryLoading(false);
      })
      .catch(() => setSummaryLoading(false));
  }, []);

  const hasPreviousBatches = batchSummary.length > 0;
  const latestBatch = batchSummary[0];
  const unresolved = latestBatch
    ? latestBatch.in_stock + latestBatch.in_vans + latestBatch.with_ba + latestBatch.registered
    : 0;

  const rangeCount = useMemo(() => {
    try {
      const s = BigInt(rangeStart), e = BigInt(rangeEnd);
      if (e < s) return null;
      return Number(e - s + 1n);
    } catch { return null; }
  }, [rangeStart, rangeEnd]);

  const handleAddSerial = () => {
    const t = singleSerial.trim();
    if (!t) return;
    if (serialList.includes(t)) { setDupError(`${t} already added.`); return; }
    setSerialList(p => [...p, t]); setSingleSerial(""); setDupError("");
  };

  const isValid = batchNumber.trim() && branchId && (
    tab === "range" ? (rangeCount !== null && rangeCount > 0) : serialList.length > 0
  );

  const handleSubmit = async () => {
    if (!isValid) return;
    try {
      const result = await createBatch.mutateAsync({
        batch_number: batchNumber.trim(), branch: Number(branchId),
        quantity: tab === "range" ? rangeCount! : serialList.length,
        serial_start: tab === "range" ? rangeStart : serialList[0],
        serial_end: tab === "range" ? rangeEnd : serialList[serialList.length - 1],
        notes: notes.trim(),
      });
      setNewBatchId(result.id);
      if (hasPreviousBatches && unresolved > 0) {
        setStep("carryforward");
      } else {
        showSuccess("Batch created successfully!");
        onClose();
      }
    } catch { showError("Failed to create batch. Please try again."); }
  };

  const handleCarryForward = async (doCarry: boolean) => {
    if (doCarry && latestBatch && newBatchId) {
      setCarryingForward(true);
      try {
        await api.post(ENDPOINTS.CARRY_FORWARD, {
          from_batch: latestBatch.id,
          to_batch:   newBatchId,
        });
        showSuccess(`${unresolved} SIMs carried forward to new batch.`);
      } catch {
        showError("Carry forward failed. You can do it manually later.");
      }
      setCarryingForward(false);
    } else {
      showSuccess("Batch created successfully!");
    }
    onClose();
  };

  if (step === "summary") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between border-b border-border px-6 py-4 sticky top-0 bg-card z-10">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Plus className="h-4 w-4 text-primary" />
              </div>
              <h3 className="font-heading text-lg font-semibold">Add New Batch</h3>
            </div>
            <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6 space-y-5">
            {summaryLoading ? (
              <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Loading current status…</span>
              </div>
            ) : !hasPreviousBatches ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">No previous batches. Let's create your first one.</p>
              </div>
            ) : (
              <>
                <div>
                  <p className="text-sm font-medium text-foreground mb-1">Before you add a new batch, here's where you stand:</p>
                  <p className="text-xs text-muted-foreground">Latest batch: <span className="text-foreground font-medium">{latestBatch.batch_number}</span></p>
                </div>
                <div className="rounded-lg border border-border bg-accent/20 divide-y divide-border">
                  {[
                    { label: "In Stock (branch)",    value: latestBatch.in_stock,    color: "text-blue-400",    unresolved: true  },
                    { label: "In Vans",              value: latestBatch.in_vans,     color: "text-amber-400",   unresolved: true  },
                    { label: "With BAs (unregistered)", value: latestBatch.with_ba,  color: "text-orange-400",  unresolved: true  },
                    { label: "Registered (waiting Safaricom)", value: latestBatch.registered, color: "text-green-500", unresolved: true },
                    { label: "Activated ✅",          value: latestBatch.activated,  color: "text-emerald-400", unresolved: false },
                    { label: "Lost / Faulty ❌",      value: latestBatch.lost_faulty,color: "text-destructive", unresolved: false },
                    { label: "Returned",             value: latestBatch.returned,   color: "text-purple-400",  unresolved: false },
                  ].map(row => (
                    <div key={row.label} className="flex items-center justify-between px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{row.label}</span>
                        {row.unresolved && row.value > 0 && (
                          <span className="text-xs bg-amber-500/15 text-amber-500 rounded-full px-1.5 py-0.5">unresolved</span>
                        )}
                      </div>
                      <span className={cn("text-sm font-bold", row.color)}>{row.value.toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between px-4 py-2.5 bg-accent/30">
                    <span className="text-sm font-semibold text-foreground">Total</span>
                    <span className="text-sm font-bold text-foreground">{latestBatch.total.toLocaleString()}</span>
                  </div>
                </div>
                {unresolved > 0 && (
                  <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
                    <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-500">
                      You have <span className="font-bold">{unresolved.toLocaleString()} unresolved SIMs</span> from this batch. You can carry them forward to the new batch after creating it.
                    </p>
                  </div>
                )}
              </>
            )}
            <div className="flex gap-2 pt-1">
              <button onClick={onClose} className="flex-1 rounded-md border border-border py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors">
                Cancel
              </button>
              <button
                onClick={() => setStep("form")}
                disabled={summaryLoading}
                className="flex-1 flex items-center justify-center gap-2 rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50 hover:opacity-90 transition-opacity">
                Continue to Add Batch
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === "carryforward") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" />
        <div className="relative w-full max-w-sm rounded-xl border border-border bg-card shadow-2xl p-6 space-y-5">
          <div className="text-center space-y-2">
            <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto">
              <AlertCircle className="h-6 w-6 text-amber-500" />
            </div>
            <h3 className="font-heading text-lg font-semibold">Carry Forward Unresolved SIMs?</h3>
            <p className="text-sm text-muted-foreground">
              You have <span className="font-bold text-foreground">{unresolved.toLocaleString()} unresolved SIMs</span> from <span className="font-medium text-foreground">{latestBatch?.batch_number}</span>.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-accent/20 divide-y divide-border text-sm">
            {[
              { label: "In Stock",    value: latestBatch?.in_stock   ?? 0 },
              { label: "In Vans",     value: latestBatch?.in_vans    ?? 0 },
              { label: "With BAs",    value: latestBatch?.with_ba    ?? 0 },
              { label: "Registered",  value: latestBatch?.registered ?? 0 },
            ].map(row => (
              <div key={row.label} className="flex justify-between px-4 py-2">
                <span className="text-muted-foreground">{row.label}</span>
                <span className="font-medium text-foreground">{row.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-border bg-accent/10 px-4 py-3 space-y-1">
            <p className="text-xs font-medium text-foreground">What does carry forward mean?</p>
            <p className="text-xs text-muted-foreground">These SIMs move to your new batch — like moving to the next class. Activated and lost SIMs stay on the old batch.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleCarryForward(false)}
              disabled={carryingForward}
              className="flex-1 rounded-md border border-border py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50">
              No, Keep Separate
            </button>
            <button
              onClick={() => handleCarryForward(true)}
              disabled={carryingForward}
              className="flex-1 flex items-center justify-center gap-2 rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50 hover:opacity-90 transition-opacity">
              {carryingForward && <Loader2 className="h-4 w-4 animate-spin" />}
              {carryingForward ? "Moving…" : "Yes, Carry Forward"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl border border-border bg-card shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-border px-6 py-4 sticky top-0 bg-card z-10">
          <div className="flex items-center gap-2">
            <button onClick={() => setStep("summary")} className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Plus className="h-4 w-4 text-primary" />
            </div>
            <h3 className="font-heading text-lg font-semibold">Add SIM Batch</h3>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Batch Number</label>
            <input value={batchNumber} onChange={e => setBatchNumber(e.target.value)} placeholder="e.g. BATCH-2026-002"
              className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Destination Branch</label>
            <select value={branchId} onChange={e => setBranchId(e.target.value)}
              className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
              <option value="">— Select branch —</option>
              {branches.map(b => <option key={b.id} value={String(b.id)}>{b.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-1 rounded-md border border-border bg-accent p-1">
            {(["range", "single"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={cn("rounded py-1.5 text-sm font-medium transition-colors capitalize",
                  tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
                {t === "range" ? "Serial Range" : "Individual SIMs"}
              </button>
            ))}
          </div>
          {tab === "range" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Start Serial</label>
                <input value={rangeStart} onChange={e => setRangeStart(e.target.value.replace(/\D/g, ""))} placeholder="89254000000000"
                  className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">End Serial</label>
                <input value={rangeEnd} onChange={e => setRangeEnd(e.target.value.replace(/\D/g, ""))} placeholder="89254000000199"
                  className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              {rangeCount !== null && rangeCount > 0 && (
                <p className="col-span-2 text-sm text-muted-foreground">
                  Will create <span className="text-primary font-semibold">{rangeCount.toLocaleString()}</span> SIM records.
                </p>
              )}
              {rangeStart && rangeEnd && (rangeCount === null || rangeCount <= 0) && (
                <p className="col-span-2 text-sm text-destructive">End serial must be greater than start.</p>
              )}
            </div>
          )}
          {tab === "single" && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <input value={singleSerial}
                  onChange={e => { setSingleSerial(e.target.value.replace(/\D/g, "")); setDupError(""); }}
                  onKeyDown={e => { if (e.key === "Enter") handleAddSerial(); }}
                  placeholder="89254000000000"
                  className="flex-1 rounded-md border border-border bg-accent py-2 px-3 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                <button onClick={handleAddSerial} disabled={!singleSerial}
                  className="flex items-center justify-center rounded-md border border-border bg-accent px-3 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors disabled:opacity-40">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              {dupError && <p className="text-xs text-destructive">{dupError}</p>}
              {serialList.length > 0 && (
                <div className="rounded-md border border-border bg-accent/30 p-2 space-y-1 max-h-36 overflow-y-auto">
                  {serialList.map(s => (
                    <div key={s} className="flex items-center justify-between rounded px-2 py-1 hover:bg-accent">
                      <span className="font-mono text-xs text-primary">{s}</span>
                      <button onClick={() => setSerialList(p => p.filter(x => x !== s))} className="text-muted-foreground hover:text-destructive">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                {serialList.length === 0 ? "No SIMs added yet." : (
                  <><span className="text-primary font-semibold">{serialList.length}</span> SIM{serialList.length > 1 ? "s" : ""} added.</>
                )}
              </p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Notes <span className="text-muted-foreground font-normal">(optional)</span></label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="e.g. Received from Safaricom warehouse"
              className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 rounded-md border border-border py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors">Cancel</button>
            <button onClick={handleSubmit} disabled={!isValid || createBatch.isPending}
              className="flex-1 flex items-center justify-center gap-2 rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50 hover:opacity-90 transition-opacity">
              {createBatch.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {createBatch.isPending ? "Creating…" : "Create Batch"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({ page, totalCount, pageSize, onPageChange }: {
  page: number; totalCount: number; pageSize: number; onPageChange: (p: number) => void;
}) {
  const totalPages = Math.ceil(totalCount / pageSize);
  if (totalPages <= 1) return null;
  const start = (page - 1) * pageSize + 1;
  const end   = Math.min(page * pageSize, totalCount);
  const pages: (number | "…")[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) pages.push(i);
    else if (pages[pages.length - 1] !== "…") pages.push("…");
  }
  return (
    <div className="flex items-center justify-between gap-4 pt-1">
      <p className="text-xs text-muted-foreground">
        Showing <span className="text-foreground font-medium">{start.toLocaleString()}–{end.toLocaleString()}</span> of{" "}
        <span className="text-foreground font-medium">{totalCount.toLocaleString()}</span> SIMs
      </p>
      <div className="flex items-center gap-1">
        <button onClick={() => onPageChange(page - 1)} disabled={page === 1}
          className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
          <ChevronLeft className="h-3.5 w-3.5" /> Prev
        </button>
        {pages.map((p, i) => p === "…" ? (
          <span key={`e-${i}`} className="px-1 text-xs text-muted-foreground">…</span>
        ) : (
          <button key={p} onClick={() => onPageChange(p as number)}
            className={cn("min-w-[32px] rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors",
              p === page ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground hover:bg-accent")}>
            {p}
          </button>
        ))}
        <button onClick={() => onPageChange(page + 1)} disabled={page === totalPages}
          className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
          Next <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Filter Bar ───────────────────────────────────────────────────────────────

interface FilterBarProps {
  role: string; dealerId?: number; branchId?: number | null; vanTeamId?: number | null;
  search: string; onSearch: (v: string) => void;
  statusFilter: SIMStatus | ""; onStatus: (v: SIMStatus | "") => void;
  vanFilter: string; onVan: (v: string) => void;
  holderFilter: string; onHolder: (v: string) => void;
  holderType: "ba" | "agent" | ""; onHolderType: (v: "ba" | "agent" | "") => void;
  branchFilter: string; onBranch: (v: string) => void;
  activeFilterCount: number; onClearAll: () => void;
  onLocationClear: () => void;
}

function FilterBar({
  role, dealerId, branchId, vanTeamId,
  search, onSearch, statusFilter, onStatus,
  branchFilter, onBranch, vanFilter, onVan,
  holderFilter, onHolder, holderType, onHolderType,
  activeFilterCount, onClearAll, onLocationClear,
}: FilterBarProps) {
  const { data: allBranches = [] } = useBranches(
    (role === "dealer_owner" || role === "operations_manager") ? dealerId : undefined
  );
  const { data: allVanTeamsData } = useAllVanTeams(
    (role === "dealer_owner" || role === "operations_manager") ? dealerId : undefined, allBranches
  );
  const managerVanTeams = useMemo(() => allVanTeamsData ?? [], [allVanTeamsData]);
  const { data: branchVanTeams = [] } = useVanTeams(
    role === "branch_manager" ? dealerId : undefined,
    role === "branch_manager" ? (branchId ?? undefined) : undefined
  );
  const vanOptions = useMemo(() => {
    if (role === "dealer_owner" || role === "operations_manager")
      return branchFilter ? managerVanTeams.filter(v => String(v.branch) === branchFilter) : managerVanTeams;
    if (role === "branch_manager") return branchVanTeams;
    return [];
  }, [role, managerVanTeams, branchVanTeams, branchFilter]);

  // FIX: Added page_size=1000 to fetch ALL BAs/agents, not just first page
  const baParams = useMemo(() => {
    const base = {
      role: "brand_ambassador" as const,
      page_size: 1000,
      ...(dealerId ? { dealer_id: dealerId } : {}),
    };
    if (role === "branch_manager" && vanFilter) return { ...base, van_team: Number(vanFilter) };
    if (role === "van_team_leader" && vanTeamId) return { ...base, van_team: vanTeamId };
    return base;
  }, [role, dealerId, vanFilter, vanTeamId]);

  const { data: baData } = useUsers((role !== "brand_ambassador" && role !== "finance") ? baParams : undefined);
  const baUsers = baData?.results ?? [];

  // FIX: Added page_size=1000 to fetch ALL agents, not just first page
  const agentParams = useMemo(() => {
    const base = {
      role: "external_agent" as const,
      page_size: 1000,
      ...(dealerId ? { dealer_id: dealerId } : {}),
    };
    if (role === "branch_manager" && vanFilter) return { ...base, van_team: Number(vanFilter) };
    if (role === "van_team_leader" && vanTeamId) return { ...base, van_team: vanTeamId };
    return base;
  }, [role, dealerId, vanFilter, vanTeamId]);

  const { data: agentData } = useUsers((role !== "brand_ambassador" && role !== "finance") ? agentParams : undefined);
  const agentUsers = agentData?.results ?? [];
  const holderOptions = holderType === "ba" ? baUsers : agentUsers;

  const showBranchFilter  = role === "dealer_owner" || role === "operations_manager";
  const showVanFilter     = role === "dealer_owner" || role === "operations_manager" || role === "branch_manager";
  const showHolderFilters = role !== "brand_ambassador" && role !== "finance";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input value={search} onChange={e => onSearch(e.target.value)} placeholder="Search serial, holder, branch…"
          className="w-full rounded-md border border-border bg-accent py-2 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
      </div>
      <select value={statusFilter} onChange={e => { onLocationClear(); onStatus(e.target.value as SIMStatus | ""); }}
        className="rounded-md border border-border bg-accent px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
        <option value="">All Statuses</option>
        <option value="in_stock">In Stock</option>
        <option value="issued">Issued</option>
        <option value="registered">Registered</option>
        <option value="activated">Activated</option>
        <option value="returned">Returned</option>
        <option value="fraud_flagged">Fraud Flagged</option>
        <option value="lost">Lost</option>
        <option value="faulty">Faulty</option>
        <option value="replaced">Replaced</option>
      </select>
      {showBranchFilter && (
        <select value={branchFilter} onChange={e => { onBranch(e.target.value); onVan(""); onHolder(""); onHolderType(""); }}
          className="rounded-md border border-border bg-accent px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
          <option value="">All Branches</option>
          {allBranches.map(b => <option key={b.id} value={String(b.id)}>{b.name}</option>)}
        </select>
      )}
      {showVanFilter && vanOptions.length > 0 && (
        <select value={vanFilter} onChange={e => { onVan(e.target.value); onHolder(""); }}
          className="rounded-md border border-border bg-accent px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
          <option value="">All Van Teams</option>
          {vanOptions.map(v => <option key={v.id} value={String(v.id)}>{v.name}</option>)}
        </select>
      )}
      {showHolderFilters && (baUsers.length > 0 || agentUsers.length > 0) && (
        <select value={holderType} onChange={e => { onHolderType(e.target.value as "ba" | "agent" | ""); onHolder(""); }}
          className="rounded-md border border-border bg-accent px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
          <option value="">All Holders</option>
          {baUsers.length > 0    && <option value="ba">Brand Ambassadors ({baUsers.length})</option>}
          {agentUsers.length > 0 && <option value="agent">External Agents ({agentUsers.length})</option>}
        </select>
      )}
      {showHolderFilters && holderType && holderOptions.length > 0 && (
        <select value={holderFilter} onChange={e => onHolder(e.target.value)}
          className="rounded-md border border-border bg-accent px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
          <option value="">— All {holderType === "ba" ? "Ambassadors" : "Agents"} ({holderOptions.length}) —</option>
          {holderOptions.map(u => (
            <option key={u.id} value={String(u.id)}>{`${u.first_name} ${u.last_name}`.trim() || u.email}</option>
          ))}
        </select>
      )}
      {activeFilterCount > 0 && (
        <button onClick={onClearAll}
          className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent border border-border transition-colors">
          <X className="h-3.5 w-3.5" />
          Clear {activeFilterCount > 1 ? `(${activeFilterCount})` : ""}
        </button>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SimInventory() {
  const { user } = useAuth();
  const role      = user?.role ?? "dealer_owner";
  const dealerId  = user?.dealer_id  ? Number(user.dealer_id)  : undefined;
  const branchId  = user?.branch_id  ?? null;
  const vanTeamId = user?.van_team_id ?? null;
  const canEditDelete = CAN_EDIT_DELETE.has(role);

  const [search,        setSearch]        = useState("");
  const [statusFilter,  setStatusFilter]  = useState<SIMStatus | "">("");
  const [locationFilter,setLocationFilter]= useState<"branch_stock"|"van_stock"|"with_ba"|"">("");
  const [branchFilter,  setBranchFilter]  = useState<string>("");
  const [vanFilter,     setVanFilter]     = useState<string>("");
  const [holderFilter,  setHolderFilter]  = useState<string>("");
  const [holderType,    setHolderType]    = useState<"ba" | "agent" | "">("");
  const [page,          setPage]          = useState(1);
  const [isExporting,   setIsExporting]   = useState(false);

  const [activeSIM,    setActiveSIM]    = useState<SIM | null>(null);
  const [showAddBatch, setShowAddBatch] = useState(false);
  const [selected,     setSelected]     = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<string[] | null>(null);

  const handleFilterChange = (fn: () => void) => { fn(); setPage(1); };

  const scopeParams = useMemo((): Record<string, string | number> => {
    if (role === "branch_manager" && branchId)   return { branch: branchId };
    if (role === "van_team_leader") return vanTeamId ? { van_team: vanTeamId } : { van_team: -1 };
    if (role === "brand_ambassador" || role === "finance") return { holder: Number(user?.id) };
    return {};
  }, [role, branchId, vanTeamId, user?.id]);

  const filterParams = useMemo(() => ({
    ...scopeParams,
    ...(locationFilter ? { location: locationFilter } : statusFilter ? { status: statusFilter } : {}),
    ...(branchFilter && (role === "dealer_owner" || role === "operations_manager") ? { branch: Number(branchFilter) } : {}),
    ...(vanFilter && role !== "brand_ambassador" && role !== "finance" ? { van_team: Number(vanFilter) } : {}),
    ...(holderFilter && role !== "brand_ambassador" && role !== "finance" ? { holder: Number(holderFilter) } : {}),
    ...(search.trim() ? { search: search.trim() } : {}),
    page,
  }), [scopeParams, locationFilter, statusFilter, branchFilter, vanFilter, holderFilter, search, page, role]);

  const { data: simsData, isLoading, isError, refetch } = useSIMs(filterParams);
  const visibleSIMs = useMemo(() => simsData?.results ?? [], [simsData?.results]);
  const totalCount  = simsData?.count ?? 0;

  const kpiBase = useMemo(() => ({
    ...scopeParams,
    ...(branchFilter && (role === "dealer_owner" || role === "operations_manager") ? { branch: Number(branchFilter) } : {}),
    page_size: 1,
  }), [scopeParams, branchFilter, role]);

  const { data: kpiTotal       } = useSIMs(useMemo(() => ({ ...kpiBase }),                                          [kpiBase]));
  const { data: kpiBranchStock } = useSIMs(useMemo(() => ({ ...kpiBase, location: "branch_stock" as const }),       [kpiBase]));
  const { data: kpiVanStock    } = useSIMs(useMemo(() => ({ ...kpiBase, location: "van_stock"    as const }),       [kpiBase]));
  const { data: kpiWithBA      } = useSIMs(useMemo(() => ({ ...kpiBase, location: "with_ba"      as const }),       [kpiBase]));
  const { data: kpiRegistered  } = useSIMs(useMemo(() => ({ ...kpiBase, status: "registered" as const }),           [kpiBase]));
  const { data: kpiActivated   } = useSIMs(useMemo(() => ({ ...kpiBase, status: "activated"  as const }),           [kpiBase]));
  const { data: kpiReturned    } = useSIMs(useMemo(() => ({ ...kpiBase, status: "returned"   as const }),           [kpiBase]));

  const kpis = useMemo(() => ({
    total:        kpiTotal?.count       ?? 0,
    branch_stock: kpiBranchStock?.count ?? 0,
    van_stock:    kpiVanStock?.count    ?? 0,
    with_ba:      kpiWithBA?.count      ?? 0,
    registered:   kpiRegistered?.count  ?? 0,
    activated:    kpiActivated?.count   ?? 0,
    returned:     kpiReturned?.count    ?? 0,
  }), [kpiTotal, kpiBranchStock, kpiVanStock, kpiWithBA, kpiRegistered, kpiActivated, kpiReturned]);

  const { data: allBranches = [] } = useBranches(CAN_ADD_STOCK.has(role) ? dealerId : undefined);
  const activeFilterCount = [statusFilter, locationFilter, branchFilter, vanFilter, holderFilter, search].filter(Boolean).length;
  const clearAllFilters = () => handleFilterChange(() => {
    setSearch(""); setStatusFilter(""); setLocationFilter(""); setBranchFilter(""); setVanFilter(""); setHolderFilter(""); setHolderType("");
  });
  const viewerUserId = user?.id ? Number(user.id) : undefined;

  // Selection
  const allPageSerials = useMemo(() => visibleSIMs.map(s => s.serial_number), [visibleSIMs]);
  const allSelected    = allPageSerials.length > 0 && allPageSerials.every(s => selected.has(s));
  const someSelected   = selected.size > 0;

  const toggleOne = (serial: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      if (n.has(serial)) { n.delete(serial); } else { n.add(serial); }
      return n;
    });
  };
  const toggleAll = () => {
    if (allSelected) {
      setSelected(prev => { const n = new Set(prev); allPageSerials.forEach(s => n.delete(s)); return n; });
    } else {
      setSelected(prev => new Set([...prev, ...allPageSerials]));
    }
  };

  // Mutations
  const deleteSIM      = useDeleteSIM();
  const bulkDeleteSIMs = useBulkDeleteSIMs();
  const isDeletePending = deleteSIM.isPending || bulkDeleteSIMs.isPending;

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.length === 1) {
        await deleteSIM.mutateAsync(deleteTarget[0]);
      } else {
        await bulkDeleteSIMs.mutateAsync(deleteTarget);
      }
      showSuccess(`${deleteTarget.length} SIM${deleteTarget.length > 1 ? "s" : ""} permanently deleted.`);
      setDeleteTarget(null);
      setSelected(new Set());
    } catch { showError("Failed to delete SIM(s). Please try again."); }
  };

  // ── FIX: Download — fetches ALL pages matching current filters and exports CSV ──
  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      // Build the same filter params but without pagination, and request all results
      const exportParams: Record<string, string | number> = {
        ...scopeParams,
        ...(locationFilter ? { location: locationFilter } : statusFilter ? { status: statusFilter } : {}),
        ...(branchFilter && (role === "dealer_owner" || role === "operations_manager") ? { branch: Number(branchFilter) } : {}),
        ...(vanFilter && role !== "brand_ambassador" && role !== "finance" ? { van_team: Number(vanFilter) } : {}),
        ...(holderFilter && role !== "brand_ambassador" && role !== "finance" ? { holder: Number(holderFilter) } : {}),
        ...(search.trim() ? { search: search.trim() } : {}),
        page_size: 10000, // fetch all matching records
        page: 1,
      };

      const params = new URLSearchParams(
        Object.entries(exportParams).map(([k, v]) => [k, String(v)])
      );

      const response = await api.get(`${ENDPOINTS.SIMS}?${params.toString()}`);
      const allSIMs: SIM[] = response.data?.results ?? response.data ?? [];

      if (!allSIMs.length) {
        showError("No SIMs to export with the current filters.");
        return;
      }

      const rows = allSIMs.map(sim => ({
        "Serial Number":  sim.serial_number,
        "Status":         STATUS_LABELS[sim.status] ?? sim.status,
        "Current Holder": sim.current_holder_details
          ? `${sim.current_holder_details.first_name} ${sim.current_holder_details.last_name}`.trim()
          : sim.van_team_details?.name ?? sim.branch_details?.name ?? "—",
        "Holder Role":    sim.current_holder_details?.role?.replace(/_/g, " ") ?? (sim.van_team_details ? "Van Stock" : sim.branch_details ? "Branch Stock" : "Warehouse"),
        "Branch":         sim.branch_details?.name ?? "—",
        "Van Team":       sim.van_team_details?.name ?? "—",
        "Batch ID":       sim.batch ?? "—",
        "Added":          new Date(sim.created_at).toLocaleDateString("en-KE"),
        "Last Updated":   new Date(sim.updated_at).toLocaleDateString("en-KE"),
      }));

      // Build a human-readable filename reflecting active filters
      const filterParts: string[] = [];
      if (statusFilter) filterParts.push(statusFilter);
      if (locationFilter) filterParts.push(locationFilter);
      if (search) filterParts.push(`search-${search}`);
      const filterSuffix = filterParts.length ? `_${filterParts.join("_")}` : "";
      const dateStr = new Date().toISOString().slice(0, 10);
      const filename = `sim_inventory${filterSuffix}_${dateStr}.csv`;

      downloadCsv(rows, filename);
      showSuccess(`Exported ${allSIMs.length} SIM${allSIMs.length !== 1 ? "s" : ""} to CSV.`);
    } catch {
      showError("Export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  }, [scopeParams, locationFilter, statusFilter, branchFilter, vanFilter, holderFilter, search, role]);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">{PAGE_TITLE[role] ?? "SIM Inventory"}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {totalCount > 0 ? `${totalCount.toLocaleString()} total SIMs` : isLoading ? "Loading inventory…" : "No SIMs found"}
          </p>
        </div>
        <div className="flex gap-2">
          {CAN_ADD_STOCK.has(role) && (
            <button onClick={() => setShowAddBatch(true)}
              className="btn-press flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity">
              <Plus className="h-4 w-4" /> Add Batch
            </button>
          )}
          {/* FIX: Export button — fetches filtered results and downloads as CSV */}
          <button
            onClick={handleExport}
            disabled={isExporting || isLoading || totalCount === 0}
            className="btn-press flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={totalCount > 0 ? `Export ${totalCount.toLocaleString()} SIMs${activeFilterCount > 0 ? " (filtered)" : ""}` : "No SIMs to export"}
          >
            {isExporting
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Exporting…</>
              : <><Download className="h-4 w-4" /> Export{activeFilterCount > 0 ? ` (${totalCount.toLocaleString()})` : ""}</>
            }
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {(() => {
        const stockLabel = role === "branch_manager" ? "At Branch" : role === "van_team_leader" ? "In My Van" : "In Stock";
        const issuedLabel = role === "branch_manager" || role === "van_team_leader" ? "Issued Out" : "Issued";
        const kpiCards = role === "dealer_owner" || role === "operations_manager" ? [
          { label: "Total",      value: kpis.total,        color: "text-foreground",  bg: "bg-accent/30",       locationKey: "",             statusKey: ""           },
          { label: "In Stock",   value: kpis.branch_stock, color: "text-blue-400",    bg: "bg-blue-500/10",     locationKey: "branch_stock", statusKey: ""           },
          { label: "In Vans",    value: kpis.van_stock,    color: "text-amber-400",   bg: "bg-amber-500/10",    locationKey: "van_stock",    statusKey: ""           },
          { label: "With BAs",   value: kpis.with_ba,      color: "text-orange-400",  bg: "bg-orange-500/10",   locationKey: "with_ba",      statusKey: ""           },
          { label: "Registered", value: kpis.registered,   color: "text-green-500",   bg: "bg-green-500/10",    locationKey: "",             statusKey: "registered" },
          { label: "Activated",  value: kpis.activated,    color: "text-emerald-400", bg: "bg-emerald-500/10",  locationKey: "",             statusKey: "activated"  },
          { label: "Returned",   value: kpis.returned,     color: "text-purple-400",  bg: "bg-purple-500/10",   locationKey: "",             statusKey: "returned"   },
        ] : [
          { label: "Total",      value: kpis.total,        color: "text-foreground",  bg: "bg-accent/30",       locationKey: "",             statusKey: ""           },
          { label: stockLabel,   value: kpis.branch_stock, color: "text-blue-400",    bg: "bg-blue-500/10",     locationKey: "branch_stock", statusKey: ""           },
          { label: issuedLabel,  value: kpis.with_ba,      color: "text-amber-500",   bg: "bg-amber-500/10",    locationKey: "with_ba",      statusKey: ""           },
          { label: "Registered", value: kpis.registered,   color: "text-green-500",   bg: "bg-green-500/10",    locationKey: "",             statusKey: "registered" },
          { label: "Activated",  value: kpis.activated,    color: "text-emerald-400", bg: "bg-emerald-500/10",  locationKey: "",             statusKey: "activated"  },
          { label: "Returned",   value: kpis.returned,     color: "text-purple-400",  bg: "bg-purple-500/10",   locationKey: "",             statusKey: "returned"   },
        ];
        return (
          <div className={cn("grid grid-cols-2 gap-3", (role === "dealer_owner" || role === "operations_manager") ? "lg:grid-cols-7" : "lg:grid-cols-6")}>
            {kpiCards.map(({ label, value, color, bg, locationKey, statusKey }) => {
              const isActive =
                (locationKey && locationFilter === locationKey) ||
                (statusKey && statusFilter === statusKey && !locationFilter) ||
                (!locationKey && !statusKey && !locationFilter && !statusFilter);
              return (
                <div
                  key={label}
                  onClick={() => handleFilterChange(() => {
                    setLocationFilter("");
                    setStatusFilter("");
                    if (locationKey) setLocationFilter(locationKey as typeof locationFilter);
                    else if (statusKey) setStatusFilter(statusKey as SIMStatus);
                  })}
                  className={cn(
                    "rounded-xl border p-4 cursor-pointer transition-all",
                    bg,
                    isActive ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/50"
                  )}
                >
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className={cn("text-2xl font-bold mt-1 font-heading", color)}>
                    {isLoading ? "—" : value.toLocaleString()}
                  </p>
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* Filter Bar */}
      <FilterBar
        role={role} dealerId={dealerId} branchId={branchId} vanTeamId={vanTeamId}
        search={search}             onSearch={v => handleFilterChange(() => setSearch(v))}
        statusFilter={statusFilter} onStatus={v => handleFilterChange(() => setStatusFilter(v))}
        branchFilter={branchFilter} onBranch={v => handleFilterChange(() => setBranchFilter(v))}
        vanFilter={vanFilter}       onVan={v => handleFilterChange(() => setVanFilter(v))}
        holderFilter={holderFilter} onHolder={v => handleFilterChange(() => setHolderFilter(v))}
        holderType={holderType}     onHolderType={v => handleFilterChange(() => setHolderType(v))}
        activeFilterCount={activeFilterCount} onClearAll={clearAllFilters}
        onLocationClear={() => handleFilterChange(() => setLocationFilter(""))}
      />

      {/* Bulk action toolbar */}
      {canEditDelete && someSelected && (
        <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5">
          <span className="text-sm font-medium text-primary">
            {selected.size} SIM{selected.size > 1 ? "s" : ""} selected
          </span>
          <div className="flex-1" />
          <button onClick={() => setSelected(new Set())} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Clear selection
          </button>
          <button onClick={() => setDeleteTarget([...selected])}
            className="flex items-center gap-1.5 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/20 transition-colors">
            <Trash2 className="h-3.5 w-3.5" />
            Delete {selected.size} SIM{selected.size > 1 ? "s" : ""}
          </button>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading inventory…</span>
        </div>
      ) : isError ? (
        <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Failed to load SIM inventory.</span>
          <button onClick={() => refetch()} className="ml-auto underline text-xs">Retry</button>
        </div>
      ) : (
        <>
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-accent/30 text-muted-foreground text-xs">
                    {canEditDelete && (
                      <th className="py-3 px-3 w-10">
                        <button onClick={toggleAll} className="flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                          {allSelected ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4" />}
                        </button>
                      </th>
                    )}
                    <th className="py-3 px-4 text-left font-medium">Serial Number</th>
                    <th className="py-3 px-4 text-left font-medium">Status</th>
                    <th className="py-3 px-4 text-left font-medium">Current Holder</th>
                    <th className="py-3 px-4 text-left font-medium">Branch</th>
                    <th className="py-3 px-4 text-left font-medium">Last Updated</th>
                    <th className="py-3 px-4 text-left font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleSIMs.length === 0 ? (
                    <tr>
                      <td colSpan={canEditDelete ? 7 : 6} className="py-16 text-center text-sm text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                          <Layers className="h-8 w-8 opacity-30" />
                          <p>No SIMs match your filters.</p>
                          {activeFilterCount > 0 && (
                            <button onClick={clearAllFilters} className="text-primary text-xs underline">Clear all filters</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : visibleSIMs.map(sim => {
                    const holderName = sim.current_holder_details
                      ? `${sim.current_holder_details.first_name} ${sim.current_holder_details.last_name}`.trim()
                      : null;
                    const isChecked = selected.has(sim.serial_number);

                    return (
                      <tr key={sim.id}
                        className={cn(
                          "border-b border-border/50 transition-colors",
                          canEditDelete ? "hover:bg-accent/20" : "hover:bg-accent/40 cursor-pointer",
                          isChecked && "bg-primary/5"
                        )}
                        onClick={() => !canEditDelete && setActiveSIM(sim)}
                      >
                        {canEditDelete && (
                          <td className="py-3 px-3" onClick={e => { e.stopPropagation(); toggleOne(sim.serial_number); }}>
                            <button className="flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                              {isChecked ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4" />}
                            </button>
                          </td>
                        )}
                        <td className="py-3 px-4">
                          <span className="font-mono text-xs text-primary">{sim.serial_number}</span>
                        </td>
                        <td className="py-3 px-4">
                          {(() => {
                            const ds = getDisplayStatus(sim, role, viewerUserId, branchId, vanTeamId);
                            return <SIMStatusBadge label={ds.label} colorClass={ds.colorClass} />;
                          })()}
                        </td>
                        <td className="py-3 px-4">
                          {holderName ? (
                            <div>
                              <p className="text-sm text-foreground">{holderName}</p>
                              <p className="text-xs text-muted-foreground capitalize">{sim.current_holder_details?.role?.replace(/_/g, " ")}</p>
                            </div>
                          ) : sim.van_team_details ? (
                            <div>
                              <p className="text-sm text-foreground">{sim.van_team_details.name}</p>
                              <p className="text-xs text-muted-foreground">Van Stock</p>
                            </div>
                          ) : sim.branch_details ? (
                            <div>
                              <p className="text-sm text-foreground">{sim.branch_details.name}</p>
                              <p className="text-xs text-muted-foreground">Branch Stock</p>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Warehouse</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">{sim.branch_details?.name ?? "—"}</td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">
                          {new Date(sim.updated_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
                        </td>
                        <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => setActiveSIM(sim)}
                              className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors border border-border"
                              title="View details">
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                            {canEditDelete && (
                              <button onClick={() => setDeleteTarget([sim.serial_number])}
                                className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-colors border border-border hover:border-destructive/30"
                                title="Delete SIM">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <Pagination page={page} totalCount={totalCount} pageSize={PAGE_SIZE} onPageChange={setPage} />
        </>
      )}

      {activeSIM && <SIMDetailDrawer sim={activeSIM} onClose={() => setActiveSIM(null)} />}

      {deleteTarget && (
        <DeleteConfirmModal
          serials={deleteTarget}
          onConfirm={handleConfirmDelete}
          onClose={() => setDeleteTarget(null)}
          isPending={isDeletePending}
        />
      )}

      {showAddBatch && (
        <AddBatchModal
          onClose={() => setShowAddBatch(false)}
          dealerId={dealerId}
          branches={allBranches.map(b => ({ id: b.id, name: b.name }))}
        />
      )}
    </div>
  );
}