// src/types/planSettings.types.ts

export type PlanId = "trial" | "basic" | "pro" | "enterprise";

export interface PlanSetting {
  plan:          PlanId;
  label:         string;
  monthly_price: number;
  yearly_price:  number;
  max_users:     number;
  max_vans:      number;
  max_branches:  number;
  features:      string[];
  trial_days:    number | null;

  // ── Overage billing (new) ────────────────────────────────────────────────
  allow_overage:              boolean;
  overage_price_per_user:     number;
  overage_price_per_van:      number;
  overage_price_per_branch:   number;
}

export type PlanSettingsMap = Record<PlanId, PlanSetting>;


// ── Usage types ───────────────────────────────────────────────────────────────

export type UsageWarning = "limit_reached" | "approaching_limit" | null;

export interface UsageMetric {
  current:    number;
  max:        number;
  percentage: number;
  warning:    UsageWarning;
}

export interface DealerUsage {
  plan:     PlanId;
  users:    UsageMetric;
  vans:     UsageMetric;
  branches: UsageMetric;
}


// ── Feature catalogue (keep in sync with backend) ─────────────────────────────

export const KNOWN_FEATURES: Record<string, string> = {
  bulk_issue:          "Bulk SIM Issue",
  analytics_dashboard: "Analytics Dashboard",
  api_access:          "API Access",
  multi_branch:        "Multi-Branch Management",
  commission_rules:    "Custom Commission Rules",
  export_reports:      "Export Reports",
  advanced_reconciliation: "Advanced Reconciliation",
  priority_support:    "Priority Support",
};