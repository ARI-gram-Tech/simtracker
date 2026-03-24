import { Layers, Send, CheckCircle, XCircle, TrendingUp, DollarSign, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { KpiCard } from "@/components/KpiCard";
import { registrationData, claimStatusData, brandAmbassadors, alerts } from "@/data/mockData";
import { StatusBadge } from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const claimNumbers = [
  { name: "Payable", value: 4012, color: "hsl(160, 60%, 45%)" },
  { name: "Inactive", value: 1062, color: "hsl(38, 92%, 50%)" },
  { name: "Fraud", value: 236, color: "hsl(0, 84%, 60%)" },
  { name: "Review", value: 590, color: "hsl(263, 84%, 52%)" },
];

const topBAs = [
  { rank: 1, medal: "🥇", name: "John Kamau", branch: "Embakasi", registered: 150, active: 132, commission: 13200 },
  { rank: 2, medal: "🥈", name: "Mary Wanjiku", branch: "Eastleigh", registered: 142, active: 128, commission: 12800 },
  { rank: 3, medal: "🥉", name: "Peter Otieno", branch: "Westlands", registered: 138, active: 119, commission: 11900 },
  { rank: 4, medal: "", name: "Grace Achieng", branch: "Ngong Road", registered: 125, active: 108, commission: 10800 },
  { rank: 5, medal: "", name: "David Mwangi", branch: "Embakasi", registered: 118, active: 102, commission: 10200 },
];

const dashAlerts = [
  { severity: "high" as const, title: "Duplicate Claim", desc: "SIM 89254001882 claimed by 2 BAs", time: "2 minutes ago", action: "Investigate" },
  { severity: "high" as const, title: "Fraud Flag", desc: "Safaricom flagged SIM 89254008821", time: "3 hours ago", action: "Investigate" },
  { severity: "medium" as const, title: "No Returns", desc: "BA David Mwangi has not returned SIMs for 3 days", time: "1 hour ago", action: "View" },
  { severity: "low" as const, title: "Reconciliation Complete", desc: "2,150 SIMs processed successfully", time: "5 hours ago", action: "View Report" },
];

const severityColors = { high: "bg-destructive/20 text-destructive border-destructive/30", medium: "bg-warning/20 text-warning border-warning/30", low: "bg-success/20 text-success border-success/30" };
const severityDots = { high: "bg-destructive", medium: "bg-warning", low: "bg-success" };

export default function OwnerDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Business Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">Here is your business summary for today</p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard icon={Layers} iconColor="text-primary" value="10,000" label="Total SIM Inventory" sub="+500 added this week" subColor="text-success" />
        <KpiCard icon={Send} iconColor="text-secondary" value="7,500" label="SIMs Issued" sub="75% of total inventory" subColor="text-muted-foreground" />
        <KpiCard icon={CheckCircle} iconColor="text-success" value="5,900" label="Confirmed Active" sub="Last reconciliation Mar 10" subColor="text-success" />
        <KpiCard icon={XCircle} iconColor="text-warning" value="450" label="Inactive Lines" sub="300 pending review" subColor="text-warning" />
        <KpiCard icon={TrendingUp} iconColor="text-primary" value="KES 590,000" label="Expected Safaricom Payout" sub="Current billing cycle" subColor="text-muted-foreground" />
        <KpiCard icon={DollarSign} iconColor="text-success" value="KES 472,000" label="Total BA Commission" sub="Variance: KES 118,000" subColor="text-warning" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 rounded-lg border border-border bg-card p-5">
          <h3 className="font-heading text-lg font-semibold text-foreground mb-4">SIM Registrations vs Activations</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={registrationData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 40%, 22%)" />
              <XAxis dataKey="week" tick={{ fill: "hsl(215, 17%, 47%)", fontSize: 12 }} />
              <YAxis tick={{ fill: "hsl(215, 17%, 47%)", fontSize: 12 }} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(222, 45%, 10%)", border: "1px solid hsl(222, 40%, 22%)", borderRadius: 8, color: "hsl(214, 32%, 91%)" }} />
              <Legend />
              <Area type="monotone" dataKey="registered" name="Registrations" stroke="hsl(190, 100%, 50%)" fill="hsl(190, 100%, 50%)" fillOpacity={0.2} />
              <Area type="monotone" dataKey="activated" name="Activations" stroke="hsl(160, 60%, 45%)" fill="hsl(160, 60%, 45%)" fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="lg:col-span-2 rounded-lg border border-border bg-card p-5">
          <h3 className="font-heading text-lg font-semibold text-foreground mb-4">Reconciliation Breakdown</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={claimNumbers} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                {claimNumbers.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: "hsl(222, 45%, 10%)", border: "1px solid hsl(222, 40%, 22%)", borderRadius: 8, color: "hsl(214, 32%, 91%)" }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {claimNumbers.map(s => (
              <div key={s.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ background: s.color }} />
                  <span className="text-muted-foreground">{s.name}</span>
                </div>
                <span className="text-foreground font-medium">{s.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 rounded-lg border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading text-lg font-semibold text-foreground">Top Performing BAs</h3>
            <button className="text-sm text-primary hover:underline">View All BAs</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="pb-3 text-left font-medium">Rank</th>
                  <th className="pb-3 text-left font-medium">Name</th>
                  <th className="pb-3 text-left font-medium">Branch</th>
                  <th className="pb-3 text-right font-medium">Registered</th>
                  <th className="pb-3 text-right font-medium">Active</th>
                  <th className="pb-3 text-right font-medium">Commission</th>
                </tr>
              </thead>
              <tbody>
                {topBAs.map(ba => (
                  <tr key={ba.rank} className="border-b border-border/50 hover:bg-accent/50 transition-colors">
                    <td className="py-3">{ba.medal || ba.rank}</td>
                    <td className="py-3 text-foreground font-medium">{ba.name}</td>
                    <td className="py-3 text-muted-foreground">{ba.branch}</td>
                    <td className="py-3 text-right text-foreground">{ba.registered}</td>
                    <td className="py-3 text-right text-foreground">{ba.active}</td>
                    <td className="py-3 text-right text-success font-medium">KES {ba.commission.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="lg:col-span-2 rounded-lg border border-border bg-card p-5">
          <h3 className="font-heading text-lg font-semibold text-foreground mb-4">Alerts & Warnings</h3>
          <div className="space-y-3">
            {dashAlerts.map((a, i) => (
              <div key={i} className={cn("rounded-lg border p-3", severityColors[a.severity])}>
                <div className="flex items-start gap-2">
                  <div className={cn("mt-1 h-2 w-2 rounded-full shrink-0", severityDots[a.severity])} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{a.title}</p>
                    <p className="text-xs opacity-80 mt-0.5">{a.desc}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs opacity-60">{a.time}</span>
                      <button className="text-xs font-medium hover:underline">[{a.action}]</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
