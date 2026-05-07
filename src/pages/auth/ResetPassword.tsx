// src/pages/auth/ResetPassword.tsx
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Layers, Eye, EyeOff, CheckCircle } from "lucide-react";
import { useConfirmPasswordReset } from "@/hooks/usePasswordReset";
import { getApiError } from "@/lib/apiError";      

export default function ResetPassword() {
  const [searchParams]  = useSearchParams();
  const navigate        = useNavigate();
  const uid             = searchParams.get("uid")   ?? "";
  const token           = searchParams.get("token") ?? "";

  const [newPassword, setNewPassword]         = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword]       = useState(false);
  const [localError, setLocalError]           = useState("");
  const [done, setDone]                       = useState(false);

  const { mutate, isPending, error } = useConfirmPasswordReset();

  // Check token/uid fields first, then fall back to detail      ← replaces the any casts
  const apiError = getApiError(error, ["token", "uid", "detail"]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");

    if (newPassword !== confirmPassword) {
      setLocalError("Passwords do not match.");
      return;
    }
    if (!uid || !token) {
      setLocalError("Invalid or missing reset link. Please request a new one.");
      return;
    }

    mutate(
      { uid, token, new_password: newPassword },
      { onSuccess: () => setDone(true) },
    );
  };

  if (!uid || !token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-8">
        <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8 text-center space-y-4">
          <p className="text-sm text-destructive">
            This reset link is invalid or incomplete.
          </p>
          <Link to="/forgot-password" className="text-sm text-primary hover:underline">
            Request a new link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-8">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Layers className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-heading text-2xl font-bold">
            Sim<span className="text-primary">Track</span>
          </span>
        </div>

        <div className="rounded-xl border border-border bg-card p-8">
          {done ? (
            <div className="text-center space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/15">
                <CheckCircle className="h-6 w-6 text-success" />
              </div>
              <h2 className="font-heading text-xl font-bold text-foreground">
                Password reset!
              </h2>
              <p className="text-sm text-muted-foreground">
                Your password has been updated. You can now sign in.
              </p>
              <button
                onClick={() => navigate("/login")}
                className="btn-press w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Go to Sign In
              </button>
            </div>
          ) : (
            <>
              <h2 className="font-heading text-2xl font-bold text-foreground">
                Set new password
              </h2>
              <p className="text-sm text-muted-foreground mt-1 mb-6">
                Must be at least 8 characters.
              </p>

              {(localError || apiError) && (
                <div className="mb-4 rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive">
                  {localError || apiError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={8}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full rounded-md border border-border bg-accent py-2.5 px-3 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Confirm Password
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className={`w-full rounded-md border ${
                      confirmPassword && confirmPassword !== newPassword
                        ? "border-destructive"
                        : "border-border"
                    } bg-accent py-2.5 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary`}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="btn-press w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending ? "Resetting…" : "Reset Password"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}