// src/pages/FraudDetection.tsx
import { useState, useMemo } from "react";
import {
  ShieldAlert, AlertTriangle, Copy,
  Phone, UserCheck, Loader2, RefreshCw, ExternalLink,
  Calendar, ArrowUpDown, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { KpiCard } from "@/components/KpiCard";
import { useFraudSummary } from "@/hooks/useReconciliation";
import { SIMTraceModal } from "@/components/SIMTraceModal";
import type { FraudIncident, BARiskScore } from "@/types/reconciliation.types";

// ── Constants ─────────────────────────────────────────────────────────────────
const SEVERITY_CFG = {
  critical: { label: "Critical", classes: "bg-destructive/10 border-destructive/30 text-destructive" },
  high:     { label: "High",     classes: "bg-amber-500/10 border-amber-500/30 text-amber-500" },
  medium:   { label: "Medium",   classes: "bg-yellow-500/10 border-yellow-500/30 text-yellow-500" },
  low:      { label: "Low",      classes: "bg-muted/40 border-border text-muted-foreground" },
} as const;

const DATE_RANGES = [
  { label: "Today",      value: "today" },
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
  { label: "Last 3 months", value: "90d" },
  { label: "Last 6 months", value: "180d" },
  { label: "This year",  value: "year" },
  { label: "All time",   value: "all" },
] as const;

const SORT_OPTIONS = [
  { label: "Newest first",  value: "newest" },
  { label: "Oldest first",  value: "oldest" },
  { label: "Severity ↑",    value: "severity_asc" },
  { label: "Severity ↓",    value: "severity_desc" },
] as const;

const INCIDENT_TYPES = [
  { label: "All Types",              value: "all" },
  { label: "Fraud",                  value: "fraud" },
  { label: "Disputed MSISDN",        value: "dispute" },
  { label: "Wrong Dealer SIM",       value: "unmatched_foreign" },
  { label: "Unknown BA",             value: "unmatched_unknown" },
] as const;

const SEVERITY_ORDER: Record<string, number> = {
  critical: 4, high: 3, medium: 2, low: 1,
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function getDateCutoff(range: string): Date | null {
  const now = new Date();
  switch (range) {
    case "today":  { const d = new Date(now); d.setHours(0,0,0,0); return d; }
    case "7d":     return new Date(now.getTime() - 7   * 86400000);
    case "30d":    return new Date(now.getTime() - 30  * 86400000);
    case "90d":    return new Date(now.getTime() - 90  * 86400000);
    case "180d":   return new Date(now.getTime() - 180 * 86400000);
    case "year":   return new Date(now.getFullYear(), 0, 1);
    default:       return null;
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────
function SelectDropdown({
  value, onChange, options, icon: Icon,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly { label: string; value: string }[];
  icon?: React.ElementType;
}) {
  return (
    <div className="relative">
      {Icon && (
        <Icon className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
      )}
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className={cn(
          "appearance-none rounded-lg border border-border bg-card pr-7 py-1.5 text-xs text-foreground",
          "focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer hover:bg-accent transition-colors",
          Icon ? "pl-7" : "pl-3"
        )}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
    </div>
  );
}

function IncidentCard({ inc, onTrace }: { inc: FraudIncident; onTrace: (s: string) => void }) {
  const cfg = SEVERITY_CFG[inc.severity] ?? SEVERITY_CFG.low;
  const date = inc.created_at
    ? new Date(inc.created_at).toLocaleDateString("en-KE", {
        day: "numeric", month: "short", year: "numeric",
      })
    : inc.report_period ?? "—";

  return (
    <div className={cn("rounded-lg border bg-card p-4", cfg.classes.split(" ")[1])}>
      <div className="flex items-start gap-3 min-w-0">
        <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold", cfg.classes)}>
          {cfg.label}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{inc.type}</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{inc.description}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
            <span>
              SIM:{" "}
              <button onClick={() => onTrace(inc.serial_number)} className="font-mono text-primary hover:underline">
                {inc.serial_number}
              </button>
            </span>
            {inc.ba_name && <span>BA: {inc.ba_name}</span>}
            {inc.ba_msisdn && <span>MSISDN: {inc.ba_msisdn}</span>}
            <span>{date}</span>
          </div>
        </div>
      </div>
      <div className="mt-3">
        <button
          onClick={() => onTrace(inc.serial_number)}
          className="btn-press flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
        >
          <ExternalLink className="h-3 w-3" />
          Trace SIM
        </button>
      </div>
    </div>
  );
}

function BARiskRow({ ba }: { ba: BARiskScore }) {
  const level = ba.risk_score >= 60 ? "HIGH" : ba.risk_score >= 30 ? "MEDIUM" : "LOW";
  const barColor = level === "HIGH" ? "bg-destructive" : level === "MEDIUM" ? "bg-amber-500" : "bg-green-500";
  const labelColor = level === "HIGH" ? "text-destructive" : level === "MEDIUM" ? "text-amber-500" : "text-green-500";

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="min-w-0">
          <span className="text-sm text-foreground truncate block">{ba.full_name}</span>
          <span className="text-xs text-muted-foreground">
            {ba.fraud_count} fraud · {ba.dispute_count} dispute · {ba.rejected_count} rejected
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-3">
          <span className="text-sm font-bold tabular-nums">{ba.risk_score}</span>
          <span className={cn("text-xs font-semibold", labelColor)}>{level}</span>
        </div>
      </div>
      <div className="h-2 rounded-full bg-accent overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", barColor)} style={{ width: `${ba.risk_score}%` }} />
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function FraudDetection() {
  const { data, isLoading, error, refetch, isFetching } = useFraudSummary();
  const [traceSerial, setTraceSerial]     = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState("all");
  const [typeFilter, setTypeFilter]         = useState("all");
  const [dateRange, setDateRange]           = useState("all");
  const [sortBy, setSortBy]                 = useState("newest");

  // ── Filtered + sorted incidents ───────────────────────────────────────────
  const filteredIncidents = useMemo(() => {
    let list = data?.incidents ?? [];

    // Date range
    const cutoff = getDateCutoff(dateRange);
    if (cutoff) {
      list = list.filter(inc => inc.created_at && new Date(inc.created_at) >= cutoff);
    }

    // Severity
    if (severityFilter !== "all") {
      list = list.filter(inc => inc.severity === severityFilter);
    }

    // Type
    if (typeFilter !== "all") {
      if (typeFilter === "fraud") {
        list = list.filter(inc => inc.result === "fraud");
      } else if (typeFilter === "dispute") {
        list = list.filter(inc => inc.result === "dispute");
      } else if (typeFilter === "unmatched_foreign") {
        list = list.filter(inc => inc.result === "unmatched" && inc.type === "Wrong Dealer SIM");
      } else if (typeFilter === "unmatched_unknown") {
        list = list.filter(inc => inc.result === "unmatched" && inc.type === "Unknown BA Phone");
      }
    }

    // Sort
    list = [...list].sort((a, b) => {
      if (sortBy === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === "severity_desc") return (SEVERITY_ORDER[b.severity] ?? 0) - (SEVERITY_ORDER[a.severity] ?? 0);
      if (sortBy === "severity_asc")  return (SEVERITY_ORDER[a.severity] ?? 0) - (SEVERITY_ORDER[b.severity] ?? 0);
      return 0;
    });

    return list;
  }, [data, dateRange, severityFilter, typeFilter, sortBy]);

  // ── KPIs scoped to current date filter ───────────────────────────────────
  const scopedKpis = useMemo(() => {
    const cutoff = getDateCutoff(dateRange);
    const list = cutoff
      ? (data?.incidents ?? []).filter(inc => inc.created_at && new Date(inc.created_at) >= cutoff)
      : data?.incidents ?? [];

    return {
      fraud_flagged_safaricom: list.filter(i => i.result === "fraud").length,
      disputed:                list.filter(i => i.result === "dispute").length,
      wrong_dealer_sims:       list.filter(i => i.result === "unmatched" && i.type === "Wrong Dealer SIM").length,
      unknown_ba:              list.filter(i => i.result === "unmatched" && i.type === "Unknown BA Phone").length,
      agent_eq_ba:             data?.kpis.agent_eq_ba ?? 0,
    };
  }, [data, dateRange]);

  const activeFiltersCount = [
    severityFilter !== "all",
    typeFilter !== "all",
    dateRange !== "all",
  ].filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Fraud Detection</h1>
          <p className="text-sm text-muted-foreground">
            Suspicious activity flagged by the reconciliation engine
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="btn-press flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm hover:bg-accent transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
          Refresh
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load fraud data. Check your connection and try again.
        </div>
      )}

      {data && (
        <>
          {/* Date range bar */}
          <div className="flex items-center gap-2 flex-wrap">
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
            {DATE_RANGES.map(r => (
              <button
                key={r.value}
                onClick={() => setDateRange(r.value)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors border",
                  dateRange === r.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:bg-accent bg-card"
                )}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* KPIs — scoped to date range */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <KpiCard icon={ShieldAlert} value={String(scopedKpis.fraud_flagged_safaricom)} label="Fraud Flagged by Safaricom" iconColor="text-destructive" />
            <KpiCard icon={AlertTriangle} value={String(scopedKpis.disputed)} label="Disputed MSISDN" iconColor="text-amber-500" />
            <KpiCard icon={Copy} value={String(scopedKpis.wrong_dealer_sims)} label="Wrong Dealer SIMs" iconColor="text-amber-500" />
            <KpiCard icon={Phone} value={String(scopedKpis.unknown_ba)} label="Unknown BA Phone" iconColor="text-destructive" />
            <KpiCard icon={UserCheck} value={String(scopedKpis.agent_eq_ba)} label="Agent = BA Fraud" iconColor="text-destructive" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Incidents */}
            <div className="lg:col-span-3 space-y-3">

              {/* Incident toolbar */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="font-heading text-lg font-semibold">
                  Flagged Incidents
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    ({filteredIncidents.length})
                  </span>
                  {activeFiltersCount > 0 && (
                    <span className="ml-2 rounded-full bg-primary px-1.5 py-0.5 text-xs text-primary-foreground">
                      {activeFiltersCount} filter{activeFiltersCount > 1 ? "s" : ""}
                    </span>
                  )}
                </h3>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Severity pills */}
                  <div className="flex gap-1">
                    {["all", "critical", "high", "medium"].map(s => (
                      <button
                        key={s}
                        onClick={() => setSeverityFilter(s)}
                        className={cn(
                          "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                          severityFilter === s
                            ? "bg-primary text-primary-foreground"
                            : "border border-border text-muted-foreground hover:bg-accent"
                        )}
                      >
                        {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                  {/* Type dropdown */}
                  <SelectDropdown
                    value={typeFilter}
                    onChange={setTypeFilter}
                    options={INCIDENT_TYPES}
                  />
                  {/* Sort dropdown */}
                  <SelectDropdown
                    value={sortBy}
                    onChange={setSortBy}
                    options={SORT_OPTIONS}
                    icon={ArrowUpDown}
                  />
                </div>
              </div>

              {/* Reset filters */}
              {activeFiltersCount > 0 && (
                <button
                  onClick={() => { setSeverityFilter("all"); setTypeFilter("all"); setDateRange("all"); }}
                  className="text-xs text-primary hover:underline"
                >
                  Clear all filters
                </button>
              )}

              {filteredIncidents.length === 0 ? (
                <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
                  {data.incidents.length === 0
                    ? "No fraud incidents detected. All SIMs are clean."
                    : "No incidents match the selected filters."}
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                  {filteredIncidents.map(inc => (
                    <IncidentCard key={inc.id} inc={inc} onTrace={setTraceSerial} />
                  ))}
                </div>
              )}
            </div>

            {/* BA Risk Scores */}
            <div className="lg:col-span-2 rounded-lg border border-border bg-card p-5">
              <h3 className="font-heading text-lg font-semibold">BA Risk Scores</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Calculated from fraud, dispute and rejection ratios
              </p>
              {data.ba_risk.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No risk data available yet. Run reconciliation to generate scores.
                </p>
              ) : (
                <div className="space-y-4">
                  {data.ba_risk.map(ba => (
                    <BARiskRow key={ba.ba_id} ba={ba} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <SIMTraceModal serial={traceSerial} onClose={() => setTraceSerial(null)} />
    </div>
  );
}