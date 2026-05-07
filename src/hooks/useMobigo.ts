// src/hooks/useMobigo.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dealersService } from "@/api/dealers.service";
import type { CreateMobiGoRequest, MobiGo } from "@/types/dealers.types";

const QUERY_KEY = "mobigos";

// ── List all MobiGos for a dealer ────────────────────────────────────────────
export function useMobiGos(dealerId?: number) {
  return useQuery({
    queryKey: [QUERY_KEY, dealerId],
    queryFn:  () => dealersService.listMobiGos(dealerId!),
    enabled:  !!dealerId,
    select: (data: MobiGo[] | { results: MobiGo[] }) =>
      Array.isArray(data) ? data : (data as { results: MobiGo[] }).results ?? [],
  });
}

// ── Create a new MobiGo ──────────────────────────────────────────────────────
export function useCreateMobiGo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      dealerId,
      data,
    }: {
      dealerId: number;
      data: CreateMobiGoRequest;
    }) => dealersService.createMobiGo(dealerId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}

// ── Update a MobiGo ──────────────────────────────────────────────────────────
export function useUpdateMobiGo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      dealerId,
      mobigoId,
      data,
    }: {
      dealerId:  number;
      mobigoId:  number;
      data:      Partial<CreateMobiGoRequest>;
    }) => dealersService.updateMobiGo(dealerId, mobigoId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}

// ── Deactivate a MobiGo ──────────────────────────────────────────────────────
export function useDeactivateMobiGo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      dealerId,
      mobigoId,
    }: {
      dealerId: number;
      mobigoId: number;
    }) => dealersService.deactivateMobiGo(dealerId, mobigoId),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}

// ── Activate a MobiGo ────────────────────────────────────────────────────────
export function useActivateMobiGo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      dealerId,
      mobigoId,
    }: {
      dealerId: number;
      mobigoId: number;
    }) => dealersService.activateMobiGo(dealerId, mobigoId),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}

// ── Delete a MobiGo ──────────────────────────────────────────────────────────
export function useDeleteMobiGo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      dealerId,
      mobigoId,
    }: {
      dealerId: number;
      mobigoId: number;
    }) => dealersService.deleteMobiGo(dealerId, mobigoId),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}