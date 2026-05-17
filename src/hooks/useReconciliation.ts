// src/hooks/useReconciliation.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { reconciliationService } from "@/api/reconciliation.service";
import type {
  UploadReportRequest,
  RecordFilterParams,
  SafaricomReport,
} from "@/types/reconciliation.types";

export function useReports() {
  return useQuery({
    queryKey: ["reconciliationReports"],
    queryFn: reconciliationService.listReports,
    refetchInterval: (query) => {
      // query.state.data is the actual array
      const data = query.state.data as SafaricomReport[] | undefined;
      const hasProcessing = data?.some(r => r.status === "processing");
      return hasProcessing ? 3000 : false;
    },
  });
}

export function useReport(id: number) {
  return useQuery({
    queryKey: ["reconciliationReports", id],
    queryFn: () => reconciliationService.getReport(id),
    enabled: !!id,
  });
}

export function useUploadReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UploadReportRequest) => reconciliationService.uploadReport(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reconciliationReports"] }),
  });
}

export function useProcessReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => reconciliationService.processReport(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reconciliationReports"] }),
  });
}

export function useReconciliationRecords(reportId: number, params?: RecordFilterParams) {
  return useQuery({
    queryKey: ["reconciliationRecords", reportId, params],
    queryFn: () => reconciliationService.listRecords(reportId, params),
    enabled: !!reportId,
  });
}

export function useResetReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => reconciliationService.resetReport(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reconciliationReports"] }),
  });
}

export function useDeleteReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => reconciliationService.deleteReport(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reconciliationReports"] }),
  });
}

export function useFraudSummary() {
  return useQuery({
    queryKey: ["fraudSummary"],
    queryFn: () => reconciliationService.getFraudSummary(),
    staleTime: 60_000,
  });
}

export function useMyReconHistory() {
  return useQuery({
    queryKey: ["myReconHistory"],
    queryFn: () => reconciliationService.getMyHistory(),
  });
}

export function useRaiseComplaint() {
  return useMutation({
    mutationFn: (data: { serial_number: string; record_id: number; message: string }) =>
      reconciliationService.raiseComplaint(data),
  });
}