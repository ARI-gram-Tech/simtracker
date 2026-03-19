import { Layers, CheckCircle, DollarSign, Bell } from "lucide-react";
import { KpiCard } from "@/components/KpiCard";
import { StatusBadge } from "@/components/StatusBadge";

const myRegistrations = [
  { serial: "89254000100001", regDate: "2024-03-08", topUp: 50, territory: "Nairobi East", cluster: "Embakasi", status: "Active", commission: 100 },
  { serial: "89254000100002", regDate: "2024-03-07", topUp: 100, territory: "Nairobi East", cluster: "Embakasi", status: "Active", commission: 100 },
  { serial: "89254000100003", regDate: "2024-03-06", topUp: 20, territory: "Nairobi East", cluster: "Embakasi", status: "Inactive", commission: 0 },
  { serial: "89254000100004", regDate: "2024-03-05", topUp: 50, territory: "Nairobi West", cluster: "Westlands", status: "Active", commission: 100 },
  { serial: "89254000100005", regDate: "2024-03-04", topUp: 0, territory: "Nairobi East", cluster: "Embakasi", status: "Not Found", commission: 0 },
  { serial: "89254000100006", regDate: "2024-03-03", topUp: 200, territory: "Nairobi West", cluster: "Ngong Road", status: "Active", commission: 100 },
  { serial: "89254000100007", regDate: "2024-03-02", topUp: 50, territory: "Nairobi East", cluster: "Eastleigh", status: "Active", commission: 100 },
];

const commissionCycles = [
  { cycle: "March Wk 2 (Mar 8-14)", registered: 45, active: 38, rejected: 7, commission: 3800, status: "Pending" },
  { cycle: "March Wk 1 (Mar 1-7)", registered: 50, active: 44, rejected: 6, commission: 4400, status: "Approved" },
  { cycle: "Feb Wk 4 (Feb 22-28)", registered: 38, active: 33, rejected: 5, commission: 3300, status: "Paid" },
];

export default function BADashboard() {
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-bold">Hi, John Kamau 👋</h1>
          <p className="text-sm text-muted-foreground">Brand Ambassador · 0712 345 678</p>
        </div>
        <button className="relative p-2 text-muted-foreground hover:text-foreground">
          <Bell className="h-5 w-5" />
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">2</span>
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <KpiCard icon={Layers} value="120" label="SIMs Attributed to Me" iconColor="text-primary" />
        <KpiCard icon={Layers} value="95" label="SIMs Active" iconColor="text-primary" />
        <KpiCard icon={CheckCircle} value="82" label="Confirmed Payable" iconColor="text-success" />
        <KpiCard icon={DollarSign} value="KES 8,200" label="Commission Earned" iconColor="text-warning" />
      </div>

      {/* My Registrations - read only from Safaricom data */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-heading text-base font-semibold">My Registrations</h3>
          <span className="text-xs text-muted-foreground">From Safaricom report</span>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          SIMs registered via Safaricom using your phone number. This data is read-only.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="pb-2 text-left font-medium text-xs">Serial</th>
                <th className="pb-2 text-left font-medium text-xs">Date</th>
                <th className="pb-2 text-right font-medium text-xs">Top Up</th>
                <th className="pb-2 text-left font-medium text-xs">Territory</th>
                <th className="pb-2 text-left font-medium text-xs">Status</th>
                <th className="pb-2 text-right font-medium text-xs">Commission</th>
              </tr>
            </thead>
            <tbody>
              {myRegistrations.map((r) => (
                <tr key={r.serial} className="border-b border-border/50 hover:bg-accent/50 transition-colors">
                  <td className="py-2.5 font-mono text-xs text-primary">{r.serial}</td>
                  <td className="py-2.5 text-xs text-muted-foreground">{r.regDate}</td>
                  <td className="py-2.5 text-xs text-right">KES {r.topUp}</td>
                  <td className="py-2.5 text-xs text-muted-foreground">{r.territory}</td>
                  <td className="py-2.5"><StatusBadge status={r.status} /></td>
                  <td className="py-2.5 text-xs text-right font-medium text-success">{r.commission > 0 ? `KES ${r.commission}` : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button className="mt-3 text-sm text-primary hover:underline">View All Registrations →</button>
      </div>

      {/* My Commission */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="font-heading text-base font-semibold mb-3">My Commission</h3>
        <p className="text-xs text-muted-foreground mb-3">Commission breakdown per reconciliation cycle</p>
        <div className="space-y-3">
          {commissionCycles.map((c) => (
            <div key={c.cycle} className="rounded-md border border-border/50 bg-accent/30 p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-foreground">{c.cycle}</p>
                <StatusBadge status={c.status} />
              </div>
              <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground">
                <div>
                  <p className="font-medium text-foreground">{c.registered}</p>
                  <p>Registered</p>
                </div>
                <div>
                  <p className="font-medium text-success">{c.active}</p>
                  <p>Active</p>
                </div>
                <div>
                  <p className="font-medium text-destructive">{c.rejected}</p>
                  <p>Rejected</p>
                </div>
                <div>
                  <p className="font-medium text-warning">KES {c.commission.toLocaleString()}</p>
                  <p>Commission</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
