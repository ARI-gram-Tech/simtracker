import api from "@/lib/api";
import { ENDPOINTS } from "@/constants/endpoints";
import type { PlanSettingsMap, PlanSetting } from "@/types/planSettings.types";

// Ensure overage decimal fields are never sent as null
function sanitizePlan(plan: PlanSetting): PlanSetting {
  return {
    ...plan,
    overage_price_per_user:   plan.overage_price_per_user   ?? 0,
    overage_price_per_van:    plan.overage_price_per_van    ?? 0,
    overage_price_per_branch: plan.overage_price_per_branch ?? 0,
  };
}

function sanitizePayload(data: PlanSettingsMap): PlanSettingsMap {
  return Object.fromEntries(
    Object.entries(data).map(([plan, settings]) => [plan, sanitizePlan(settings)])
  ) as PlanSettingsMap;
}

export const subscriptionPlansApi = {
  getSettings: (): Promise<PlanSettingsMap> =>
    api.get<PlanSettingsMap>(ENDPOINTS.PLAN_SETTINGS).then(r => r.data),

  updateSettings: (data: PlanSettingsMap): Promise<PlanSettingsMap> =>
    api.put<PlanSettingsMap>(ENDPOINTS.PLAN_SETTINGS, sanitizePayload(data)).then(r => r.data),

  changeDealerPlan: (dealerId: number, plan: string) =>
    api.post(ENDPOINTS.CHANGE_DEALER_PLAN(dealerId), { plan }).then(r => r.data),
};