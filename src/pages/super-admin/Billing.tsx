// src/pages/super-admin/Billing.tsx
import { useState, useMemo } from "react";
import {
  DollarSign, CheckCircle2, Clock,
  AlertTriangle, XCircle, Plus, Search, X, Building2, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useInvoices } from "@/hooks/useInvoices";
import { useDealers } from "@/hooks/useDealers";
import { showSuccess, showError } from "@/lib/toast";
import type {
  Invoice, InvoiceStatus, ManualInvoiceType,
  InvoicePeriod,
} from "@/types/invoice.types";
import { MANUAL_INVOICE_TYPE_OPTIONS } from "@/types/invoice.types";

// ─── Status config ─────────────────────────────────────────────────────────────
const statusConfig: Record<
  InvoiceStatus,
  { icon: React.ElementType; color: string; bg: string; label: string }
> = {
  paid:      { icon: CheckCircle2,   color: "text-success",          bg: "bg-success/10",     label: "Paid"      },
  pending:   { icon: Clock,          color: "text-yellow-600",        bg: "bg-yellow-500/10",  label: "Pending"   },
  overdue:   { icon: AlertTriangle,  color: "text-destructive",       bg: "bg-destructive/10", label: "Overdue"   },
  cancelled: { icon: XCircle,        color: "text-muted-foreground",  bg: "bg-muted/10",       label: "Cancelled" },
  draft:     { icon: Clock,          color: "text-muted-foreground",  bg: "bg-muted/10",       label: "Draft"     },
};

// ─── Source badge ──────────────────────────────────────────────────────────────
function SourceBadge({ source }: { source: Invoice["source"] }) {
  if (source === "system") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-600">
        <Zap className="h-3 w-3" /> Auto
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
      Manual
    </span>
  );
}

// ─── Generate Invoice Dialog ───────────────────────────────────────────────────
interface GenerateDialogProps {
  dealers: { id: number; name: string }[];
  onClose: () => void;
  onCreate: (data: {
    dealer:       number;
    invoice_type: ManualInvoiceType;
    period:       InvoicePeriod;
    amount:       number;
    issued_date:  string;
    due_date:     string;
    notes:        string;
  }) => Promise<void>;
}

function GenerateInvoiceDialog({ dealers, onClose, onCreate }: GenerateDialogProps) {
  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    dealer:       "" as unknown as number,
    invoice_type: "onboarding" as ManualInvoiceType,
    period:       "once" as InvoicePeriod,
    amount:       "",
    issued_date:  today,
    due_date:     "",
    notes:        "",
  });
  const [submitting, setSubmitting] = useState(false);

  const set = (k: string, v: unknown) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const handleSubmit = async () => {
    if (!form.dealer || !form.amount || !form.issued_date || !form.due_date) {
      showError("Please fill in all required fields.");
      return;
    }
    setSubmitting(true);
    try {
      await onCreate({
        ...form,
        amount: parseFloat(form.amount),
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-xl bg-card p-6 shadow-xl">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Generate Invoice</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Subscription invoices are generated automatically by the system.
            </p>
          </div>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Dealer */}
          <div>
            <label className="mb-1 block text-sm font-medium">
              Dealer <span className="text-destructive">*</span>
            </label>
            <select
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={form.dealer}
              onChange={(e) => set("dealer", Number(e.target.value))}
            >
              <option value="">Select dealer…</option>
              {dealers.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Invoice Type — manual types ONLY */}
          <div>
            <label className="mb-1 block text-sm font-medium">
              Invoice Type <span className="text-destructive">*</span>
            </label>
            <select
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={form.invoice_type}
              onChange={(e) => set("invoice_type", e.target.value as ManualInvoiceType)}
            >
              {MANUAL_INVOICE_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {/* Inform the user why subscription is not listed */}
            <p className="mt-1 text-xs text-muted-foreground">
              Subscription, overage, and proration invoices are generated automatically.
            </p>
          </div>

          {/* Period */}
          <div>
            <label className="mb-1 block text-sm font-medium">Period</label>
            <select
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={form.period}
              onChange={(e) => set("period", e.target.value as InvoicePeriod)}
            >
              <option value="once">One-time</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="mb-1 block text-sm font-medium">
              Amount (KES) <span className="text-destructive">*</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              placeholder="e.g. 5000"
              value={form.amount}
              onChange={(e) => set("amount", e.target.value)}
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Issued Date <span className="text-destructive">*</span>
              </label>
              <input
                type="date"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={form.issued_date}
                onChange={(e) => set("issued_date", e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Due Date <span className="text-destructive">*</span>
              </label>
              <input
                type="date"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={form.due_date}
                onChange={(e) => set("due_date", e.target.value)}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1 block text-sm font-medium">Notes</label>
            <textarea
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              rows={2}
              placeholder="Optional notes…"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting ? "Creating…" : "Create Invoice"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Billing Page ─────────────────────────────────────────────────────────
export default function Billing() {
  const [search,      setSearch]      = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [showDialog,  setShowDialog]  = useState(false);

  const { invoices, loading, create, markPaid, cancel } = useInvoices();
  const dealersQuery = useDealers();
  const dealers = dealersQuery.data?.results ?? [];

  // ── Filter logic ────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return invoices.filter((inv) => {
      const dealerName = inv.dealer_details?.name?.toLowerCase() ?? "";
      const invId      = `INV-${String(inv.id).padStart(4, "0")}`;

      const matchesSearch =
        !search ||
        dealerName.includes(search.toLowerCase()) ||
        invId.toLowerCase().includes(search.toLowerCase());

      const matchesStatus = statusFilter === "all" || inv.status === statusFilter;
      const matchesSource = sourceFilter === "all" || inv.source === sourceFilter;

      return matchesSearch && matchesStatus && matchesSource;
    });
  }, [invoices, search, statusFilter, sourceFilter]);

  // ── Stats ───────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total    = invoices.reduce((s, i) => s + parseFloat(i.amount), 0);
    const paid     = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + parseFloat(i.amount), 0);
    const pending  = invoices.filter((i) => i.status === "pending").length;
    const overdue  = invoices.filter((i) => i.status === "overdue").length;
    return { total, paid, pending, overdue };
  }, [invoices]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleCreate = async (data: Parameters<typeof create>[0]) => {
    try {
      await create(data);
      showSuccess("Invoice created successfully.");
    } catch {
      showError("Failed to create invoice.");
    }
  };

  const handleMarkPaid = async (inv: Invoice) => {
    try {
      await markPaid(inv.id);
      showSuccess("Invoice marked as paid.");
    } catch {
      showError("Failed to mark invoice as paid.");
    }
  };

  const handleCancel = async (inv: Invoice) => {
    if (!confirm("Cancel this invoice?")) return;
    try {
      await cancel(inv.id);
      showSuccess("Invoice cancelled.");
    } catch {
      showError("Failed to cancel invoice.");
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Billing</h1>
          <p className="text-sm text-muted-foreground">
            Subscription invoices are generated automatically. Create manual invoices for one-off charges.
          </p>
        </div>
        <button
          onClick={() => setShowDialog(true)}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Generate Invoice
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total Invoiced",    value: `KES ${stats.total.toLocaleString()}`,  icon: DollarSign,  color: "text-primary"     },
          { label: "Total Collected",   value: `KES ${stats.paid.toLocaleString()}`,   icon: CheckCircle2,color: "text-success"      },
          { label: "Pending",           value: stats.pending,                          icon: Clock,       color: "text-yellow-600"  },
          { label: "Overdue",           value: stats.overdue,                          icon: AlertTriangle,color:"text-destructive"  },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <s.icon className={cn("h-4 w-4", s.color)} />
              <span className="text-xs">{s.label}</span>
            </div>
            <p className={cn("mt-1 text-xl font-bold", s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm"
            placeholder="Search by dealer or invoice #…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
          <option value="cancelled">Cancelled</option>
        </select>

        {/* Source filter — new */}
        <select
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
        >
          <option value="all">All Sources</option>
          <option value="system">Auto (System)</option>
          <option value="admin">Manual (Admin)</option>
        </select>
      </div>

      {/* Invoice table */}
      <div className="rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="px-4 py-3 text-left font-medium">Invoice #</th>
                <th className="px-4 py-3 text-left font-medium">Dealer</th>
                <th className="px-4 py-3 text-left font-medium">Type</th>
                <th className="px-4 py-3 text-left font-medium">Source</th>
                <th className="px-4 py-3 text-left font-medium">Amount</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Issued</th>
                <th className="px-4 py-3 text-left font-medium">Due</th>
                <th className="px-4 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-muted-foreground">
                    <div className="flex justify-center">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-muted-foreground text-sm">
                    No invoices found.
                  </td>
                </tr>
              ) : (
                filtered.map((inv) => {
                  const cfg  = statusConfig[inv.status] ?? statusConfig.draft;
                  const Icon = cfg.icon;
                  return (
                    <tr key={inv.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono text-xs text-primary">
                        INV-{String(inv.id).padStart(4, "0")}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-medium">{inv.dealer_details?.name ?? `Dealer #${inv.dealer}`}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {inv.type_label}
                      </td>
                      <td className="px-4 py-3">
                        <SourceBadge source={inv.source} />
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        KES {Number(inv.amount).toLocaleString()}
                        {inv.is_prorated && (
                          <span className="ml-1 text-xs text-muted-foreground">(prorated)</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("flex items-center gap-1 text-xs", cfg.color)}>
                          <Icon className="h-3 w-3" /> {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{inv.issued_date}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{inv.due_date}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {inv.status === "pending" || inv.status === "overdue" ? (
                            <button
                              onClick={() => handleMarkPaid(inv)}
                              className="text-xs text-success hover:underline"
                            >
                              Mark Paid
                            </button>
                          ) : null}
                          {inv.status !== "paid" && inv.status !== "cancelled" ? (
                            <button
                              onClick={() => handleCancel(inv)}
                              className="text-xs text-destructive hover:underline"
                            >
                              Cancel
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dialog */}
      {showDialog && (
        <GenerateInvoiceDialog
          dealers={dealers.map((d) => ({ id: d.id, name: d.name }))}
          onClose={() => setShowDialog(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}