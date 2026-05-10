import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { reportsService } from "@/api/reports.service";
import type {
  DailyPerformanceFilterParams,
  CreateDailySnapshotRequest,
} from "@/types/reports.types";

export function useDailySnapshots(params?: DailyPerformanceFilterParams) {
  return useQuery({
    queryKey: ["dailySnapshots", params],
    queryFn:  () => reportsService.listSnapshots(params),
  });
}

export function useCreateDailySnapshot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateDailySnapshotRequest) => reportsService.createSnapshot(data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["dailySnapshots"] }),
  });
}

export function useWeeklySummary(params?: { branch?: number; dealer?: number }) {
  return useQuery({
    queryKey: ["weeklySummary", params],
    queryFn:  () => reportsService.getWeeklySummary(params),
  });
}

export function useAgentSummary(params?: { branch?: number; dealer?: number }) {
  return useQuery({
    queryKey: ["agentSummary", params],
    queryFn:  () => reportsService.getAgentSummary(params),
  });
}

// ── Live aggregation hook ─────────────────────────────────────────────────────
export function useLivePerformance(params?: { branch?: number; van_team?: number; ba?: number }) {
  return useQuery({
    queryKey: ["livePerformance", params],
    queryFn:  () => reportsService.getLiveSummary(params),
    refetchInterval: 60_000,
    staleTime: 0,          
    refetchOnWindowFocus: true,  
  });
}

export function useDailyByDate(params?: { date?: string; branch?: number; van_team?: number; ba?: number }) {
  return useQuery({
    queryKey: ["dailyByDate", params],
    queryFn:  () => reportsService.getDailyByDate(params),
    staleTime: 30_000,
  });
}

export function useAgentPerformanceLive(params?: { branch?: number }) {
  return useQuery({
    queryKey: ["agentPerformanceLive", params],
    queryFn:  () => reportsService.getAgentPerformanceLive(params),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
}