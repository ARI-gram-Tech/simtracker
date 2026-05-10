// src/hooks/useInventory.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { inventoryService } from "@/api/inventory.service";
import type {
  CreateSIMBatchRequest, BulkIssueRequest,
  BulkReturnRequest, SIMFilterParams,
  BulkRegisterRequest,
} from "@/types/inventory.types";
import type { UpdateSIMRequest } from "@/api/inventory.service";

export function useSIMBatches() {
  return useQuery({
    queryKey: ["simBatches"],
    queryFn: inventoryService.listBatches,
  });
}

export function useCreateSIMBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSIMBatchRequest) => inventoryService.createBatch(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["simBatches"] });
      qc.invalidateQueries({ queryKey: ["sims"] });
    },
  });
}

export function useSIMs(params?: SIMFilterParams) {
  return useQuery({
    queryKey: ["sims", params],
    queryFn: () => inventoryService.listSIMs(params),
  });
}

export function useSIM(serial: string) {
  return useQuery({
    queryKey: ["sim", serial],
    queryFn: () => inventoryService.getSIM(serial),
    enabled: !!serial,
  });
}

export function useAllSIMMovements(params?: { movement_type?: string; date?: string; from_branch?: number; from_user?: number }) {
  return useQuery({
    queryKey: ["simMovementsAll", params],
    queryFn: () => inventoryService.listAllMovements(params),
  });
}

export function useSIMMovements(serial?: string) {
  return useQuery({
    queryKey: ["simMovements", serial],
    queryFn: () => inventoryService.listMovements(serial!),
    enabled: !!serial,
  });
}

export function useBulkIssueSIMs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: BulkIssueRequest) => inventoryService.bulkIssue(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sims"] });
      qc.invalidateQueries({ queryKey: ["simMovements"] });
    },
  });
}

export function useResolveLost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: import("@/types/inventory.types").ResolveLostRequest) =>
      inventoryService.resolveLost(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sims"] });
      qc.invalidateQueries({ queryKey: ["simMovements"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useResolveRegister() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: import("@/types/inventory.types").ResolveRegisterRequest) =>
      inventoryService.resolveRegister(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sims"] });
      qc.invalidateQueries({ queryKey: ["simMovements"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useResolveFaulty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: import("@/types/inventory.types").ResolveFaultyRequest) =>
      inventoryService.resolveFaulty(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sims"] });
      qc.invalidateQueries({ queryKey: ["simMovements"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useBulkReturnSIMs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: BulkReturnRequest) => inventoryService.bulkReturn(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sims"] });
      qc.invalidateQueries({ queryKey: ["simMovements"] });
    },
  });
}

export function useRegisterSIMs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: BulkRegisterRequest) => inventoryService.bulkRegister(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sims"] });
      qc.invalidateQueries({ queryKey: ["simMovements"] });
    },
  });
}

export function useSIMTrace(serial: string | null) {
  return useQuery({
    queryKey: ["simTrace", serial],
    queryFn: () => inventoryService.traceSIM(serial!),
    enabled: !!serial,
    staleTime: 30_000,
  });
}

// ── Edit / Delete ─────────────────────────────────────────────────────────────

export function useUpdateSIM() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ serial, data }: { serial: string; data: UpdateSIMRequest }) =>
      inventoryService.updateSIM(serial, data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["sims"] });
      qc.invalidateQueries({ queryKey: ["sim", vars.serial] });
    },
  });
}

export function useDeleteSIM() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (serial: string) => inventoryService.deleteSIM(serial),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sims"] });
    },
  });
}

export function useBulkDeleteSIMs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (serialNumbers: string[]) => inventoryService.bulkDeleteSIMs(serialNumbers),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sims"] });
    },
  });
}