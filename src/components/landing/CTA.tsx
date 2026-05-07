// src/components/landing/CTA.tsx
import { ArrowRight, Shield, Zap, Users } from "lucide-react";
import { Link } from "react-router-dom";

const badges = [
  { icon: Shield, text: "Role-based access control" },
  { icon: Zap,    text: "Real-time sync"            },
  { icon: Users,  text: "Multi-dealer support"      },
];

export default function CTA() {
  return (
    <section className="relative py-28 overflow-hidden bg-[#080e1a]">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-700/50 to-transparent" />

      {/* Glow blobs */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[400px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(ellipse, rgba(0,188,212,0.08) 0%, rgba(124,58,237,0.06) 50%, transparent 75%)",
        }}
      />

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* Main card */}
          <div
            className="relative rounded-3xl overflow-hidden p-12 md:p-16 text-center"
            style={{
              background: "linear-gradient(135deg, rgba(0,188,212,0.08) 0%, rgba(14,165,233,0.06) 40%, rgba(124,58,237,0.08) 100%)",
              border: "1px solid rgba(0,188,212,0.2)",
            }}
          >
            {/* Inner glow corners */}
            <div className="absolute top-0 left-0 w-48 h-48 rounded-full opacity-20 pointer-events-none"
              style={{ background: "radial-gradient(circle, #00bcd4, transparent)" }} />
            <div className="absolute bottom-0 right-0 w-48 h-48 rounded-full opacity-15 pointer-events-none"
              style={{ background: "radial-gradient(circle, #7c3aed, transparent)" }} />

            <div className="relative z-10">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 mb-6">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-xs font-semibold tracking-widest text-cyan-400 uppercase">
                  Ready to go live?
                </span>
              </div>

              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
                Stop managing SIMs
                <br />
                <span
                  style={{
                    background: "linear-gradient(135deg, #00bcd4 0%, #0ea5e9 50%, #7c3aed 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  in spreadsheets.
                </span>
              </h2>

              <p className="text-lg text-slate-400 max-w-xl mx-auto mb-10">
                SimTrack gives your entire distribution network — from dealer to BA — 
                a single source of truth. Get started today.
              </p>

              {/* CTA buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
                <Link
                  to="/login"
                  className="group inline-flex items-center justify-center gap-2 rounded-xl px-8 py-4 text-base font-semibold text-[#080e1a] transition-all hover:opacity-90 hover:scale-[1.02]"
                  style={{ background: "linear-gradient(135deg, #00bcd4, #0ea5e9)" }}
                >
                  Get Started Now
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-8 py-4 text-base font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/10"
                >
                  Sign In
                </Link>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap justify-center gap-4">
                {badges.map(({ icon: Icon, text }) => (
                  <div
                    key={text}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2"
                  >
                    <Icon className="h-3.5 w-3.5 text-cyan-400" />
                    <span className="text-xs text-slate-400">{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Testimonial / quote strip */}
          <div className="mt-10 text-center">
            <p className="text-slate-500 text-sm italic">
              "SimTrack cut our reconciliation time from 3 days to under 2 hours."
            </p>
            <p className="text-slate-600 text-xs mt-1">— Operations Manager, Nairobi Dealer Network</p>
          </div>
        </div>
      </div>
    </section>
  );
}