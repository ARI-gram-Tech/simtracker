// src/components/landing/Hero.tsx
import { ArrowRight, Layers, Shield, GitMerge, DollarSign, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";

const stats = [
  { value: "99.8%", label: "Recon Accuracy" },
  { value: "50K+",  label: "SIMs Tracked"   },
  { value: "< 3s",  label: "Sync Time"       },
];

const floatingCards = [
  {
    top: "top-[18%]", right: "right-[6%]",
    delay: "0s",
    content: (
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
          <GitMerge className="h-4 w-4 text-emerald-400" />
        </div>
        <div>
          <p className="text-xs text-slate-400">Reconciliation</p>
          <p className="text-sm font-semibold text-white">342 SIMs matched</p>
        </div>
      </div>
    ),
  },
  {
    top: "top-[48%]", right: "right-[2%]",
    delay: "0.4s",
    content: (
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-cyan-500/20 flex items-center justify-center shrink-0">
          <DollarSign className="h-4 w-4 text-cyan-400" />
        </div>
        <div>
          <p className="text-xs text-slate-400">Commission</p>
          <p className="text-sm font-semibold text-white">KES 128,400 pending</p>
        </div>
      </div>
    ),
  },
  {
    top: "top-[72%]", right: "right-[8%]",
    delay: "0.8s",
    content: (
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-violet-500/20 flex items-center justify-center shrink-0">
          <Shield className="h-4 w-4 text-violet-400" />
        </div>
        <div>
          <p className="text-xs text-slate-400">Fraud Alerts</p>
          <p className="text-sm font-semibold text-white">2 flagged today</p>
        </div>
      </div>
    ),
  },
];

export default function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col justify-center overflow-hidden bg-[#080e1a]">
      {/* Grid background */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,220,255,0.8) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,220,255,0.8) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Radial glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-[-10%] left-[20%] w-[700px] h-[700px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #00bcd4 0%, transparent 70%)" }}
        />
        <div
          className="absolute bottom-[-10%] right-[10%] w-[500px] h-[500px] rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #7c3aed 0%, transparent 70%)" }}
        />
      </div>

      {/* Floating stat cards */}
      {floatingCards.map((card, i) => (
        <div
          key={i}
          className={`absolute ${card.top} ${card.right} hidden xl:block z-10`}
          style={{
            animation: `float 6s ease-in-out infinite`,
            animationDelay: card.delay,
          }}
        >
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-md px-4 py-3 shadow-xl min-w-[200px]">
            {card.content}
          </div>
        </div>
      ))}

      <div className="relative z-10 container mx-auto px-6 pt-32 pb-24">
        <div className="max-w-3xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 mb-8">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-xs font-semibold tracking-widest text-cyan-400 uppercase">
              Safaricom SIM Distribution Platform
            </span>
          </div>

          {/* Headline */}
          <h1 className="font-bold leading-[1.08] tracking-tight mb-6">
            <span
              className="block text-white"
              style={{ fontSize: "clamp(2.8rem, 7vw, 5.5rem)" }}
            >
              SIM Tracking.
            </span>
            <span
              className="block"
              style={{
                fontSize: "clamp(2.8rem, 7vw, 5.5rem)",
                background: "linear-gradient(135deg, #00bcd4 0%, #0ea5e9 50%, #7c3aed 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Reconciliation.
            </span>
            <span
              className="block text-white"
              style={{ fontSize: "clamp(2.8rem, 7vw, 5.5rem)" }}
            >
              Commission. Done.
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg text-slate-400 max-w-xl mb-10 leading-relaxed">
            One platform for dealers, branch managers, van teams and brand ambassadors 
            to track every SIM, auto-reconcile with Safaricom, and pay commissions — 
            with zero spreadsheets.
          </p>

          {/* CTA row */}
          <div className="flex flex-wrap gap-4 mb-16">
            <Link
              to="/login"
              className="group inline-flex items-center gap-2 rounded-lg px-7 py-3.5 text-sm font-semibold text-[#080e1a] transition-all"
              style={{ background: "linear-gradient(135deg, #00bcd4, #0ea5e9)" }}
            >
              Get Started
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/10"
            >
              Sign In
            </Link>
          </div>

          {/* Stats row */}
          <div className="flex flex-wrap gap-10">
            {stats.map((s) => (
              <div key={s.label}>
                <p
                  className="text-3xl font-bold"
                  style={{
                    background: "linear-gradient(135deg, #00bcd4, #0ea5e9)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  {s.value}
                </p>
                <p className="text-xs text-slate-500 mt-0.5 uppercase tracking-wider">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scroll cue */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-slate-600">
        <span className="text-[10px] uppercase tracking-widest">Scroll</span>
        <ChevronDown className="h-4 w-4 animate-bounce" />
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
      `}</style>
    </section>
  );
}