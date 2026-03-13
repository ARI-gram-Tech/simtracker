import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  in_stock: "bg-muted text-muted-foreground",
  issued: "bg-primary/20 text-primary",
  returned: "bg-secondary/20 text-secondary",
  activated: "bg-success/20 text-success",
  damaged: "bg-destructive/20 text-destructive",
  lost: "bg-warning/20 text-warning",
  // Commission / reconciliation
  Payable: "bg-success/20 text-success",
  Paid: "bg-success/20 text-success",
  Approved: "bg-primary/20 text-primary",
  Pending: "bg-warning/20 text-warning",
  Rejected: "bg-destructive/20 text-destructive",
  Review: "bg-secondary/20 text-secondary",
  Active: "bg-success/20 text-success",
  Inactive: "bg-warning/20 text-warning",
  "Not Found": "bg-muted text-muted-foreground",
  // Reports
  parsing: "bg-warning/20 text-warning animate-pulse-glow",
  ready: "bg-success/20 text-success",
  reconciled: "bg-secondary/20 text-secondary",
  error: "bg-destructive/20 text-destructive",
  completed: "bg-success/20 text-success",
  pending: "bg-warning/20 text-warning",
  // Fraud
  HIGH: "bg-destructive/20 text-destructive",
  MEDIUM: "bg-warning/20 text-warning",
  LOW: "bg-primary/20 text-primary",
  // Claim types
  Manual: "bg-primary/20 text-primary",
  Inferred: "bg-secondary/20 text-secondary",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        statusStyles[status] || "bg-muted text-muted-foreground"
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}
