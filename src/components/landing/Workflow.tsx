// src/components/landing/Workflow.tsx
import { Package, Upload, GitMerge, CheckCircle2, DollarSign, ArrowDown } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: Package,
    title: "Import SIM Batches",
    description: "Upload SIM serial numbers in bulk. The system assigns them to your warehouse and tracks stock levels instantly.",
    accent: "#00bcd4",
    detail: "Batch import • Auto serial validation • Warehouse assignment",
  },
  {
    number: "02",
    icon: Package,
    title: "Issue to Van Teams & BAs",
    description: "Distribute SIMs from warehouse → branch → van team → brand ambassador. Every movement is logged with timestamps.",
    accent: "#0ea5e9",
    detail: "Chain-of-custody • Movement log • Bulk operations",
  },
  {
    number: "03",
    icon: Upload,
    title: "Upload Safaricom Report",
    description: "Drop in the monthly Excel report from Safaricom. SimTrack maps BA MSISDNs via MobiGo devices automatically.",
    accent: "#8b5cf6",
    detail: "Excel parsing • Column mapping • MSISDN normalisation",
  },
  {
    number: "04",
    icon: GitMerge,
    title: "Auto-Reconcile",
    description: "Each row is matched against inventory. Results classified: payable, rejected, fraud, dispute, or ghost SIM.",
    accent: "#f59e0b",
    detail: "99.8% accuracy • Fraud scoring • BA risk profiles",
  },
  {
    number: "05",
    icon: CheckCircle2,
    title: "Approve Commissions",
    description: "Finance reviews auto-generated commission records per BA. Approve, adjust, or reject — with full audit trail.",
    accent: "#10b981",
    detail: "Per-cycle records • Deduction rules • Approval workflow",
  },
  {
    number: "06",
    icon: DollarSign,
    title: "Pay & Export",
    description: "Mark payouts as paid. Export commission summaries and payout history as Excel or PDF for your records.",
    accent: "#34d399",
    detail: "Payout history • Excel export • BA statements",
  },
];

export default function Workflow() {
  return (
    <section className="relative py-28 overflow-hidden" style={{ background: "#060c17" }}>
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-700/50 to-transparent" />

      {/* Background accent */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full pointer-events-none opacity-[0.04]"
        style={{ background: "radial-gradient(circle, #00bcd4, transparent)" }}
      />

      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/5 px-4 py-1.5 mb-5">
            <span className="text-xs font-semibold tracking-widest text-violet-400 uppercase">
              How It Works
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            From batch to
            <span
              className="ml-3"
              style={{
                background: "linear-gradient(135deg, #00bcd4, #8b5cf6)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              payout
            </span>
          </h2>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            Six steps. One platform. Zero spreadsheets.
          </p>
        </div>

        {/* Steps — vertical on mobile, 2-col on md, 3-col on xl */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {steps.map((step, i) => {
            const Icon = step.icon;
            const isLast = i === steps.length - 1;
            return (
              <div key={step.number} className="relative group">
                <div
                  className="relative h-full rounded-2xl border border-white/[0.07] bg-white/[0.02] p-7 transition-all duration-300 hover:border-white/15 hover:bg-white/[0.04]"
                >
                  {/* Number */}
                  <div className="flex items-start justify-between mb-5">
                    <div
                      className="h-12 w-12 rounded-xl flex items-center justify-center"
                      style={{ background: `${step.accent}15`, border: `1px solid ${step.accent}30` }}
                    >
                      <Icon className="h-5 w-5" style={{ color: step.accent }} />
                    </div>
                    <span
                      className="text-4xl font-black opacity-20 tabular-nums"
                      style={{ color: step.accent }}
                    >
                      {step.number}
                    </span>
                  </div>

                  <h3 className="text-base font-semibold text-white mb-2">{step.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed mb-4">{step.description}</p>

                  {/* Detail tags */}
                  <div className="flex flex-wrap gap-1.5">
                    {step.detail.split(" • ").map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                        style={{
                          background: `${step.accent}12`,
                          color: step.accent,
                          border: `1px solid ${step.accent}25`,
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Connector arrow — only on mobile for non-last */}
                  {!isLast && (
                    <div className="md:hidden flex justify-center mt-6 text-slate-700">
                      <ArrowDown className="h-5 w-5" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom bar */}
        <div className="mt-16 max-w-3xl mx-auto rounded-2xl border border-white/[0.07] bg-white/[0.02] p-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
            {[
              { value: "< 3s", label: "Reconciliation per row" },
              { value: "100%", label: "Audit trail coverage" },
              { value: "6 roles", label: "Supported user types" },
            ].map((stat) => (
              <div key={stat.label}>
                <p
                  className="text-3xl font-bold mb-1"
                  style={{
                    background: "linear-gradient(135deg, #00bcd4, #0ea5e9)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  {stat.value}
                </p>
                <p className="text-xs text-slate-500 uppercase tracking-wider">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}