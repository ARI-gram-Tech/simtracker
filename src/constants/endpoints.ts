// src/constants/endpoints.ts
const BASE_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000/api";

export const ENDPOINTS = {

  // ── Auth ────────────────────────────────────────────────────────────────────
  LOGIN:                  `${BASE_URL}/auth/login/`,
  LOGOUT:                 `${BASE_URL}/auth/logout/`,
  TOKEN_REFRESH:          `${BASE_URL}/auth/token/refresh/`,
  ME:                     `${BASE_URL}/auth/me/`,
  REGISTER:               `${BASE_URL}/auth/register/`,
  CHANGE_PASSWORD:        `${BASE_URL}/auth/change-password/`,
  PASSWORD_RESET:         `${BASE_URL}/auth/password-reset/`,
  PASSWORD_RESET_CONFIRM: `${BASE_URL}/auth/password-reset/confirm/`,

  // ── Users ───────────────────────────────────────────────────────────────────
  USERS:           `${BASE_URL}/auth/users/`,
  USER:            (id: number) => `${BASE_URL}/auth/users/${id}/`,
  USER_DEACTIVATE: (id: number) => `${BASE_URL}/auth/users/${id}/deactivate/`,
  USER_ACTIVATE:   (id: number) => `${BASE_URL}/auth/users/${id}/activate/`,
  EXTERNAL_AGENTS:       (dealerId: number)                => `${BASE_URL}/auth/${dealerId}/external-agents/`,
  EXTERNAL_AGENT_DETAIL: (dealerId: number, agentId: number) => `${BASE_URL}/auth/${dealerId}/external-agents/${agentId}/`,

  // ── Dealers ─────────────────────────────────────────────────────────────────
  DEALERS:               `${BASE_URL}/dealers/`,
  DEALER:                (id: number)                      => `${BASE_URL}/dealers/${id}/`,
  DEALER_USAGE:          (dealerId: number)                => `${BASE_URL}/dealers/${dealerId}/usage/`,
  BRANCHES:              (dealerId: number)                => `${BASE_URL}/dealers/${dealerId}/branches/`,
  BRANCH:                (dealerId: number, id: number)    => `${BASE_URL}/dealers/${dealerId}/branches/${id}/`,
  VAN_TEAMS:             (dealerId: number, branchId: number) => `${BASE_URL}/dealers/${dealerId}/branches/${branchId}/teams/`,
  MOBIGOS:               (dealerId: number)                => `${BASE_URL}/dealers/${dealerId}/mobigo/`,
  MOBIGO:                (dealerId: number, mobigoId: number) => `${BASE_URL}/dealers/${dealerId}/mobigo/${mobigoId}/`,

  // ── Inventory ───────────────────────────────────────────────────────────────
  SIMS:              `${BASE_URL}/inventory/`,
  SIM:               (serial: string) => `${BASE_URL}/inventory/${serial}/`,
  SIM_MOVEMENTS:     (serial: string) => `${BASE_URL}/inventory/${serial}/movements/`,
  SIM_TRACE:         (serial: string) => `${BASE_URL}/inventory/${serial}/trace/`,
  SIM_BATCHES:       `${BASE_URL}/inventory/batches/`,
  BULK_ISSUE:        `${BASE_URL}/inventory/actions/bulk-issue/`,
  BULK_RETURN:       `${BASE_URL}/inventory/actions/bulk-return/`,
  BULK_REGISTER:     `${BASE_URL}/inventory/actions/bulk-register/`,
  BULK_DELETE:       `${BASE_URL}/inventory/actions/bulk-delete/`,
  RESOLVE_LOST:      `${BASE_URL}/inventory/actions/resolve-lost/`,
  RESOLVE_REGISTER:  `${BASE_URL}/inventory/actions/resolve-register/`,
  RESOLVE_FAULTY:    `${BASE_URL}/inventory/actions/resolve-faulty/`,
  SIM_MOVEMENTS_ALL: `${BASE_URL}/inventory/movements/`,
  BATCH_SUMMARY:    `${BASE_URL}/inventory/batches/summary/`,
  CARRY_FORWARD:    `${BASE_URL}/inventory/batches/carry-forward/`,
  // ── Reconciliation ──────────────────────────────────────────────────────────
  REPORTS:          `${BASE_URL}/reconciliation/`,
  REPORT:           (id: number) => `${BASE_URL}/reconciliation/${id}/`,
  PROCESS_REPORT:   (id: number) => `${BASE_URL}/reconciliation/${id}/process/`,
  REPORT_RECORDS:   (id: number) => `${BASE_URL}/reconciliation/${id}/records/`,
  RESET_REPORT:     (id: number) => `${BASE_URL}/reconciliation/${id}/reset/`,
  FRAUD_SUMMARY:    `${BASE_URL}/reconciliation/fraud-summary/`,
  MY_RECON_HISTORY: `${BASE_URL}/reconciliation/my-history/`,
  RAISE_COMPLAINT:  `${BASE_URL}/reconciliation/raise-complaint/`,

  // ── Commissions ─────────────────────────────────────────────────────────────
  COMMISSION_RULES:       `${BASE_URL}/commissions/rules/`,
  COMMISSION_CYCLES:      `${BASE_URL}/commissions/cycles/`,
  GENERATE_CYCLE_RECORDS: (id: number) => `${BASE_URL}/commissions/cycles/${id}/generate/`,
  COMMISSION_RECORDS:     `${BASE_URL}/commissions/records/`,
  APPROVE_COMMISSION:     (id: number) => `${BASE_URL}/commissions/records/${id}/approve/`,
  REJECT_COMMISSION:      (id: number) => `${BASE_URL}/commissions/records/${id}/reject/`,
  PAYOUTS:                `${BASE_URL}/commissions/payouts/`,
  DEDUCTION_RULES:        `${BASE_URL}/commissions/deduction-rules/`,
  DEDUCTION_RULE:         (id: number) => `${BASE_URL}/commissions/deduction-rules/${id}/`,
  BA_SIM_BREAKDOWN:       `${BASE_URL}/commissions/ba-sim-breakdown/`,
  DEDUCTION_RECORDS: `${BASE_URL}/commissions/deduction-records/`,
  
  // ── Notifications ───────────────────────────────────────────────────────────
  NOTIFICATIONS:  `${BASE_URL}/notifications/`,
  MARK_READ:      (id: number) => `${BASE_URL}/notifications/${id}/mark-read/`,
  MARK_ALL_READ:  `${BASE_URL}/notifications/mark-all-read/`,
  UNREAD_COUNT:   `${BASE_URL}/notifications/unread-count/`,
  SEND_EMAIL:     `${BASE_URL}/notifications/send-email/`,

  // ── Reports ─────────────────────────────────────────────────────────────────
  DAILY_PERFORMANCE:      `${BASE_URL}/reports/daily/`,
  WEEKLY_SUMMARY:         `${BASE_URL}/reports/weekly-summary/`,
  AGENT_SUMMARY:          `${BASE_URL}/reports/agent-summary/`,
  LIVE_PERFORMANCE:       `${BASE_URL}/reports/live-summary/`,
  DAILY_BY_DATE:          `${BASE_URL}/reports/daily-by-date/`,
  AGENT_PERFORMANCE_LIVE: `${BASE_URL}/reports/agent-performance/`,

  // ── Invoices & Billing ──────────────────────────────────────────────────────
  INVOICES:           `${BASE_URL}/invoices/`,
  INVOICE:            (id: number)       => `${BASE_URL}/invoices/${id}/`,
  INVOICE_MARK_PAID:  (id: number)       => `${BASE_URL}/invoices/${id}/mark-paid/`,
  INVOICE_CANCEL:     (id: number)       => `${BASE_URL}/invoices/${id}/cancel/`,
  PLAN_SETTINGS:      `${BASE_URL}/invoices/plan-settings/`,
  CHANGE_DEALER_PLAN: (dealerId: number) => `${BASE_URL}/invoices/dealers/${dealerId}/change-plan/`,

};