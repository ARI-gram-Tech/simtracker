import { useState } from "react";
import { Building, Truck, User, Store } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { issuanceLogs } from "@/data/mockData";
import { cn } from "@/lib/utils";

const destTypes = [
  { id: "branch", label: "Branch", icon: Building },
  { id: "van", label: "Van", icon: Truck },
  { id: "ba", label: "Brand Ambassador", icon: User },
  { id: "agent", label: "External Agent", icon: Store },
];

const treeData = [
  { label: "Dealer (10,000)", children: [
    { label: "Branch Embakasi (800)" },
    { label: "Branch Eastleigh (600)" },
    { label: "Van KCK 001 (200)" },
    { label: "Van KCH 002 (300)" },
    { label: "Direct BAs (400)" },
  ]}
];

export default function IssueSims() {
  const [selectedType, setSelectedType] = useState("branch");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Issue SIM Cards</h1>
        <p className="text-sm text-muted-foreground">Distribute SIM cards to branches, vans, or brand ambassadors</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Issue Form */}
        <div className="lg:col-span-2 rounded-lg border border-border bg-card p-5 space-y-5">
          <h3 className="font-heading text-lg font-semibold">New Issuance</h3>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Step 1: Select Destination Type</label>
            <div className="grid grid-cols-2 gap-2">
              {destTypes.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setSelectedType(d.id)}
                  className={cn(
                    "btn-press flex items-center gap-2 rounded-md border p-3 text-sm font-medium transition-all",
                    selectedType === d.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-accent"
                  )}
                >
                  <d.icon className="h-4 w-4" />
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Step 2: Select {selectedType === "ba" ? "Brand Ambassador" : selectedType === "van" ? "Van" : "Branch"}</label>
            <select className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground">
              <option>Select...</option>
              <option>Embakasi</option>
              <option>Eastleigh</option>
              <option>Westlands</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Step 3: SIM Range</label>
            <div className="space-y-2">
              <input placeholder="Start Serial" className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              <input placeholder="End Serial" className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">200 SIMs will be issued</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Step 4: Notes (optional)</label>
            <textarea rows={2} className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>

          <button className="btn-press w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground">Issue SIMs</button>
        </div>

        {/* Today's log */}
        <div className="lg:col-span-3 rounded-lg border border-border bg-card p-5">
          <h3 className="font-heading text-lg font-semibold mb-4">Today's Issuances</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="pb-3 text-left font-medium">Time</th>
                  <th className="pb-3 text-left font-medium">Issued To</th>
                  <th className="pb-3 text-left font-medium">Type</th>
                  <th className="pb-3 text-right font-medium">SIM Count</th>
                  <th className="pb-3 text-left font-medium">Issued By</th>
                  <th className="pb-3 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {issuanceLogs.map((log, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-accent/50 transition-colors">
                    <td className="py-3 text-muted-foreground">{log.time}</td>
                    <td className="py-3 font-medium text-foreground">{log.issuedTo}</td>
                    <td className="py-3"><StatusBadge status={log.type} /></td>
                    <td className="py-3 text-right">{log.simCount}</td>
                    <td className="py-3 text-muted-foreground">{log.issuedBy}</td>
                    <td className="py-3"><StatusBadge status={log.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Distribution Tree */}
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="font-heading text-lg font-semibold mb-4">SIM Distribution Tree</h3>
        <div className="space-y-2">
          {treeData.map((node) => (
            <div key={node.label}>
              <p className="text-sm font-medium text-foreground">{node.label}</p>
              {node.children && (
                <div className="ml-4 mt-1 space-y-1 border-l border-border pl-4">
                  {node.children.map((child) => (
                    <p key={child.label} className="text-sm text-muted-foreground">├── <StatusBadge status="issued" /> {child.label}</p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
