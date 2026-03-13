import { Layers, Send, CheckCircle, XCircle, TrendingUp, DollarSign, Eye, MoreHorizontal, Medal } from "lucide-react";
import { KpiCard } from "@/components/KpiCard";
import { StatusBadge } from "@/components/StatusBadge";
import { registrationData, claimStatusData, brandAmbassadors, alerts } from "@/data/mockData";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

export default function DealerDashboard() {
  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold">Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard icon={Layers} iconColor="text-primary" value="10,000" label="Total SIMs in system" sub="+500 added this week" subColor="text-success" />
        <KpiCard icon={Send} iconColor="text-secondary" value="7,500" label="Currently distributed" sub="75% of inventory" subColor="text-muted-foreground" />
        <KpiCard icon={CheckCircle} iconColor="text-success" value="5,900" label="Confirmed by Safaricom" sub="Last reconciliation: Mar 10" subColor="text-muted-foreground" />
        <KpiCard icon={XCircle} iconColor="text-warning" value="450" label="Not yet activated" sub="300 pending review" subColor="text-warning" />
        <KpiCard icon={TrendingUp} iconColor="text-primary" value="KES 590,000" label="From Safaricom" sub="For current cycle" subColor="text-muted-foreground" />
        <KpiCard icon={DollarSign} iconColor="text-success" value="KES 472,000" label="Payable to BAs" sub="Variance: KES 118,000" subColor="text-warning" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 rounded-lg border border-border bg-card p-5">
          <h3 className="font-heading text-lg font-semibold mb-4">SIM Registrations Over Time</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={registrationData}>
              <defs>
                <linearGradient id="regGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(190, 100%, 50%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(190, 100%, 50%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="actGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(160, 60%, 45%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(160, 60%, 45%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 40%, 22%)" />
              <XAxis dataKey="week" stroke="hsl(215, 17%, 47%)" fontSize={12} />
              <YAxis stroke="hsl(215, 17%, 47%)" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(222, 45%, 10%)", border: "1px solid hsl(222, 40%, 22%)", borderRadius: 8, color: "hsl(214, 32%, 91%)" }} />
              <Area type="monotone" dataKey="registered" stroke="hsl(190, 100%, 50%)" fill="url(#regGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="activated" stroke="hsl(160, 60%, 45%)" fill="url(#actGrad)" strokeWidth={2} />
              <Legend />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="lg:col-span-2 rounded-lg border border-border bg-card p-5">
          <h3 className="font-heading text-lg font-semibold mb-4">Claim Status Breakdown</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={claimStatusData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                {claimStatusData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Legend formatter={(value: string) => <span className="text-foreground text-sm">{value}</span>} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(222, 45%, 10%)", border: "1px solid hsl(222, 40%, 22%)", borderRadius: 8, color: "hsl(214, 32%, 91%)" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom panels */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Top BAs */}
        <div className="lg:col-span-3 rounded-lg border border-border bg-card p-5">
          <h3 className="font-heading text-lg font-semibold mb-4">Top Performing BAs This Month</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="pb-3 text-left font-medium">Rank</th>
                  <th className="pb-3 text-left font-medium">BA Name</th>
                  <th className="pb-3 text-left font-medium">Branch</th>
                  <th className="pb-3 text-right font-medium">Registered</th>
                  <th className="pb-3 text-right font-medium">Active</th>
                  <th className="pb-3 text-right font-medium">Commission</th>
                </tr>
              </thead>
              <tbody>
                {brandAmbassadors.slice(0, 5).map((ba, i) => (
                  <tr key={ba.id} className="border-b border-border/50 hover:bg-accent/50 transition-colors">
                    <td className="py-3">
                      {i < 3 ? (
                        <Medal className={`h-4 w-4 ${i === 0 ? "text-warning" : i === 1 ? "text-muted-foreground" : "text-warning/60"}`} />
                      ) : (
                        <span className="text-muted-foreground">{i + 1}</span>
                      )}
                    </td>
                    <td className="py-3 font-medium text-foreground">{ba.name}</td>
                    <td className="py-3 text-muted-foreground">{ba.branch}</td>
                    <td className="py-3 text-right">{ba.registered}</td>
                    <td className="py-3 text-right">{ba.active}</td>
                    <td className="py-3 text-right text-success font-medium">KES {ba.commission.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button className="mt-3 text-sm text-primary hover:underline">View All →</button>
        </div>

        {/* Alerts */}
        <div className="lg:col-span-2 rounded-lg border border-border bg-card p-5">
          <h3 className="font-heading text-lg font-semibold mb-4">Recent Alerts</h3>
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div key={alert.id} className="flex items-start gap-3 rounded-md border border-border/50 bg-accent/30 p-3">
                <span className={`text-lg ${alert.severity === "high" ? "" : alert.severity === "medium" ? "" : ""}`}>
                  {alert.severity === "high" ? "🔴" : alert.severity === "medium" ? "🟡" : "🟢"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{alert.title}</p>
                  {alert.description && <p className="text-xs text-muted-foreground">{alert.description}</p>}
                  <p className="text-xs text-muted-foreground mt-1">{alert.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
