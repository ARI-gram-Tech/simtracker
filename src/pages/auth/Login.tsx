// src/pages/auth/Login.tsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useAuth, getRoleDashboard } from "@/contexts/AuthContext";
import { useLoginError } from "@/hooks/useLoginError";
import { showInfo } from "@/lib/toast";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { error: loginError, handleLoginError, clearError } = useLoginError();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    if (!email || !password) { showInfo("Please enter your email and password."); return; }
    setIsSubmitting(true);
    try {
      await login(email, password);
      const stored = localStorage.getItem("simtrack_user");
      if (stored) {
        const user = JSON.parse(stored);
        navigate(getRoleDashboard(user.role));
      } else {
        navigate("/");
      }
    } catch (err: unknown) {
      handleLoginError(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayError = loginError?.message || "";

  return (
    <div className="flex min-h-screen" style={{ background: "#080e1a" }}>

      {/* IMAGE PANEL */}
      <div className="hidden lg:block lg:w-[55%] relative overflow-hidden">
        <img
          src="https://www.microsoft.com/en-us/research/wp-content/uploads/2018/08/01_MSR_SIGCOMM_Data_Network_1400x788-1024x576.png"
          alt="Network"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0"
          style={{ background: "linear-gradient(to right, rgba(8,14,26,0.1) 0%, rgba(8,14,26,0.5) 100%)" }} />
        <div className="absolute bottom-8 left-8 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(0,188,212,0.9)" }}>
            <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <rect x="2" y="3" width="7" height="9" rx="1"/><rect x="15" y="3" width="7" height="5" rx="1"/>
              <rect x="15" y="12" width="7" height="9" rx="1"/><rect x="2" y="16" width="7" height="5" rx="1"/>
            </svg>
          </div>
          <div>
            <p className="text-white text-sm font-bold">SimTrack Pro</p>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>SIM Distribution Platform</p>
          </div>
        </div>
      </div>

      {/* FORM PANEL */}
      <div className="flex w-full lg:w-[45%] items-center justify-center p-8">
        <div className="w-full max-w-[300px]">

          {/* Logo */}
          <div className="flex items-center gap-2 mb-8">
            <div className="w-2 h-2 rounded-full" style={{ background: "#00bcd4" }} />
            <span className="text-white font-bold text-base tracking-wide">
              Sim<span style={{ color: "#00bcd4" }}>Track</span>
            </span>
          </div>

          <h2 className="text-2xl font-bold text-white mb-1">Welcome back</h2>
          <p className="text-sm mb-6" style={{ color: "#475569" }}>Sign in to your account to continue</p>

          {displayError && (
            <div className="mb-4 rounded-lg px-4 py-3 text-sm"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171" }}>
              {displayError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest mb-1.5"
                style={{ color: "#64748b" }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); if (loginError?.field === "email") clearError(); }}
                placeholder="you@example.com"
                autoComplete="email"
                className="w-full rounded-lg py-2.5 px-3 text-sm text-white placeholder:text-slate-700 focus:outline-none transition-all"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: loginError?.field === "email" ? "1px solid rgba(239,68,68,0.6)" : "1px solid rgba(255,255,255,0.1)",
                }}
                onFocus={e => { e.target.style.borderColor = "rgba(0,188,212,0.6)"; }}
                onBlur={e => { e.target.style.borderColor = loginError?.field === "email" ? "rgba(239,68,68,0.6)" : "rgba(255,255,255,0.1)"; }}
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest mb-1.5"
                style={{ color: "#64748b" }}>Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => { setPassword(e.target.value); if (loginError?.field === "password") clearError(); }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full rounded-lg py-2.5 px-3 pr-10 text-sm text-white placeholder:text-slate-700 focus:outline-none transition-all"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: loginError?.field === "password" ? "1px solid rgba(239,68,68,0.6)" : "1px solid rgba(255,255,255,0.1)",
                  }}
                  onFocus={e => { e.target.style.borderColor = "rgba(0,188,212,0.6)"; }}
                  onBlur={e => { e.target.style.borderColor = loginError?.field === "password" ? "rgba(239,68,68,0.6)" : "rgba(255,255,255,0.1)"; }}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: "#475569" }}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: "#475569" }}>
                <input type="checkbox" className="accent-cyan-500" />
                Remember me
              </label>
              <Link to="/forgot-password" className="text-xs" style={{ color: "#00bcd4" }}>
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg py-2.5 text-sm font-bold tracking-wide transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: "#00bcd4", color: "#080e1a" }}
            >
              {isSubmitting ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <p className="text-center text-[10px] mt-8" style={{ color: "#1e293b" }}>
            ARI gram Technologies · SimTrack SaaS
          </p>
        </div>
      </div>
    </div>
  );
}