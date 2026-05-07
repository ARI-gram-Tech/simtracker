export interface LiveKPIs {
  in_field:             number;
  registered:           number;
  confirmed:            number;
  pending:              number;
  fraud:                number;
  in_stock:             number;
  estimated_commission: number;
  confirmed_commission: number;
  last_recon_date:      string | null;
}

export interface LiveBAItem {
  id:            number;
  name:          string;
  branch_id:     number | null;
  branch_name:   string;
  van_team_id:   number | null;
  van_team_name: string;
  sims_in_field: number;
  registered:    number;
  confirmed:     number;
  fraud_flags:   number;
  commission:    number;
}

export interface LiveBranchItem {
  id:            number;
  name:          string;
  van_count:     number;
  sims_in_field: number;
  registered:    number;
  confirmed:     number;
  fraud_flags:   number;
  commission:    number;
}

export interface LiveVanItem {
  id:            number;
  name:          string;
  branch_name:   string;
  sims_in_field: number;
  registered:    number;
  confirmed:     number;
  fraud_flags:   number;
  commission:    number;
}

export interface LiveTrendPoint {
  label:      string;
  date:       string;
  registered: number;
  confirmed:  number;
}

export interface LivePerformanceSummary {
  kpis:      LiveKPIs;
  by_ba:     LiveBAItem[];
  by_branch: LiveBranchItem[];
  by_van:    LiveVanItem[];
  trend:     LiveTrendPoint[];
}

// ── Existing snapshot types (for the snapshot endpoints) ─────────────────────

export interface DailyPerformanceSnapshot {
  id:               number;
  date:             string;
  dealer:           number;
  dealer_name:      string;
  branch:           number | null;
  branch_name:      string | null;
  agent:            number | null;
  agent_name:       string | null;
  sims_issued:      number;
  sims_returned:    number;
  sims_registered:  number;
  sims_fraud:       number;
  created_at:       string;
}

export interface DailyPerformanceFilterParams {
  date?:    string;
  branch?:  number;
  agent?:   number;
  dealer?:  number;
}

export interface WeeklySummaryItem {
  date:             string;
  total_issued:     number;
  total_returned:   number;
  total_registered: number;
  total_fraud:      number;
}

export interface AgentPerformanceSummaryItem {
  agent:              number;
  agent__first_name:  string;
  agent__last_name:   string;
  total_issued:       number;
  total_returned:     number;
  total_registered:   number;
  total_fraud:        number;
}

export interface CreateDailySnapshotRequest {
  date:          string;
  dealer:        number;
  branch?:       number;
  agent?:        number;
  sims_issued:   number;
  sims_returned: number;
  sims_registered: number;
  sims_fraud:    number;
}