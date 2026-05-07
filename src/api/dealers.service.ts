import api from "@/lib/api";
import { ENDPOINTS } from "@/constants/endpoints";
import type {
  Dealer, Branch, VanTeam, VanTeamMember,
  CreateDealerRequest, CreateBranchRequest,
  CreateVanTeamRequest, AddVanTeamMemberRequest,
  PaginatedResponse, MobiGo,
  CreateMobiGoRequest,
} from "@/types/dealers.types";
import type { DealerUsage } from "@/types/planSettings.types";

export const dealersService = {
  // Dealers
  listDealers: () =>
    api.get<PaginatedResponse<Dealer>>(ENDPOINTS.DEALERS).then(r => r.data),

  getDealer: (id: number) =>
    api.get<Dealer>(ENDPOINTS.DEALER(id)).then(r => r.data),

  createDealer: (data: CreateDealerRequest) =>
    api.post<Dealer>(ENDPOINTS.DEALERS, data).then(r => r.data),

  updateDealer: (id: number, data: Partial<CreateDealerRequest>) =>
    api.patch<Dealer>(ENDPOINTS.DEALER(id), data).then(r => r.data),

  suspendDealer: (id: number) =>
    api.patch<Dealer>(`${ENDPOINTS.DEALER(id)}suspend/`, {}).then(r => r.data),

  activateDealer: (id: number) =>
    api.patch<Dealer>(`${ENDPOINTS.DEALER(id)}activate/`, {}).then(r => r.data),

  deleteDealer: (id: number) =>
    api.delete(ENDPOINTS.DEALER(id)),

  // MobiGo Devices
  listMobiGos: (dealerId: number) =>
    api.get<{ results: MobiGo[] } | MobiGo[]>(ENDPOINTS.MOBIGOS(dealerId)).then(r => {
      const data = r.data;
      return Array.isArray(data) ? data : (data as { results: MobiGo[] }).results ?? [];
    }),
 
  getMobiGo: (dealerId: number, mobigoId: number) =>
    api.get<MobiGo>(ENDPOINTS.MOBIGO(dealerId, mobigoId)).then(r => r.data),
 
  createMobiGo: (dealerId: number, data: CreateMobiGoRequest) =>
    api.post<MobiGo>(ENDPOINTS.MOBIGOS(dealerId), data).then(r => r.data),
 
  updateMobiGo: (dealerId: number, mobigoId: number, data: Partial<CreateMobiGoRequest>) =>
    api.patch<MobiGo>(ENDPOINTS.MOBIGO(dealerId, mobigoId), data).then(r => r.data),
 
  deactivateMobiGo: (dealerId: number, mobigoId: number) =>
    api.patch<MobiGo>(
      `${ENDPOINTS.MOBIGO(dealerId, mobigoId)}deactivate/`, {}
    ).then(r => r.data),
 
  activateMobiGo: (dealerId: number, mobigoId: number) =>
    api.patch<MobiGo>(
      `${ENDPOINTS.MOBIGO(dealerId, mobigoId)}activate/`, {}
    ).then(r => r.data),
 
  deleteMobiGo: (dealerId: number, mobigoId: number) =>
    api.delete(ENDPOINTS.MOBIGO(dealerId, mobigoId)),

  // Branches
  listBranches: (dealerId: number) =>
    api.get<Branch[]>(ENDPOINTS.BRANCHES(dealerId)).then(r => r.data),

  getBranch: (dealerId: number, branchId: number) =>
    api.get<Branch>(ENDPOINTS.BRANCH(dealerId, branchId)).then(r => r.data),

  createBranch: (dealerId: number, data: CreateBranchRequest) =>
    api.post<Branch>(ENDPOINTS.BRANCHES(dealerId), data).then(r => r.data),

  updateBranch: (dealerId: number, branchId: number, data: Partial<CreateBranchRequest>) =>
    api.patch<Branch>(ENDPOINTS.BRANCH(dealerId, branchId), data).then(r => r.data),

  deactivateBranch: (dealerId: number, branchId: number) =>
    api.patch<Branch>(
      `${ENDPOINTS.BRANCH(dealerId, branchId)}deactivate/`, {}
    ).then(r => r.data),

  activateBranch: (dealerId: number, branchId: number) =>
    api.patch<Branch>(
      `${ENDPOINTS.BRANCH(dealerId, branchId)}activate/`, {}
    ).then(r => r.data),

  deleteBranch: (dealerId: number, branchId: number) =>
    api.delete(ENDPOINTS.BRANCH(dealerId, branchId)),

  // Van Teams
  listVanTeams: (dealerId: number, branchId: number) =>
    api.get<VanTeam[]>(ENDPOINTS.VAN_TEAMS(dealerId, branchId)).then(r => r.data),

  createVanTeam: (dealerId: number, branchId: number, data: CreateVanTeamRequest) =>
    api.post<VanTeam>(ENDPOINTS.VAN_TEAMS(dealerId, branchId), data).then(r => r.data),

  updateVanTeam: (dealerId: number, branchId: number, teamId: number, data: Partial<CreateVanTeamRequest>) =>
    api.patch<VanTeam>(
      `${ENDPOINTS.VAN_TEAMS(dealerId, branchId)}${teamId}/`, data
    ).then(r => r.data),
  deactivateVanTeam: (dealerId: number, branchId: number, teamId: number) =>
  api.patch<VanTeam>(
    `${ENDPOINTS.VAN_TEAMS(dealerId, branchId)}${teamId}/deactivate/`, {}
  ).then(r => r.data),

  activateVanTeam: (dealerId: number, branchId: number, teamId: number) =>
    api.patch<VanTeam>(
      `${ENDPOINTS.VAN_TEAMS(dealerId, branchId)}${teamId}/activate/`, {}
    ).then(r => r.data),

  deleteVanTeam: (dealerId: number, branchId: number, teamId: number) =>
    api.delete(
      `${ENDPOINTS.VAN_TEAMS(dealerId, branchId)}${teamId}/`
    ),
    
  // Van Team Members
  addMember: (dealerId: number, branchId: number, teamId: number, data: AddVanTeamMemberRequest) =>
    api.post<VanTeamMember>(
      `${ENDPOINTS.VAN_TEAMS(dealerId, branchId)}${teamId}/members/`, data
    ).then(r => r.data),

  removeMember: (dealerId: number, branchId: number, teamId: number, memberId: number) =>
    api.delete(`${ENDPOINTS.VAN_TEAMS(dealerId, branchId)}${teamId}/members/${memberId}/`),
};

export const usageService = {
  getDealerUsage: (dealerId: number) =>
    api.get<DealerUsage>(`${ENDPOINTS.DEALER(dealerId)}usage/`).then(r => r.data),
};