import { Upload, FileText } from "lucide-react";
import { KpiCard } from "@/components/KpiCard";
import { StatusBadge } from "@/components/StatusBadge";
import { safaricomReports } from "@/data/mockData";

export default function SafaricomReports() {
  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold">Safaricom Activation Reports</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard icon={FileText} value="12" label="Reports Uploaded" />
        <KpiCard icon={FileText} value="March 10, 2024" label="Last Upload" iconColor="text-primary" />
        <KpiCard icon={FileText} value="85,230" label="Rows Processed" iconColor="text-success" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload */}
        <div className="rounded-lg border border-border bg-card p-5 space-y-4">
          <h3 className="font-heading text-lg font-semibold">Upload New Report</h3>
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-accent/30 p-10 text-center cursor-pointer hover:border-primary/50 transition-colors">
            <Upload className="h-10 w-10 text-primary mb-3" />
            <p className="text-sm text-foreground font-medium">Drag and drop your Safaricom Excel file here</p>
            <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
            <p className="text-xs text-muted-foreground mt-2">Accepted: .xlsx, .xls, .csv · Max 50MB</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Report Period Start</label>
              <input type="date" className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Report Period End</label>
              <input type="date" className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
          </div>
          <select className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground">
            <option>Use saved column mapping</option>
            <option>Default Safaricom Template</option>
          </select>
          <button className="btn-press w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground">Import Report</button>
        </div>

        {/* Previous reports */}
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="font-heading text-lg font-semibold mb-4">Previous Reports</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="pb-3 text-left font-medium">File Name</th>
                  <th className="pb-3 text-left font-medium">Period</th>
                  <th className="pb-3 text-right font-medium">Rows</th>
                  <th className="pb-3 text-left font-medium">Status</th>
                  <th className="pb-3 text-left font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {safaricomReports.map((r) => (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-accent/50 transition-colors">
                    <td className="py-3 text-foreground text-xs">{r.fileName}</td>
                    <td className="py-3 text-muted-foreground text-xs">{r.period}</td>
                    <td className="py-3 text-right">{r.rows.toLocaleString()}</td>
                    <td className="py-3"><StatusBadge status={r.status} /></td>
                    <td className="py-3 text-muted-foreground text-xs">{r.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
