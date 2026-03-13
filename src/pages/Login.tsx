import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layers, BarChart3, GitMerge, DollarSign, Eye, EyeOff } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    navigate("/");
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left side */}
      <div className="hidden lg:flex lg:w-[60%] flex-col justify-center px-16 xl:px-24">
        <div className="flex items-center gap-3 mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Layers className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="font-heading text-4xl font-bold text-foreground">
            Sim<span className="text-primary">Track</span>
          </h1>
        </div>
        <p className="text-xl text-muted-foreground mb-12">SIM Distribution & Commission Management</p>

        <div className="space-y-6">
          {[
            { icon: Layers, text: "Track SIM inventory across all branches" },
            { icon: GitMerge, text: "Automated Safaricom reconciliation" },
            { icon: DollarSign, text: "Real-time commission calculation" },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <p className="text-foreground">{text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right side */}
      <div className="flex w-full lg:w-[40%] items-center justify-center p-8">
        <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8">
          <div className="lg:hidden flex items-center gap-2 mb-6 justify-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
              <Layers className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-heading text-xl font-bold">Sim<span className="text-primary">Track</span></span>
          </div>

          <h2 className="font-heading text-2xl font-bold text-foreground">Welcome back</h2>
          <p className="text-sm text-muted-foreground mt-1 mb-6">Sign in to your account</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Phone Number</label>
              <div className="flex">
                <span className="inline-flex items-center rounded-l-md border border-r-0 border-border bg-accent px-3 text-sm text-muted-foreground">
                  🇰🇪 +254
                </span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="7XX XXX XXX"
                  className="w-full rounded-r-md border border-border bg-accent py-2.5 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-md border border-border bg-accent py-2.5 px-3 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input type="checkbox" className="rounded border-border" />
                Remember me
              </label>
              <a href="#" className="text-sm text-primary hover:underline">Forgot password?</a>
            </div>

            <button
              type="submit"
              className="btn-press w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Sign In
            </button>
          </form>
        </div>
      </div>

      {/* Bottom text */}
      <p className="fixed bottom-4 left-1/2 -translate-x-1/2 text-xs text-muted-foreground">
        Powered by SimTrack SaaS
      </p>
    </div>
  );
}
