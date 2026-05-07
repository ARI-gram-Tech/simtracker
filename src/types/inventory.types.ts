export type SIMStatus =
  | "in_stock"
  | "issued"
  | "registered"
  | "activated"
  | "returned"
  | "fraud_flagged"
  | "replaced";

export type MovementType =
  | "receive"
  | "issue"
  | "return"
  | "transfer"
  | "flag"
  | "replace"
  | "register";
  
export interface BulkRegisterRequest {
  serial_numbers: string[];
  notes?: string;
}

export interface SIMBatch {
  id: number;
  batch_number: string;
  quantity: number;
  received_by: number;
  branch: number;
  received_at: string;
  notes: string;
}

export interface SIMHolderDetails {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: string;
}

export interface SIMBranchDetails {
  id: number;
  name: string;
  phone: string;
  address: string;
  is_active: boolean;
}

export interface SIMVanTeamDetails {
  id: number;
  name: string;
}

export interface SIM {
  id: number;
  serial_number: string;
  batch: number;
  status: SIMStatus;
  current_holder: number | null;
  current_holder_details: SIMHolderDetails | null;
  branch: number | null;
  branch_details: SIMBranchDetails | null;
  van_team: number | null;
  van_team_details: SIMVanTeamDetails | null;
  created_at: string;
  updated_at: string;
}

export interface SIMMovement {
  id: number;
  sim: { id: number; serial_number: string } | null;
  movement_type: MovementType;
  from_user: { id: number; full_name: string } | null;
  to_user: { id: number; full_name: string } | null;
  from_branch: { id: number; name: string } | null;
  to_branch: { id: number; name: string } | null;
  van_team: number | null;
  notes: string;
  created_at: string;
  created_by: { id: number; full_name: string } | null;
}

export interface CreateSIMBatchRequest {
  batch_number: string;
  quantity: number;
  branch: number;
  serial_start: string;
  serial_end: string;
  notes?: string;
}

export interface BulkIssueRequest {
  serial_numbers: string[];
  to_user: number;
  to_branch?: number;
  van_team?: number;
  notes?: string;
}

export interface BulkReturnRequest {
  serial_numbers: string[];
  from_user?: number;
  from_branch?: number;
  van_team?: number;
  notes?: string;
}

export interface SIMFilterParams {
  status?:    SIMStatus;
  branch?:    number;
  holder?:    number;
  search?:    string;
  page?:      number;
  page_size?: number;
  van_team?:  number;
  from_branch?: number;
}

export interface PaginatedSIMResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: SIM[];
}

// ── SIM Trace ─────────────────────────────────────────────────────────────────

export interface TraceMovement {
  id: number;
  movement_type: MovementType;
  from_user:   { id: number; full_name: string } | null;
  to_user:     { id: number; full_name: string } | null;
  from_branch: { id: number; name: string } | null;
  to_branch:   { id: number; name: string } | null;
  notes: string;
  created_at: string;
  created_by: string | null;
}

export interface TraceReconRecord {
  id: number;
  report_id: number;
  period_start: string | null;
  period_end:   string | null;
  result: string;
  topup_amount: string;
  topup_date: string | null;
  agent_msisdn: string;
  ba_msisdn: string;
  fraud_flag: string;
  rejection_reason: string;
  identified_ba: { id: number; full_name: string; phone: string } | null;
  commission_amount: string;
}

export interface TraceVerdict {
  status: "payable" | "fraud" | "rejected" | "dispute" | "unmatched" | "foreign" | "not_reported" | "pending" | "in_stock" | "unknown";
  badge: "success" | "danger" | "warning" | "info" | "neutral";
  summary: string;
  detail: string;
  commission_payable: boolean;
  commission_amount?: string;
}

export interface SIMTrace {
  sim: {
    serial_number: string;
    status: SIMStatus;
    current_holder: { id: number; full_name: string; phone: string; role: string } | null;
    branch: { id: number; name: string } | null;
    created_at: string;
    batch_number: string | null;
  };
  movements: TraceMovement[];
  reconciliation_records: TraceReconRecord[];
  verdict: TraceVerdict;
}