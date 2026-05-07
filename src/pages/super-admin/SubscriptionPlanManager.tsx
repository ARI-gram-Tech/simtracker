// src/pages/super-admin/SubscriptionPlanManager.tsx
import { useState } from "react";
import {
  Crown, AlertCircle, Loader2, Zap, Users,
  Truck, GitBranch, Check, Clock, ArrowDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSubscriptionPlans } from "@/hooks/useSubscriptionPlans";
import { showSuccess, showError } from "@/lib/toast";
import type { Dealer } from "@/types/dealers.types";

interface Props {
  dealer: Dealer;
}

const PLAN_ORDER = ["trial", "basic", "pro", "enterprise"] as const;

const PLAN_COLORS: Record<string, string> = {
  trial:      "from-slate-500/20 to-slate-600/20 border-slate-500/30",
  basic:      "from-blue-500/20 to-blue-600/20 border-blue-500/30",
  pro:        "from-purple-500/20 to-purple-600/20 border-purple-500/30",
  enterprise: "from-amber-500/20 to-amber-600/20 border-amber-500/30",
};

export function SubscriptionPlanManager({ dealer }: Props) {
  const { settings, changeDealerPlan, isChangingPlan } = useSubscriptionPlans();
  const [selectedPlan, setSelectedPlan] = useState<"trial" | "basic" | "pro" | "enterprise">(
    dealer.subscription_plan || "basic"
  );
  const [isChanging, setIsChanging] = useState(false);

  const currentPlan   = dealer.subscription_plan   || "basic";
  const currentStatus = dealer.subscription_status || "trial";

  const currentPlanData  = settings?.[currentPlan];
  const selectedPlanData = settings?.[selectedPlan];

  // ── Pending downgrade state ────────────────────────────────────────────────
  const pendingPlan     = dealer.pending_plan_change ?? null;
  const pendingPlanDate = dealer.next_billing_date   ?? null;
  const pendingPlanData = pendingPlan ? settings?.[pendingPlan] : null;

  const handleChangePlan = async () => {
    if (selectedPlan === currentPlan) { setIsChanging(false); return; }
    try {
      // result shape from billing_service.process_plan_change:
      // { dealer_id, old_plan, new_plan, effective, message, invoice }
      const result = await changeDealerPlan({ dealerId: dealer.id, plan: selectedPlan });

      if (result.effective === "immediate" && result.invoice) {
        // Upgrade — invoice was created
        showSuccess(
          `Upgraded to ${selectedPlanData?.label ?? selectedPlan}. ` +
          `Prorated invoice of KES ${Number(result.invoice.amount).toLocaleString()} created.`
        );
      } else if (result.effective === "next_billing_cycle") {
        // Downgrade — scheduled
        showSuccess(
          `Downgrade to ${selectedPlanData?.label ?? selectedPlan} scheduled. ` +
          `Will apply on ${pendingPlanDate ?? "your next billing date"}.`
        );
      } else {
        showSuccess(result.message ?? `Plan changed to ${selectedPlanData?.label ?? selectedPlan}`);
      }

      setIsChanging(false);
      // Reload to reflect updated dealer data (pending_plan_change etc.)
      window.location.reload();
      } catch (err: unknown) {
        const detail = (err as { response?: { data?: { error?: string; conflicts?: string[] } } })?.response?.data;
      if (detail?.error === "downgrade_incompatible" && detail?.conflicts?.length) {
        showError("Cannot downgrade: " + detail.conflicts.join(" "));
      } else {
        showError("Failed to change plan. Please try again.");
      }
    }
  };

  return (
    <div className="space-y-6">

      {/* ── Current Plan Badge ─────────────────────────────────────────────── */}
      <div className={cn(
        "rounded-lg border bg-gradient-to-r p-4",
        PLAN_COLORS[currentPlan] ?? PLAN_COLORS.basic
      )}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Crown className="h-8 w-8 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Current Plan</p>
              <p className="text-xl font-bold text-foreground">
                {currentPlanData?.label ?? currentPlan}
              </p>
              {currentPlanData && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  KES {Number(currentPlanData.monthly_price).toLocaleString()}/mo
                  {" · "}
                  KES {Number(currentPlanData.yearly_price).toLocaleString()}/yr
                </p>
              )}
            </div>
          </div>
          <div className={cn(
            "rounded-full px-3 py-1 text-xs font-medium",
            currentStatus === "active"    && "bg-success/10 text-success",
            currentStatus === "trial"     && "bg-yellow-500/10 text-yellow-600",
            currentStatus === "suspended" && "bg-destructive/10 text-destructive",
            currentStatus === "overdue"   && "bg-orange-500/10 text-orange-600",
          )}>
            {currentStatus.toUpperCase()}
          </div>
        </div>

        {/* Trial warning */}
        {currentStatus === "trial" && dealer.trial_ends_at && (
          <div className="mt-3 flex items-center gap-2 text-xs text-yellow-600">
            <AlertCircle className="h-3 w-3" />
            Trial ends on {new Date(dealer.trial_ends_at).toLocaleDateString()}
          </div>
        )}

        {/* Overage badge */}
        {currentPlanData?.allow_overage && (
          <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-600">
            <Zap className="h-3 w-3" />
            Overage billing enabled — excess usage will be invoiced automatically
          </div>
        )}

        {/* Limits summary */}
        {currentPlanData && (
          <div className="mt-3 flex gap-4 text-xs text-muted-foreground border-t border-border/40 pt-3">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" /> {currentPlanData.max_users} users
            </span>
            <span className="flex items-center gap-1">
              <Truck className="h-3 w-3" /> {currentPlanData.max_vans} vans
            </span>
            <span className="flex items-center gap-1">
              <GitBranch className="h-3 w-3" /> {currentPlanData.max_branches} branches
            </span>
          </div>
        )}
      </div>

      {/* ── Pending Downgrade Banner ───────────────────────────────────────── */}
      {pendingPlan && (
        <div className="flex items-start gap-3 rounded-lg border border-orange-500/30 bg-orange-500/5 p-4">
          <div className="mt-0.5 rounded-full bg-orange-500/10 p-1.5">
            <ArrowDown className="h-3.5 w-3.5 text-orange-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-orange-700 dark:text-orange-400">
              Downgrade Scheduled
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              This account will move to{" "}
              <span className="font-semibold text-foreground">
                {pendingPlanData?.label ?? pendingPlan}
              </span>{" "}
              on{" "}
              <span className="font-semibold text-foreground">
                {pendingPlanDate
                  ? new Date(pendingPlanDate).toLocaleDateString()
                  : "the next billing date"}
              </span>
              . No action needed — it will apply automatically.
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
            <Clock className="h-3 w-3" /> Scheduled
          </div>
        </div>
      )}

      {/* ── Next Billing Date ──────────────────────────────────────────────── */}
      {pendingPlanDate && !pendingPlan && currentStatus === "active" && (
        <div className="flex items-center gap-2 rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          Next billing date:{" "}
          <span className="font-medium text-foreground">
            {new Date(pendingPlanDate).toLocaleDateString()}
          </span>
        </div>
      )}

      {/* ── Change Plan ────────────────────────────────────────────────────── */}
      {!isChanging ? (
        <button
          onClick={() => setIsChanging(true)}
          className="w-full rounded-md border border-border bg-accent py-2 text-sm font-medium text-foreground hover:bg-accent/80 transition-colors"
        >
          Change Plan
        </button>
      ) : (
        <div className="space-y-4 rounded-lg border border-border bg-accent/20 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">Select New Plan</p>
            <button
              onClick={() => setIsChanging(false)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>

          {/* Plan cards */}
          <div className="grid grid-cols-2 gap-3">
            {PLAN_ORDER.map(planId => {
              const planData   = settings?.[planId];
              const isSelected = selectedPlan === planId;
              const isCurrent  = currentPlan  === planId;

              return (
                <button
                  key={planId}
                  onClick={() => setSelectedPlan(planId)}
                  className={cn(
                    "rounded-lg border p-3 text-left transition-all",
                    isSelected
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card hover:bg-accent"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold text-sm text-foreground">
                      {planData?.label ?? planId}
                    </p>
                    {isCurrent && (
                      <span className="text-[10px] font-medium text-primary bg-primary/10 rounded-full px-1.5 py-0.5">
                        Current
                      </span>
                    )}
                  </div>
                  {planData ? (
                    <>
                      <p className="text-xs text-muted-foreground">
                        KES {Number(planData.monthly_price).toLocaleString()}/mo
                      </p>
                      <div className="mt-2 space-y-0.5">
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Users className="h-3 w-3" /> {planData.max_users} users
                        </p>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Truck className="h-3 w-3" /> {planData.max_vans} vans
                        </p>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <GitBranch className="h-3 w-3" /> {planData.max_branches} branches
                        </p>
                      </div>
                      {planData.features.length > 0 && (
                        <div className="mt-2 space-y-0.5 border-t border-border/40 pt-2">
                          {planData.features.slice(0, 3).map(f => (
                            <p key={f} className="text-[11px] text-muted-foreground flex items-center gap-1">
                              <Check className="h-3 w-3 text-success" /> {f}
                            </p>
                          ))}
                          {planData.features.length > 3 && (
                            <p className="text-[11px] text-muted-foreground">
                              +{planData.features.length - 3} more
                            </p>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">Not configured</p>
                  )}
                </button>
              );
            })}
          </div>

          {/* Info box */}
          <div className="rounded-md bg-primary/5 p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">How plan changes work:</p>
            <p>• <span className="text-foreground font-medium">Upgrades</span> apply immediately — a prorated invoice is generated for the remaining cycle</p>
            <p>• <span className="text-foreground font-medium">Downgrades</span> are scheduled for the next billing date — no immediate charge</p>
            <p>• Downgrade will be blocked if current usage exceeds the new plan's limits</p>
          </div>

          <button
            onClick={handleChangePlan}
            disabled={isChangingPlan || selectedPlan === currentPlan || !settings?.[selectedPlan]}
            className="w-full rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            {isChangingPlan ? (
              <Loader2 className="h-4 w-4 animate-spin mx-auto" />
            ) : selectedPlan === currentPlan ? (
              "Select a different plan"
            ) : (
              `Change to ${settings?.[selectedPlan]?.label ?? selectedPlan}`
            )}
          </button>
        </div>
      )}
    </div>
  );
}