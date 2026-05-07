// src/components/landing/Features.tsx
import {
  Layers, GitMerge, DollarSign, Shield, BarChart3,
  Users, Truck, Building2, Bell, FileText,
} from "lucide-react";

const features = [
  {
    icon: Layers,
    title: "SIM Inventory Control",
    description: "Track every SIM from warehouse to BA's hand. Real-time status across all branches and van teams.",
    accent: "#00bcd4",
    glow: "rgba(0,188,212,0.15)",
  },
  {
    icon: GitMerge,
    title: "Safaricom Reconciliation",
    description: "Upload Excel reports and auto-match against your inventory. Fraud flags, disputes, and ghost SIMs detected instantly.",
    accent: "#0ea5e9",
    glow: "rgba(14,165,233,0.15)",
  },
  {
    icon: DollarSign,
    title: "Commission Engine",
    description: "Automated per-cycle commission calculation for every BA. Approve, reject, and pay — all in one flow.",
    accent: "#10b981",
    glow: "rgba(16,185,129,0.15)",
  },
  {
    icon: Shield,
    title: "Fraud Detection",
    description: "BA risk scoring, MSISDN mismatch alerts, and wrong-dealer SIM detection on every reconciliation.",
    accent: "#ef4444",
    glow: "rgba(239,68,68,0.15)",
  },
  {
    icon: BarChart3,
    title: "Live Performance",
    description: "KPIs per branch, van team, and BA. Trend charts, registration rates, and commission forecasts updated live.",
    accent: "#8b5cf6",
    glow: "rgba(139,92,246,0.15)",
  },
  {
    icon: Users,
    title: "Role-Based Access",
    description: "Owner, Ops Manager, Branch Manager, Van Leader, BA, Finance — every role sees exactly what they need.",
    accent: "#f59e0b",
    glow: "rgba(245,158,11,0.15)",
  },
  {
    icon: Truck,
    title: "Van Team Management",
    description: "Organise BAs into van teams under branches. Issue SIMs to teams, track returns, and monitor team performance.",
    accent: "#06b6d4",
    glow: "rgba(6,182,212,0.15)",
  },
  {
    icon: Building2,
    title: "Branch Operations",
    description: "Multi-branch support with scoped inventory, manager dashboards, and branch-level reporting.",
    accent: "#64748b",
    glow: "rgba(100,116,139,0.15)",
  },
  {
    icon: Bell,
    title: "Smart Notifications",
    description: "In-app and email alerts for SIM issues, returns, commission approvals, and fraud incidents.",
    accent: "#a78bfa",
    glow: "rgba(167,139,250,0.15)",
  },
  {
    icon: FileText,
    title: "Export & Reports",
    description: "Download commission summaries, payout history, and reconciliation data as Excel or PDF.",
    accent: "#34d399",
    glow: "rgba(52,211,153,0.15)",
  },
];

export default function Features() {
  return (
    <section className="relative py-28 bg-[#080e1a] overflow-hidden">
      {/* Subtle separator line from hero */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />

      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/5 px-4 py-1.5 mb-5">
            <span className="text-xs font-semibold tracking-widest text-cyan-400 uppercase">
              Everything you need
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
            Built for the full
            <span
              className="ml-3"
              style={{
                background: "linear-gradient(135deg, #00bcd4, #7c3aed)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              SIM lifecycle
            </span>
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            From batch import to commission payout — every step is tracked, audited, and visible to the right people.
          </p>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="group relative rounded-2xl border border-white/[0.07] bg-white/[0.03] p-6 transition-all duration-300 hover:border-white/15 hover:-translate-y-1"
                style={{
                  animationDelay: `${i * 0.05}s`,
                }}
              >
                {/* Glow on hover */}
                <div
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{ background: `radial-gradient(circle at 30% 30%, ${f.glow}, transparent 70%)` }}
                />

                <div
                  className="relative h-11 w-11 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: `${f.accent}18`, border: `1px solid ${f.accent}30` }}
                >
                  <Icon className="h-5 w-5" style={{ color: f.accent }} />
                </div>

                <h3 className="relative text-sm font-semibold text-white mb-2">{f.title}</h3>
                <p className="relative text-xs text-slate-500 leading-relaxed">{f.description}</p>

                {/* Accent bottom line on hover */}
                <div
                  className="absolute bottom-0 left-6 right-6 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full"
                  style={{ background: `linear-gradient(90deg, transparent, ${f.accent}, transparent)` }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}