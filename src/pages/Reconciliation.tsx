import { useState } from "react";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { reconciliationResults } from "@/data/mockData";
import { cn } from "@/lib/utils";

const tabs = ["All", "Payable", "Inactive", "Fraud Flagged", "Manual Review", "Disputed"];

export default function Reconciliation() {
  const [activeTab, setActiveTab] = useState("All");
  const [step, setStep] = useState(0);

  const filtered = activeTab === "All" ? reconciliationResults
    : activeTab === "Payable" ? reconciliationResults.filter(r => r.result === "Payable")
    : activeTab === "Fraud Flagged" ? reconciliationResults.filter(r => r.fraudFlag)
    : activeTab === "Manual Review" ? reconciliationResults.filter(r => r.result === "Review")
    : reconciliationResults.filter(r => r.result === "Rejected");

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold">Reconciliation Engine</h1>

      {/* Run card */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-4">
        <h3 className="font-heading text-lg font-semibold">Run Reconciliation</h3>
        <select className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground">
          <option>safaricom_mar_wk2.xlsx — Mar 8-14 (1,890 rows)</option>
          <option>safaricom_mar_wk1.xlsx — Mar 1-7 (2,150 rows)</option>
        </select>
        <p className="text-sm text-warning flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" /> This will process 1,890 activations against your inventory
        </p>
        <div className="flex gap-3">
          <button className="btn-press rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-accent">Preview</button>
          <button onClick={() => setStep(5)} className="btn-press rounded-md bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground">Run Reconciliation</button>
        </div>

        {step === 5 && (
          <div className="flex items-center gap-4 mt-4 text-sm">
            <span className="text-success">✅ Report Loaded (2,150)</span>
            <span className="text-success">✅ Inventory Matched (2,090)</span>
            <span className="text-success">✅ Claims Verified</span>
            <span className="text-success">✅ Results Generated</span>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="font-heading text-lg font-semibold mb-4">Reconciliation Results</h3>

        <div className="flex flex-wrap gap-2 mb-4">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "btn-press rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                activeTab === tab ? "bg-primary text-primary-foreground" : "bg-accent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="pb-3 text-left font-medium">Serial Number</th>
                <th className="pb-3 text-left font-medium">BA Name</th>
                <th className="pb-3 text-left font-medium">BA Phone Match</th>
                <th className="pb-3 text-left font-medium">Claim Type</th>
                <th className="pb-3 text-left font-medium">Safaricom Status</th>
                <th className="pb-3 text-left font-medium">Fraud</th>
                <th className="pb-3 text-left font-medium">Result</th>
                <th className="pb-3 text-right font-medium">Commission</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr
                  key={i}
                  className={cn(
                    "border-b border-border/50 hover:bg-accent/50 transition-colors",
                    r.result === "Rejected" && "border-l-2 border-l-destructive",
                    r.result === "Payable" && "border-l-2 border-l-success"
                  )}
                >
                  <td className="py-3 font-mono text-xs text-primary">{r.serial}</td>
                  <td className="py-3 text-foreground">{r.baName}</td>
                  <td className="py-3">
                    {r.baPhoneMatch ? (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                  </td>
                  <td className="py-3"><StatusBadge status={r.claimType} /></td>
                  <td className="py-3"><StatusBadge status={r.safaricomStatus} /></td>
                  <td className="py-3">{r.fraudFlag && <AlertTriangle className="h-4 w-4 text-destructive" />}</td>
                  <td className="py-3"><StatusBadge status={r.result} /></td>
                  <td className="py-3 text-right font-medium text-success">{r.commission > 0 ? `KES ${r.commission}` : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4">
          <button className="btn-press rounded-md bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground">Generate Commission Report</button>
        </div>
      </div>
    </div>
  );
}
