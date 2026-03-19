export const dealer = {
  name: "Enlight Communications Ltd",
  code: "D-E019",
  region: "Nairobi",
};

export const branches = ["Embakasi", "Eastleigh", "Westlands", "Ngong Road"];
export const vans = ["Van KCK 001", "Van KCH 002", "Van KBZ 003"];

export const brandAmbassadors = [
  { id: "ba1", name: "John Kamau", branch: "Embakasi", photo: "", registered: 145, active: 128, commission: 12800, riskScore: 12 },
  { id: "ba2", name: "Mary Wanjiku", branch: "Eastleigh", photo: "", registered: 132, active: 118, commission: 11800, riskScore: 45 },
  { id: "ba3", name: "Peter Otieno", branch: "Westlands", photo: "", registered: 128, active: 112, commission: 11200, riskScore: 8 },
  { id: "ba4", name: "Grace Achieng", branch: "Ngong Road", photo: "", registered: 115, active: 102, commission: 10200, riskScore: 72 },
  { id: "ba5", name: "David Mwangi", branch: "Embakasi", photo: "", registered: 108, active: 95, commission: 9500, riskScore: 15 },
  { id: "ba6", name: "Sarah Njeri", branch: "Eastleigh", photo: "", registered: 98, active: 87, commission: 8700, riskScore: 60 },
  { id: "ba7", name: "James Mutua", branch: "Westlands", photo: "", registered: 89, active: 78, commission: 7800, riskScore: 5 },
];

export type SimStatus = "in_stock" | "issued" | "returned" | "activated" | "damaged" | "lost";

export interface SimCard {
  id: string;
  serial: string;
  status: SimStatus;
  holder: string;
  holderType: "branch" | "van" | "ba" | "stock";
  branch: string;
  issuedDate: string;
  lastUpdated: string;
}

export const generateSimCards = (): SimCard[] => {
  const statuses: SimStatus[] = ["in_stock", "issued", "activated", "returned", "damaged", "lost"];
  const holders = [
    { name: "Warehouse", type: "stock" as const, branch: "-" },
    { name: "John Kamau", type: "ba" as const, branch: "Embakasi" },
    { name: "Mary Wanjiku", type: "ba" as const, branch: "Eastleigh" },
    { name: "Peter Otieno", type: "ba" as const, branch: "Westlands" },
    { name: "Branch Embakasi", type: "branch" as const, branch: "Embakasi" },
    { name: "Van KCK 001", type: "van" as const, branch: "Embakasi" },
  ];

  return Array.from({ length: 15 }, (_, i) => {
    const status = statuses[i % statuses.length];
    const holder = status === "in_stock" ? holders[0] : holders[(i % 5) + 1];
    return {
      id: `sim-${i}`,
      serial: `8925400${String(10001 + i).padStart(5, "0")}`,
      status,
      holder: holder.name,
      holderType: holder.type,
      branch: holder.branch,
      issuedDate: status === "in_stock" ? "-" : `2024-03-${String(1 + (i % 10)).padStart(2, "0")}`,
      lastUpdated: `2024-03-${String(8 + (i % 3)).padStart(2, "0")}`,
    };
  });
};

export const registrationData = [
  { week: "Week 1", registered: 320, activated: 280 },
  { week: "Week 2", registered: 450, activated: 390 },
  { week: "Week 3", registered: 380, activated: 340 },
  { week: "Week 4", registered: 520, activated: 470 },
  { week: "Week 5", registered: 490, activated: 430 },
  { week: "Week 6", registered: 610, activated: 550 },
  { week: "Week 7", registered: 580, activated: 520 },
  { week: "Week 8", registered: 650, activated: 590 },
];

export const claimStatusData = [
  { name: "Payable", value: 68, color: "hsl(160, 60%, 45%)" },
  { name: "Inactive", value: 18, color: "hsl(38, 92%, 50%)" },
  { name: "Fraud", value: 4, color: "hsl(0, 84%, 60%)" },
  { name: "Review", value: 10, color: "hsl(263, 84%, 52%)" },
];

export const alerts = [
  { id: 1, severity: "high" as const, title: "Duplicate claim detected", description: "SIM 893254001", time: "2 min ago" },
  { id: 2, severity: "medium" as const, title: "BA Mary returned 0 SIMs today", description: "", time: "1 hour ago" },
  { id: 3, severity: "high" as const, title: "Fraud flag from Safaricom", description: "SIM 893254889", time: "3 hours ago" },
  { id: 4, severity: "low" as const, title: "Reconciliation complete", description: "2,150 SIMs processed", time: "5 hours ago" },
];

export const notifications = [
  { id: 1, type: "alert", title: "Duplicate Claim Detected", description: "SIM 893254001 claimed by two BAs", time: "2 min ago", read: false },
  { id: 2, type: "system", title: "Report Upload Complete", description: "March Safaricom report processed successfully", time: "30 min ago", read: false },
  { id: 3, type: "alert", title: "Fraud Flag", description: "Safaricom flagged SIM 893254889", time: "3 hours ago", read: false },
  { id: 4, type: "system", title: "Reconciliation Complete", description: "2,150 SIMs processed for March cycle", time: "5 hours ago", read: true },
  { id: 5, type: "alert", title: "Low Stock Warning", description: "Only 250 SIMs remaining in warehouse", time: "1 day ago", read: true },
  { id: 6, type: "system", title: "Commission Report Generated", description: "March commission report ready for review", time: "2 days ago", read: true },
];

export const issuanceLogs = [
  { time: "09:15 AM", issuedTo: "John Kamau", type: "BA", simCount: 50, issuedBy: "James (Ops)", status: "completed" },
  { time: "10:30 AM", issuedTo: "Branch Embakasi", type: "Branch", simCount: 200, issuedBy: "James (Ops)", status: "completed" },
  { time: "11:00 AM", issuedTo: "Van KCK 001", type: "Van", simCount: 100, issuedBy: "James (Ops)", status: "completed" },
  { time: "01:45 PM", issuedTo: "Mary Wanjiku", type: "BA", simCount: 30, issuedBy: "Sarah (Ops)", status: "completed" },
  { time: "02:30 PM", issuedTo: "Grace Achieng", type: "BA", simCount: 40, issuedBy: "Sarah (Ops)", status: "pending" },
  { time: "03:15 PM", issuedTo: "Branch Westlands", type: "Branch", simCount: 150, issuedBy: "James (Ops)", status: "completed" },
];

export const safaricomReports = [
  { id: 1, fileName: "safaricom_mar_wk1.xlsx", period: "Mar 1-7", rows: 2150, status: "reconciled", uploadedBy: "James", date: "2024-03-08" },
  { id: 2, fileName: "safaricom_mar_wk2.xlsx", period: "Mar 8-14", rows: 1890, status: "ready", uploadedBy: "James", date: "2024-03-15" },
  { id: 3, fileName: "safaricom_feb_wk4.xlsx", period: "Feb 22-28", rows: 2340, status: "reconciled", uploadedBy: "Sarah", date: "2024-03-01" },
  { id: 4, fileName: "safaricom_feb_wk3.xlsx", period: "Feb 15-21", rows: 1970, status: "reconciled", uploadedBy: "James", date: "2024-02-22" },
  { id: 5, fileName: "safaricom_mar_wk3.xlsx", period: "Mar 15-21", rows: 0, status: "parsing", uploadedBy: "James", date: "2024-03-22" },
  { id: 6, fileName: "safaricom_error_test.csv", period: "Mar 1-7", rows: 0, status: "error", uploadedBy: "Sarah", date: "2024-03-09" },
];

export const reconciliationResults = [
  { serial: "89254000100001", baName: "John Kamau", baPhone: "0712345678", agentPhone: "0798111222", claimType: "Manual", safaricomStatus: "Active", fraudFlag: false, baPhoneMatch: true, result: "Payable", commission: 100 },
  { serial: "89254000100002", baName: "Mary Wanjiku", baPhone: "0712345679", agentPhone: "0798111223", claimType: "Inferred", safaricomStatus: "Active", fraudFlag: false, baPhoneMatch: true, result: "Payable", commission: 100 },
  { serial: "89254000100003", baName: "Peter Otieno", baPhone: "0712345680", agentPhone: "0798111224", claimType: "Manual", safaricomStatus: "Inactive", fraudFlag: false, baPhoneMatch: true, result: "Rejected", commission: 0 },
  { serial: "89254000100004", baName: "Grace Achieng", baPhone: "0712345681", agentPhone: "0798111225", claimType: "Manual", safaricomStatus: "Active", fraudFlag: true, baPhoneMatch: true, result: "Review", commission: 0 },
  { serial: "89254000100005", baName: "John Kamau", baPhone: "0712345678", agentPhone: "0798111226", claimType: "Inferred", safaricomStatus: "Active", fraudFlag: false, baPhoneMatch: true, result: "Payable", commission: 100 },
  { serial: "89254000100006", baName: "Unknown", baPhone: "0799999999", agentPhone: "0798111227", claimType: "Manual", safaricomStatus: "Not Found", fraudFlag: false, baPhoneMatch: false, result: "Rejected", commission: 0 },
  { serial: "89254000100007", baName: "Sarah Njeri", baPhone: "0712345683", agentPhone: "0798111228", claimType: "Manual", safaricomStatus: "Active", fraudFlag: false, baPhoneMatch: true, result: "Payable", commission: 100 },
  { serial: "89254000100008", baName: "James Mutua", baPhone: "0712345684", agentPhone: "0712345684", claimType: "Inferred", safaricomStatus: "Active", fraudFlag: true, baPhoneMatch: true, result: "Review", commission: 0 },
  { serial: "89254000100009", baName: "Mary Wanjiku", baPhone: "0712345679", agentPhone: "0798111230", claimType: "Manual", safaricomStatus: "Inactive", fraudFlag: false, baPhoneMatch: true, result: "Rejected", commission: 0 },
  { serial: "89254000100010", baName: "Unknown", baPhone: "0788888888", agentPhone: "0798111231", claimType: "Manual", safaricomStatus: "Active", fraudFlag: false, baPhoneMatch: false, result: "Rejected", commission: 0 },
];

export const commissionData = [
  { baName: "John Kamau", branch: "Embakasi", issued: 145, active: 128, rate: "KES 100", total: 12800, status: "Paid" },
  { baName: "Mary Wanjiku", branch: "Eastleigh", issued: 132, active: 118, rate: "KES 100", total: 11800, status: "Approved" },
  { baName: "Peter Otieno", branch: "Westlands", issued: 128, active: 112, rate: "KES 100", total: 11200, status: "Pending" },
  { baName: "Grace Achieng", branch: "Ngong Road", issued: 115, active: 102, rate: "KES 100", total: 10200, status: "Pending" },
  { baName: "David Mwangi", branch: "Embakasi", issued: 108, active: 95, rate: "KES 100", total: 9500, status: "Approved" },
  { baName: "Sarah Njeri", branch: "Eastleigh", issued: 98, active: 87, rate: "KES 100", total: 8700, status: "Paid" },
  { baName: "James Mutua", branch: "Westlands", issued: 89, active: 78, rate: "KES 100", total: 7800, status: "Pending" },
  { baName: "Alice Wambui", branch: "Ngong Road", issued: 76, active: 65, rate: "KES 100", total: 6500, status: "Approved" },
];

export const fraudIncidents = [
  { id: 1, severity: "HIGH", type: "Duplicate Claim", description: "Same SIM claimed by two different BAs", serial: "89254000100004", ba: "Grace Achieng", time: "2 hours ago" },
  { id: 2, severity: "HIGH", type: "Safaricom Flag", description: "SIM flagged as fraudulent by Safaricom system", serial: "89254000100008", ba: "James Mutua", time: "4 hours ago" },
  { id: 3, severity: "HIGH", type: "Unknown BA Phone", description: "SIM registered by phone 0799999999 — not matching any BA in the system", serial: "89254000100006", ba: "Unknown (0799999999)", time: "3 hours ago" },
  { id: 4, severity: "HIGH", type: "Agent = BA Fraud", description: "Agent MSISDN and BA MSISDN are the same number (0712345684) — one person acting as both agent and BA", serial: "89254000100008", ba: "James Mutua", time: "4 hours ago" },
  { id: 5, severity: "MEDIUM", type: "Unusual Pattern", description: "50 SIMs registered in 30 minutes — abnormal speed", serial: "Multiple", ba: "Sarah Njeri", time: "1 day ago" },
  { id: 6, severity: "MEDIUM", type: "Wrong Dealer", description: "SIM registered under different dealer code", serial: "89254000100015", ba: "Mary Wanjiku", time: "1 day ago" },
  { id: 7, severity: "MEDIUM", type: "Unknown BA Phone", description: "SIM registered by phone 0788888888 — not matching any BA in the system", serial: "89254000100010", ba: "Unknown (0788888888)", time: "5 hours ago" },
  { id: 8, severity: "LOW", type: "Late Registration", description: "SIM registered 30 days after issuance", serial: "89254000100022", ba: "David Mwangi", time: "3 days ago" },
];
