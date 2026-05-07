// src/pages/ba/Dashboard.tsx
import { useMemo } from "react";
import { CreditCard, CheckCircle, Calendar, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useSIMs } from "@/hooks/useInventory";
import { useMyReconHistory } from "@/hooks/useReconciliation";
import { useCommissionRecords } from "@/hooks/useCommissions";
import type { ReconciliationRecord } from "@/types/reconciliation.types";
import type { SIM } from "@/types/inventory.types";

// ── Status colour maps ────────────────────────────────────────────────────────

const SIM_STATUS_COLORS: Record<string, string> = {
  in_stock:     "bg-muted/40 text-muted-foreground",
  issued:       "bg-blue-500/20 text-blue-400",
  registered:   "bg-primary/20 text-primary",
  activated:    "bg-success/20 text-success",
  returned:     "bg-warning/20 text-warning",
  fraud_flagged:"bg-destructive/20 text-destructive",
  replaced:     "bg-muted/40 text-muted-foreground",
};

const RECON_STATUS_COLORS: Record<string, string> = {
  payable:   "bg-success/20 text-success",
  rejected:  "bg-warning/20 text-warning",
  fraud:     "bg-destructive/20 text-destructive",
  dispute:   "bg-destructive/20 text-destructive",
  unmatched: "bg-muted/40 text-muted-foreground",
  review:    "bg-primary/20 text-primary",
  ghost_sim: "bg-destructive/20 text-destructive",
};

function reconLabel(result: string) {
  return result.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function simStatusLabel(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BADashboard() {
  const { user } = useAuth();
  const userId   = user?.id ? Number(user.id) : undefined;

  // ── Data fetching ─────────────────────────────────────────────────────────
  const { data: simsData,       isLoading: simsLoading   } = useSIMs(
    userId ? { holder: userId } as never : undefined
  );
  const { data: reconRaw,       isLoading: reconLoading   } = useMyReconHistory();
  const { data: commRecordsRaw, isLoading: commLoading    } = useCommissionRecords(
    userId ? { agent: userId } : undefined
  );

  // ── Derived: SIMs ─────────────────────────────────────────────────────────
  const allSims = useMemo<SIM[]>(() => {
    const raw = simsData as { results?: SIM[] } | SIM[] | undefined;
    if (!raw) return [];
    return Array.isArray(raw) ? raw : (raw.results ?? []);
  }, [simsData]);

  const totalSims    = (simsData as { count?: number } | undefined)?.count ?? allSims.length;
  const previewSims  = allSims.slice(0, 4);

  // ── Derived: Recon records ────────────────────────────────────────────────
  const reconRecords = useMemo<ReconciliationRecord[]>(() => {
    if (!reconRaw) return [];
    return Array.isArray(reconRaw) ? reconRaw : ((reconRaw as { results?: ReconciliationRecord[] }).results ?? []);
  }, [reconRaw]);

  const confirmedActive = useMemo(
    () => reconRecords.filter(r => r.result === "payable").length,
    [reconRecords]
  );
  const thisMonthRegs = useMemo(() => {
    const now = new Date();
    return reconRecords.filter(r => {
      if (!r.topup_date) return false;
      const d = new Date(r.topup_date);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }).length;
  }, [reconRecords]);

  const previewRecon = reconRecords.slice(0, 5);

  // ── Derived: Commission ───────────────────────────────────────────────────
  const commRecords = useMemo(() => {
    const raw = commRecordsRaw as { results?: typeof commRecordsRaw } | undefined;
    if (!raw) return [];
    return Array.isArray(raw) ? raw : ((raw as { results?: unknown[] }).results ?? []);
  }, [commRecordsRaw]);

  const latestComm = commRecords[0] as {
    net_amount?: string;
    gross_amount?: string;
    active_sims?: number;
    status?: string;
    rate_per_sim?: string;
  } | undefined;

  const netAmount   = parseFloat(latestComm?.net_amount   ?? "0");
  const grossAmount = parseFloat(latestComm?.gross_amount ?? "0");
  const activeSims  = latestComm?.active_sims ?? 0;
  const commStatus  = latestComm?.status ?? "—";
  const ratePerSim  = parseFloat(latestComm?.rate_per_sim ?? "0");

  // Commission progress bar — use gross as "earned", net as "after deductions"
  const target = grossAmount > 0 ? grossAmount * 1.25 : 15000;
  const pct    = grossAmount > 0 ? Math.min(Math.round((netAmount / target) * 100), 100) : 0;

  const isLoading = simsLoading || reconLoading || commLoading;

  return (
    <div className="space-y-5 max-w-lg mx-auto lg:max-w-none">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">My Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Here is your performance this cycle</p>
      </div>

      {/* KPIs 2×2 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <CreditCard className="h-5 w-5 mb-2 text-primary" />
          <p className="font-heading text-xl font-bold text-foreground">
            {simsLoading ? "—" : totalSims.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground">SIMs With Me</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {simsLoading ? "Loading…" : `${allSims.filter(s => s.status === "registered").length} registered`}
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <CheckCircle className="h-5 w-5 mb-2 text-success" />
          <p className="font-heading text-xl font-bold text-foreground">
            {reconLoading ? "—" : confirmedActive.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground">Confirmed Active</p>
          <p className="text-xs text-muted-foreground mt-0.5">From Safaricom</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <Calendar className="h-5 w-5 mb-2 text-secondary" />
          <p className="font-heading text-xl font-bold text-foreground">
            {reconLoading ? "—" : thisMonthRegs.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground">This Month</p>
          <p className="text-xs text-muted-foreground mt-0.5">Total registrations</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <DollarSign className="h-5 w-5 mb-2 text-warning" />
          <p className="font-heading text-xl font-bold text-foreground">
            {commLoading ? "—" : `KES ${netAmount.toLocaleString()}`}
          </p>
          <p className="text-xs text-muted-foreground">My Commission</p>
          <p className="text-xs text-muted-foreground mt-0.5 capitalize">{commStatus}</p>
        </div>
      </div>

      {/* My SIMs */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="font-heading text-lg font-semibold text-foreground mb-3">My SIMs</h3>
        {simsLoading ? (
          <p className="text-sm text-muted-foreground text-center py-4">Loading…</p>
        ) : previewSims.length === 0 ? (
          <p className="text-sm text-muted-foreground italic text-center py-4">No SIMs currently assigned to you.</p>
        ) : (
          <div className="space-y-2">
            {previewSims.map(s => (
              <div key={s.serial_number} className="flex items-center justify-between rounded-md bg-accent p-3">
                <div>
                  <p className="font-mono text-sm text-primary">{s.serial_number}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.updated_at
                      ? `Updated ${new Date(s.updated_at).toLocaleDateString("en-KE", { day: "numeric", month: "short" })}`
                      : "—"}
                  </p>
                </div>
                <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", SIM_STATUS_COLORS[s.status] ?? "bg-muted/40 text-muted-foreground")}>
                  {simStatusLabel(s.status)}
                </span>
              </div>
            ))}
          </div>
        )}
        {totalSims > 4 && (
          <button className="mt-3 w-full text-center text-sm text-primary hover:underline">
            View All {totalSims} SIMs
          </button>
        )}
      </div>

      {/* Registrations from Safaricom */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="font-heading text-lg font-semibold text-foreground">Registrations From Safaricom</h3>
        <p className="text-xs text-muted-foreground mb-3">SIMs Safaricom has confirmed in your name</p>
        {reconLoading ? (
          <p className="text-sm text-muted-foreground text-center py-4">Loading…</p>
        ) : previewRecon.length === 0 ? (
          <p className="text-sm text-muted-foreground italic text-center py-4">No reconciliation records yet.</p>
        ) : (
          <div className="space-y-2">
            {previewRecon.map(r => (
              <div
                key={r.id}
                className={cn(
                  "rounded-md bg-accent p-3",
                  (r.result === "fraud" || r.result === "dispute") && "border border-destructive/30"
                )}
              >
                <div className="flex items-center justify-between">
                  <p className="font-mono text-sm text-primary">{r.serial_number}</p>
                  <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", RECON_STATUS_COLORS[r.result] ?? "bg-muted/40 text-muted-foreground")}>
                    {reconLabel(r.result)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                  {r.topup_date && (
                    <span>{new Date(r.topup_date).toLocaleDateString("en-KE", { day: "numeric", month: "short" })}</span>
                  )}
                  {r.territory && <span>{r.territory}</span>}
                  {r.cluster   && <span>{r.cluster}</span>}
                  <span>Top-up: KES {parseFloat(r.topup_amount || "0").toLocaleString()}</span>
                </div>
                {parseFloat(r.commission_amount || "0") > 0 && (
                  <p className="text-sm font-bold text-success mt-1">
                    KES {parseFloat(r.commission_amount).toLocaleString()}
                  </p>
                )}
                {(r.result === "fraud" || r.result === "dispute") && (
                  <p className="text-xs text-destructive mt-1">
                    ⚠ {r.rejection_reason || "This SIM was flagged. Commission will not be paid."}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Commission Progress */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="font-heading text-lg font-semibold text-foreground mb-3">Commission This Cycle</h3>
        {commLoading ? (
          <p className="text-sm text-muted-foreground text-center py-4">Loading…</p>
        ) : !latestComm ? (
          <p className="text-sm text-muted-foreground italic text-center py-4">No commission record for this cycle yet.</p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-2">
              KES {netAmount.toLocaleString()} net of KES {grossAmount.toLocaleString()} gross
            </p>
            <div className="h-3 rounded-full bg-accent overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {activeSims} active SIM{activeSims !== 1 ? "s" : ""}
              {ratePerSim > 0 ? ` × KES ${ratePerSim.toLocaleString()} = KES ${grossAmount.toLocaleString()}` : ""}
            </p>
            {isLoading && <p className="text-xs text-muted-foreground mt-1">Refreshing…</p>}
          </>
        )}
      </div>
    </div>
  );
}