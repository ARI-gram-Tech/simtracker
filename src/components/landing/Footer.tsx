// src/components/landing/Footer.tsx
import { Layers } from "lucide-react";
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="bg-[#060c17] border-t border-white/[0.06] py-14">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link to="/" className="inline-flex items-center gap-2 mb-4">
              <div
                className="h-9 w-9 rounded-lg flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #00bcd4, #0ea5e9)" }}
              >
                <Layers className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold text-white">
                Sim<span style={{ color: "#00bcd4" }}>Track</span>
              </span>
            </Link>
            <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
              SIM distribution, Safaricom reconciliation, and commission management — 
              built for Kenyan dealer networks.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Platform</h4>
            <ul className="space-y-2.5">
              {["Features", "How It Works", "Pricing"].map(label => (
                <li key={label}>
                  <Link to="/login" className="text-sm text-slate-500 hover:text-white transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Account */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Account</h4>
            <ul className="space-y-2.5">
              {[
                { label: "Sign In",        to: "/login"          },
                { label: "Forgot Password",to: "/forgot-password"},
              ].map(({ label, to }) => (
                <li key={label}>
                  <Link to={to} className="text-sm text-slate-500 hover:text-white transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-white/[0.06] flex flex-col md:flex-row justify-between items-center gap-3">
          <p className="text-xs text-slate-600">© 2025 SimTrack. All rights reserved.</p>
          <p className="text-xs text-slate-600">Built for Safaricom dealer networks in Kenya.</p>
        </div>
      </div>
    </footer>
  );
}