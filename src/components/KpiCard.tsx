import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface KpiCardProps {
  icon: LucideIcon;
  iconColor?: string;
  value: string;
  label: string;
  sub?: string;
  subColor?: string;
}

export function KpiCard({ icon: Icon, iconColor = "text-primary", value, label, sub, subColor = "text-success" }: KpiCardProps) {
  return (
    <div className="group rounded-lg border border-border bg-card p-5 transition-all duration-150 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5">
      <div className="flex items-start gap-4">
        <div className={cn("rounded-lg bg-accent p-2.5", iconColor)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-heading text-2xl font-bold text-foreground">{value}</p>
          <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
          {sub && <p className={cn("text-xs mt-1", subColor)}>{sub}</p>}
        </div>
      </div>
    </div>
  );
}
