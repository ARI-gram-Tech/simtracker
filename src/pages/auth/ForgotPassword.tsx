// src/pages/auth/ForgotPassword.tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { Layers, ArrowLeft, Mail } from "lucide-react";
import { useRequestPasswordReset } from "@/hooks/usePasswordReset";
import { getApiError } from "@/lib/apiError";          // ← new

export default function ForgotPassword() {
  const [email, setEmail]         = useState("");
  const [submitted, setSubmitted] = useState(false);

  const { mutate, isPending, error } = useRequestPasswordReset();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutate({ email }, { onSuccess: () => setSubmitted(true) });
  };

  const apiError = getApiError(error);                  // ← replaces the any casts

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
          {submitted ? (
            <div className="text-center space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/15">
                <Mail className="h-6 w-6 text-success" />
              </div>
              <h2 className="font-heading text-xl font-bold text-foreground">
                Check your inbox
              </h2>
              <p className="text-sm text-muted-foreground">
                If <span className="text-foreground font-medium">{email}</span> is
                registered, you'll receive a reset link shortly.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <ArrowLeft className="h-4 w-4" /> Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <h2 className="font-heading text-2xl font-bold text-foreground">
                Forgot password?
              </h2>
              <p className="text-sm text-muted-foreground mt-1 mb-6">
                Enter your email and we'll send you a reset link.
              </p>

              {apiError && (
                <div className="mb-4 rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive">
                  {apiError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    className="w-full rounded-md border border-border bg-accent py-2.5 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isPending || !email}
                  className="btn-press w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending ? "Sending…" : "Send Reset Link"}
                </button>
              </form>

              <div className="mt-4 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}