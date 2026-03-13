import { Layers, CheckCircle, DollarSign, Bell, ScanLine } from "lucide-react";
import { KpiCard } from "@/components/KpiCard";
import { StatusBadge } from "@/components/StatusBadge";

const mySims = [
  { serial: "89254000100001", status: "issued", date: "2024-03-08" },
  { serial: "89254000100002", status: "registered", date: "2024-03-07" },
  { serial: "89254000100003", status: "issued", date: "2024-03-06" },
  { serial: "89254000100004", status: "returned", date: "2024-03-05" },
  { serial: "89254000100005", status: "issued", date: "2024-03-04" },
];

const myClaims = [
  { serial: "89254000100002", date: "2024-03-08", status: "Approved" },
  { serial: "89254000100006", date: "2024-03-07", status: "Pending" },
  { serial: "89254000100009", date: "2024-03-06", status: "Rejected", reason: "Not activated by Safaricom" },
  { serial: "89254000100010", date: "2024-03-05", status: "Approved" },
];

export default function BADashboard() {
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-bold">Hi, John Kamau 👋</h1>
          <p className="text-sm text-muted-foreground">Brand Ambassador</p>
        </div>
        <button className="relative p-2 text-muted-foreground hover:text-foreground">
          <Bell className="h-5 w-5" />
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">2</span>
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <KpiCard icon={Layers} value="120" label="SIMs Issued to Me" iconColor="text-primary" />
        <KpiCard icon={Layers} value="95" label="SIMs Registered" iconColor="text-primary" />
        <KpiCard icon={CheckCircle} value="82" label="Confirmed Active" iconColor="text-success" />
        <KpiCard icon={DollarSign} value="KES 8,200" label="Commission Earned" iconColor="text-warning" />
      </div>

      {/* My SIMs */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="font-heading text-base font-semibold mb-3">SIMs Currently With Me</h3>
        <div className="space-y-2">
          {mySims.map((sim) => (
            <div key={sim.serial} className="flex items-center justify-between rounded-md border border-border/50 bg-accent/30 p-3">
              <div>
                <p className="font-mono text-xs text-primary">{sim.serial}</p>
                <p className="text-xs text-muted-foreground">{sim.date}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={sim.status} />
                {sim.status === "issued" && (
                  <button className="btn-press rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">Register</button>
                )}
              </div>
            </div>
          ))}
        </div>
        <button className="mt-3 text-sm text-primary hover:underline">View All My SIMs →</button>
      </div>

      {/* Quick Register */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="font-heading text-base font-semibold mb-3">Register a SIM</h3>
        <div className="space-y-3">
          <div className="relative">
            <input placeholder="Scan or type serial number" className="w-full rounded-md border border-border bg-accent py-3 px-4 pr-10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            <ScanLine className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          </div>
          <select className="w-full rounded-md border border-border bg-accent py-2.5 px-3 text-sm text-foreground">
            <option>New Line</option>
            <option>Replacement</option>
          </select>
          <input placeholder="Customer Phone Number" className="w-full rounded-md border border-border bg-accent py-2.5 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
          <button className="btn-press w-full rounded-md bg-primary py-3 text-sm font-semibold text-primary-foreground">Submit Registration</button>
        </div>
      </div>

      {/* Claims */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="font-heading text-base font-semibold mb-3">My Recent Claims</h3>
        <div className="space-y-2">
          {myClaims.map((claim) => (
            <div key={claim.serial} className="rounded-md border border-border/50 bg-accent/30 p-3">
              <div className="flex items-center justify-between">
                <p className="font-mono text-xs text-primary">{claim.serial}</p>
                <StatusBadge status={claim.status} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">{claim.date}</p>
              {claim.status === "Rejected" && (
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-xs text-destructive">{claim.reason}</p>
                  <button className="text-xs text-primary hover:underline">Dispute</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
