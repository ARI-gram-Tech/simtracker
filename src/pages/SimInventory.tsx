import { useState } from "react";
import { Search, Upload, Download, Eye, MoreHorizontal, Layers } from "lucide-react";
import { KpiCard } from "@/components/KpiCard";
import { StatusBadge } from "@/components/StatusBadge";
import { generateSimCards } from "@/data/mockData";

const simCards = generateSimCards();

export default function SimInventory() {
  const [showUploadModal, setShowUploadModal] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">SIM Inventory</h1>
        <p className="text-sm text-muted-foreground">Dashboard &gt; SIM Inventory</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Layers} value="10,000" label="Total" />
        <KpiCard icon={Layers} value="2,500" label="In Stock" iconColor="text-muted-foreground" />
        <KpiCard icon={Layers} value="7,500" label="Issued" iconColor="text-primary" />
        <KpiCard icon={Layers} value="5,900" label="Activated" iconColor="text-success" />
      </div>

      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input placeholder="Search by serial number..." className="w-full rounded-md border border-border bg-accent py-2 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
        <select className="rounded-md border border-border bg-accent px-3 py-2 text-sm text-foreground">
          <option>All Statuses</option>
          <option>In Stock</option>
          <option>Issued</option>
          <option>Activated</option>
          <option>Returned</option>
        </select>
        <select className="rounded-md border border-border bg-accent px-3 py-2 text-sm text-foreground">
          <option>All Holders</option>
          <option>Warehouse</option>
          <option>Branch</option>
          <option>Van</option>
          <option>BA</option>
        </select>
        <div className="ml-auto flex gap-2">
          <button onClick={() => setShowUploadModal(true)} className="btn-press rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors">
            <Upload className="inline h-4 w-4 mr-1" /> Upload SIM Range
          </button>
          <button className="btn-press rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors">
            <Download className="inline h-4 w-4 mr-1" /> Export
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="p-3 text-left"><input type="checkbox" /></th>
              <th className="p-3 text-left font-medium">Serial Number</th>
              <th className="p-3 text-left font-medium">Status</th>
              <th className="p-3 text-left font-medium">Current Holder</th>
              <th className="p-3 text-left font-medium">Branch/Van</th>
              <th className="p-3 text-left font-medium">Issued Date</th>
              <th className="p-3 text-left font-medium">Last Updated</th>
              <th className="p-3 text-left font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {simCards.map((sim, i) => (
              <tr key={sim.id} className={`border-b border-border/50 hover:bg-accent/50 transition-colors ${i % 2 === 0 ? "bg-accent/20" : ""}`}>
                <td className="p-3"><input type="checkbox" /></td>
                <td className="p-3 font-mono text-primary text-xs">{sim.serial}</td>
                <td className="p-3"><StatusBadge status={sim.status} /></td>
                <td className="p-3">
                  <span className="text-foreground">{sim.holder}</span>
                  <StatusBadge status={sim.holderType === "stock" ? "in_stock" : sim.holderType} />
                </td>
                <td className="p-3 text-muted-foreground">{sim.branch}</td>
                <td className="p-3 text-muted-foreground">{sim.issuedDate}</td>
                <td className="p-3 text-muted-foreground">{sim.lastUpdated}</td>
                <td className="p-3 flex gap-1">
                  <button className="p-1 text-muted-foreground hover:text-foreground"><Eye className="h-4 w-4" /></button>
                  <button className="p-1 text-muted-foreground hover:text-foreground"><MoreHorizontal className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-muted-foreground">Showing 1-15 of 10,000 SIMs</p>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-background/60" onClick={() => setShowUploadModal(false)} />
          <div className="relative w-full max-w-md rounded-xl border border-border bg-card p-6">
            <h3 className="font-heading text-lg font-semibold mb-4">Add SIM Inventory</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Start Serial Number</label>
                <input placeholder="89254000..." className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">End Serial Number</label>
                <input placeholder="89254000..." className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <p className="text-sm text-muted-foreground">This will create <span className="text-primary font-medium">200</span> SIM records</p>
              <button onClick={() => setShowUploadModal(false)} className="btn-press w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground">Create Inventory</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
