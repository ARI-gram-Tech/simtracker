// src/api/commissions.service.ts
import api from "@/lib/api";
import { ENDPOINTS } from "@/constants/endpoints";
import type {
  CommissionRule, CommissionCycle, CommissionRecord, PayoutRecord,
  CreateCommissionRuleRequest, UpdateCommissionRuleRequest,
  CreateCommissionCycleRequest,
  CreateCommissionRecordRequest, ApproveCommissionRequest,
  CreatePayoutRequest, CommissionRecordFilterParams,
  DeductionRule, BASimBreakdownResponse, CycleAvailableReport
} from "@/types/commissions.types";

export const commissionsService = {
  // ── Rules ──────────────────────────────────────────────────────────────────
  listRules: (dealerId?: number) =>
    api.get<{ count: number; results: CommissionRule[] }>(ENDPOINTS.COMMISSION_RULES, {
      params: dealerId ? { dealer: dealerId } : undefined,
    }).then(r => {
      // Handle both paginated and plain array responses
      const data = r.data as unknown;
      if (Array.isArray(data)) return data as CommissionRule[];
      return (data as { results: CommissionRule[] }).results ?? [];
    }),

  createRule: (data: CreateCommissionRuleRequest) =>
    api.post<CommissionRule>(ENDPOINTS.COMMISSION_RULES, data).then(r => r.data),

  updateRule: (id: number, data: Partial<UpdateCommissionRuleRequest>) =>
    api.patch<CommissionRule>(`${ENDPOINTS.COMMISSION_RULES}${id}/`, data).then(r => r.data),

  deleteRule: (id: number) =>
    api.delete(`${ENDPOINTS.COMMISSION_RULES}${id}/`),

  listDeductionRules: (dealerId?: number) =>
    api.get(ENDPOINTS.DEDUCTION_RULES, {
      params: dealerId ? { dealer: dealerId } : {},
    }).then(r => {
      const data = r.data;
      return Array.isArray(data) ? data : (data?.results ?? []);
    }),

  createDeductionRule: (data: Partial<DeductionRule>) =>
    api.post(ENDPOINTS.DEDUCTION_RULES, data).then(r => r.data),

  updateDeductionRule: (id: number, data: Partial<DeductionRule>) =>
    api.patch(ENDPOINTS.DEDUCTION_RULE(id), data).then(r => r.data),

  deleteDeductionRule: (id: number) =>
    api.delete(ENDPOINTS.DEDUCTION_RULE(id)).then(r => r.data),

  // ── Cycles ─────────────────────────────────────────────────────────────────
  listCycles: (dealerId?: number) =>
    api.get<{ count: number; results: CommissionCycle[] }>(ENDPOINTS.COMMISSION_CYCLES, {
      params: dealerId ? { dealer: dealerId } : undefined,
    }).then(r => {
      const data = r.data as unknown;
      if (Array.isArray(data)) return data as CommissionCycle[];
      return (data as { results: CommissionCycle[] }).results ?? [];
    }),

  getCycle: (id: number) =>
    api.get<CommissionCycle>(`${ENDPOINTS.COMMISSION_CYCLES}${id}/`).then(r => r.data),

  createCycle: (data: CreateCommissionCycleRequest) =>
    api.post<CommissionCycle>(ENDPOINTS.COMMISSION_CYCLES, data).then(r => r.data),

  closeCycle: (id: number) =>
    api.post(`${ENDPOINTS.COMMISSION_CYCLES}${id}/close/`).then(r => r.data),

  // ── Records ────────────────────────────────────────────────────────────────
  listRecords: (params?: CommissionRecordFilterParams) =>
    api.get<{ count: number; next: string | null; previous: string | null; results: CommissionRecord[] }>(
      ENDPOINTS.COMMISSION_RECORDS, { params }
    ).then(r => r.data),
    
  getRecord: (id: number) =>
    api.get<CommissionRecord>(`${ENDPOINTS.COMMISSION_RECORDS}${id}/`).then(r => r.data),

  createRecord: (data: CreateCommissionRecordRequest) =>
    api.post<CommissionRecord>(ENDPOINTS.COMMISSION_RECORDS, data).then(r => r.data),

  approveRecord: (id: number, data?: ApproveCommissionRequest) =>
    api.post<CommissionRecord>(ENDPOINTS.APPROVE_COMMISSION(id), data ?? {}).then(r => r.data),

  rejectRecord: (id: number, data?: ApproveCommissionRequest) =>
    api.post<CommissionRecord>(ENDPOINTS.REJECT_COMMISSION(id), data ?? {}).then(r => r.data),

  // ── Payouts ────────────────────────────────────────────────────────────────
  listPayouts: () =>
    api.get<PayoutRecord[] | { results: PayoutRecord[] }>(ENDPOINTS.PAYOUTS).then(r => {
      const data = r.data as unknown;
      if (Array.isArray(data)) return data as PayoutRecord[];
      return (data as { results: PayoutRecord[] }).results ?? [];
    }),

  listAgentApprovedDeductions: (agentId: number) =>
    api.get(ENDPOINTS.DEDUCTION_RECORDS, {
      params: { agent: agentId, status: "approved" },
    }).then(r => {
      const data = r.data;
      return Array.isArray(data) ? data : (data?.results ?? []);
    }),
    
  listPayoutsByRecord: (commissionRecordId: number) =>
    api.get<PayoutRecord[] | { results: PayoutRecord[] }>(ENDPOINTS.PAYOUTS, {
      params: { commission_record: commissionRecordId },
    }).then(r => {
      const data = r.data as unknown;
      if (Array.isArray(data)) return data as PayoutRecord[];
      return (data as { results: PayoutRecord[] }).results ?? [];
    }),

  createPayout: (data: CreatePayoutRequest) =>
    api.post<PayoutRecord>(ENDPOINTS.PAYOUTS, data).then(r => r.data),

  getBASimBreakdown: (params: { ba_id: number; start_date?: string; end_date?: string }) =>
    api.get<BASimBreakdownResponse>(ENDPOINTS.BA_SIM_BREAKDOWN, { params }).then(r => r.data),

  getAvailableReportsForCycle: (cycleId: number) =>
    api.get<CycleAvailableReport[]>(ENDPOINTS.CYCLE_AVAILABLE_REPORTS(cycleId)).then(r => r.data),

  generateCycleRecords: (cycleId: number, reportIds: number[]) =>
    api.post(ENDPOINTS.GENERATE_CYCLE_RECORDS(cycleId), { report_ids: reportIds }).then(r => r.data),
};

