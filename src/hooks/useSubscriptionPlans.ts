// src/hooks/useSubscriptionPlans.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { subscriptionPlansApi } from "@/api/subscriptionPlans";
import type { PlanSettingsMap } from "@/types/planSettings.types";

export function useSubscriptionPlans() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["subscription-plans"],
    queryFn:  subscriptionPlansApi.getSettings,
  });

  const updateMutation = useMutation({
    mutationFn: (data: PlanSettingsMap) => subscriptionPlansApi.updateSettings(data),
    onSuccess: (fresh) => {
      // Populate the cache directly with the response so we skip a refetch
      queryClient.setQueryData(["subscription-plans"], fresh);
    },
  });

  const changeDealerPlan = useMutation({
    mutationFn: ({ dealerId, plan }: { dealerId: number; plan: string }) =>
      subscriptionPlansApi.changeDealerPlan(dealerId, plan),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dealers"] });
      queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
    },
  });

  return {
    settings,
    isLoading,
    updateSettings:   updateMutation.mutateAsync,
    changeDealerPlan: changeDealerPlan.mutateAsync,
    isUpdating:       updateMutation.isPending,
    isChangingPlan:   changeDealerPlan.isPending,
  };
}