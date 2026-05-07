// src/pages/super-admin/InvoiceHistory.tsx
import { useInvoices } from "@/hooks/useInvoices";
import { CheckCircle2, Clock, XCircle, AlertTriangle, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Invoice, InvoiceStatus } from "@/types/invoice.types";

interface Props {
  dealerId: number;
}

const statusConfig: Record<
  InvoiceStatus,
  { icon: React.ElementType; color: string; label: string }
> = {
  paid:      { icon: CheckCircle2,  color: "text-success",         label: "Paid"      },
  pending:   { icon: Clock,         color: "text-yellow-600",       label: "Pending"   },
  overdue:   { icon: AlertTriangle, color: "text-destructive",      label: "Overdue"   },
  cancelled: { icon: XCircle,       color: "text-muted-foreground", label: "Cancelled" },
  draft:     { icon: Clock,         color: "text-muted-foreground", label: "Draft"     },
};

function SourceBadge({ source }: { source: Invoice["source"] }) {
  if (source === "system") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-1.5 py-0.5 text-xs text-blue-600">
        <Zap className="h-2.5 w-2.5" /> Auto
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
      Manual
    </span>
  );
}

export function InvoiceHistory({ dealerId }: Props) {
  const { invoices, loading } = useInvoices({ dealer: dealerId });
  const dealerInvoices = invoices.slice(0, 10);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (dealerInvoices.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <p className="text-sm">No invoices yet</p>
        <p className="text-xs mt-1">Subscription invoices will appear here automatically.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-muted-foreground">
            <th className="py-3 text-left font-medium">Invoice #</th>
            <th className="py-3 text-left font-medium">Type</th>
            <th className="py-3 text-left font-medium">Source</th>
            <th className="py-3 text-left font-medium">Amount</th>
            <th className="py-3 text-left font-medium">Status</th>
            <th className="py-3 text-left font-medium">Issued</th>
            <th className="py-3 text-left font-medium">Due</th>
          </tr>
        </thead>
        <tbody>
          {dealerInvoices.map((inv) => {
            const cfg  = statusConfig[inv.status] ?? statusConfig.draft;
            const Icon = cfg.icon;
            return (
              <tr key={inv.id} className="border-b border-border/50 last:border-0">
                <td className="py-3 font-mono text-xs text-primary">
                  INV-{String(inv.id).padStart(4, "0")}
                </td>
                <td className="py-3 text-xs text-muted-foreground">
                  {/* Use backend-computed label if available, fall back to raw type */}
                  {inv.type_label ?? inv.invoice_type}
                </td>
                <td className="py-3">
                  <SourceBadge source={inv.source} />
                </td>
                <td className="py-3 font-semibold">
                  KES {Number(inv.amount).toLocaleString()}
                  {inv.is_prorated && (
                    <span className="ml-1 text-xs text-muted-foreground">(prorated)</span>
                  )}
                </td>
                <td className="py-3">
                  <span className={cn("flex items-center gap-1 text-xs", cfg.color)}>
                    <Icon className="h-3 w-3" /> {cfg.label}
                  </span>
                </td>
                <td className="py-3 text-xs text-muted-foreground">{inv.issued_date}</td>
                <td className="py-3 text-xs text-muted-foreground">{inv.due_date}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}