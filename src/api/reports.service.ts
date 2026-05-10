import api from "@/lib/api";
import { ENDPOINTS } from "@/constants/endpoints";
import type {
  DailyPerformanceSnapshot,
  DailyPerformanceFilterParams,
  WeeklySummaryItem,
  AgentPerformanceSummaryItem,
  CreateDailySnapshotRequest,
  LivePerformanceSummary,
} from "@/types/reports.types";

export const reportsService = {
  listSnapshots: (params?: DailyPerformanceFilterParams) =>
    api.get<DailyPerformanceSnapshot[]>(ENDPOINTS.DAILY_PERFORMANCE, { params }).then(r => r.data),

  createSnapshot: (data: CreateDailySnapshotRequest) =>
    api.post<DailyPerformanceSnapshot>(ENDPOINTS.DAILY_PERFORMANCE, data).then(r => r.data),

  getWeeklySummary: (params?: { branch?: number; dealer?: number }) =>
    api.get<WeeklySummaryItem[]>(ENDPOINTS.WEEKLY_SUMMARY, { params }).then(r => r.data),

  getAgentSummary: (params?: { branch?: number; dealer?: number }) =>
    api.get<AgentPerformanceSummaryItem[]>(ENDPOINTS.AGENT_SUMMARY, { params }).then(r => r.data),

  // ── Live aggregation (no snapshots needed) ────────────────────────────────
  getLiveSummary: (params?: { branch?: number; van_team?: number; ba?: number }) =>
    api.get<LivePerformanceSummary>(ENDPOINTS.LIVE_PERFORMANCE, { params }).then(r => r.data),

  getDailyByDate: (params?: { date?: string; branch?: number; van_team?: number; ba?: number }) =>
    api.get(ENDPOINTS.DAILY_BY_DATE, { params }).then(r => r.data),

  getAgentPerformanceLive: (params?: { branch?: number }) =>
    api.get(ENDPOINTS.AGENT_PERFORMANCE_LIVE, { params }).then(r => r.data),
};