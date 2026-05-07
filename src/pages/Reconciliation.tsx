// src/pages/Reconciliation.tsx
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  AlertTriangle, CheckCircle2, XCircle,
  Loader2, RefreshCw, ChevronDown, FileSearch, Download, 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useReports, useReconciliationRecords } from "@/hooks/useReconciliation";
import type { ReconciliationResult, ReconciliationRecord } from "@/types/reconciliation.types";
import { SIMTraceModal } from "@/components/SIMTraceModal";

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS: { label: string; value: ReconciliationResult | "all" }[] = [
  { label: "All",           value: "all"      },
  { label: "Payable",       value: "payable"  },
  { label: "Rejected",      value: "rejected" },
  { label: "Fraud",         value: "fraud"    },
  { label: "Disputed",      value: "dispute"  },
  { label: "Unmatched",     value: "unmatched"},
  { label: "Manual Review", value: "review"   },
  { label: "Ghost SIMs",    value: "ghost_sim" },
];

const RESULT_STYLES: Record<string, string> = {
  payable:   "bg-green-500/10  text-green-500  border-green-500/20",
  rejected:  "bg-red-500/10    text-red-400    border-red-500/20",
  fraud:     "bg-orange-500/10 text-orange-400 border-orange-500/20",
  dispute:   "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  unmatched: "bg-slate-500/10  text-slate-400  border-slate-500/20",
  review:    "bg-blue-500/10   text-blue-400   border-blue-500/20",
  ghost_sim: "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

const LEFT_BORDER: Record<string, string> = {
  payable:  "border-l-2 border-l-green-500",
  rejected: "border-l-2 border-l-destructive",
  fraud:    "border-l-2 border-l-orange-400",
  dispute:  "border-l-2 border-l-yellow-400",
  ghost_sim: "border-l-2 border-l-purple-400",
};

function ResultBadge({ result }: { result: string }) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize",
      RESULT_STYLES[result] ?? "bg-accent text-muted-foreground border-border"
    )}>
      {result}
    </span>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function downloadCSV(records: ReconciliationRecord[], filename: string) {
  const headers = [
    "Serial Number", "BA Name", "BA MSISDN", "BA Match",
    "SIM Status", "Fraud Flag", "Result", "Reason", "Commission (KES)"
  ];

  const rows = records.map(r => [
    r.serial_number,
    r.identified_ba_name ?? "Unknown",
    r.ba_msisdn || "",
    r.identified_ba ? "Yes" : "No",
    r.sim_status.replace("_", " "),
    r.fraud_flag ? "Yes" : "No",
    r.result,
    r.rejection_reason || "",
    parseFloat(r.commission_amount) > 0 ? parseFloat(r.commission_amount).toFixed(2) : "0.00",
  ]);

  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Reconciliation() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: reports = [], isLoading: reportsLoading } = useReports();  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<ReconciliationResult | "all">("all");
  const [traceSerial, setTraceSerial] = useState<string | null>(null);

  // Only show done reports in the selector — pending/failed have no records yet
  const doneReports = useMemo(
    () => reports.filter(r => r.status === "done"),
    [reports]
  );

  // Auto-select the most recent done report on first load
  const effectiveReportId = selectedReportId ?? doneReports[0]?.id ?? null;

  const { data: records = [], isLoading: recordsLoading } = useReconciliationRecords(
    effectiveReportId ?? 0,
    activeTab !== "all" ? { result: activeTab } : undefined,
  );

  // Selected report metadata (for the summary row)
  const selectedReport = useMemo(
    () => reports.find(r => r.id === effectiveReportId) ?? null,
    [reports, effectiveReportId]
  );

  // Tab counts — derive from full records list (no filter) so badges are correct
  const { data: allRecords = [] } = useReconciliationRecords(
    effectiveReportId ?? 0,
  );

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allRecords.length };
    for (const r of allRecords) {
      counts[r.result] = (counts[r.result] ?? 0) + 1;
    }
    return counts;
  }, [allRecords]);

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold">Reconciliation Engine</h1>

      {/* ── Report selector card ── */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-4">
        <h3 className="font-heading text-lg font-semibold">Select Report</h3>

        {reportsLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading reports…
          </div>
        ) : doneReports.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <FileSearch className="h-4 w-4" />
            No processed reports yet. Upload and process a report first.
          </div>
        ) : (
          <>
            {/* Selector */}
            <div className="relative">
              <select
                value={effectiveReportId ?? ""}
                onChange={e => {
                  setSelectedReportId(Number(e.target.value));
                  setActiveTab("all");
                }}
                className="w-full appearance-none rounded-md border border-border bg-accent py-2.5 pl-3 pr-8 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {doneReports.map(r => {
                  const period = r.period_start && r.period_end
                    ? ` — ${r.period_start} → ${r.period_end}`
                    : "";
                  return (
                    <option key={r.id} value={r.id}>
                      {r.filename || `Report #${r.id}`}{period}
                      {r.total_records > 0 ? ` (${r.total_records.toLocaleString()} rows)` : ""}
                    </option>
                  );
                })}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>

            {/* Summary row for selected report */}
            {selectedReport && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Total Rows",    value: selectedReport.total_records, color: "text-foreground"  },
                  { label: "Matched",       value: selectedReport.matched,       color: "text-green-500"   },
                  { label: "Unmatched",     value: selectedReport.unmatched,     color: "text-destructive" },
                  { label: "Fraud Flagged", value: selectedReport.fraud_flagged, color: "text-orange-400"  },
                ].map(({ label, value, color }) => (
                  <div key={label} className="rounded-lg border border-border bg-accent/30 px-4 py-3">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className={cn("text-xl font-bold font-heading mt-0.5", color)}>
                      {value.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Results table ── */}
      {effectiveReportId && (
        <div className="rounded-lg border border-border bg-card p-5 space-y-4">
          <h3 className="font-heading text-lg font-semibold">Reconciliation Results</h3>

          {/* Filter tabs */}
          <div className="flex flex-wrap gap-2">
            {TABS.map(tab => {
              const count = tabCounts[tab.value] ?? 0;
              const active = activeTab === tab.value;
              return (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={cn(
                    "btn-press rounded-md px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "bg-accent text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab.label}
                  {count > 0 && (
                    <span className={cn(
                      "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                      active ? "bg-white/20 text-white" : "bg-border text-muted-foreground"
                    )}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-xs">
                  <th className="pb-3 px-2 text-left font-medium">Serial Number</th>
                  <th className="pb-3 px-2 text-left font-medium">BA Name</th>
                  <th className="pb-3 px-2 text-left font-medium">BA MSISDN</th>
                  <th className="pb-3 px-2 text-center font-medium">BA Match</th>
                  <th className="pb-3 px-2 text-left font-medium">SIM Status</th>
                  <th className="pb-3 px-2 text-center font-medium">Fraud</th>
                  <th className="pb-3 px-2 text-left font-medium">Result</th>
                  <th className="pb-3 px-2 text-left font-medium">Reason</th>
                  <th className="pb-3 px-2 text-right font-medium">Commission</th>
                </tr>
              </thead>
              <tbody>
                {recordsLoading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-auto" />
                    </td>
                  </tr>
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-sm text-muted-foreground">
                      No records found for this filter.
                    </td>
                  </tr>
                ) : records.map(r => (
                  <tr
                    key={r.id}
                    className={cn(
                      "border-b border-border/50 hover:bg-accent/50 transition-colors",
                      LEFT_BORDER[r.result] ?? ""
                    )}
                  >
                    {/* Serial */}
                    <td className="py-3 px-4">
                      <button
                        onClick={() => setTraceSerial(r.serial_number)}
                        className="font-mono text-xs text-primary hover:underline"
                      >
                        {r.serial_number}
                      </button>
                    </td>

                    {/* BA Name */}
                    <td className="py-3 px-2 text-foreground text-xs">
                      {r.identified_ba_name ?? (
                        <span className="text-muted-foreground italic">Unknown</span>
                      )}
                    </td>

                    {/* BA MSISDN */}
                    <td className="py-3 px-2 text-xs text-muted-foreground font-mono">
                      {r.ba_msisdn || "—"}
                    </td>

                    {/* BA Match indicator */}
                    <td className="py-3 px-2 text-center">
                      {r.identified_ba ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
                      ) : (
                        <XCircle className="h-4 w-4 text-destructive mx-auto" />
                      )}
                    </td>

                    {/* SIM Status */}
                    <td className="py-3 px-2">
                      <span className={cn(
                        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize",
                        r.sim_status === "active"        && "bg-green-500/10 text-green-500 border-green-500/20",
                        r.sim_status === "inactive"      && "bg-slate-500/10 text-slate-400 border-slate-500/20",
                        r.sim_status === "fraud_flagged" && "bg-orange-500/10 text-orange-400 border-orange-500/20",
                      )}>
                        {r.sim_status.replace("_", " ")}
                      </span>
                    </td>

                    {/* Fraud flag */}
                    <td className="py-3 px-2 text-center">
                      {r.fraud_flag && (
                        <AlertTriangle className="h-4 w-4 text-orange-400 mx-auto" />
                      )}
                    </td>

                    {/* Result */}
                    <td className="py-3 px-2">
                      <ResultBadge result={r.result} />
                    </td>

                    {/* Rejection reason */}
                    <td className="py-3 px-2 text-xs text-muted-foreground max-w-[200px] truncate"
                        title={r.rejection_reason}>
                      {r.rejection_reason || "—"}
                    </td>

                    {/* Commission */}
                    <td className="py-3 px-2 text-right font-medium text-green-500 text-xs">
                      {parseFloat(r.commission_amount) > 0
                        ? `KES ${parseFloat(r.commission_amount).toLocaleString()}`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <SIMTraceModal serial={traceSerial} onClose={() => setTraceSerial(null)} />
          </div>

          {/* Footer */}
          {records.length > 0 && (
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Showing {records.length.toLocaleString()} record{records.length !== 1 ? "s" : ""}
                {activeTab !== "all" ? ` · filtered by ${activeTab}` : ""}
              </p>
              <div className="flex items-center gap-2">
                {/* Download current view */}
                <button
                  onClick={() => {
                    const reportName = selectedReport?.filename
                      ? selectedReport.filename.replace(/\.[^.]+$/, "")
                      : `report-${effectiveReportId}`;
                    const suffix = activeTab !== "all" ? `_${activeTab}` : "_all";
                    downloadCSV(records, `${reportName}${suffix}.csv`);
                  }}
                  className="btn-press flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download {activeTab !== "all" ? `(${activeTab})` : "All"}
                </button>

                {/* Download full report regardless of active tab */}
                {activeTab !== "all" && (
                  <button
                    onClick={() => {
                      const reportName = selectedReport?.filename
                        ? selectedReport.filename.replace(/\.[^.]+$/, "")
                        : `report-${effectiveReportId}`;
                      downloadCSV(allRecords, `${reportName}_all.csv`);
                    }}
                    className="btn-press flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download Full
                  </button>
                )}

               <button
                  onClick={() => {
                    const role = user?.role;
                    if (role === "dealer_owner")       navigate("/owner/commission");
                    else if (role === "finance")        navigate("/finance/commissions");
                    else if (role === "operations_manager") navigate("/operations/reconciliation");
                    else navigate(-1);
                  }}
                  className="btn-press rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
                >
                  View Commission Report
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}