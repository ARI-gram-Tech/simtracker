// /src/pages/super-admin/Dashboard.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, DollarSign, TrendingUp, AlertCircle, Plus,
  Bell, ArrowUpRight, ArrowDownRight, CheckCircle2,
  Clock, XCircle, Building2, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell,
} from "recharts";

// ─── Mock data ────────────────────────────────────────────────────────────────

const METRICS = {
  totalClients:    15,
  activeClients:   12,
  trialClients:     2,
  suspendedClients: 1,
  totalRevenue:    384500,
  monthlyRevenue:   52450,
  totalUsers:       387,
  totalVans:        156,
  pendingInvoices:    3,
  overdueInvoices:    1,
};

const REVENUE_TREND = [
  { month: "Nov", revenue: 38000, clients: 10 },
  { month: "Dec", revenue: 41000, clients: 11 },
  { month: "Jan", revenue: 45000, clients: 12 },
  { month: "Feb", revenue: 48500, clients: 13 },
  { month: "Mar", revenue: 51000, clients: 14 },
  { month: "Apr", revenue: 52450, clients: 15 },
];

const PLAN_BREAKDOWN = [
  { name: "Enterprise", count: 3, revenue: 74997, color: "hsl(190,100%,50%)" },
  { name: "Pro",        count: 7, revenue: 69993, color: "hsl(160,60%,45%)"  },
  { name: "Basic",      count: 5, revenue: 24995, color: "hsl(215,17%,47%)"  },
];

const RECENT_CLIENTS = [
  { id: "c1", name: "Enlight Communications Ltd", plan: "enterprise", status: "active",    revenue: 24999, lastLogin: "2h ago"  },
  { id: "c2", name: "Safaricom Retail Ltd",        plan: "pro",        status: "active",    revenue:  9999, lastLogin: "5h ago"  },
  { id: "c3", name: "Airtel Kenya",                plan: "basic",      status: "trial",     revenue:     0, lastLogin: "1d ago"  },
  { id: "c4", name: "Coast Telecom",               plan: "pro",        status: "suspended", revenue:  9999, lastLogin: "7d ago"  },
  { id: "c5", name: "Western Digital Co",          plan: "basic",      status: "active",    revenue:  4999, lastLogin: "3h ago"  },
];

const RECENT_ACTIVITY = [
  { id: "1", action: "New client registered",  client: "Tech Solutions Ltd",     time: "2 hours ago",  type: "success", detail: "Enterprise plan"         },
  { id: "2", action: "Invoice paid",           client: "Enlight Communications", time: "5 hours ago",  type: "success", detail: "KES 24,999"               },
  { id: "3", action: "Client suspended",       client: "Coast Telecom",          time: "1 day ago",    type: "warning", detail: "Payment overdue 30 days"  },
  { id: "4", action: "Plan upgraded",          client: "Western Digital",        time: "2 days ago",   type: "info",    detail: "Basic → Pro"               },
  { id: "5", action: "Trial expired",          client: "Rift Valley Comms",      time: "3 days ago",   type: "danger",  detail: "No conversion"             },
  { id: "6", action: "Invoice generated",      client: "Safaricom Retail Ltd",   time: "4 days ago",   type: "info",    detail: "KES 9,999 — Pro Monthly"   },
];

const statusColors: Record<string, string> = {
  active:    "bg-success/15 text-success",
  trial:     "bg-warning/15 text-warning",
  suspended: "bg-destructive/15 text-destructive",
  expired:   "bg-muted text-muted-foreground",
};

const planColors: Record<string, string> = {
  enterprise: "bg-primary/15 text-primary",
  pro:        "bg-blue-500/15 text-blue-400",
  basic:      "bg-muted/50 text-muted-foreground",
};

const activityDot: Record<string, string> = {
  success: "bg-success",
  warning: "bg-warning",
  info:    "bg-primary",
  danger:  "bg-destructive",
};

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<"week" | "month" | "year">("month");

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Platform Overview</h1>
          <p className="text-sm text-muted-foreground mt-0.5">SimTrack Super Admin · April 2025</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate("/super-admin/notifications")}
            className="flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <Bell className="h-4 w-4" /> Send Notice
          </button>
          <button
            onClick={() => navigate("/super-admin/clients")}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4" /> Add Client
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Clients",
            value: METRICS.totalClients,
            sub: `${METRICS.activeClients} active · ${METRICS.trialClients} trial`,
            icon: Users,
            color: "text-primary",
            iconBg: "bg-primary/10",
          },
          {
            label: "Monthly Revenue",
            value: `KES ${METRICS.monthlyRevenue.toLocaleString()}`,
            sub: "+8.5% vs last month",
            icon: TrendingUp,
            color: "text-success",
            iconBg: "bg-success/10",
            trend: "up",
          },
          {
            label: "Pending Invoices",
            value: METRICS.pendingInvoices,
            sub: `${METRICS.overdueInvoices} overdue`,
            icon: AlertCircle,
            color: METRICS.overdueInvoices > 0 ? "text-warning" : "text-foreground",
            iconBg: "bg-warning/10",
          },
          {
            label: "Total Lifetime Revenue",
            value: `KES ${METRICS.totalRevenue.toLocaleString()}`,
            sub: `${METRICS.totalUsers} users · ${METRICS.totalVans} vans`,
            icon: DollarSign,
            color: "text-foreground",
            iconBg: "bg-accent",
          },
        ].map(k => (
          <div key={k.label} className="rounded-lg border border-border bg-card px-4 py-4">
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg", k.iconBg)}>
                <k.icon className={cn("h-3.5 w-3.5", k.color)} />
              </div>
            </div>
            <p className={cn("text-2xl font-bold font-heading", k.color)}>{k.value}</p>
            <div className="flex items-center gap-1 mt-1">
              {k.trend === "up" && <ArrowUpRight className="h-3 w-3 text-success" />}
              <p className="text-xs text-muted-foreground">{k.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Revenue trend */}
        <div className="lg:col-span-2 rounded-lg border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading text-base font-semibold text-foreground">Revenue Trend</h3>
            <div className="flex items-center gap-1 rounded-lg border border-border bg-accent p-1">
              {(["week", "month", "year"] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={cn(
                    "rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors",
                    period === p ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={REVENUE_TREND}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,40%,22%)" />
              <XAxis dataKey="month" tick={{ fill: "hsl(215,17%,47%)", fontSize: 11 }} />
              <YAxis tick={{ fill: "hsl(215,17%,47%)", fontSize: 11 }} tickFormatter={v => `${v/1000}k`} />
              <Tooltip
                formatter={(v: number) => [`KES ${v.toLocaleString()}`, "Revenue"]}
                contentStyle={{ backgroundColor: "hsl(222,45%,10%)", border: "1px solid hsl(222,40%,22%)", borderRadius: 8, color: "hsl(214,32%,91%)" }}
              />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke="hsl(190,100%,50%)" fill="hsl(190,100%,50%)" fillOpacity={0.12} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Plan breakdown */}
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="font-heading text-base font-semibold text-foreground mb-4">Clients by Plan</h3>
          <ResponsiveContainer width="100%" height={130}>
            <BarChart data={PLAN_BREAKDOWN} layout="vertical">
              <XAxis type="number" tick={{ fill: "hsl(215,17%,47%)", fontSize: 10 }} />
              <YAxis type="category" dataKey="name" tick={{ fill: "hsl(215,17%,47%)", fontSize: 11 }} width={60} />
              <Tooltip
                formatter={(v: number) => [v, "Clients"]}
                contentStyle={{ backgroundColor: "hsl(222,45%,10%)", border: "1px solid hsl(222,40%,22%)", borderRadius: 8, color: "hsl(214,32%,91%)" }}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {PLAN_BREAKDOWN.map((p, i) => <Cell key={i} fill={p.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2 border-t border-border pt-4">
            {PLAN_BREAKDOWN.map(p => (
              <div key={p.name} className="flex justify-between text-xs">
                <span className="text-muted-foreground">{p.name} ({p.count})</span>
                <span className="font-medium text-foreground">KES {p.revenue.toLocaleString()}/mo</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Recent clients */}
        <div className="lg:col-span-2 rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h3 className="font-heading text-base font-semibold text-foreground">Recent Clients</h3>
            <button
              onClick={() => navigate("/super-admin/clients")}
              className="text-xs text-primary hover:underline"
            >
              View all →
            </button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground text-xs">
                <th className="py-2.5 px-5 text-left font-medium">Client</th>
                <th className="py-2.5 px-4 text-left font-medium">Plan</th>
                <th className="py-2.5 px-4 text-left font-medium">Status</th>
                <th className="py-2.5 px-4 text-right font-medium">Revenue</th>
                <th className="py-2.5 px-5 text-right font-medium">Last Login</th>
              </tr>
            </thead>
            <tbody>
              {RECENT_CLIENTS.map(c => (
                <tr
                  key={c.id}
                  onClick={() => navigate(`/super-admin/clients/${c.id}`)}
                  className="border-b border-border/50 hover:bg-accent/40 transition-colors cursor-pointer"
                >
                  <td className="py-3 px-5">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Building2 className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <span className="font-medium text-foreground text-xs">{c.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium capitalize", planColors[c.plan])}>
                      {c.plan}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium capitalize", statusColors[c.status])}>
                      {c.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right text-xs font-medium text-foreground">
                    {c.revenue > 0 ? `KES ${c.revenue.toLocaleString()}` : "—"}
                  </td>
                  <td className="py-3 px-5 text-right text-xs text-muted-foreground">{c.lastLogin}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Activity feed */}
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="font-heading text-base font-semibold text-foreground mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {RECENT_ACTIVITY.map((a, i) => (
              <div key={a.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={cn("h-2.5 w-2.5 rounded-full mt-1 shrink-0", activityDot[a.type])} />
                  {i < RECENT_ACTIVITY.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground leading-tight">{a.action}</p>
                  <p className="text-xs text-muted-foreground">{a.client}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs text-muted-foreground">{a.time}</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground italic">{a.detail}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick status summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Active",    count: METRICS.activeClients,    icon: CheckCircle2, color: "text-success",     bg: "bg-success/10"     },
          { label: "On Trial",  count: METRICS.trialClients,     icon: Clock,        color: "text-warning",     bg: "bg-warning/10"     },
          { label: "Suspended", count: METRICS.suspendedClients, icon: XCircle,      color: "text-destructive", bg: "bg-destructive/10" },
          { label: "Renewing",  count: 4,                        icon: RefreshCw,    color: "text-primary",     bg: "bg-primary/10"     },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
            <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg shrink-0", s.bg)}>
              <s.icon className={cn("h-4 w-4", s.color)} />
            </div>
            <div>
              <p className={cn("text-xl font-bold font-heading", s.color)}>{s.count}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}