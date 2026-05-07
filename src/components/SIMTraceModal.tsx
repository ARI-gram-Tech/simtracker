// src/components/SIMTraceModal.tsx
import { X, Package, ArrowRight, CheckCircle2, ShieldAlert,
         AlertTriangle, XCircle, Clock, Loader2, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSIMTrace } from "@/hooks/useInventory";
import type { TraceMovement, TraceReconRecord, TraceVerdict } from "@/types/inventory.types";

// ── Movement type labels & icons ─────────────────────────────────────────────
const MOVEMENT_META: Record<string, { label: string; icon: string; color: string }> = {
  receive:  { label: "Received from Safaricom", icon: "📦", color: "text-blue-400" },
  issue:    { label: "Issued to BA",             icon: "📤", color: "text-primary" },
  register: { label: "BA Claimed Registration",  icon: "✅", color: "text-green-500" },
  return:   { label: "Returned",                 icon: "↩️", color: "text-amber-500" },
  transfer: { label: "Transferred",              icon: "🔄", color: "text-purple-400" },
  flag:     { label: "Fraud Flagged",            icon: "🚩", color: "text-destructive" },
  replace:  { label: "Replaced",                 icon: "🔁", color: "text-muted-foreground" },
};

// ── Verdict badge ─────────────────────────────────────────────────────────────
function VerdictBadge({ verdict }: { verdict: TraceVerdict }) {
  const cfg = {
    success: { bg: "bg-green-500/10 border-green-500/20 text-green-500",  Icon: CheckCircle2 },
    danger:  { bg: "bg-destructive/10 border-destructive/20 text-destructive", Icon: ShieldAlert },
    warning: { bg: "bg-amber-500/10 border-amber-500/20 text-amber-500",  Icon: AlertTriangle },
    info:    { bg: "bg-blue-500/10 border-blue-500/20 text-blue-400",     Icon: Clock },
    neutral: { bg: "bg-muted/40 border-border text-muted-foreground",     Icon: HelpCircle },
  }[verdict.badge] ?? { bg: "bg-muted/40 border-border text-muted-foreground", Icon: HelpCircle };

  return (
    <div className={cn("rounded-xl border p-4", cfg.bg)}>
      <div className="flex items-start gap-3">
        <cfg.Icon className="h-5 w-5 mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold text-sm">{verdict.summary}</p>
          <p className="text-xs mt-1 leading-relaxed opacity-80">{verdict.detail}</p>
          {verdict.commission_payable && verdict.commission_amount && (
            <p className="text-xs mt-2 font-bold">
              Commission: KES {Number(verdict.commission_amount).toLocaleString()}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Timeline row ──────────────────────────────────────────────────────────────
function TimelineRow({ m, isLast }: { m: TraceMovement; isLast: boolean }) {
  const meta = MOVEMENT_META[m.movement_type] ?? { label: m.movement_type, icon: "•", color: "text-muted-foreground" };
  const date = new Date(m.created_at);
  const formatted = date.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })
    + " " + date.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="flex gap-3">
      {/* Timeline spine */}
      <div className="flex flex-col items-center">
        <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-card text-sm", meta.color)}>
          {meta.icon}
        </div>
        {!isLast && <div className="w-px flex-1 bg-border mt-1" />}
      </div>

      {/* Content */}
      <div className={cn("pb-4 flex-1 min-w-0", isLast ? "pb-0" : "")}>
        <p className={cn("text-sm font-medium", meta.color)}>{meta.label}</p>
        {(m.from_user || m.to_user) && (
          <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
            {m.from_user && <span>{m.from_user.full_name}</span>}
            {m.from_user && m.to_user && <ArrowRight className="h-3 w-3" />}
            {m.to_user && <span>{m.to_user.full_name}</span>}
          </div>
        )}
        {(m.from_branch || m.to_branch) && (
          <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
            {m.from_branch && <span>{m.from_branch.name}</span>}
            {m.from_branch && m.to_branch && <ArrowRight className="h-3 w-3" />}
            {m.to_branch && <span>{m.to_branch.name}</span>}
          </div>
        )}
        {m.notes && <p className="text-xs text-muted-foreground/60 mt-0.5 italic">{m.notes}</p>}
        <p className="text-xs text-muted-foreground/50 mt-1">{formatted}</p>
      </div>
    </div>
  );
}

// ── Recon record row ──────────────────────────────────────────────────────────
function ReconRow({ r }: { r: TraceReconRecord }) {
  const resultCfg = {
    payable:   { label: "Payable",   color: "text-green-500",     bg: "bg-green-500/10  border-green-500/20" },
    fraud:     { label: "Fraud",     color: "text-destructive",   bg: "bg-destructive/10 border-destructive/20" },
    rejected:  { label: "Rejected",  color: "text-destructive",   bg: "bg-destructive/10 border-destructive/20" },
    dispute:   { label: "Disputed",  color: "text-amber-500",     bg: "bg-amber-500/10  border-amber-500/20" },
    unmatched: { label: "Unmatched", color: "text-muted-foreground", bg: "bg-muted/30 border-border" },
  }[r.result] ?? { label: r.result, color: "text-muted-foreground", bg: "bg-muted/30 border-border" };

  return (
    <div className="rounded-lg border border-border bg-accent/20 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Report Period</p>
          <p className="text-sm font-medium">
            {r.period_start ?? "—"} → {r.period_end ?? "—"}
          </p>
        </div>
        <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-semibold", resultCfg.bg, resultCfg.color)}>
          {resultCfg.label}
        </span>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <div>
          <span className="text-muted-foreground">Topup Amount</span>
          <p className="font-medium">KES {Number(r.topup_amount).toLocaleString()}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Topup Date</span>
          <p className="font-medium">{r.topup_date ?? "—"}</p>
        </div>
        <div>
          <span className="text-muted-foreground">BA MSISDN</span>
          <p className="font-medium">{r.ba_msisdn || "—"}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Identified BA</span>
          <p className="font-medium">{r.identified_ba?.full_name ?? "Not matched"}</p>
        </div>
        {r.fraud_flag && r.fraud_flag !== "N" && r.fraud_flag !== "" && (
          <div className="col-span-2">
            <span className="text-destructive font-medium">⚠ Fraud Flag: {r.fraud_flag}</span>
          </div>
        )}
        {r.rejection_reason && (
          <div className="col-span-2">
            <span className="text-muted-foreground">Rejection Reason: </span>
            <span className="text-amber-500 font-medium">{r.rejection_reason}</span>
          </div>
        )}
        {r.commission_amount && Number(r.commission_amount) > 0 && (
          <div className="col-span-2">
            <span className="text-muted-foreground">Commission: </span>
            <span className="text-green-500 font-bold">KES {Number(r.commission_amount).toLocaleString()}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Modal ────────────────────────────────────────────────────────────────
interface SIMTraceModalProps {
  serial: string | null;
  onClose: () => void;
}

export function SIMTraceModal({ serial, onClose }: SIMTraceModalProps) {
  const { data: trace, isLoading, error } = useSIMTrace(serial);
  console.log("SIMTrace debug:", { serial, isLoading, error, trace });
  if (!serial) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl rounded-xl border border-border bg-card shadow-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h3 className="font-heading text-lg font-semibold">SIM Trace</h3>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">{serial}</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
          {isLoading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

        {/* ADD THIS: */}
        {!isLoading && !trace && !error && (
        <div className="py-8 text-center text-sm text-muted-foreground">
            No data returned for serial: <span className="font-mono">{serial}</span>
        </div>
        )}

          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
              Failed to load trace data. Check your connection and try again.
            </div>
          )}

          {trace && trace.sim && (
            <>
                {/* SIM Overview */}
                <div className="rounded-lg border border-border bg-accent/20 px-4 py-3 flex items-center justify-between">
                <div>
                    <p className="text-xs text-muted-foreground">Current Holder</p>
                    <p className="text-sm font-semibold">{trace.sim.current_holder?.full_name ?? "Unassigned"}</p>
                    {trace.sim.current_holder?.phone && (
                    <p className="text-xs text-muted-foreground">{trace.sim.current_holder.phone}</p>
                    )}
                </div>
                <div className="text-right">
                    <p className="text-xs text-muted-foreground">Status</p>
                    <p className="text-sm font-semibold capitalize">{trace.sim.status?.replace("_", " ") ?? "—"}</p>
                    {trace.sim.branch && (
                    <p className="text-xs text-muted-foreground">{trace.sim.branch.name}</p>
                    )}
                </div>
            </div>

              {/* Verdict */}
              <VerdictBadge verdict={trace.verdict} />

              {/* Movement timeline */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Internal Movement History
                </h4>
                {trace.movements.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No movements recorded.</p>
                ) : (
                  <div>
                    {trace.movements.map((m, i) => (
                      <TimelineRow key={m.id} m={m} isLast={i === trace.movements.length - 1} />
                    ))}
                  </div>
                )}
              </div>

              {/* Safaricom records */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Safaricom Report History
                </h4>
                {trace.reconciliation_records.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    This SIM has not appeared in any Safaricom reconciliation report.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {trace.reconciliation_records.map(r => (
                      <ReconRow key={r.id} r={r} />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}