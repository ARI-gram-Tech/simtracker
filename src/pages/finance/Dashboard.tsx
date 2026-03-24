import { useState } from "react";
import { DollarSign, CheckCircle, Clock, AlertTriangle, X } from "lucide-react";
import { KpiCard } from "@/components/KpiCard";
import { StatusBadge } from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const monthlyPayouts = [
  { month: "Oct", amount: 380000 },
  { month: "Nov", amount: 420000 },
  { month: "Dec", amount: 510000 },
  { month: "Jan", amount: 390000 },
  { month: "Feb", amount: 445000 },
  { month: "Mar", amount: 472000 },
];

const commissionTable = [
  { name: "John Kamau", initials: "JK", branch: "Embakasi", active: 132, rate: 100, total: 13200, status: "Pending" },
  { name: "Mary Wanjiku", initials: "MW", branch: "Eastleigh", active: 128, rate: 100, total: 12800, status: "Approved" },
  { name: "Peter Otieno", initials: "PO", branch: "Westlands", active: 119, rate: 100, total: 11900, status: "Paid" },
  { name: "Grace Achieng", initials: "GA", branch: "Ngong Road", active: 108, rate: 100, total: 10800, status: "Pending" },
  { name: "David Mwangi", initials: "DM", branch: "Embakasi", active: 102, rate: 100, total: 10200, status: "Pending" },
  { name: "Sarah Njeri", initials: "SN", branch: "Embakasi", active: 98, rate: 100, total: 9800, status: "Paid" },
  { name: "James Mutua", initials: "JM", branch: "Eastleigh", active: 95, rate: 100, total: 9500, status: "Approved" },
  { name: "Grace Njeri", initials: "GN", branch: "Westlands", active: 88, rate: 100, total: 8800, status: "Pending" },
];

const statusColors: Record<string, string> = {
  Pending: "bg-warning/20 text-warning",
  Approved: "bg-blue-500/20 text-blue-400",
  Paid: "bg-success/20 text-success",
};

const actionLabels: Record<string, string> = { Pending: "Approve", Approved: "Pay", Paid: "Receipt" };

export default function FinanceDashboard() {
  const [drawerBA, setDrawerBA] = useState<typeof commissionTable[0] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleSelect = (name: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === commissionTable.length) setSelected(new Set());
    else setSelected(new Set(commissionTable.map(c => c.name)));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Commission Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">Payout summary for March 2024 cycle</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard icon={DollarSign} iconColor="text-success" value="KES 472,000" label="Total Payable" sub="24 BAs this cycle" />
        <KpiCard icon={CheckCircle} iconColor="text-primary" value="KES 300,000" label="Already Paid" sub="15 BAs paid" />
        <KpiCard icon={Clock} iconColor="text-warning" value="KES 172,000" label="Pending Payment" sub="9 BAs awaiting payment" />
        <KpiCard icon={AlertTriangle} iconColor="text-destructive" value="3" label="Disputed Claims" sub="Requires review" />
      </div>

      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="font-heading text-lg font-semibold text-foreground mb-4">Monthly Payouts — Last 6 Months</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={monthlyPayouts}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 40%, 22%)" />
            <XAxis dataKey="month" tick={{ fill: "hsl(215, 17%, 47%)", fontSize: 12 }} />
            <YAxis tickFormatter={v => `KES ${(v / 1000).toFixed(0)}k`} tick={{ fill: "hsl(215, 17%, 47%)", fontSize: 12 }} />
            <Tooltip formatter={(v: number) => [`KES ${v.toLocaleString()}`, "Payout"]} contentStyle={{ backgroundColor: "hsl(222, 45%, 10%)", border: "1px solid hsl(222, 40%, 22%)", borderRadius: 8, color: "hsl(214, 32%, 91%)" }} />
            <Bar dataKey="amount" fill="hsl(160, 60%, 45%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-heading text-lg font-semibold text-foreground">BA Commission This Cycle</h3>
            <p className="text-sm text-muted-foreground">March 1 — March 31, 2024</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button className="btn-press rounded-md bg-success/20 text-success px-3 py-1.5 text-xs font-medium hover:bg-success/30">Approve Selected</button>
            <button className="btn-press rounded-md bg-primary/20 text-primary px-3 py-1.5 text-xs font-medium hover:bg-primary/30">Mark as Paid</button>
            <button className="btn-press rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent">Export Excel</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="pb-3 text-left font-medium"><input type="checkbox" onChange={toggleAll} checked={selected.size === commissionTable.length} className="rounded border-border" /></th>
                <th className="pb-3 text-left font-medium">BA Name</th>
                <th className="pb-3 text-left font-medium">Branch</th>
                <th className="pb-3 text-right font-medium">Active SIMs</th>
                <th className="pb-3 text-right font-medium">Rate</th>
                <th className="pb-3 text-right font-medium">Total Commission</th>
                <th className="pb-3 text-left font-medium">Status</th>
                <th className="pb-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {commissionTable.map(c => (
                <tr key={c.name} onClick={() => setDrawerBA(c)} className="border-b border-border/50 hover:bg-accent/50 transition-colors cursor-pointer">
                  <td className="py-3" onClick={e => e.stopPropagation()}><input type="checkbox" checked={selected.has(c.name)} onChange={() => toggleSelect(c.name)} className="rounded border-border" /></td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">{c.initials}</div>
                      <span className="text-foreground font-medium">{c.name}</span>
                    </div>
                  </td>
                  <td className="py-3 text-muted-foreground">{c.branch}</td>
                  <td className="py-3 text-right text-foreground">{c.active}</td>
                  <td className="py-3 text-right text-muted-foreground">KES {c.rate}</td>
                  <td className="py-3 text-right text-success font-medium">KES {c.total.toLocaleString()}</td>
                  <td className="py-3"><span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", statusColors[c.status])}>{c.status}{c.status === "Paid" && " ✓"}</span></td>
                  <td className="py-3 text-right">
                    <button className="btn-press rounded-md bg-primary/20 text-primary px-3 py-1 text-xs font-medium hover:bg-primary/30">{actionLabels[c.status]}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Side Drawer */}
      {drawerBA && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-background/50" onClick={() => setDrawerBA(null)} />
          <div className="absolute right-0 top-0 h-full w-full max-w-md border-l border-border bg-card shadow-xl overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border p-4">
              <h2 className="font-heading text-lg font-semibold">Payment Details</h2>
              <button onClick={() => setDrawerBA(null)} className="rounded-md p-1 text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-5 space-y-5">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center text-lg font-bold text-primary">{drawerBA.initials}</div>
                <div>
                  <p className="text-foreground font-semibold">{drawerBA.name}</p>
                  <p className="text-sm text-muted-foreground">{drawerBA.branch}</p>
                </div>
              </div>
              <div className="rounded-md bg-accent p-4 space-y-2">
                <h4 className="text-sm font-medium text-foreground">This Cycle Breakdown</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">SIMs Issued</span><span className="text-foreground text-right">{drawerBA.active + 15}</span>
                  <span className="text-muted-foreground">Registered (Safaricom)</span><span className="text-foreground text-right">{drawerBA.active + 8}</span>
                  <span className="text-muted-foreground">Active</span><span className="text-success text-right">{drawerBA.active}</span>
                  <span className="text-muted-foreground">Fraud Flagged</span><span className="text-destructive text-right">2</span>
                  <span className="text-muted-foreground">Net Payable</span><span className="text-success text-right font-bold">KES {drawerBA.total.toLocaleString()}</span>
                </div>
              </div>
              <div className="rounded-md bg-accent p-4 space-y-2">
                <h4 className="text-sm font-medium text-foreground">Payment History</h4>
                {["Feb 2024 — KES 11,200 — Paid", "Jan 2024 — KES 9,800 — Paid", "Dec 2023 — KES 10,500 — Paid"].map(h => (
                  <p key={h} className="text-sm text-muted-foreground">{h}</p>
                ))}
              </div>
              <div className="flex gap-3">
                <button className="btn-press flex-1 rounded-md bg-success py-2.5 text-sm font-semibold text-success-foreground">Approve</button>
                <button className="btn-press flex-1 rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground">Mark Paid</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
