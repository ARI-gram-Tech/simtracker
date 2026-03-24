import { CreditCard, CheckCircle, Calendar, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

const kpis = [
  { icon: CreditCard, color: "text-primary", value: "32", label: "SIMs With Me", sub: "18 registered today" },
  { icon: CheckCircle, color: "text-success", value: "28", label: "Confirmed Active", sub: "From Safaricom" },
  { icon: Calendar, color: "text-secondary", value: "95", label: "This Month", sub: "Total registrations" },
  { icon: DollarSign, color: "text-warning", value: "KES 8,200", label: "My Commission", sub: "Pending approval" },
];

const mySims = [
  { serial: "89254000110001", status: "issued", dateIssued: "Mar 12" },
  { serial: "89254000110002", status: "registered", dateIssued: "Mar 12" },
  { serial: "89254000110003", status: "issued", dateIssued: "Mar 13" },
  { serial: "89254000110004", status: "registered", dateIssued: "Mar 13" },
];

const myRegistrations = [
  { serial: "89254000110010", date: "Mar 14", territory: "Nairobi East", cluster: "Embakasi", topup: 50, status: "Active", commission: 100 },
  { serial: "89254000110011", date: "Mar 14", territory: "Nairobi East", cluster: "Embakasi", topup: 50, status: "Active", commission: 100 },
  { serial: "89254000110012", date: "Mar 13", territory: "Nairobi East", cluster: "Embakasi", topup: 50, status: "Inactive", commission: 0 },
  { serial: "89254000110013", date: "Mar 13", territory: "Nairobi East", cluster: "Embakasi", topup: 50, status: "Active", commission: 100 },
  { serial: "89254000110014", date: "Mar 12", territory: "Nairobi East", cluster: "Embakasi", topup: 0, status: "Fraud Flagged", commission: 0 },
];

const statusColors: Record<string, string> = {
  issued: "bg-blue-500/20 text-blue-400",
  registered: "bg-primary/20 text-primary",
  Active: "bg-success/20 text-success",
  Inactive: "bg-warning/20 text-warning",
  "Fraud Flagged": "bg-destructive/20 text-destructive",
};

export default function BADashboard() {
  const earned = 8200;
  const target = 15000;
  const pct = Math.round((earned / target) * 100);

  return (
    <div className="space-y-5 max-w-lg mx-auto lg:max-w-none">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">My Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Here is your performance this cycle</p>
      </div>

      {/* KPIs 2x2 */}
      <div className="grid grid-cols-2 gap-3">
        {kpis.map(k => (
          <div key={k.label} className="rounded-lg border border-border bg-card p-4">
            <k.icon className={cn("h-5 w-5 mb-2", k.color)} />
            <p className="font-heading text-xl font-bold text-foreground">{k.value}</p>
            <p className="text-xs text-muted-foreground">{k.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* My SIMs */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="font-heading text-lg font-semibold text-foreground mb-3">My SIMs</h3>
        <div className="space-y-2">
          {mySims.map(s => (
            <div key={s.serial} className="flex items-center justify-between rounded-md bg-accent p-3">
              <div>
                <p className="font-mono text-sm text-primary">{s.serial}</p>
                <p className="text-xs text-muted-foreground">Issued {s.dateIssued}</p>
              </div>
              <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", statusColors[s.status])}>
                {s.status}
              </span>
            </div>
          ))}
        </div>
        <button className="mt-3 w-full text-center text-sm text-primary hover:underline">View All 32 SIMs</button>
      </div>

      {/* My Registrations */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="font-heading text-lg font-semibold text-foreground">Registrations From Safaricom</h3>
        <p className="text-xs text-muted-foreground mb-3">SIMs Safaricom has confirmed in your name</p>
        <div className="space-y-2">
          {myRegistrations.map(r => (
            <div key={r.serial} className={cn("rounded-md bg-accent p-3", r.status === "Fraud Flagged" && "border border-destructive/30")}>
              <div className="flex items-center justify-between">
                <p className="font-mono text-sm text-primary">{r.serial}</p>
                <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", statusColors[r.status])}>
                  {r.status}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                <span>{r.date}</span>
                <span>{r.territory}</span>
                <span>{r.cluster}</span>
                <span>Top-up: KES {r.topup}</span>
              </div>
              {r.commission > 0 && (
                <p className="text-sm font-bold text-success mt-1">KES {r.commission}</p>
              )}
              {r.status === "Fraud Flagged" && (
                <p className="text-xs text-destructive mt-1">⚠ This SIM was flagged by Safaricom. Commission will not be paid.</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Commission Progress */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="font-heading text-lg font-semibold text-foreground mb-3">Commission This Cycle</h3>
        <p className="text-sm text-muted-foreground mb-2">KES {earned.toLocaleString()} earned of KES {target.toLocaleString()} target</p>
        <div className="h-3 rounded-full bg-accent overflow-hidden">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-muted-foreground mt-2">82 active SIMs × KES 100 = KES 8,200</p>
      </div>
    </div>
  );
}
