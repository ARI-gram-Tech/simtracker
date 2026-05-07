import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usersService } from "@/api/users.service";
import type { UserProfile, RegisterRequest } from "@/types/auth.types";
import type { PaginatedResponse } from "@/types/dealers.types";

export function useUsers(params?: { role?: string; search?: string; dealer_id?: number }) {
  return useQuery<PaginatedResponse<UserProfile>>({
    queryKey: ["users", params],
    queryFn: () => usersService.listUsers(params),
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: RegisterRequest & { dealer_id?: number }) =>
      usersService.createUser(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["branches"] });  // ← so manager_details refreshes
      qc.invalidateQueries({ queryKey: ["vanTeams"] });  // ← so leader_details refreshes
    },
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<UserProfile> }) =>
      usersService.updateUser(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => usersService.deleteUser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useDeactivateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => usersService.deactivateUser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useActivateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => usersService.activateUser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}