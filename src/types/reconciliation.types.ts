export type ReportStatus = "pending" | "processing" | "done" | "failed";
export type ReconciliationSimStatus = "active" | "inactive" | "fraud_flagged";
export type ReconciliationResult = 
  "payable" | "rejected" | "fraud" | "dispute" | 
  "unmatched" | "review" | "ghost_sim";

export interface ColumnMapping {
  serial_number: string;
  ba_msisdn:     string;
  agent_msisdn:  string;
  topup_amount:  string;
  topup_date:    string;
  fraud_flag:    string;
}

export const DEFAULT_COLUMN_MAPPING: ColumnMapping = {
  serial_number: "F",
  ba_msisdn:     "J",
  agent_msisdn:  "I",
  topup_amount:  "H",
  topup_date:    "G",
  fraud_flag:    "P",
};

export interface SafaricomReport {
  id:            number;
  file:          string;
  filename:      string;
  uploaded_by:   number;
  branch:        number | null;
  status:        ReportStatus;
  period_start:  string | null;
  period_end:    string | null;
  column_mapping: ColumnMapping;
  total_records: number;
  matched:       number;
  unmatched:     number;
  fraud_flagged: number;
  uploaded_at:   string;
  processed_at:  string | null;
  notes:         string;
}

export interface SafaricomReportWithRecords extends SafaricomReport {
  records: ReconciliationRecord[];
}

export interface ReconciliationRecord {
  id:                 number;
  report:             number;
  sim:                number | null;
  serial_number:      string;
  ba_msisdn:          string;
  agent_msisdn:       string;
  topup_amount:       string;
  topup_date:         string | null;
  territory:          string;
  cluster:            string;
  sim_status:         ReconciliationSimStatus;
  fraud_flag:         boolean;
  identified_ba:      number | null;
  identified_ba_name: string | null;
  registered_by:      number | null;
  matched:            boolean;
  result:             ReconciliationResult;
  rejection_reason:   string;
  commission_amount:  string;
  created_at:         string;
}

export interface UploadReportRequest {
  file:           File;
  branch?:        number;
  notes?:         string;
  period_start?:  string;
  period_end?:    string;
  column_mapping?: ColumnMapping;
}

export interface RecordFilterParams {
  sim_status?: ReconciliationSimStatus;
  matched?:    boolean;
  result?:     ReconciliationResult;
}

export interface ProcessReportResponse {
  detail:        string;
  total_records: number;
  matched:       number;
  unmatched:     number;
  fraud_flagged: number;
}

// ── Fraud Detection ───────────────────────────────────────────────────────────

export interface FraudIncident {
  id: number;
  type: string;
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  serial_number: string;
  ba_msisdn: string;
  ba_name: string | null;
  report_period: string | null;
  topup_amount: string;
  result: string;
  created_at: string;
}

export interface BARiskScore {
  ba_id: number;
  full_name: string;
  risk_score: number;
  total_sims: number;
  fraud_count: number;
  dispute_count: number;
  rejected_count: number;
}

export interface FraudSummary {
  kpis: {
    fraud_flagged_safaricom: number;
    unknown_ba: number;
    wrong_dealer_sims: number;
    disputed: number;
    agent_eq_ba: number;
  };
  incidents: FraudIncident[];
  ba_risk: BARiskScore[];
}