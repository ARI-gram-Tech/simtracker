// src/hooks/useCommissions.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { commissionsService } from "@/api/commissions.service";
import type {
  CreateCommissionRuleRequest, UpdateCommissionRuleRequest,
  CreateCommissionCycleRequest,
  CreateCommissionRecordRequest, ApproveCommissionRequest,
  CreatePayoutRequest, CommissionRecordFilterParams,
  CommissionRecord, PaginatedResponse,
  DeductionRule
} from "@/types/commissions.types";

// ── Rules ────────────────────────────────────────────────────────────────────

export function useCommissionRules(dealerId?: number) {
  return useQuery({
    queryKey: ["commissionRules", dealerId],
    queryFn:  () => commissionsService.listRules(dealerId),
    enabled:  !!dealerId,
  });
}

export function useCreateCommissionRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCommissionRuleRequest) => commissionsService.createRule(data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["commissionRules"] }),
  });
}

export function useUpdateCommissionRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateCommissionRuleRequest }) =>
      commissionsService.updateRule(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["commissionRules"] }),
  });
}

export function useToggleCommissionRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      commissionsService.updateRule(id, { is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["commissionRules"] }),
  });
}

export function useDeleteCommissionRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => commissionsService.deleteRule(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["commissionRules"] }),
  });
}

// ── Cycles ───────────────────────────────────────────────────────────────────

export function useCommissionCycles(dealerId?: number) {
  return useQuery({
    queryKey: ["commissionCycles", dealerId],
    queryFn:  () => commissionsService.listCycles(dealerId),
    enabled:  !!dealerId,
  });
}

export function useCommissionCycle(id: number) {
  return useQuery({
    queryKey: ["commissionCycle", id],
    queryFn:  () => commissionsService.getCycle(id),
    enabled:  !!id,
  });
}

export function useCreateCommissionCycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCommissionCycleRequest) => commissionsService.createCycle(data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["commissionCycles"] }),
  });
}

export function useCloseCycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => commissionsService.closeCycle(id),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ["commissionCycles"] });
      qc.invalidateQueries({ queryKey: ["commissionRecords"] });
    },
  });
}

// ── Records ──────────────────────────────────────────────────────────────────

export function useCommissionRecords(params?: CommissionRecordFilterParams) {
  return useQuery<PaginatedResponse<CommissionRecord>>({
    queryKey: ["commissionRecords", params],
    queryFn:  () => commissionsService.listRecords(params),
  });
}

export function useCreateCommissionRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCommissionRecordRequest) => commissionsService.createRecord(data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["commissionRecords"] }),
  });
}

export function useApproveCommissionRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data?: ApproveCommissionRequest }) =>
      commissionsService.approveRecord(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["commissionRecords"] }),
  });
}

export function useRejectCommissionRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data?: ApproveCommissionRequest }) =>
      commissionsService.rejectRecord(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["commissionRecords"] }),
  });
}

// ── Payouts ──────────────────────────────────────────────────────────────────

export function usePayouts() {
  return useQuery({
    queryKey: ["payouts"],
    queryFn:  commissionsService.listPayouts,
  });
}

export function useCreatePayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePayoutRequest) => commissionsService.createPayout(data),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ["payouts"] });
      qc.invalidateQueries({ queryKey: ["commissionRecords"] });
    },
  });
}

export function usePayoutByRecord(commissionRecordId?: number) {
  return useQuery({
    queryKey: ["payoutByRecord", commissionRecordId],
    queryFn:  () => commissionsService.listPayoutsByRecord(commissionRecordId!),
    enabled:  !!commissionRecordId,
  });
}

export function useDeductionRules(dealerId?: number) {
  return useQuery({
    queryKey: ["deduction-rules", dealerId],
    queryFn: () =>
      commissionsService.listDeductionRules(dealerId),
    enabled: !!dealerId,
  });
}

export function useCreateDeductionRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<DeductionRule>) =>
      commissionsService.createDeductionRule(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["deduction-rules"] }),
  });
}

export function useToggleDeductionRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      commissionsService.updateDeductionRule(id, { is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["deduction-rules"] }),
  });
}

export function useDeleteDeductionRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      commissionsService.deleteDeductionRule(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["deduction-rules"] }),
  });
}

export function useBASimBreakdown(params: { ba_id: number; start_date?: string; end_date?: string } | null) {
  return useQuery({
    queryKey: ["baSimBreakdown", params],
    queryFn: () => commissionsService.getBASimBreakdown(params!),
    enabled: !!params?.ba_id,
    staleTime: 30_000,
  });
}

export function useAgentApprovedDeductions(agentId?: number) {
  return useQuery({
    queryKey: ["agentDeductions", agentId],
    queryFn:  () => commissionsService.listAgentApprovedDeductions(agentId!),
    enabled:  !!agentId,
  });
}

export function useAvailableReportsForCycle(cycleId: number | null) {
  return useQuery({
    queryKey: ["cycleAvailableReports", cycleId],
    queryFn:  () => commissionsService.getAvailableReportsForCycle(cycleId!),
    enabled:  cycleId != null,
  });
}

