import { useMemo } from "react";
import type { PlanSetting } from "@/types/planSettings.types";

export function usePlanFeatures(plan: PlanSetting | undefined) {
  const hasFeature = useMemo(() => {
    const features = new Set(plan?.features ?? []);
    return (name: string): boolean => features.has(name);
  }, [plan]);
 
  return { hasFeature };
}