import { Package, Send, CornerDownLeft, CheckSquare } from "lucide-react";
import { KpiCard } from "@/components/KpiCard";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const dailyIssuances = [
  { day: "Mon", count: 420 },
  { day: "Tue", count: 380 },
  { day: "Wed", count: 510 },
  { day: "Thu", count: 290 },
  { day: "Fri", count: 460 },
  { day: "Sat", count: 380 },
  { day: "Sun", count: 120 },
];

const timeline = [
  { time: "08:15 AM", color: "bg-primary", text: "Alice issued 100 SIMs to Van KCK 001" },
  { time: "08:42 AM", color: "bg-blue-500", text: "Branch Embakasi received 200 SIMs" },
  { time: "09:10 AM", color: "bg-success", text: "BA John Kamau received 50 SIMs" },
  { time: "10:30 AM", color: "bg-warning", text: "BA David Mwangi has not returned SIMs from yesterday" },
  { time: "11:45 AM", color: "bg-success", text: "BA Mary Wanjiku returned 18 SIMs" },
  { time: "02:30 PM", color: "bg-secondary", text: "Safaricom report uploaded successfully" },
  { time: "03:15 PM", color: "bg-destructive", text: "Reconciliation flagged 3 fraud cases" },
];

const pendingReturns = [
  { name: "David Mwangi", location: "Van KCK", issued: 50, returned: 0, outstanding: 50, overdue: "3 days", isOverdue: true },
  { name: "Sarah Njeri", location: "Embakasi", issued: 40, returned: 12, outstanding: 28, overdue: "1 day", isOverdue: false },
  { name: "James Mutua", location: "Eastleigh", issued: 35, returned: 35, outstanding: 0, overdue: "On time", isOverdue: false },
  { name: "Grace Achieng", location: "Westlands", issued: 45, returned: 20, outstanding: 25, overdue: "2 days", isOverdue: true },
];

export default function OperationsDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Operations Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">Here is what needs your attention today</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard icon={Package} iconColor="text-primary" value="2,500" label="SIMs In Stock" sub="Available to issue" />
        <KpiCard icon={Send} iconColor="text-blue-500" value="380" label="Issued Today" sub="Across 12 BAs and 3 vans" />
        <KpiCard icon={CornerDownLeft} iconColor="text-success" value="145" label="Returned Today" sub="8 BAs returned SIMs" />
        <KpiCard icon={CheckSquare} iconColor="text-secondary" value="235" label="Registered Today" sub="Net registrations" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="font-heading text-lg font-semibold text-foreground mb-4">Daily SIM Issuances — Last 7 Days</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={dailyIssuances}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 40%, 22%)" />
              <XAxis dataKey="day" tick={{ fill: "hsl(215, 17%, 47%)", fontSize: 12 }} />
              <YAxis tick={{ fill: "hsl(215, 17%, 47%)", fontSize: 12 }} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(222, 45%, 10%)", border: "1px solid hsl(222, 40%, 22%)", borderRadius: 8, color: "hsl(214, 32%, 91%)" }} />
              <Bar dataKey="count" fill="hsl(190, 100%, 50%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="font-heading text-lg font-semibold text-foreground mb-4">Activity Timeline</h3>
          <div className="space-y-4 overflow-y-auto max-h-[280px] pr-2">
            {timeline.map((e, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={cn("h-2.5 w-2.5 rounded-full mt-1.5 shrink-0", e.color)} />
                  {i < timeline.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{e.time}</p>
                  <p className="text-sm text-foreground">{e.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="font-heading text-lg font-semibold text-foreground">Pending SIM Returns</h3>
        <p className="text-sm text-muted-foreground mb-4">BAs who have outstanding SIMs to return</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="pb-3 text-left font-medium">BA Name</th>
                <th className="pb-3 text-left font-medium">Branch/Van</th>
                <th className="pb-3 text-right font-medium">Issued</th>
                <th className="pb-3 text-right font-medium">Returned</th>
                <th className="pb-3 text-right font-medium">Outstanding</th>
                <th className="pb-3 text-left font-medium">Days Overdue</th>
                <th className="pb-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {pendingReturns.map((r, i) => (
                <tr key={i} className={cn("border-b border-border/50 transition-colors", r.isOverdue && r.outstanding > 0 ? "bg-destructive/5" : "hover:bg-accent/50")}>
                  <td className="py-3 text-foreground font-medium">{r.name}</td>
                  <td className="py-3 text-muted-foreground">{r.location}</td>
                  <td className="py-3 text-right text-foreground">{r.issued}</td>
                  <td className="py-3 text-right text-foreground">{r.returned}</td>
                  <td className="py-3 text-right font-medium text-foreground">{r.outstanding}</td>
                  <td className="py-3">
                    <span className={cn("text-sm", r.outstanding === 0 ? "text-success" : r.isOverdue ? "text-destructive" : "text-warning")}>
                      {r.overdue}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    {r.outstanding > 0 ? (
                      <button className="btn-press rounded-md bg-warning/20 text-warning px-3 py-1 text-xs font-medium hover:bg-warning/30">Remind</button>
                    ) : (
                      <span className="text-success text-xs">✓</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
