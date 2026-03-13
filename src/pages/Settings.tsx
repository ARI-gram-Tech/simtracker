import { useState } from "react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/StatusBadge";

const settingsTabs = ["Dealer Profile", "Users & Roles", "Commission Rules", "Branches", "Vans", "Notifications"];

const users = [
  { name: "James Odhiambo", phone: "+254 712 345 678", role: "Dealer Owner", status: "Active", lastLogin: "2024-03-10" },
  { name: "Sarah Muthoni", phone: "+254 722 987 654", role: "Ops Manager", status: "Active", lastLogin: "2024-03-10" },
  { name: "John Kamau", phone: "+254 733 111 222", role: "Brand Ambassador", status: "Active", lastLogin: "2024-03-09" },
  { name: "Mary Wanjiku", phone: "+254 711 333 444", role: "Brand Ambassador", status: "Active", lastLogin: "2024-03-08" },
  { name: "Peter Otieno", phone: "+254 700 555 666", role: "Finance", status: "Inactive", lastLogin: "2024-02-28" },
];

const commissionRules = [
  { name: "Standard New Line", simType: "New", region: "All", topupMin: "KES 50", topupMax: "KES 500", amount: "KES 100", validFrom: "2024-01-01", status: "Active" },
  { name: "Premium New Line", simType: "New", region: "Nairobi", topupMin: "KES 500", topupMax: "KES 5000", amount: "KES 150", validFrom: "2024-01-01", status: "Active" },
  { name: "Replacement", simType: "Replacement", region: "All", topupMin: "KES 0", topupMax: "KES 500", amount: "KES 50", validFrom: "2024-01-01", status: "Active" },
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState("Dealer Profile");

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold">Settings</h1>

      <div className="flex flex-wrap gap-2">
        {settingsTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "btn-press rounded-md px-4 py-2 text-sm font-medium transition-colors",
              activeTab === tab ? "bg-primary text-primary-foreground" : "bg-accent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        {activeTab === "Dealer Profile" && (
          <div className="max-w-lg space-y-4">
            <div><label className="block text-sm font-medium text-foreground mb-1.5">Company Name</label><input defaultValue="Enlight Communications Ltd" className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" /></div>
            <div><label className="block text-sm font-medium text-foreground mb-1.5">Dealer Code</label><div className="flex"><input defaultValue="D-E019" readOnly className="w-full rounded-l-md border border-border bg-muted py-2 px-3 text-sm text-muted-foreground" /><button className="rounded-r-md border border-l-0 border-border px-3 text-xs text-muted-foreground hover:text-foreground">Copy</button></div></div>
            <div><label className="block text-sm font-medium text-foreground mb-1.5">Contact Email</label><input defaultValue="info@enlightcomms.co.ke" className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" /></div>
            <div><label className="block text-sm font-medium text-foreground mb-1.5">Contact Phone</label><input defaultValue="+254 712 345 678" className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" /></div>
            <div><label className="block text-sm font-medium text-foreground mb-1.5">Safaricom Region</label><select className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground"><option>Nairobi</option><option>Central</option><option>Coast</option></select></div>
            <div className="flex items-center gap-3"><StatusBadge status="Active" /><span className="text-sm text-muted-foreground">Pro Plan</span></div>
            <button className="btn-press rounded-md bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground">Save Changes</button>
          </div>
        )}

        {activeTab === "Users & Roles" && (
          <div>
            <div className="flex justify-between mb-4">
              <h3 className="font-heading text-lg font-semibold">Users</h3>
              <button className="btn-press rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Add User</button>
            </div>
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border text-muted-foreground">
                <th className="pb-3 text-left font-medium">Name</th>
                <th className="pb-3 text-left font-medium">Phone</th>
                <th className="pb-3 text-left font-medium">Role</th>
                <th className="pb-3 text-left font-medium">Status</th>
                <th className="pb-3 text-left font-medium">Last Login</th>
              </tr></thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-accent/50 transition-colors">
                    <td className="py-3 font-medium text-foreground">{u.name}</td>
                    <td className="py-3 text-muted-foreground">{u.phone}</td>
                    <td className="py-3"><StatusBadge status={u.role === "Dealer Owner" ? "HIGH" : u.role === "Finance" ? "MEDIUM" : "LOW"} /></td>
                    <td className="py-3"><StatusBadge status={u.status === "Active" ? "activated" : "Inactive"} /></td>
                    <td className="py-3 text-muted-foreground">{u.lastLogin}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "Commission Rules" && (
          <div>
            <div className="flex justify-between mb-4">
              <h3 className="font-heading text-lg font-semibold">Commission Rules</h3>
              <button className="btn-press rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Add Rule</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border text-muted-foreground">
                  <th className="pb-3 text-left font-medium">Rule Name</th>
                  <th className="pb-3 text-left font-medium">SIM Type</th>
                  <th className="pb-3 text-left font-medium">Region</th>
                  <th className="pb-3 text-left font-medium">Topup Min</th>
                  <th className="pb-3 text-left font-medium">Topup Max</th>
                  <th className="pb-3 text-left font-medium">Amount</th>
                  <th className="pb-3 text-left font-medium">Valid From</th>
                  <th className="pb-3 text-left font-medium">Status</th>
                </tr></thead>
                <tbody>
                  {commissionRules.map((r, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-accent/50 transition-colors">
                      <td className="py-3 font-medium text-foreground">{r.name}</td>
                      <td className="py-3">{r.simType}</td>
                      <td className="py-3 text-muted-foreground">{r.region}</td>
                      <td className="py-3">{r.topupMin}</td>
                      <td className="py-3">{r.topupMax}</td>
                      <td className="py-3 text-success font-medium">{r.amount}</td>
                      <td className="py-3 text-muted-foreground">{r.validFrom}</td>
                      <td className="py-3"><StatusBadge status="activated" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {(activeTab === "Branches" || activeTab === "Vans" || activeTab === "Notifications") && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-16 w-16 rounded-full bg-accent flex items-center justify-center mb-4">
              <span className="text-2xl text-muted-foreground">📋</span>
            </div>
            <p className="text-foreground font-medium">No {activeTab.toLowerCase()} configured yet</p>
            <p className="text-sm text-muted-foreground mt-1">Add your first {activeTab.toLowerCase()} to get started</p>
            <button className="btn-press mt-4 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Add {activeTab === "Branches" ? "Branch" : activeTab === "Vans" ? "Van" : "Rule"}</button>
          </div>
        )}
      </div>
    </div>
  );
}
