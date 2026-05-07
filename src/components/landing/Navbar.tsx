// src/components/landing/Navbar.tsx
import { useState } from "react";
import { Layers, Menu, X } from "lucide-react";
import { Link } from "react-router-dom";

const navLinks = [
  { label: "Features",    href: "#features"  },
  { label: "How It Works",href: "#workflow"  },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] backdrop-blur-xl" style={{ background: "rgba(8,14,26,0.85)" }}>
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #00bcd4, #0ea5e9)" }}
            >
              <Layers className="h-4 w-4 text-white" />
            </div>
            <span className="text-base font-bold text-white">
              Sim<span style={{ color: "#00bcd4" }}>Track</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map(l => (
              <a
                key={l.label}
                href={l.href}
                className="text-sm text-slate-400 hover:text-white transition-colors"
              >
                {l.label}
              </a>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/login"
              className="text-sm font-semibold text-[#080e1a] rounded-lg px-4 py-2 transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #00bcd4, #0ea5e9)" }}
            >
              Get Started
            </Link>
          </div>

          {/* Mobile toggle */}
          <button className="md:hidden p-2 text-slate-400" onClick={() => setOpen(!open)}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="md:hidden py-4 border-t border-white/[0.06] flex flex-col gap-4">
            {navLinks.map(l => (
              <a
                key={l.label}
                href={l.href}
                className="text-sm text-slate-400 hover:text-white"
                onClick={() => setOpen(false)}
              >
                {l.label}
              </a>
            ))}
            <div className="flex flex-col gap-2 pt-2 border-t border-white/[0.06]">
              <Link to="/login" className="text-sm text-slate-400 hover:text-white text-center py-2" onClick={() => setOpen(false)}>
                Sign In
              </Link>
              <Link
                to="/login"
                className="text-sm font-semibold text-[#080e1a] rounded-lg px-4 py-2.5 text-center"
                style={{ background: "linear-gradient(135deg, #00bcd4, #0ea5e9)" }}
                onClick={() => setOpen(false)}
              >
                Get Started
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}