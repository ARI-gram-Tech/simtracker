import api from "@/lib/api";
import { ENDPOINTS } from "@/constants/endpoints";
import type {
  ExternalAgent,
  CreateExternalAgentRequest,
  PaginatedResponse,
} from "@/types/dealers.types";

export const externalAgentsService = {
  list: (dealerId: number) =>
    api
      .get<PaginatedResponse<ExternalAgent>>(ENDPOINTS.EXTERNAL_AGENTS(dealerId))
      .then((r) => r.data),

  create: (dealerId: number, data: CreateExternalAgentRequest) =>
    api
      .post<ExternalAgent>(ENDPOINTS.EXTERNAL_AGENTS(dealerId), data)
      .then((r) => r.data),

  update: (dealerId: number, agentId: number, data: Partial<CreateExternalAgentRequest>) =>
    api
      .patch<ExternalAgent>(ENDPOINTS.EXTERNAL_AGENT_DETAIL(dealerId, agentId), data)
      .then((r) => r.data),

  delete: (dealerId: number, agentId: number) =>
    api.delete(ENDPOINTS.EXTERNAL_AGENT_DETAIL(dealerId, agentId)),
};