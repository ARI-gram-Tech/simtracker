// /src/pages/super-admin/Settings.tsx
import { useState } from "react";
import {
  Save, Edit2, Check, X, Loader2, Plus, Trash2,
  AlertTriangle, TrendingUp, Users, Truck, GitBranch, Zap, Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSubscriptionPlans } from "@/hooks/useSubscriptionPlans";
import { showSuccess, showError } from "@/lib/toast";
import type {
  PlanId, PlanSetting, PlanSettingsMap, DealerUsage, UsageWarning,
} from "@/types/planSettings.types";
import { KNOWN_FEATURES } from "@/types/planSettings.types";

// ── Constants ─────────────────────────────────────────────────────────────────

const PLAN_ORDER: PlanId[] = ["trial", "basic", "pro", "enterprise"];

const SETTINGS_TABS = [
  { id: "plans",   label: "Subscription Plans" },
  { id: "system",  label: "System Config"       },
  { id: "email",   label: "Email Templates"     },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function blankPlan(id: PlanId): PlanSetting {
  return {
    plan:                     id,
    label:                    id.charAt(0).toUpperCase() + id.slice(1),
    monthly_price:            0,
    yearly_price:             0,
    max_users:                10,
    max_vans:                 5,
    max_branches:             3,
    features:                 [],
    trial_days:               id === "trial" ? 30 : null,
    allow_overage:            false,
    overage_price_per_user:   500,
    overage_price_per_van:    300,
    overage_price_per_branch: 800,
  };
}

// ── UsageBar: progress bar with warning states ────────────────────────────────

interface UsageBarProps {
  label:   string;
  current: number;
  max:     number;
  pct:     number;
  warning: UsageWarning;
  icon:    React.ReactNode;
}

function UsageBar({ label, current, max, pct, warning, icon }: UsageBarProps) {
  const barColor =
    warning === "limit_reached"    ? "bg-destructive" :
    warning === "approaching_limit" ? "bg-amber-500"  : "bg-primary";

  const textColor =
    warning === "limit_reached"    ? "text-destructive" :
    warning === "approaching_limit" ? "text-amber-500"  : "text-foreground";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          {icon}
          <span>{label}</span>
        </div>
        <span className={cn("font-semibold tabular-nums", textColor)}>
          {current} / {max}
          {warning === "limit_reached"    && <span className="ml-1.5 text-xs">(Limit reached)</span>}
          {warning === "approaching_limit" && <span className="ml-1.5 text-xs">(Approaching limit)</span>}
        </span>
      </div>
      <div className="h-2 rounded-full bg-accent overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", barColor)}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}

// ── UsageDashboard: shows per-dealer usage (feed real data via prop) ───────────
// In a real page, pass `usage` from `useDealerUsage(dealerId)`.

interface UsageDashboardProps {
  usage: DealerUsage;
}

function UsageDashboard({ usage }: UsageDashboardProps) {
  const hasAnyWarning =
    usage.users.warning || usage.vans.warning || usage.branches.warning;

  return (
    <div className="space-y-5">
      {hasAnyWarning && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-400/30 bg-amber-400/10 p-4">
          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          <div className="text-sm text-amber-700 dark:text-amber-300">
            <span className="font-semibold">Usage warning:</span> Some resources are at or
            near their plan limits. Consider upgrading to avoid disruptions.
          </div>
        </div>
      )}

      <div className="rounded-lg border border-border bg-accent/20 p-5 space-y-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">
            Current Plan: <span className="capitalize text-primary">{usage.plan}</span>
          </p>
          <span className="rounded-full bg-primary/10 text-primary text-xs font-medium px-2.5 py-1">
            Live usage
          </span>
        </div>

        <UsageBar
          label="Users"
          current={usage.users.current}
          max={usage.users.max}
          pct={usage.users.percentage}
          warning={usage.users.warning}
          icon={<Users className="h-4 w-4" />}
        />
        <UsageBar
          label="Vans"
          current={usage.vans.current}
          max={usage.vans.max}
          pct={usage.vans.percentage}
          warning={usage.vans.warning}
          icon={<Truck className="h-4 w-4" />}
        />
        <UsageBar
          label="Branches"
          current={usage.branches.current}
          max={usage.branches.max}
          pct={usage.branches.percentage}
          warning={usage.branches.warning}
          icon={<GitBranch className="h-4 w-4" />}
        />
      </div>
    </div>
  );
}

// ── FeatureGate: wraps any UI section that requires a feature ─────────────────

interface FeatureGateProps {
  feature:    string;
  plan:       PlanSetting | undefined;
  children:   React.ReactNode;
  fallback?:  React.ReactNode;
}

export function FeatureGate({ feature, plan, children, fallback }: FeatureGateProps) {
  const hasFeature = plan?.features.includes(feature) ?? false;
  if (hasFeature) return <>{children}</>;

  return (
    fallback ?? (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-accent/20 px-4 py-3 text-sm text-muted-foreground">
        <Lock className="h-4 w-4 shrink-0" />
        <span>
          <span className="font-medium text-foreground">
            {KNOWN_FEATURES[feature] ?? feature}
          </span>{" "}
          is not available on your current plan.
        </span>
        <button className="ml-auto rounded-md bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground hover:opacity-90">
          Upgrade
        </button>
      </div>
    )
  );
}

// ── PlanCard ──────────────────────────────────────────────────────────────────

interface PlanCardProps {
  plan:   PlanSetting;
  onEdit: (plan: PlanSetting) => void;
}

function PlanCard({ plan, onEdit }: PlanCardProps) {
  return (
    <div className="rounded-lg border border-border bg-accent/20 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-heading font-semibold text-foreground">{plan.label}</p>
        <button
          onClick={() => onEdit(plan)}
          className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <Edit2 className="h-4 w-4" />
        </button>
      </div>

      <div>
        <p className="text-2xl font-bold font-heading text-primary">
          KES {plan.monthly_price.toLocaleString()}
          <span className="text-sm font-normal text-muted-foreground">/mo</span>
        </p>
        <p className="text-xs text-muted-foreground">KES {plan.yearly_price.toLocaleString()}/yr</p>
      </div>

      <div className="text-xs space-y-1 border-t border-border pt-3">
        {plan.trial_days != null && (
          <div className="flex justify-between text-muted-foreground">
            <span>Trial days</span>
            <span className="text-foreground font-medium">{plan.trial_days}</span>
          </div>
        )}
        <div className="flex justify-between text-muted-foreground">
          <span>Users</span><span className="text-foreground font-medium">{plan.max_users}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Vans</span><span className="text-foreground font-medium">{plan.max_vans}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Branches</span><span className="text-foreground font-medium">{plan.max_branches}</span>
        </div>
      </div>

      {/* Overage badge */}
      {plan.allow_overage && (
        <div className="flex items-center gap-1.5 rounded-md bg-amber-400/10 border border-amber-400/30 px-2.5 py-1.5">
          <Zap className="h-3 w-3 text-amber-500 shrink-0" />
          <span className="text-xs text-amber-700 dark:text-amber-300">Overage billing enabled</span>
        </div>
      )}

      {plan.features.length > 0 && (
        <div className="space-y-1">
          {plan.features.map(f => (
            <div key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Check className="h-3 w-3 text-success shrink-0" />
              {KNOWN_FEATURES[f] ?? f}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── PlanEditor ────────────────────────────────────────────────────────────────

interface PlanEditorProps {
  draft:    PlanSetting;
  onChange: (updated: PlanSetting) => void;
  onSave:   () => void;
  onCancel: () => void;
}

function PlanEditor({ draft, onChange, onSave, onCancel }: PlanEditorProps) {
  const [newFeature, setNewFeature] = useState("");

  const set = <K extends keyof PlanSetting>(key: K, value: PlanSetting[K]) =>
    onChange({ ...draft, [key]: value });

  const addFeature = () => {
    const trimmed = newFeature.trim();
    if (!trimmed || draft.features.includes(trimmed)) return;
    set("features", [...draft.features, trimmed]);
    setNewFeature("");
  };

  const removeFeature = (i: number) =>
    set("features", draft.features.filter((_, idx) => idx !== i));

  const numField = (
    label: string,
    key: "monthly_price" | "yearly_price" | "max_users" | "max_vans" | "max_branches"
       | "trial_days" | "overage_price_per_user" | "overage_price_per_van" | "overage_price_per_branch"
  ) => (
    <div key={key}>
      <label className="block text-xs font-medium text-foreground mb-1">{label}</label>
      <input
        type="number" min={0}
        value={draft[key] ?? ""}
        onChange={e => set(key, e.target.value === "" ? null : Number(e.target.value))}
        className="w-full rounded-md border border-border bg-card py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
      />
    </div>
  );

  // Suggest known feature keys the plan doesn't have yet
  const featureSuggestions = Object.keys(KNOWN_FEATURES).filter(
    k => !draft.features.includes(k)
  );

  return (
    <div className="mt-6 rounded-lg border border-primary/30 bg-primary/5 p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="font-semibold text-foreground">Editing: {draft.label} Plan</p>
        <button onClick={onCancel} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Label */}
      <div>
        <label className="block text-xs font-medium text-foreground mb-1">Plan Label</label>
        <input
          type="text" value={draft.label}
          onChange={e => set("label", e.target.value)}
          className="w-full rounded-md border border-border bg-card py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Pricing & Limits */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Pricing & Limits
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {numField("Monthly Price (KES)", "monthly_price")}
          {numField("Yearly Price (KES)",  "yearly_price")}
          {numField("Max Users",           "max_users")}
          {numField("Max Vans",            "max_vans")}
          {numField("Max Branches",        "max_branches")}
          {draft.plan === "trial" && numField("Trial Days", "trial_days")}
        </div>
      </div>

      {/* ── Overage Billing (NEW) ──────────────────────────────────────────── */}
      <div className="border border-border rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-amber-500" />
              Overage Billing
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              If enabled, usage beyond limits is charged per unit instead of blocked.
            </p>
          </div>
          {/* Toggle */}
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={draft.allow_overage}
              onChange={e => set("allow_overage", e.target.checked)}
            />
            <div className="w-10 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500" />
          </label>
        </div>

        {draft.allow_overage && (
          <div className="grid grid-cols-3 gap-4 pt-1">
            {numField("Per Extra User (KES)",   "overage_price_per_user")}
            {numField("Per Extra Van (KES)",    "overage_price_per_van")}
            {numField("Per Extra Branch (KES)", "overage_price_per_branch")}
          </div>
        )}
      </div>

      {/* Features */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Features
        </p>
        <div className="space-y-1.5 mb-3">
          {draft.features.map((f, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="flex-1 rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground">
                {KNOWN_FEATURES[f] ?? f}
                <span className="ml-2 text-xs text-muted-foreground font-mono">({f})</span>
              </span>
              <button
                onClick={() => removeFeature(i)}
                className="text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Quick-add from known features */}
        {featureSuggestions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {featureSuggestions.map(key => (
              <button
                key={key}
                onClick={() => set("features", [...draft.features, key])}
                className="rounded-full border border-dashed border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:border-primary transition-colors"
              >
                + {KNOWN_FEATURES[key]}
              </button>
            ))}
          </div>
        )}

        {/* Custom feature input */}
        <div className="flex gap-2">
          <input
            type="text" value={newFeature}
            placeholder="Custom feature key (e.g. custom_reports)…"
            onChange={e => setNewFeature(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addFeature()}
            className="flex-1 rounded-md border border-border bg-card py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            onClick={addFeature}
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <button
          onClick={onSave}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
        >
          <Save className="h-4 w-4" /> Update Plan
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function SuperAdminSettings() {
  const [activeTab, setActiveTab]           = useState("plans");
  const [draft, setDraft]                   = useState<PlanSetting | null>(null);
  const [localOverrides, setLocalOverrides] = useState<Partial<PlanSettingsMap>>({});

  const { settings, isLoading, isUpdating, updateSettings } = useSubscriptionPlans();

  const effectivePlans: PlanSettingsMap | undefined = settings
    ? Object.fromEntries(
        PLAN_ORDER.map(id => [
          id,
          localOverrides[id] ?? settings[id] ?? blankPlan(id),
        ])
      ) as PlanSettingsMap
    : undefined;

  const hasUnsavedChanges = Object.keys(localOverrides).length > 0;

  const handleEditorSave = () => {
    if (!draft) return;
    setLocalOverrides(prev => ({ ...prev, [draft.plan]: draft }));
    setDraft(null);
  };

  const handleSaveAll = async () => {
    if (!effectivePlans) return;
    try {
      await updateSettings(effectivePlans);
      setLocalOverrides({});
      showSuccess("Plan settings saved successfully");
    } catch {
      showError("Failed to save plan settings");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading settings…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Platform Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage subscription plans, system configuration, and email templates
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {SETTINGS_TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={cn(
              "rounded-md px-4 py-2 text-sm font-medium transition-colors",
              activeTab === t.id
                ? "bg-primary text-primary-foreground"
                : "bg-accent text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-card p-6">

        {/* ── Plans tab ──────────────────────────────────────────────────────── */}
        {activeTab === "plans" && effectivePlans && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-heading text-lg font-semibold">Subscription Plans</h3>
                {hasUnsavedChanges && (
                  <p className="text-xs text-amber-500 mt-0.5">You have unsaved changes</p>
                )}
              </div>
              <button
                onClick={handleSaveAll}
                disabled={isUpdating || !hasUnsavedChanges}
                className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {isUpdating ? "Saving…" : "Save All Changes"}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {PLAN_ORDER.map(id => {
                const plan    = effectivePlans[id];
                if (!plan) return null;
                const isDirty = !!localOverrides[id];
                return (
                  <div key={id} className={cn("relative", isDirty && "ring-1 ring-amber-400/60 rounded-lg")}>
                    {isDirty && (
                      <span className="absolute -top-2 -right-2 z-10 rounded-full bg-amber-400 text-amber-900 text-[10px] font-semibold px-1.5 py-0.5 leading-none">
                        unsaved
                      </span>
                    )}
                    <PlanCard plan={plan} onEdit={p => setDraft({ ...p })} />
                  </div>
                );
              })}
            </div>

            {draft && (
              <PlanEditor
                draft={draft}
                onChange={setDraft}
                onSave={handleEditorSave}
                onCancel={() => setDraft(null)}
              />
            )}
          </div>
        )}

        {/* ── System config tab ──────────────────────────────────────────────── */}
        {activeTab === "system" && (
          <div className="max-w-lg space-y-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              System Configuration
            </p>
            {[
              { label: "Platform Name",            defaultVal: "SimTrack"            },
              { label: "Support Email",             defaultVal: "support@simtrack.io" },
              { label: "Trial Period (days)",       defaultVal: "30"                  },
              { label: "Invoice Due Period (days)", defaultVal: "10"                  },
              { label: "Max Login Attempts",        defaultVal: "5"                   },
            ].map(f => (
              <div key={f.label}>
                <label className="block text-sm font-medium text-foreground mb-1.5">{f.label}</label>
                <input
                  defaultValue={f.defaultVal}
                  className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            ))}
            <div className="space-y-2 pt-2">
              {[
                { label: "Allow self-registration",            checked: false },
                { label: "Require email verification",         checked: true  },
                { label: "Send overdue invoice reminders",     checked: true  },
                { label: "Auto-suspend after 30 days overdue", checked: true  },
              ].map(s => (
                <label
                  key={s.label}
                  className="flex items-center justify-between rounded-lg border border-border bg-accent/30 px-4 py-3 cursor-pointer"
                >
                  <span className="text-sm text-foreground">{s.label}</span>
                  <div className="relative">
                    <input type="checkbox" defaultChecked={s.checked} className="sr-only peer" />
                    <div className="w-10 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary" />
                  </div>
                </label>
              ))}
            </div>
            <button className="flex items-center gap-2 rounded-md bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground">
              <Save className="h-4 w-4" /> Save Configuration
            </button>
          </div>
        )}

        {/* ── Email templates tab ────────────────────────────────────────────── */}
        {activeTab === "email" && (
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Email Templates
            </p>
            {[
              { name: "Welcome Email",            trigger: "New client registered",    status: "Active" },
              { name: "Trial Expiry Warning",     trigger: "3 days before trial ends", status: "Active" },
              { name: "Invoice Generated",        trigger: "Invoice created",          status: "Active" },
              { name: "Invoice Overdue Reminder", trigger: "Payment 7 days overdue",   status: "Active" },
              { name: "Account Suspended",        trigger: "Manual suspension",        status: "Active" },
              { name: "Password Reset",           trigger: "User requests reset",      status: "Active" },
              { name: "Overage Charge Notice",    trigger: "Overage invoice created",  status: "Active" },
              { name: "Plan Downgrade Scheduled", trigger: "Downgrade requested",      status: "Active" },
            ].map(t => (
              <div
                key={t.name}
                className="flex items-center justify-between rounded-lg border border-border bg-accent/20 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Trigger: {t.trigger}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-success">{t.status}</span>
                  <button className="rounded-md border border-border px-3 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}