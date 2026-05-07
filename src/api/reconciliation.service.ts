import api from "@/lib/api";
import { ENDPOINTS } from "@/constants/endpoints";
import type {
  SafaricomReport, SafaricomReportWithRecords,
  ReconciliationRecord, UploadReportRequest,
  RecordFilterParams, ProcessReportResponse,
  FraudSummary,
} from "@/types/reconciliation.types";

type Paginated<T> = { results: T };

const unwrap = <T>(data: T | Paginated<T>): T =>
  Array.isArray(data) ? data : (data as Paginated<T>).results ?? (data as T);

export const reconciliationService = {
  listReports: () =>
    api.get<SafaricomReport[]>(ENDPOINTS.REPORTS)
      .then(r => unwrap(r.data)),

  getReport: (id: number) =>
    api.get<SafaricomReportWithRecords>(ENDPOINTS.REPORT(id)).then(r => r.data),

  uploadReport: (data: UploadReportRequest) => {
    const form = new FormData();
    form.append("file", data.file);
    if (data.branch)         form.append("branch",       String(data.branch));
    if (data.notes)          form.append("notes",        data.notes);
    if (data.period_start)   form.append("period_start", data.period_start);
    if (data.period_end)     form.append("period_end",   data.period_end);
    if (data.column_mapping) {
      Object.entries(data.column_mapping).forEach(([key, val]) => {
        form.append(`column_mapping_${key}`, val);
      });
    }
    return api.post<SafaricomReport>(ENDPOINTS.REPORTS, form, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then(r => r.data);
  },

  resetReport: (id: number) =>
  api.post<{ detail: string }>(ENDPOINTS.RESET_REPORT(id), {}).then(r => r.data),

  processReport: (id: number) =>
    api.post<ProcessReportResponse>(ENDPOINTS.PROCESS_REPORT(id), {}).then(r => r.data),

  listRecords: (reportId: number, params?: RecordFilterParams) =>
    api.get<ReconciliationRecord[]>(ENDPOINTS.REPORT_RECORDS(reportId), { params })
      .then(r => unwrap(r.data)),

  getFraudSummary: () =>
    api.get<FraudSummary>(ENDPOINTS.FRAUD_SUMMARY).then(r => r.data),

  getMyHistory: () =>
    api.get(ENDPOINTS.MY_RECON_HISTORY).then(r => r.data),

  raiseComplaint: (data: { serial_number: string; record_id: number; message: string }) =>
    api.post(ENDPOINTS.RAISE_COMPLAINT, data).then(r => r.data),
};