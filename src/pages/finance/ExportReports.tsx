// src/pages/finance/ExportReports.tsx
import { useState, useMemo } from "react";
import {
  Download, FileText, CheckCircle2, DollarSign,
  Loader2, AlertCircle, BarChart2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import {
  useCommissionRecords,
  useCommissionCycles,
  usePayouts,
} from "@/hooks/useCommissions";
import { showSuccess, showError } from "@/lib/toast";

function fmt(n: number | string | undefined) {
  return Number(n ?? 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d: string | undefined) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" });
}

// ── CSV helpers ───────────────────────────────────────────────────────────────
function toCSV(headers: string[], rows: (string | number | undefined)[][]) {
  const escape = (v: string | number | undefined) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  return [headers, ...rows].map(r => r.map(escape).join(",")).join("\n");
}

function downloadCSV(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── Export Card ───────────────────────────────────────────────────────────────
function ExportCard({
  title, description, icon: Icon, color,
  count, countLabel, onExport, loading, disabled,
}: {
  title: string; description: string; icon: React.ElementType; color: string;
  count: number; countLabel: string; onExport: () => void; loading: boolean; disabled: boolean;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-6 flex flex-col gap-4">
      <div className="flex items-start gap-4">
        <div className={cn("p-3 rounded-xl bg-muted shrink-0", color)}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border bg-accent/30 px-4 py-2.5">
        <span className="text-xs text-muted-foreground">{countLabel}</span>
        <span className={cn("text-sm font-bold", color)}>{count}</span>
      </div>

      <button
        onClick={onExport}
        disabled={loading || disabled}
        className="flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90">
        {loading
          ? <><Loader2 className="h-4 w-4 animate-spin" />Exporting…</>
          : <><Download className="h-4 w-4" />Export CSV</>}
      </button>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ExportReports() {
  const { user } = useAuth();
  const dealerId = user?.dealer_id ? Number(user.dealer_id) : undefined;

  const [loadingKey, setLoadingKey]       = useState<string | null>(null);
  const [selectedCycleId, setSelectedCycleId] = useState<number | "all">("all");

  const { data: cyclesData } = useCommissionCycles(dealerId);
  const cycles       = useMemo(() => cyclesData ?? [], [cyclesData]);
  const currentCycle = cycles.find(c => c.status === "open") ?? cycles[0];

  const filterParams = selectedCycleId !== "all"
    ? { cycle: selectedCycleId as number }
    : currentCycle ? { cycle: currentCycle.id } : undefined;

  const { data: recordsData, isLoading: loadingRecords } = useCommissionRecords(filterParams);
  const { data: payoutsData, isLoading: loadingPayouts  } = usePayouts();

  const records = useMemo(() => recordsData ?? [], [recordsData]);
  const payouts = useMemo(() => payoutsData ?? [], [payoutsData]);

  // ── Export handlers ───────────────────────────────────────────────────────
  const handleExportCommissions = () => {
    if (!records.length) { showError("No commission records to export."); return; }
    setLoadingKey("commissions");
    try {
      const headers = [
        "Agent Name","Active SIMs","Claimed SIMs","Not in Report",
        "Fraud SIMs","Disputed SIMs","Rejected SIMs",
        "Rate (KES)","Gross (KES)","Deductions (KES)","Net (KES)","Status",
      ];
      const rows = records.map(r => [
        r.agent_name ?? `Agent #${r.agent}`,
        r.active_sims, r.claimed_sims, r.not_in_report_sims,
        r.fraud_sims, r.disputed_sims, r.rejected_sims,
        r.rate_per_sim, r.gross_amount, r.deductions, r.net_amount, r.status,
      ]);
      const label = cycles.find(c => c.id === selectedCycleId)?.name
        ?? currentCycle?.name ?? "cycle";
      downloadCSV(
        `commissions-${label.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.csv`,
        toCSV(headers, rows)
      );
      showSuccess("Commission records exported.");
    } catch { showError("Export failed."); }
    finally { setLoadingKey(null); }
  };

  const handleExportPayouts = () => {
    if (!payouts.length) { showError("No payout records to export."); return; }
    setLoadingKey("payouts");
    try {
      const headers = ["Agent Name","Amount (KES)","Payment Method","Reference","Paid On","Paid By","Notes"];
      const rows = payouts.map(p => [
        p.agent_name ?? `Record #${p.commission_record}`,
        p.amount, p.payment_method ?? "",
        p.reference ?? "", fmtDate(p.paid_at),
        p.paid_by_name ?? "", p.notes ?? "",
      ]);
      downloadCSV(`payout-history-${Date.now()}.csv`, toCSV(headers, rows));
      showSuccess("Payout history exported.");
    } catch { showError("Export failed."); }
    finally { setLoadingKey(null); }
  };

  const handleExportSummary = () => {
    if (!records.length && !payouts.length) { showError("No data to export."); return; }
    setLoadingKey("summary");
    try {
      const totalNet  = records.reduce((s, r) => s + Number(r.net_amount  ?? 0), 0);
      const totalPaid = payouts.reduce((s, p) => s + Number(p.amount      ?? 0), 0);
      const totalSims = records.reduce((s, r) => s + Number(r.active_sims ?? 0), 0);
      const rows: [string, string | number][] = [
        ["Cycle",                   currentCycle?.name ?? "—"],
        ["Export Date",             fmtDate(new Date().toISOString())],
        ["Total Agents",            records.length],
        ["Total Active SIMs",       totalSims],
        ["Total Net Payable (KES)", fmt(totalNet)],
        ["Total Paid (KES)",        fmt(totalPaid)],
        ["Pending Approval",        records.filter(r => r.status === "pending").length],
        ["Approved (ready to pay)", records.filter(r => r.status === "approved").length],
        ["Paid",                    records.filter(r => r.status === "paid").length],
        ["Total Payout Records",    payouts.length],
      ];
      downloadCSV(`finance-summary-${Date.now()}.csv`, toCSV(["Metric","Value"], rows));
      showSuccess("Summary report exported.");
    } catch { showError("Export failed."); }
    finally { setLoadingKey(null); }
  };

  const totalNet  = records.reduce((s, r) => s + Number(r.net_amount ?? 0), 0);
  const totalPaid = payouts.reduce((s, p) => s + Number(p.amount     ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Export Reports</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Download commission and payout data as CSV</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Commission Records", value: records.length,          color: "text-foreground",  icon: FileText    },
          { label: "Net Payable",        value: `KES ${fmt(totalNet)}`,  color: "text-blue-400",    icon: BarChart2   },
          { label: "Payout Records",     value: payouts.length,          color: "text-foreground",  icon: CheckCircle2 },
          { label: "Total Paid",         value: `KES ${fmt(totalPaid)}`, color: "text-emerald-400", icon: DollarSign  },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <div className={cn("p-2 rounded-lg bg-muted", color)}><Icon className="w-4 h-4" /></div>
            <div>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={cn("text-lg font-bold", color)}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Cycle Selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-foreground shrink-0">Filter by Cycle</label>
        <select
          value={selectedCycleId}
          onChange={e => setSelectedCycleId(e.target.value === "all" ? "all" : Number(e.target.value))}
          className="rounded-md border border-border bg-card py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
          <option value="all">Current / Active</option>
          {cycles.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Export Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ExportCard
          title="Commission Records"
          description="All BA commission records for the selected cycle — SIM counts, rates, gross, deductions, net, and status."
          icon={BarChart2} color="text-blue-400"
          count={records.length} countLabel="Records in cycle"
          onExport={handleExportCommissions}
          loading={loadingKey === "commissions"}
          disabled={loadingRecords || records.length === 0}
        />
        <ExportCard
          title="Payout History"
          description="All recorded payments — agent name, amount, payment method, reference number, and date paid."
          icon={DollarSign} color="text-emerald-400"
          count={payouts.length} countLabel="Payout records"
          onExport={handleExportPayouts}
          loading={loadingKey === "payouts"}
          disabled={loadingPayouts || payouts.length === 0}
        />
        <ExportCard
          title="Finance Summary"
          description="High-level summary of the current cycle — totals, counts, outstanding amounts, and cycle metadata."
          icon={FileText} color="text-amber-400"
          count={1} countLabel="Summary report"
          onExport={handleExportSummary}
          loading={loadingKey === "summary"}
          disabled={records.length === 0 && payouts.length === 0}
        />
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-border bg-accent/20 px-4 py-3">
        <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          CSV files open in Excel, Google Sheets, or any spreadsheet tool. Commission records are filtered by the selected cycle above. Payout history exports all records across all cycles.
        </p>
      </div>
    </div>
  );
}