// src/types/commissions.types.ts
// Aligned to the Django CommissionRule, CommissionCycle, CommissionRecord, PayoutRecord models

export type CommissionCycleStatus = "open" | "closed" | "approved" | "paid";
export type CommissionRecordStatus = "pending" | "approved" | "rejected" | "paid";
export type PayoutMethod = "mpesa" | "bank" | "cash";

// ── Commission Rule ──────────────────────────────────────────────────────────
// Backend fields: dealer, rate_per_active, minimum_topup, effective_from,
//                 effective_to, is_active, created_at
export interface CommissionRule {
  id:              number;
  dealer:          number;
  rate_per_active: string;   // DecimalField → comes as string from DRF
  minimum_topup:   string;   // DecimalField → comes as string from DRF
  effective_from:  string;   // DateField "YYYY-MM-DD"
  effective_to:    string | null;
  is_active:       boolean;
  created_at:      string;
}

// ── Commission Cycle ─────────────────────────────────────────────────────────
export interface CommissionCycle {
  id:         number;
  dealer:     number;
  name:       string;        // e.g. "March 2026"
  start_date: string;
  end_date:   string;
  report:     number | null;
  status:     CommissionCycleStatus;
  created_at: string;
}

// ── Commission Record ────────────────────────────────────────────────────────
export interface CommissionRecord {
  id:           number;
  cycle:        number;
  agent:        number;
  agent_name:   string;      // read-only, from serializer
  branch:       number | null;
  claimed_sims:          number;
  active_sims:           number;
  not_in_report_sims:    number;
  not_in_inventory_sims: number;
  fraud_sims:            number;
  rejected_sims:         number;
  disputed_sims:         number;
  rate_per_sim:          string;
  gross_amount: string;
  deductions:   string;
  net_amount:   string;
  target_sims:  number;
  status:       CommissionRecordStatus;
  approved_by:  number | null;
  approved_at:  string | null;
  notes:        string;
  created_at:   string;
}

// ── Payout Record ────────────────────────────────────────────────────────────
export interface PayoutRecord {
  id:                number;
  commission_record: number;
  agent_name:        string; 
  method:            PayoutMethod;
  transaction_ref:   string;
  amount:            string;
  paid_by:           number;
  paid_at:           string;
  notes:             string;
  payment_method?:   string;
  reference?:        string;
  paid_by_name?:     string;
}
// ── Request types ────────────────────────────────────────────────────────────

export interface CreateCommissionRuleRequest {
  dealer:          number;
  rate_per_active: number;
  minimum_topup?:  number;
  effective_from:  string;
  effective_to?:   string | null;
}

export interface UpdateCommissionRuleRequest {
  rate_per_active?: number;
  minimum_topup?:   number;
  effective_from?:  string;
  effective_to?:    string | null;
  is_active?:       boolean;
}

export interface CreateCommissionCycleRequest {
  dealer:     number;
  name:       string;
  start_date: string;
  end_date:   string;
  report?:    number;
}

export interface CreateCommissionRecordRequest {
  cycle:       number;
  agent:       number;
  branch?:     number;
  active_sims: number;
  rate_per_sim: number;
  deductions?: number;
  target_sims?: number;
}

export interface ApproveCommissionRequest {
  notes?: string;
}

export interface CreatePayoutRequest {
  commission_record: number;
  method:            PayoutMethod;
  transaction_ref?:  string;
  amount:            number;
  notes?:            string;
  payment_method?: string;
  reference?: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface CommissionRecordFilterParams {
  cycle?:    number;
  agent?:    number;
  status?:   CommissionRecordStatus;
  branch?:   number;
  van_team?: number;
}

export interface DeductionRule {
  id:              number;
  dealer:          number;
  name:            string;
  violation_type:  string;
  amount_per_unit: string;
  is_per_day:      boolean;
  threshold_days:  number | null;
  settlement_mode: "commission_deduction" | "standalone";
  is_active:       boolean;
  created_at:      string;
}

export interface BASimRow {
  serial_number:             string;
  current_status:            string;
  recon_result:              string;
  verdict:                   string;
  commission_amount:         number;
  fraud_flag:                boolean;
  ba_msisdn:                 string | null;
  topup_amount:              number;
  issued_at:                 string;
  confirmed_by_report:       { id: number; filename: string; period: string } | null;
  reports_seen_count:        number;
  reports_missed:            number;
  total_reports_in_period:   number;
  overdue:                   boolean;
}

export interface CycleAvailableReport {
  id:              number;
  filename:        string;
  period:          string;
  period_start:    string | null;
  period_end:      string | null;
  total_records:   number;
  matched:         number;
  uploaded_at:     string;
  is_locked:       boolean;
  locked_ba_count: number;
  is_used:         boolean;
}

export interface BASimBreakdownResponse {
  ba_id:                     number;
  ba_name:                   string;
  cycle_name:                string | null;
  period:                    string | null;
  total_issued:              number;
  confirmed:                 number;
  not_in_report:             number;
  rejected:                  number;
  fraud_flagged:             number;
  overdue_count:             number;
  total_reports_in_period:   number;
  reports_seen:              { id: number; filename: string; period: string }[];
  total_commission:          number;
  sims:                      BASimRow[];
}
