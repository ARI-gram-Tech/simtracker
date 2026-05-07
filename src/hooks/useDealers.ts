import { useQuery, useQueries, useMutation, useQueryClient } from "@tanstack/react-query";
import { dealersService } from "@/api/dealers.service";
import { usageService } from "@/api/dealers.service";
import type { DealerUsage } from "@/types/planSettings.types";
import type {
  CreateDealerRequest, CreateBranchRequest,
  CreateVanTeamRequest, AddVanTeamMemberRequest,
  PaginatedResponse, Dealer,
  Branch, VanTeam,
} from "@/types/dealers.types";

// ── Dealers ──────────────────────────────────────────────
export function useDealers() {
  return useQuery<PaginatedResponse<Dealer>>({
    queryKey: ["dealers"],
    queryFn: dealersService.listDealers,
  });
}

export function useDealer(id: number) {
  return useQuery({
    queryKey: ["dealers", id],
    queryFn: () => dealersService.getDealer(id),
    enabled: !!id,
  });
}

export function useCreateDealer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateDealerRequest) => dealersService.createDealer(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dealers"] }),
  });
}

export function useUpdateDealer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateDealerRequest> }) =>
      dealersService.updateDealer(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dealers"] }),
  });
}

export function useSuspendDealer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => dealersService.suspendDealer(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dealers"] }),
  });
}

export function useActivateDealer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => dealersService.activateDealer(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dealers"] }),
  });
}

export function useDeleteDealer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => dealersService.deleteDealer(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dealers"] }),
  });
}

// ── Branches ─────────────────────────────────────────────
export function useBranches(dealerId?: number) {
  return useQuery({
    queryKey: ["branches", dealerId],
    queryFn: () => dealersService.listBranches(dealerId!),
    enabled: !!dealerId,
    select: (data: Branch[] | PaginatedResponse<Branch>) =>
      Array.isArray(data) ? data : (data as PaginatedResponse<Branch>).results ?? [],
  });
}

export function useBranch(dealerId?: number, branchId?: number) {
  return useQuery({
    queryKey: ["branch", dealerId, branchId],
    queryFn: () => dealersService.getBranch(dealerId!, branchId!),
    enabled: !!dealerId && !!branchId,
  });
}

export function useCreateBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ dealerId, data }: { dealerId: number; data: CreateBranchRequest }) =>
      dealersService.createBranch(dealerId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["branches"] }),
  });
}

export function useUpdateBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      dealerId,
      branchId,
      data,
    }: {
      dealerId: number;
      branchId: number;
      data: Partial<CreateBranchRequest> & { manager?: number };  // ← manager field added
    }) =>
      dealersService.updateBranch(dealerId, branchId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["branches"] }),
  });
}

// ── Branch activate / deactivate / delete ────────────────────────────────────
export function useDeactivateBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ dealerId, branchId }: { dealerId: number; branchId: number }) =>
      dealersService.deactivateBranch(dealerId, branchId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["branches"] }),
  });
}

export function useActivateBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ dealerId, branchId }: { dealerId: number; branchId: number }) =>
      dealersService.activateBranch(dealerId, branchId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["branches"] }),
  });
}

export function useDeleteBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ dealerId, branchId }: { dealerId: number; branchId: number }) =>
      dealersService.deleteBranch(dealerId, branchId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["branches"] }),
  });
}

// ── Van Teams ─────────────────────────────────────────────
export function useVanTeams(dealerId?: number, branchId?: number) {
  return useQuery({
    queryKey: ["vanTeams", dealerId, branchId],
    queryFn: () => dealersService.listVanTeams(dealerId!, branchId!),
    enabled: !!dealerId && !!branchId,
    select: (data: VanTeam[] | PaginatedResponse<VanTeam>) =>
      Array.isArray(data) ? data : (data as PaginatedResponse<VanTeam>).results ?? [],
  });
}

export function useCreateVanTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      dealerId,
      branchId,
      data,
    }: {
      dealerId: number;
      branchId: number;
      data: CreateVanTeamRequest;
    }) =>
      dealersService.createVanTeam(dealerId, branchId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vanTeams"] }),
  });
}

export function useUpdateVanTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      dealerId, branchId, teamId, data,
    }: {
      dealerId: number;
      branchId: number;
      teamId: number;
      data: Partial<CreateVanTeamRequest>;
    }) => dealersService.updateVanTeam(dealerId, branchId, teamId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vanTeams"] });  // ← existing
      qc.invalidateQueries({ queryKey: ["branches"] });  // ← added so branch tab stays fresh
    },
  });
}

export function useAddVanTeamMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      dealerId,
      branchId,
      teamId,
      data,
    }: {
      dealerId: number;
      branchId: number;
      teamId: number;
      data: AddVanTeamMemberRequest;
    }) =>
      dealersService.addMember(dealerId, branchId, teamId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vanTeams"] }),
  });
}

export function useRemoveVanTeamMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      dealerId,
      branchId,
      teamId,
      memberId,
    }: {
      dealerId: number;
      branchId: number;
      teamId: number;
      memberId: number;
    }) =>
      dealersService.removeMember(dealerId, branchId, teamId, memberId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vanTeams"] }),
  });
}

export function useAllVanTeams(dealerId?: number, branches: Branch[] = []) {
  const results = useQueries({
    queries: branches.map(b => ({
      queryKey: ["vanTeams", dealerId, b.id],
      queryFn: () => dealersService.listVanTeams(dealerId!, b.id),
      enabled: !!dealerId && !!b.id,
      select: (data: VanTeam[] | PaginatedResponse<VanTeam>) =>
        Array.isArray(data) ? data : (data as PaginatedResponse<VanTeam>).results ?? [],
    })),
  });

  const isLoading = results.some(r => r.isLoading);
  const allVanTeams = results.flatMap(r => r.data ?? []);

  return { data: allVanTeams, isLoading };
}

// ── Van Team activate / deactivate / delete ───────────────────────────────────
export function useDeactivateVanTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ dealerId, branchId, teamId }: { dealerId: number; branchId: number; teamId: number }) =>
      dealersService.deactivateVanTeam(dealerId, branchId, teamId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vanTeams"] }),
  });
}

export function useActivateVanTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ dealerId, branchId, teamId }: { dealerId: number; branchId: number; teamId: number }) =>
      dealersService.activateVanTeam(dealerId, branchId, teamId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vanTeams"] }),
  });
}

export function useDeleteVanTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ dealerId, branchId, teamId }: { dealerId: number; branchId: number; teamId: number }) =>
      dealersService.deleteVanTeam(dealerId, branchId, teamId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vanTeams"] }),
  });
}

export function useDealerUsage(dealerId: number | undefined) {
  return useQuery<DealerUsage>({
    queryKey:  ["dealer-usage", dealerId],
    queryFn:   () => usageService.getDealerUsage(dealerId!),
    enabled:   !!dealerId,
    refetchInterval: 60_000,
  });
}