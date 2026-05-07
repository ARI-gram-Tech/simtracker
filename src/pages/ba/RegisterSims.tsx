import { useState, useMemo } from "react";
import {
  CheckCircle2, Loader2, AlertCircle, PackageSearch,
  Check, ShieldAlert, ChevronLeft, ChevronRight,
  History, ClipboardList, TrendingUp, BadgeCheck,
  XCircle, Clock, AlertTriangle, Search, MessageSquareWarning,
  SlidersHorizontal, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useSIMs } from "@/hooks/useInventory";
import { useRegisterSIMs } from "@/hooks/useInventory";
import { useMyReconHistory, useRaiseComplaint } from "@/hooks/useReconciliation";
import { showSuccess, showError } from "@/lib/toast";
import type { SIM } from "@/types/inventory.types";

const PAGE_SIZE = 20;
const CYCLE_PAGE_SIZE = 20;
type Tab = "register" | "history";

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n: number) { return n.toLocaleString(); }

type ReconRecord = {
  id: number;
  serial_number: string;
  result: string;
  commission_amount: number;
  rejection_reason: string | null;
  topup_amount: number;
  topup_date: string | null;
  report_id: number;
  period_start: string;
  period_end: string;
  sim_status: string | null;
};

// ── Result Badge — clean pill with semantic color ─────────────────────────────
function ResultBadge({ result }: { result: string }) {
  const map: Record<string, { label: string; className: string }> = {
    payable:   { label: "Confirmed", className: "bg-emerald-500/12 text-emerald-500 ring-1 ring-emerald-500/20" },
    fraud:     { label: "Fraud",     className: "bg-red-500/12 text-red-500 ring-1 ring-red-500/20" },
    rejected:  { label: "Rejected",  className: "bg-amber-500/12 text-amber-500 ring-1 ring-amber-500/20" },
    ghost_sim: { label: "Ghost SIM", className: "bg-purple-500/12 text-purple-400 ring-1 ring-purple-500/20" },
    unmatched: { label: "Unmatched", className: "bg-slate-500/12 text-slate-400 ring-1 ring-slate-500/20" },
    dispute:   { label: "Dispute",   className: "bg-blue-500/12 text-blue-400 ring-1 ring-blue-500/20" },
  };
  const config = map[result] ?? { label: result, className: "bg-muted text-muted-foreground ring-1 ring-border" };
  return (
    <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium tabular-nums", config.className)}>
      {config.label}
    </span>
  );
}

// ── Complaint Modal — focused, clean, no noise ────────────────────────────────
function ComplaintModal({ record, onClose }: { record: ReconRecord; onClose: () => void }) {
  const [message, setMessage] = useState(
    `I am raising a concern about SIM ${record.serial_number} which was marked as "${record.result}"${record.rejection_reason ? ` (reason: ${record.rejection_reason})` : ""}. Please review.`
  );
  const mutation = useRaiseComplaint();

  const handleSend = async () => {
    try {
      await mutation.mutateAsync({ serial_number: record.serial_number, record_id: record.id, message });
      showSuccess("Complaint sent to Branch Manager and Operations Manager.");
      onClose();
    } catch {
      showError("Failed to send complaint. Please try again.");
    }
  };

  return (
    // Modal backdrop with subtle blur
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={() => !mutation.isPending && onClose()} />
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card shadow-xl animate-in fade-in-0 zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
              <MessageSquareWarning className="h-4 w-4 text-amber-500" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Raise a Complaint</h3>
              <p className="text-xs text-muted-foreground mt-0.5 font-mono">{record.serial_number}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Record summary */}
        <div className="mx-6 mb-4 rounded-xl border border-border bg-accent/40 divide-y divide-border/60">
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-xs text-muted-foreground">Result</span>
            <ResultBadge result={record.result} />
          </div>
          {record.rejection_reason && (
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-xs text-muted-foreground">Reason</span>
              <span className="text-xs text-foreground max-w-[200px] text-right">{record.rejection_reason}</span>
            </div>
          )}
        </div>

        {/* Message */}
        <div className="px-6 pb-4">
          <label className="block text-xs font-medium text-foreground mb-2">Message to managers</label>
          <textarea
            rows={3}
            value={message}
            onChange={e => setMessage(e.target.value)}
            className="w-full rounded-xl border border-border bg-accent/60 py-2.5 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Notifies your <span className="text-foreground">Branch Manager</span> and <span className="text-foreground">Operations Manager</span>.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 border-t border-border px-6 py-4">
          <button onClick={onClose} disabled={mutation.isPending}
            className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button onClick={handleSend} disabled={mutation.isPending || !message.trim()}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 transition-colors disabled:opacity-50">
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {mutation.isPending ? "Sending…" : "Send Complaint"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Cycle Card — collapsible, clean hierarchy ─────────────────────────────────
function CycleCard({
  reportId, cycle, search, resultFilter, onComplain,
}: {
  reportId: number;
  cycle: { period_start: string; period_end: string; records: ReconRecord[] };
  search: string;
  resultFilter: string;
  onComplain: (r: ReconRecord) => void;
}) {
  const [page, setPage] = useState(1);
  const [collapsed, setCollapsed] = useState(false);

  const filtered = useMemo(() => {
    let r = cycle.records;
    if (search.trim()) r = r.filter(rec => rec.serial_number.toLowerCase().includes(search.toLowerCase()));
    if (resultFilter)  r = r.filter(rec => rec.result === resultFilter);
    return r;
  }, [cycle.records, search, resultFilter]);

  const totalPages  = Math.ceil(filtered.length / CYCLE_PAGE_SIZE);
  const pageRecords = filtered.slice((page - 1) * CYCLE_PAGE_SIZE, page * CYCLE_PAGE_SIZE);

  const cycleConfirmed = cycle.records.filter(r => r.result === "payable").length;
  const cycleRejected  = cycle.records.filter(r => r.result === "rejected").length;
  const cycleFraud     = cycle.records.filter(r => r.result === "fraud").length;
  const cycleEarned    = cycle.records.reduce((s, r) => s + (r.commission_amount ?? 0), 0);
  const cycleTotal     = cycle.records.length;
  const confirmRate    = cycleTotal > 0 ? Math.round((cycleConfirmed / cycleTotal) * 100) : 0;

  const periodLabel = `${new Date(cycle.period_start).toLocaleDateString("en-KE", {
    day: "numeric", month: "short",
  })} – ${new Date(cycle.period_end).toLocaleDateString("en-KE", {
    day: "numeric", month: "short", year: "numeric",
  })}`;

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">

      {/* ── Cycle header — clickable to collapse ── */}
      <button
        onClick={() => setCollapsed(s => !s)}
        className="w-full px-5 py-4 flex items-start justify-between gap-4 hover:bg-accent/20 transition-colors text-left"
      >
        <div className="space-y-2.5 flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground">{periodLabel}</p>
            {cycleFraud > 0 && (
              <span className="inline-flex items-center gap-1 rounded-md bg-red-500/10 px-1.5 py-0.5 text-[10px] font-medium text-red-500 ring-1 ring-red-500/20">
                <AlertTriangle className="h-2.5 w-2.5" />{cycleFraud} fraud
              </span>
            )}
          </div>
          {/* Progress bar */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1 rounded-full bg-border overflow-hidden">
              <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${confirmRate}%` }} />
            </div>
            <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">{confirmRate}% confirmed</span>
          </div>
          {/* Legend dots */}
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{cycleConfirmed} confirmed
            </span>
            {cycleRejected > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />{cycleRejected} rejected
              </span>
            )}
            <span className="text-[11px] text-muted-foreground">{cycleTotal} total</span>
          </div>
        </div>

        {/* Right: earnings + chevron */}
        <div className="text-right shrink-0">
          <p className="text-base font-bold font-heading text-amber-400">KES {fmt(cycleEarned)}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">earned this cycle</p>
          <p className={cn("text-[11px] mt-1 transition-transform duration-200", collapsed ? "rotate-0" : "rotate-180")}>
            ▾
          </p>
        </div>
      </button>

      {/* ── SIM rows — collapsible ── */}
      {!collapsed && (
        <>
          {filtered.length === 0 ? (
            <div className="py-10 text-center border-t border-border/60">
              <p className="text-xs text-muted-foreground">No SIMs match your filters in this cycle.</p>
            </div>
          ) : (
            <div className="border-t border-border/60">
              {pageRecords.map((r, idx) => (
                <div
                  key={r.id}
                  className={cn(
                    "group flex items-center gap-3 px-5 py-3 transition-colors",
                    // Subtle alternating rows
                    idx % 2 === 0 ? "bg-transparent" : "bg-accent/20",
                    r.result === "fraud" && "bg-red-500/5",
                    "hover:bg-accent/40",
                  )}
                >
                  {/* LEFT: serial + metadata */}
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-xs font-medium text-foreground truncate">{r.serial_number}</p>
                    {r.topup_date && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Topup {new Date(r.topup_date).toLocaleDateString("en-KE", { day: "numeric", month: "short" })}
                        {r.topup_amount > 0 && <span> · KES {fmt(r.topup_amount)}</span>}
                      </p>
                    )}
                  </div>

                  {/* RIGHT: badge + commission + complaint */}
                  <div className="flex items-center gap-2 shrink-0">
                    <ResultBadge result={r.result} />

                    {/* Commission — only show if nonzero */}
                    <span className={cn(
                      "text-xs font-semibold tabular-nums w-20 text-right",
                      r.commission_amount > 0 ? "text-amber-400" : "text-muted-foreground/40"
                    )}>
                      {r.commission_amount > 0 ? `KES ${fmt(r.commission_amount)}` : "—"}
                    </span>

                    {/* Complaint — icon button, visible on hover for non-payable rows */}
                    {r.result !== "payable" && (
                      <button
                        onClick={() => onComplain(r)}
                        title="Raise complaint"
                        className="opacity-0 group-hover:opacity-100 rounded-lg p-1.5 text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 transition-all duration-150"
                      >
                        <MessageSquareWarning className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border/60 px-5 py-3 bg-accent/10">
              <p className="text-xs text-muted-foreground">
                <span className="text-foreground font-medium">{(page - 1) * CYCLE_PAGE_SIZE + 1}–{Math.min(page * CYCLE_PAGE_SIZE, filtered.length)}</span>
                {" "}of {filtered.length}
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1">
                  <ChevronLeft className="h-3 w-3" /> Prev
                </button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1">
                  Next <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── History Tab ───────────────────────────────────────────────────────────────
function HistoryTab() {
  const { data: records = [], isLoading, isError } = useMyReconHistory();

  const [search,         setSearch]         = useState("");
  const [resultFilter,   setResultFilter]   = useState("");
  const [claimMonth,     setClaimMonth]     = useState("");
  const [reportMonth,    setReportMonth]    = useState("");
  const [complainRecord, setComplainRecord] = useState<ReconRecord | null>(null);

  // ── Summary — computed over ALL records (not filtered) ─────────────────────
  const summary = useMemo(() => ({
    total:     records.length,
    confirmed: records.filter((r: ReconRecord) => r.result === "payable").length,
    earned:    records.reduce((s: number, r: ReconRecord) => s + (r.commission_amount ?? 0), 0),
    pending:   records.filter((r: ReconRecord) => !["payable","fraud","rejected"].includes(r.result)).length,
    fraud:     records.filter((r: ReconRecord) => r.result === "fraud").length,
  }), [records]);

  const claimMonthOptions = useMemo(() => {
    const s = new Set<string>();
    (records as ReconRecord[]).forEach(r => r.topup_date && s.add(r.topup_date.slice(0, 7)));
    return [...s].sort().reverse();
  }, [records]);

  const reportMonthOptions = useMemo(() => {
    const s = new Set<string>();
    (records as ReconRecord[]).forEach(r => r.period_end && s.add(r.period_end.slice(0, 7)));
    return [...s].sort().reverse();
  }, [records]);

  const grouped = useMemo(() => {
    const map = new Map<number, { period_start: string; period_end: string; records: ReconRecord[] }>();
    for (const r of records as ReconRecord[]) {
      if (reportMonth && r.period_end.slice(0, 7) !== reportMonth) continue;
      if (claimMonth && (!r.topup_date || r.topup_date.slice(0, 7) !== claimMonth)) continue;
      if (!map.has(r.report_id))
        map.set(r.report_id, { period_start: r.period_start, period_end: r.period_end, records: [] });
      map.get(r.report_id)!.records.push(r);
    }
    return [...map.entries()].sort((a, b) =>
      new Date(b[1].period_end).getTime() - new Date(a[1].period_end).getTime()
    );
  }, [records, reportMonth, claimMonth]);

  const activeFilters = [search, resultFilter, claimMonth, reportMonth].filter(Boolean);
  const monthLabel = (ym: string) =>
    new Date(ym + "-01").toLocaleDateString("en-KE", { month: "short", year: "numeric" });

  // ── Loading / error / empty states ────────────────────────────────────────
  if (isLoading) return (
    <div className="flex flex-col items-center justify-center py-24 gap-3">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Loading your history…</p>
    </div>
  );

  if (isError) return (
    <div className="flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/8 px-4 py-3.5 text-sm text-red-500">
      <AlertCircle className="h-4 w-4 shrink-0" />
      Failed to load history. Please refresh and try again.
    </div>
  );

  if (records.length === 0) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="h-12 w-12 rounded-2xl bg-accent flex items-center justify-center">
        <History className="h-5 w-5 text-muted-foreground/50" />
      </div>
      <div className="text-center space-y-1">
        <p className="text-sm font-medium text-foreground">No history yet</p>
        <p className="text-xs text-muted-foreground">Your SIMs appear here after Safaricom reconciliation runs.</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">

      {/* ── KPI strip — more prominent numbers ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Registered", value: fmt(summary.total),          color: "text-foreground",  bg: "bg-accent/50",    icon: <ClipboardList className="h-3.5 w-3.5" /> },
          { label: "Confirmed",        value: fmt(summary.confirmed),       color: "text-emerald-500", bg: "bg-emerald-500/8",icon: <BadgeCheck className="h-3.5 w-3.5" /> },
          { label: "Pending",          value: fmt(summary.pending),         color: "text-amber-500",   bg: "bg-amber-500/8",  icon: <Clock className="h-3.5 w-3.5" /> },
          { label: "Total Earned",     value: `KES ${fmt(summary.earned)}`, color: "text-amber-400",   bg: "bg-amber-500/8",  icon: <TrendingUp className="h-3.5 w-3.5" /> },
        ].map(k => (
          <div key={k.label} className={cn("rounded-2xl border border-border p-4 space-y-2", k.bg)}>
            {/* Icon chip */}
            <div className={cn("w-fit rounded-lg p-1.5 bg-background/60", k.color)}>{k.icon}</div>
            {/* Value — large, dominant */}
            <p className={cn("text-2xl font-bold font-heading leading-none", k.color)}>{k.value}</p>
            <p className="text-[11px] text-muted-foreground">{k.label}</p>
          </div>
        ))}
      </div>

      {/* ── Fraud alert — only when needed ── */}
      {summary.fraud > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/8 px-4 py-3.5">
          <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-500">
            <span className="font-semibold">{summary.fraud} SIM{summary.fraud !== 1 ? "s" : ""} flagged for fraud.</span>
            {" "}Use the complaint button on affected rows to notify your managers.
          </p>
        </div>
      )}

      {/* ── Filter toolbar ── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search — left anchor */}
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search serial…"
            className="w-full rounded-xl border border-border bg-accent/60 py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Divider */}
        <div className="hidden sm:block h-5 w-px bg-border" />

        {/* Filter icon label */}
        <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />

        {/* Dropdowns */}
        {[
          { value: resultFilter, onChange: setResultFilter, placeholder: "All Results", options: [
            { v: "payable",   l: "Confirmed" },
            { v: "rejected",  l: "Rejected"  },
            { v: "fraud",     l: "Fraud"     },
            { v: "unmatched", l: "Unmatched" },
            { v: "dispute",   l: "Dispute"   },
          ]},
          { value: claimMonth, onChange: setClaimMonth, placeholder: "Claim Month", options: claimMonthOptions.map(m => ({ v: m, l: monthLabel(m) })) },
          { value: reportMonth, onChange: setReportMonth, placeholder: "Report Period", options: reportMonthOptions.map(m => ({ v: m, l: monthLabel(m) })) },
        ].map((f, i) => (
          <select key={i} value={f.value} onChange={e => f.onChange(e.target.value)}
            className={cn(
              "rounded-xl border px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-colors",
              f.value ? "border-primary/40 bg-primary/5 text-primary" : "border-border bg-accent/60"
            )}>
            <option value="">{f.placeholder}</option>
            {f.options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
        ))}

        {/* Clear active filters */}
        {activeFilters.length > 0 && (
          <button
            onClick={() => { setSearch(""); setResultFilter(""); setClaimMonth(""); setReportMonth(""); }}
            className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <X className="h-3 w-3" />
            Clear {activeFilters.length > 1 ? `(${activeFilters.length})` : ""}
          </button>
        )}
      </div>

      {/* ── Cycle cards ── */}
      {grouped.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
          <History className="h-5 w-5 opacity-30" />
          <p className="text-sm">No records match your filters.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {grouped.map(([reportId, cycle]) => (
            <CycleCard
              key={reportId}
              reportId={reportId}
              cycle={cycle}
              search={search}
              resultFilter={resultFilter}
              onComplain={setComplainRecord}
            />
          ))}
        </div>
      )}

      {/* Complaint modal */}
      {complainRecord && (
        <ComplaintModal record={complainRecord} onClose={() => setComplainRecord(null)} />
      )}
    </div>
  );
}

// ── Register Tab ──────────────────────────────────────────────────────────────
function RegisterTab() {
  const { user } = useAuth();
  const userId = user?.id ? Number(user.id) : undefined;
  const [page, setPage] = useState(1);

  const { data: simsData, isLoading, isError } = useSIMs(
    userId ? { holder: userId, status: "issued", page, page_size: PAGE_SIZE } : undefined
  );

  const heldSIMs: SIM[] = useMemo(() => simsData?.results ?? [], [simsData]);
  const totalCount = simsData?.count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const [selected,    setSelected]    = useState<Set<string>>(new Set());
  const [notes,       setNotes]       = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  const registerMutation = useRegisterSIMs();

  const toggleOne = (serial: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(serial)) { next.delete(serial); } else { next.add(serial); }
      return next;
    });
  };
  const selectAll = () => setSelected(new Set(heldSIMs.map(s => s.serial_number)));
  const clearAll  = () => setSelected(new Set());

  const handleConfirm = async () => {
    if (selected.size === 0) return;
    try {
      await registerMutation.mutateAsync({ serial_numbers: [...selected], notes: notes.trim() || undefined });
      showSuccess(`${selected.size} SIM${selected.size !== 1 ? "s" : ""} registered successfully!`);
      setSelected(new Set()); setNotes(""); setShowConfirm(false);
    } catch {
      showError("Failed to register SIMs. Please try again.");
      setShowConfirm(false);
    }
  };

  return (
    <div className="space-y-5">

      {/* Permanent warning — softened, less alarming than before */}
      <div className="flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/8 px-4 py-3.5">
        <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-600 dark:text-amber-400">
          <span className="font-semibold">Permanent action.</span>{" "}
          Only mark SIMs genuinely activated by a customer — this cannot be undone.
        </p>
      </div>

      {/* ── KPI strip — 3 key numbers ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "In My Hands",  value: totalCount,                 color: "text-foreground",  bg: "bg-accent/50"    },
          { label: "Selected",     value: selected.size,              color: "text-primary",     bg: "bg-primary/8"    },
          { label: "Will Remain",  value: totalCount - selected.size, color: "text-muted-foreground", bg: "bg-accent/30" },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={cn("rounded-2xl border border-border p-4 text-center", bg)}>
            <p className={cn("text-3xl font-bold font-heading leading-none", color)}>{value}</p>
            <p className="text-[11px] text-muted-foreground mt-1.5">{label}</p>
          </div>
        ))}
      </div>

      {/* ── SIM list ── */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">

        {/* Toolbar */}
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-3 bg-accent/20">
          <p className="text-sm font-medium text-foreground">
            {isLoading ? "Loading…" : `${totalCount.toLocaleString()} SIM${totalCount !== 1 ? "s" : ""} in your hands`}
          </p>
          {!isLoading && heldSIMs.length > 0 && (
            <div className="flex items-center gap-3 text-xs">
              <button onClick={selectAll} disabled={selected.size === heldSIMs.length}
                className="text-primary hover:underline disabled:opacity-30 disabled:no-underline">
                Select all
              </button>
              {selected.size > 0 && (
                <>
                  <span className="text-border">|</span>
                  <button onClick={clearAll} className="text-muted-foreground hover:text-foreground">Clear</button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Body */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /><span className="text-sm">Loading your SIMs…</span>
          </div>
        ) : isError ? (
          <div className="flex items-center gap-2 px-5 py-8 text-sm text-red-500">
            <AlertCircle className="h-4 w-4 shrink-0" />Failed to load your SIMs.
          </div>
        ) : heldSIMs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <PackageSearch className="h-7 w-7 opacity-25" />
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">No SIMs to register</p>
              <p className="text-xs mt-0.5">All your SIMs have been registered or returned.</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {heldSIMs.map((sim, idx) => {
              const isSelected = selected.has(sim.serial_number);
              return (
                <button key={sim.id} onClick={() => toggleOne(sim.serial_number)}
                  className={cn(
                    "w-full flex items-center gap-4 px-5 py-3 text-left transition-colors",
                    isSelected ? "bg-primary/5" : idx % 2 === 0 ? "bg-transparent hover:bg-accent/30" : "bg-accent/15 hover:bg-accent/35"
                  )}>
                  {/* Checkbox */}
                  <div className={cn(
                    "h-4 w-4 rounded-md border-2 flex items-center justify-center shrink-0 transition-all",
                    isSelected ? "bg-primary border-primary" : "border-border bg-background"
                  )}>
                    {isSelected && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                  </div>

                  {/* Serial */}
                  <span className={cn("font-mono text-sm flex-1 truncate", isSelected ? "text-primary font-semibold" : "text-foreground")}>
                    {sim.serial_number}
                  </span>

                  {/* Right meta */}
                  <div className="flex items-center gap-2 shrink-0">
                    {sim.branch_details && (
                      <span className="text-[11px] text-muted-foreground bg-accent rounded-lg px-2 py-0.5 hidden sm:inline">
                        {sim.branch_details.name}
                      </span>
                    )}
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(sim.updated_at).toLocaleDateString("en-KE", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border/60 px-5 py-3 bg-accent/10">
            <p className="text-xs text-muted-foreground">
              Page <span className="text-foreground font-medium">{page}</span> / <span className="text-foreground font-medium">{totalPages}</span>
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="flex items-center gap-1 rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronLeft className="h-3 w-3" /> Prev
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="flex items-center gap-1 rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                Next <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Notes + Submit — only shown when there's something to register */}
      {heldSIMs.length > 0 && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Notes <span className="text-muted-foreground font-normal text-xs">(optional)</span>
            </label>
            <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Registered at Embakasi market today"
              className="w-full rounded-xl border border-border bg-accent/60 py-2.5 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          </div>
          <button disabled={selected.size === 0} onClick={() => setShowConfirm(true)}
            className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity">
            {selected.size > 0 ? `Register ${selected.size} SIM${selected.size !== 1 ? "s" : ""}` : "Select SIMs to Register"}
          </button>
        </div>
      )}

      {/* ── Sticky selection bar — appears when SIMs selected ── */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-2xl border border-border bg-card/95 backdrop-blur-sm shadow-lg px-5 py-3 animate-in slide-in-from-bottom-2 duration-200">
          <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center shrink-0">
            <span className="text-[11px] font-bold text-primary-foreground">{selected.size}</span>
          </div>
          <p className="text-sm font-medium text-foreground">
            {selected.size} SIM{selected.size !== 1 ? "s" : ""} selected
          </p>
          <div className="w-px h-4 bg-border" />
          <button onClick={clearAll} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Clear
          </button>
          <button onClick={() => setShowConfirm(true)}
            className="rounded-xl bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity">
            Register
          </button>
        </div>
      )}

      {/* ── Confirm modal ── */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={() => !registerMutation.isPending && setShowConfirm(false)} />
          <div className="relative w-full max-w-sm rounded-2xl border border-border bg-card shadow-xl animate-in fade-in-0 zoom-in-95 duration-200">

            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <h3 className="font-heading text-base font-semibold">Confirm Registration</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">This action cannot be undone.</p>
                </div>
              </div>

              {/* Summary */}
              <div className="rounded-xl border border-border bg-accent/40 divide-y divide-border/60 text-sm">
                <div className="flex justify-between px-4 py-2.5">
                  <span className="text-muted-foreground">SIMs to register</span>
                  <span className="font-semibold text-primary">{selected.size}</span>
                </div>
                <div className="flex justify-between px-4 py-2.5">
                  <span className="text-muted-foreground">Will remain with you</span>
                  <span className="font-medium">{totalCount - selected.size}</span>
                </div>
                {notes.trim() && (
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-muted-foreground">Notes</span>
                    <span className="font-medium max-w-[160px] text-right text-xs">{notes}</span>
                  </div>
                )}
              </div>

              <p className="text-xs text-amber-500 flex items-start gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                Registered SIMs cannot be returned or re-issued.
              </p>
            </div>

            <div className="flex gap-2 border-t border-border px-6 py-4">
              <button onClick={() => setShowConfirm(false)} disabled={registerMutation.isPending}
                className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50">
                Cancel
              </button>
              <button onClick={handleConfirm} disabled={registerMutation.isPending}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50">
                {registerMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {registerMutation.isPending ? "Registering…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page Shell ────────────────────────────────────────────────────────────────
export default function RegisterSims() {
  const [activeTab, setActiveTab] = useState<Tab>("register");

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-24">

      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">My Registrations</h1>
        <p className="text-sm text-muted-foreground mt-1">Register SIMs you've sold and track Safaricom confirmation</p>
      </div>

      {/* Tab switcher — minimal pill style */}
      <div className="flex items-center gap-1 rounded-xl border border-border bg-accent/60 p-1 w-fit">
        {([
          { id: "register" as Tab, label: "Register SIMs", icon: ClipboardList },
          { id: "history"  as Tab, label: "My History",    icon: TrendingUp    },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-150",
              activeTab === id
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === "register" ? <RegisterTab /> : <HistoryTab />}
    </div>
  );
}