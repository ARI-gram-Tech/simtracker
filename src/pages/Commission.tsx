import { useState } from "react";
import { DollarSign, CreditCard, Clock, Users, X } from "lucide-react";
import { KpiCard } from "@/components/KpiCard";
import { StatusBadge } from "@/components/StatusBadge";
import { commissionData } from "@/data/mockData";

export default function Commission() {
  const [selectedBA, setSelectedBA] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold">Commission Reports</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={DollarSign} value="KES 472,000" label="Total Payable" iconColor="text-success" />
        <KpiCard icon={CreditCard} value="KES 300,000" label="Already Paid" iconColor="text-primary" />
        <KpiCard icon={Clock} value="KES 172,000" label="Pending Payment" iconColor="text-warning" />
        <KpiCard icon={Users} value="24" label="BAs to Pay" iconColor="text-secondary" />
      </div>

      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading text-lg font-semibold">BA Commission Summary</h3>
          <div className="flex gap-2">
            <button className="btn-press rounded-md bg-success px-4 py-2 text-xs font-semibold text-success-foreground">Approve Selected</button>
            <button className="btn-press rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">Mark as Paid</button>
            <button className="btn-press rounded-md border border-border px-4 py-2 text-xs font-medium text-foreground hover:bg-accent">Export Excel</button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="pb-3 text-left"><input type="checkbox" /></th>
                <th className="pb-3 text-left font-medium">BA Name</th>
                <th className="pb-3 text-left font-medium">Branch</th>
                <th className="pb-3 text-right font-medium">Issued</th>
                <th className="pb-3 text-right font-medium">Active</th>
                <th className="pb-3 text-left font-medium">Rate</th>
                <th className="pb-3 text-right font-medium">Total</th>
                <th className="pb-3 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {commissionData.map((row, i) => (
                <tr
                  key={i}
                  onClick={() => setSelectedBA(row.baName)}
                  className="border-b border-border/50 hover:bg-accent/50 transition-colors cursor-pointer"
                >
                  <td className="py-3"><input type="checkbox" onClick={(e) => e.stopPropagation()} /></td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
                        {row.baName.split(" ").map(n => n[0]).join("")}
                      </div>
                      <span className="font-medium text-foreground">{row.baName}</span>
                    </div>
                  </td>
                  <td className="py-3 text-muted-foreground">{row.branch}</td>
                  <td className="py-3 text-right">{row.issued}</td>
                  <td className="py-3 text-right">{row.active}</td>
                  <td className="py-3 text-muted-foreground">{row.rate}</td>
                  <td className="py-3 text-right font-medium text-success">KES {row.total.toLocaleString()}</td>
                  <td className="py-3"><StatusBadge status={row.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Side Drawer */}
      {selectedBA && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-background/50" onClick={() => setSelectedBA(null)} />
          <div className="absolute right-0 top-0 h-full w-full max-w-md border-l border-border bg-card shadow-xl overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border p-5">
              <h2 className="font-heading text-lg font-semibold">{selectedBA}</h2>
              <button onClick={() => setSelectedBA(null)} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              {(() => {
                const ba = commissionData.find(b => b.baName === selectedBA);
                if (!ba) return null;
                return (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-md border border-border bg-accent/30 p-3"><p className="text-xs text-muted-foreground">SIMs Issued</p><p className="font-heading text-lg font-bold">{ba.issued}</p></div>
                      <div className="rounded-md border border-border bg-accent/30 p-3"><p className="text-xs text-muted-foreground">Active</p><p className="font-heading text-lg font-bold text-success">{ba.active}</p></div>
                      <div className="rounded-md border border-border bg-accent/30 p-3"><p className="text-xs text-muted-foreground">Rejected</p><p className="font-heading text-lg font-bold text-destructive">{ba.issued - ba.active}</p></div>
                      <div className="rounded-md border border-border bg-accent/30 p-3"><p className="text-xs text-muted-foreground">Commission</p><p className="font-heading text-lg font-bold text-success">KES {ba.total.toLocaleString()}</p></div>
                    </div>
                    <h4 className="font-heading text-sm font-semibold">Previous Payments</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between text-muted-foreground"><span>February 2024</span><span className="text-foreground">KES {(ba.total * 0.9).toLocaleString()}</span></div>
                      <div className="flex justify-between text-muted-foreground"><span>January 2024</span><span className="text-foreground">KES {(ba.total * 0.85).toLocaleString()}</span></div>
                      <div className="flex justify-between text-muted-foreground"><span>December 2023</span><span className="text-foreground">KES {(ba.total * 0.8).toLocaleString()}</span></div>
                    </div>
                    <div className="flex gap-3 pt-4">
                      <button className="btn-press flex-1 rounded-md bg-success py-2 text-sm font-semibold text-success-foreground">Approve</button>
                      <button className="btn-press flex-1 rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground">Mark Paid</button>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
