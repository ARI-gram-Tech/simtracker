// src/api/inventory.service.ts
import api from "@/lib/api";
import { ENDPOINTS } from "@/constants/endpoints";
import type {
  SIM, SIMBatch, SIMMovement,
  CreateSIMBatchRequest, BulkIssueRequest,
  BulkReturnRequest, SIMFilterParams,
  PaginatedSIMResponse, BulkRegisterRequest,
  SIMTrace
} from "@/types/inventory.types";

export interface UpdateSIMRequest {
  branch?:         number | null;
  current_holder?: number | null;
  batch?:          number | null;
}

export const inventoryService = {
  listBatches: () =>
    api.get<SIMBatch[]>(ENDPOINTS.SIM_BATCHES).then(r => r.data),

  createBatch: (data: CreateSIMBatchRequest) =>
    api.post<SIMBatch>(ENDPOINTS.SIM_BATCHES, data).then(r => r.data),

  listSIMs: (params?: SIMFilterParams) =>
    api.get<PaginatedSIMResponse>(ENDPOINTS.SIMS, { params }).then(r => r.data),

  getSIM: (serial: string) =>
    api.get<SIM>(ENDPOINTS.SIM(serial)).then(r => r.data),

  // ── Edit (PATCH) ───────────────────────────────────────────────────────────
  updateSIM: (serial: string, data: UpdateSIMRequest) =>
    api.patch<SIM>(ENDPOINTS.SIM(serial), data).then(r => r.data),

  // ── Single delete ──────────────────────────────────────────────────────────
  deleteSIM: (serial: string) =>
    api.delete<{ detail: string }>(ENDPOINTS.SIM(serial)).then(r => r.data),

  // ── Bulk delete ────────────────────────────────────────────────────────────
  bulkDeleteSIMs: (serialNumbers: string[]) =>
    api.delete<{ deleted: number; detail: string; not_found: number }>(
      ENDPOINTS.BULK_DELETE,
      { data: { serial_numbers: serialNumbers } }
    ).then(r => r.data),

  listMovements: (serial: string) =>
    api.get<SIMMovement[]>(ENDPOINTS.SIM_MOVEMENTS(serial)).then(r => r.data),

  bulkIssue: (data: BulkIssueRequest) =>
    api.post<import("@/types/inventory.types").BulkIssueResponse>(ENDPOINTS.BULK_ISSUE, data).then(r => r.data),

  resolveLost: (data: import("@/types/inventory.types").ResolveLostRequest) =>
    api.post<{ lost: number; detail: string; deduction_raised: boolean; deduction_amount: number }>(
      ENDPOINTS.RESOLVE_LOST, data
    ).then(r => r.data),

  resolveRegister: (data: import("@/types/inventory.types").ResolveRegisterRequest) =>
    api.post<{ registered: number; detail: string }>(
      ENDPOINTS.RESOLVE_REGISTER, data
    ).then(r => r.data),

  resolveFaulty: (data: import("@/types/inventory.types").ResolveFaultyRequest) =>
    api.post<{ faulty: number; detail: string }>(
      ENDPOINTS.RESOLVE_FAULTY, data
    ).then(r => r.data),

  bulkReturn: (data: BulkReturnRequest) =>
    api.post<{ detail: string }>(ENDPOINTS.BULK_RETURN, data).then(r => r.data),

  listAllMovements: (params?: { movement_type?: string; date?: string; from_branch?: number; from_user?: number }) =>
    api.get<{ results: SIMMovement[]; count: number }>(ENDPOINTS.SIM_MOVEMENTS_ALL, { params }).then(r => r.data),

  bulkRegister: (data: BulkRegisterRequest) =>
    api.post<{ detail: string; registered: number }>(ENDPOINTS.BULK_REGISTER, data).then(r => r.data),

  traceSIM: (serial: string) =>
    api.get<SIMTrace>(ENDPOINTS.SIM_TRACE(serial)).then(r => r.data),
};