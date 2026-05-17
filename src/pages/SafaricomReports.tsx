import { useState, useRef, useMemo } from "react";
import {
  Upload, FileText, Loader2, CheckCircle2,
  AlertCircle, X, ChevronDown, ChevronUp, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useReports, useUploadReport, useProcessReport, useResetReport, useDeleteReport } from "@/hooks/useReconciliation";
import { showSuccess, showError } from "@/lib/toast";
import { DEFAULT_COLUMN_MAPPING } from "@/types/reconciliation.types";
import type { ColumnMapping, SafaricomReport } from "@/types/reconciliation.types";

// ─── Constants ────────────────────────────────────────────────────────────────

const EXCEL_COLUMNS = ["A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"];

const MAPPING_FIELDS: { key: keyof ColumnMapping; label: string; critical?: boolean }[] = [
  { key: "serial_number", label: "SIM Serial Number",  critical: true  },
  { key: "ba_msisdn",     label: "BA MSISDN",          critical: true  },
  { key: "agent_msisdn",  label: "Agent MSISDN",       critical: true  },
  { key: "topup_amount",  label: "Top-up Amount",      critical: false },
  { key: "topup_date",    label: "Top-up Date",        critical: false },
  { key: "fraud_flag",    label: "Fraud Flag",         critical: false },
];

const STATUS_STYLES: Record<string, string> = {
  pending:    "bg-amber-500/10 text-amber-500 border-amber-500/20",
  processing: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  done:       "bg-green-500/10 text-green-500 border-green-500/20",
  failed:     "bg-destructive/10 text-destructive border-destructive/20",
};

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize",
      STATUS_STYLES[status] ?? "bg-accent text-muted-foreground border-border"
    )}>
      {status}
    </span>
  );
}

// ─── Report Row ───────────────────────────────────────────────────────────────

function ReportRow({ report }: { report: SafaricomReport }) {
  const processReport = useProcessReport();
  const resetReport   = useResetReport();
  const deleteReport  = useDeleteReport();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleProcess = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const result = await processReport.mutateAsync(report.id);
      showSuccess(`Processed ${result.total_records} records — ${result.matched} matched`);
    } catch {
      showError("Processing failed. Check the file format and try again.");
    }
  };

  const handleReset = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await resetReport.mutateAsync(report.id);
      showSuccess("Report reset — click Process to rerun.");
    } catch {
      showError("Reset failed.");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteReport.mutateAsync(report.id);
      showSuccess("Report deleted and all related data reversed.");
      setShowDeleteConfirm(false);
    } catch {
      showError("Delete failed. Please try again.");
    }
  };

  const periodLabel = report.period_start && report.period_end
    ? `${report.period_start} → ${report.period_end}` : "—";

  return (
    <>
      <tr className="border-b border-border/50 hover:bg-accent/40 transition-colors">
        <td className="py-3 px-4 text-xs text-foreground font-mono max-w-[180px] truncate">
          {report.filename || `Report #${report.id}`}
        </td>
        <td className="py-3 px-4 text-xs text-muted-foreground">{periodLabel}</td>
        <td className="py-3 px-4 text-right text-xs text-foreground">
          {report.total_records > 0 ? report.total_records.toLocaleString() : "—"}
        </td>
        <td className="py-3 px-4 text-right text-xs">
          <span className="text-success">{report.matched}</span>
          {" / "}
          <span className="text-destructive">{report.unmatched}</span>
        </td>
        <td className="py-3 px-4"><StatusBadge status={report.status} /></td>
        <td className="py-3 px-4 text-xs text-muted-foreground">
          {new Date(report.uploaded_at).toLocaleDateString("en-KE", {
            day: "numeric", month: "short", year: "numeric",
          })}
        </td>
        <td className="py-3 px-4 text-right">
          <div className="flex items-center justify-end gap-2">
            {(report.status === "done" || report.status === "failed") && (
              <button
                onClick={handleReset}
                disabled={resetReport.isPending}
                className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/50 disabled:opacity-50 transition-colors"
              >
                {resetReport.isPending
                  ? <Loader2 className="h-3 w-3 animate-spin" />
                  : <RefreshCw className="h-3 w-3" />}
                Reprocess
              </button>
            )}
            {report.status === "pending" && (
              <button
                onClick={handleProcess}
                disabled={processReport.isPending}
                className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {processReport.isPending
                  ? <><Loader2 className="h-3 w-3 animate-spin" /> Processing…</>
                  : <><RefreshCw className="h-3 w-3" /> Process</>}
              </button>
            )}
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1.5 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20 transition-colors"
            >
              <X className="h-3 w-3" /> Delete
            </button>
          </div>
        </td>
      </tr>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <tr>
          <td colSpan={7} className="p-0">
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="absolute inset-0 bg-background/60 backdrop-blur-sm"
                onClick={() => setShowDeleteConfirm(false)} />
              <div className="relative w-full max-w-md rounded-xl border border-destructive/40 bg-card shadow-2xl p-6">
                <div className="flex items-start gap-3 mb-4">
                  <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-heading text-base font-semibold text-foreground">
                      Delete this report?
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      <span className="font-medium text-foreground">
                        {report.filename || `Report #${report.id}`}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 mb-5 space-y-1.5">
                  <p className="text-xs font-semibold text-destructive">This will permanently:</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Delete all {report.total_records.toLocaleString()} reconciliation records</li>
                    <li>• Reset all SIMs activated by this report back to issued/in-stock</li>
                    <li>• Remove fraud flags set by this report</li>
                    <li>• Delete pending commission records for affected BAs</li>
                    <li>• Remove this report from all cycle audit trails</li>
                  </ul>
                  <p className="text-xs text-destructive font-medium pt-1">
                    This cannot be undone.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deleteReport.isPending}
                    className="flex-1 rounded-md border border-border py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleteReport.isPending}
                    className="flex-1 flex items-center justify-center gap-2 rounded-md bg-destructive py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    {deleteReport.isPending
                      ? <><Loader2 className="h-4 w-4 animate-spin" /> Deleting…</>
                      : "Yes, delete report"}
                  </button>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SafaricomReports() {
  const { data: reports = [], isLoading } = useReports();
  const uploadReport = useUploadReport();

  // ── Upload form state ─────────────────────────────────────────────────────
  const fileInputRef               = useRef<HTMLInputElement>(null);
  const [dragOver,    setDragOver] = useState(false);
  const [file,        setFile]     = useState<File | null>(null);
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd,   setPeriodEnd]   = useState("");
  const [notes,       setNotes]       = useState("");
  const [mapping,     setMapping]     = useState<ColumnMapping>({ ...DEFAULT_COLUMN_MAPPING });
  const [showMapping, setShowMapping] = useState(false);

  // ── KPIs from real data ───────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const totalReports  = reports.length;
    const totalRows     = reports.reduce((a, r) => a + r.total_records, 0);
    const lastUpload    = reports[0]
      ? new Date(reports[0].uploaded_at).toLocaleDateString("en-KE", {
          day: "numeric", month: "short", year: "numeric",
        })
      : "—";
    return { totalReports, totalRows, lastUpload };
  }, [reports]);

  // ── File handling ─────────────────────────────────────────────────────────
  const handleFile = (f: File) => {
    const allowed = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
    ];
    if (!allowed.includes(f.type) && !f.name.match(/\.(xlsx|xls|csv)$/i)) {
      showError("Only .xlsx, .xls, or .csv files are accepted.");
      return;
    }
    setFile(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  // ── Submit upload ─────────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!file) { showError("Please select a file first."); return; }
    try {
      await uploadReport.mutateAsync({
        file,
        period_start:   periodStart || undefined,
        period_end:     periodEnd   || undefined,
        notes:          notes       || undefined,
        column_mapping: mapping,
      });
      showSuccess("Report uploaded. Click Process to run reconciliation.");
      setFile(null);
      setPeriodStart("");
      setPeriodEnd("");
      setNotes("");
      setMapping({ ...DEFAULT_COLUMN_MAPPING });
      setShowMapping(false);
    } catch {
      showError("Upload failed. Please try again.");
    }
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl font-bold">Safaricom Activation Reports</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Upload and process Safaricom Excel reports to confirm registrations and calculate commission.
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Reports Uploaded", value: kpis.totalReports.toString(), icon: FileText },
          { label: "Last Upload",      value: kpis.lastUpload,              icon: FileText },
          { label: "Rows Processed",   value: kpis.totalRows.toLocaleString(), icon: FileText },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-lg border border-border bg-card px-5 py-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xl font-bold font-heading text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Upload panel ── */}
        <div className="rounded-lg border border-border bg-card p-5 space-y-4">
          <h3 className="font-heading text-lg font-semibold">Upload New Report</h3>

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center cursor-pointer transition-colors",
              dragOver
                ? "border-primary bg-primary/5"
                : file
                ? "border-success bg-success/5"
                : "border-border bg-accent/30 hover:border-primary/50"
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
            />
            {file ? (
              <>
                <CheckCircle2 className="h-10 w-10 text-success mb-2" />
                <p className="text-sm font-medium text-foreground">{file.name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {(file.size / 1024).toFixed(1)} KB · click to change
                </p>
              </>
            ) : (
              <>
                <Upload className="h-10 w-10 text-primary mb-2" />
                <p className="text-sm font-medium text-foreground">
                  Drag and drop your Safaricom Excel file here
                </p>
                <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Accepted: .xlsx, .xls, .csv · Max 50MB
                </p>
              </>
            )}
          </div>

          {/* Period dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Period Start
              </label>
              <input
                type="date"
                value={periodStart}
                onChange={e => setPeriodStart(e.target.value)}
                className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Period End
              </label>
              <input
                type="date"
                value={periodEnd}
                onChange={e => setPeriodEnd(e.target.value)}
                className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Notes <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Week 2 March report"
              className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Column mapping — collapsible */}
          <div className="rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setShowMapping(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-foreground bg-accent/50 hover:bg-accent transition-colors"
            >
              <span>Column Mapping</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-normal">
                  Pre-filled with Safaricom defaults
                </span>
                {showMapping
                  ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                }
              </div>
            </button>

            {showMapping && (
              <div className="p-4 space-y-3">
                <p className="text-xs text-muted-foreground">
                  These are pre-filled based on the standard Safaricom report format.
                  Only change if Safaricom has modified their column layout.
                </p>
                {MAPPING_FIELDS.map(({ key, label, critical }) => (
                  <div key={key} className="flex items-center gap-3">
                    <span className={cn(
                      "text-xs w-44 shrink-0",
                      critical ? "font-semibold text-primary" : "text-muted-foreground"
                    )}>
                      {label}
                      {critical && <span className="text-destructive ml-0.5">*</span>}
                    </span>
                    <select
                      value={mapping[key]}
                      onChange={e => setMapping(prev => ({ ...prev, [key]: e.target.value }))}
                      className="flex-1 rounded-md border border-border bg-accent py-1.5 px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {EXCEL_COLUMNS.map(col => (
                        <option key={col} value={col}>Column {col}</option>
                      ))}
                    </select>
                    {mapping[key] !== DEFAULT_COLUMN_MAPPING[key] && (
                      <span className="text-xs text-warning font-medium shrink-0">modified</span>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => setMapping({ ...DEFAULT_COLUMN_MAPPING })}
                  className="text-xs text-muted-foreground hover:text-foreground underline"
                >
                  Reset to defaults
                </button>
              </div>
            )}
          </div>

          {/* Upload button */}
          <button
            onClick={handleUpload}
            disabled={!file || uploadReport.isPending}
            className="btn-press w-full flex items-center justify-center gap-2 rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploadReport.isPending
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading…</>
              : <><Upload className="h-4 w-4" /> Upload Report</>
            }
          </button>
        </div>

        {/* ── Previous reports ── */}
        <div className="rounded-lg border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-lg font-semibold">Previous Reports</h3>
            {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-xs">
                  <th className="pb-3 px-4 text-left font-medium">File</th>
                  <th className="pb-3 px-4 text-left font-medium">Period</th>
                  <th className="pb-3 px-4 text-right font-medium">Rows</th>
                  <th className="pb-3 px-4 text-right font-medium">Match</th>
                  <th className="pb-3 px-4 text-left font-medium">Status</th>
                  <th className="pb-3 px-4 text-left font-medium">Uploaded</th>
                  <th className="pb-3 px-4" />
                </tr>
              </thead>
              <tbody>
                {reports.length === 0 && !isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                      No reports uploaded yet.
                    </td>
                  </tr>
                ) : reports.map(r => (
                  <ReportRow key={r.id} report={r} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}