import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { externalAgentsService } from "@/api/external-agents.service";
import type { CreateExternalAgentRequest } from "@/types/dealers.types";

export function useExternalAgents(dealerId: number | undefined) {
  return useQuery({
    queryKey: ["externalAgents", dealerId],
    queryFn: () => externalAgentsService.list(dealerId!),
    enabled: !!dealerId,
  });
}

export function useCreateExternalAgent(dealerId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateExternalAgentRequest) =>
      externalAgentsService.create(dealerId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["externalAgents", dealerId] });
      qc.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useUpdateExternalAgent(dealerId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ agentId, data }: { agentId: number; data: Partial<CreateExternalAgentRequest> }) =>
      externalAgentsService.update(dealerId, agentId, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["externalAgents", dealerId] }),
  });
}

export function useDeleteExternalAgent(dealerId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (agentId: number) =>
      externalAgentsService.delete(dealerId, agentId),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["externalAgents", dealerId] }),
  });
}