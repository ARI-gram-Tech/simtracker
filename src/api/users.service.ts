import api from "@/lib/api";
import { ENDPOINTS } from "@/constants/endpoints";
import type { UserProfile, RegisterRequest } from "@/types/auth.types";
import type { PaginatedResponse } from "@/types/dealers.types";

export const usersService = {
  listUsers: (params?: { role?: string; search?: string; dealer_id?: number }) =>
    api
      .get<PaginatedResponse<UserProfile>>(ENDPOINTS.USERS, { params })
      .then((r) => r.data),

  createUser: (data: RegisterRequest & { dealer_id?: number }) =>
    api.post<UserProfile>(ENDPOINTS.REGISTER, data).then((r) => r.data),

  updateUser: (id: number, data: Partial<UserProfile>) =>
    api.patch<UserProfile>(`${ENDPOINTS.USERS}${id}/`, data).then((r) => r.data),

  deleteUser: (id: number) =>
    api.delete(`${ENDPOINTS.USERS}${id}/`),

  deactivateUser: (id: number) =>
    api.patch<UserProfile>(`${ENDPOINTS.USERS}${id}/`, { is_active: false }).then((r) => r.data),

  activateUser: (id: number) =>
    api.patch<UserProfile>(`${ENDPOINTS.USERS}${id}/`, { is_active: true }).then((r) => r.data),
};