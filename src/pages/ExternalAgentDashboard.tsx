// src/pages/ExternalAgentDashboard.tsx
import { useState, useMemo } from "react";
import {
  Search, UserPlus, X, Smartphone, Phone,
  MapPin, Globe, Calendar, Store, Briefcase,
  CheckCircle2, FileText, Loader2, AlertCircle,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { AddExternalAgentDialog } from "@/components/dialog/AddExternalAgentDialog";
import { useExternalAgents } from "@/hooks/useExternalAgents";
import { useMobiGos } from "@/hooks/useMobigo";
import type { ExternalAgent, MobiGo } from "@/types/dealers.types";

// ── helpers ───────────────────────────────────────────────────────────────────

const BUSINESS_LABELS: Record<string, string> = {
  shop:        "Shop",
  kiosk:       "Kiosk",
  supermarket: "Supermarket",
  pharmacy:    "Pharmacy",
  hardware:    "Hardware",
  other:       "Other",
};

function agentInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

function businessLabel(agent: ExternalAgent) {
  if (agent.business_type === "other" && agent.business_type_other) return agent.business_type_other;
  return BUSINESS_LABELS[agent.business_type] ?? agent.business_type;
}

// ── Detail Modal ──────────────────────────────────────────────────────────────

function AgentDetailModal({
  agent,
  mobigo,
  onClose,
}: {
  agent: ExternalAgent;
  mobigo: MobiGo | undefined;
  onClose: () => void;
}) {
  const name  = agent.user_details?.full_name ?? `Agent #${agent.user}`;
  const phone = agent.user_details?.phone ?? "—";
  const email = agent.user_details?.email ?? "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 sticky top-0 bg-card z-10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
              {agentInitials(name)}
            </div>
            <div>
              <p className="font-semibold text-foreground">{name}</p>
              <p className="text-xs text-muted-foreground">External Agent</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">

          {/* Identity & Contact */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Identity & Contact</p>
            <div className="rounded-lg border border-border bg-accent/30 divide-y divide-border text-sm">
              <div className="flex items-center gap-3 px-4 py-2.5">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground w-24">Phone</span>
                <span className="font-medium text-foreground">{phone}</span>
              </div>
              {email && (
                <div className="flex items-center gap-3 px-4 py-2.5">
                  <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground w-24">Email</span>
                  <span className="font-medium text-foreground">{email}</span>
                </div>
              )}
              {agent.location && (
                <div className="flex items-center gap-3 px-4 py-2.5">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground w-24">Location</span>
                  <span className="font-medium text-foreground">{agent.location}</span>
                </div>
              )}
              {agent.id_number && (
                <div className="flex items-center gap-3 px-4 py-2.5">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground w-24">ID Number</span>
                  <span className="font-medium text-foreground">{agent.id_number}</span>
                </div>
              )}
              <div className="flex items-center gap-3 px-4 py-2.5">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground w-24">Onboarded</span>
                <span className="font-medium text-foreground">
                  {new Date(agent.created_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>
            </div>
          </div>

          {/* Business Info */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Business</p>
            <div className="rounded-lg border border-border bg-accent/30 divide-y divide-border text-sm">
              <div className="flex items-center gap-3 px-4 py-2.5">
                <Store className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground w-24">Shop Name</span>
                <span className="font-medium text-foreground">{agent.shop_name || "—"}</span>
              </div>
              <div className="flex items-center gap-3 px-4 py-2.5">
                <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground w-24">Type</span>
                <span className="font-medium text-foreground">{businessLabel(agent)}</span>
              </div>
              <div className="flex items-center gap-3 px-4 py-2.5">
                <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground w-24">Commission</span>
                <span className={cn("font-medium", agent.commission_eligible ? "text-emerald-400" : "text-muted-foreground")}>
                  {agent.commission_eligible ? "Eligible" : "Not eligible"}
                </span>
              </div>
              {agent.notes && (
                <div className="flex items-start gap-3 px-4 py-2.5">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <span className="text-muted-foreground w-24">Notes</span>
                  <span className="text-foreground text-xs">{agent.notes}</span>
                </div>
              )}
            </div>
          </div>

          {/* MobiGo Device */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">MobiGo Device</p>
            {mobigo ? (
              <div className="rounded-lg border border-border bg-accent/30 divide-y divide-border text-sm">
                <div className="flex items-center gap-3 px-4 py-2.5">
                  <Smartphone className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-muted-foreground w-20">Type</span>
                  <span className="font-medium text-foreground">
                    {mobigo.device_type === "mobigo" ? "MobiGo Device" : "Enrolled Phone"}
                  </span>
                </div>
                <div className="flex items-center gap-3 px-4 py-2.5">
                  <Smartphone className="h-4 w-4 opacity-0 shrink-0" />
                  <span className="text-muted-foreground w-20">IMEI</span>
                  <span className="font-mono text-xs text-foreground">{mobigo.imis || "—"}</span>
                </div>
                <div className="flex items-center gap-3 px-4 py-2.5">
                  <Smartphone className="h-4 w-4 opacity-0 shrink-0" />
                  <span className="text-muted-foreground w-20">SIM Serial</span>
                  <span className="font-mono text-xs text-foreground">{mobigo.sim_serial_number || "—"}</span>
                </div>
                <div className="flex items-center gap-3 px-4 py-2.5">
                  <Smartphone className="h-4 w-4 opacity-0 shrink-0" />
                  <span className="text-muted-foreground w-20">BA MSISDN</span>
                  <span className="font-mono text-xs text-foreground">{mobigo.ba_msisdn || "—"}</span>
                </div>
                <div className="flex items-center gap-3 px-4 py-2.5">
                  <Smartphone className="h-4 w-4 opacity-0 shrink-0" />
                  <span className="text-muted-foreground w-20">Status</span>
                  <span className={cn("text-xs font-medium", mobigo.is_active ? "text-emerald-400" : "text-red-400")}>
                    {mobigo.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-border bg-accent/30 px-4 py-3 flex items-center gap-2 text-sm text-muted-foreground">
                <Smartphone className="h-4 w-4 shrink-0" />
                No MobiGo device assigned to this agent.
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 border-t border-border px-6 py-4 sticky bottom-0 bg-card">
          <button onClick={onClose} className="flex-1 rounded-md border border-border py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ExternalAgentDashboard() {
  const { user } = useAuth();
  const role     = user?.role ?? "dealer_owner";
  const dealerId = user?.dealer_id ? Number(user.dealer_id) : undefined;

  const [search,        setSearch]        = useState("");
  const [selectedAgent, setSelectedAgent] = useState<ExternalAgent | null>(null);
  const [showAdd,       setShowAdd]       = useState(false);

  const { data: agentData, isLoading, isError, refetch } = useExternalAgents(dealerId);
  const { data: mobigos = [] } = useMobiGos(dealerId);

  // Handle both paginated and array responses
  const agents: ExternalAgent[] = useMemo(() => {
    if (!agentData) return [];
    if (Array.isArray(agentData)) return agentData;
    return (agentData as { results?: ExternalAgent[] }).results ?? [];
  }, [agentData]);

  // userId → MobiGo lookup
  const mobigoByUser = useMemo(() => {
    const map: Record<number, MobiGo> = {};
    for (const m of mobigos) {
      if (m.assigned_ba != null) map[m.assigned_ba] = m;
    }
    return map;
  }, [mobigos]);

  const filtered = useMemo(() => {
    if (!search) return agents;
    const q = search.toLowerCase();
    return agents.filter(a =>
      a.user_details?.full_name?.toLowerCase().includes(q) ||
      a.shop_name?.toLowerCase().includes(q) ||
      a.location?.toLowerCase().includes(q) ||
      a.user_details?.phone?.includes(q)
    );
  }, [agents, search]);

  const totalWithDevice = agents.filter(a => mobigoByUser[a.user] != null).length;
  const totalEligible   = agents.filter(a => a.commission_eligible).length;

  const canAdd = ["dealer_owner", "operations_manager"].includes(role);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">External Agents</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Dashboard › External Agents</p>
        </div>
        {canAdd && (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <UserPlus className="h-4 w-4" /> Add Agent
          </button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Agents",       value: isLoading ? "—" : agents.length,                     color: "text-foreground"  },
          { label: "With MobiGo",        value: isLoading ? "—" : totalWithDevice,                   color: "text-primary"     },
          { label: "Commission Eligible",value: isLoading ? "—" : totalEligible,                     color: "text-emerald-400" },
          { label: "No Device",          value: isLoading ? "—" : agents.length - totalWithDevice,   color: "text-amber-400"   },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-lg border border-border bg-card px-4 py-4">
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className={cn("text-2xl font-bold font-heading", color)}>{value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, shop, location…"
          className="w-full rounded-md border border-border bg-accent py-2 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* States */}
      {isLoading && (
        <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading agents…</span>
        </div>
      )}

      {isError && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Failed to load agents.</span>
          <button onClick={() => refetch()} className="ml-auto underline text-xs">Retry</button>
        </div>
      )}

      {/* Table */}
      {!isLoading && !isError && (
        <>
          <div className="rounded-lg border border-border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="p-3 text-left font-medium">Name</th>
                  <th className="p-3 text-left font-medium">Shop</th>
                  <th className="p-3 text-left font-medium">Location</th>
                  <th className="p-3 text-left font-medium">Contact</th>
                  <th className="p-3 text-left font-medium">Business Type</th>
                  <th className="p-3 text-left font-medium">Onboarded</th>
                  <th className="p-3 text-left font-medium">Commission</th>
                  <th className="p-3 text-left font-medium">Device</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                      {agents.length === 0 ? "No external agents yet." : "No agents match your search."}
                    </td>
                  </tr>
                ) : filtered.map((agent, i) => {
                  const name   = agent.user_details?.full_name ?? `Agent #${agent.user}`;
                  const phone  = agent.user_details?.phone ?? "—";
                  const device = mobigoByUser[agent.user];

                  return (
                    <tr
                      key={agent.id}
                      onClick={() => setSelectedAgent(agent)}
                      className={cn(
                        "border-b border-border/50 hover:bg-accent/50 transition-colors cursor-pointer",
                        i % 2 === 0 ? "bg-accent/10" : ""
                      )}
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                            {agentInitials(name)}
                          </div>
                          <span className="font-medium text-foreground">{name}</span>
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground text-xs">{agent.shop_name || "—"}</td>
                      <td className="p-3 text-muted-foreground text-xs">{agent.location || "—"}</td>
                      <td className="p-3 text-muted-foreground">{phone}</td>
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs text-muted-foreground">
                          <Briefcase className="h-3 w-3" />{businessLabel(agent)}
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground text-xs">
                        {new Date(agent.created_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="p-3">
                        {agent.commission_eligible
                          ? <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium"><CheckCircle2 className="h-3.5 w-3.5" />Eligible</span>
                          : <span className="text-xs text-muted-foreground">—</span>
                        }
                      </td>
                      <td className="p-3">
                        {device
                          ? <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Smartphone className="h-3.5 w-3.5 text-primary" />
                              {device.device_type === "mobigo" ? "MobiGo" : "Phone"}
                            </span>
                          : <span className="text-xs text-muted-foreground">—</span>
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="text-sm text-muted-foreground">
            {filtered.length} of {agents.length} agent{agents.length !== 1 ? "s" : ""}
            {search && ` matching "${search}"`}
          </p>
        </>
      )}

      {/* Detail Modal */}
      {selectedAgent && (
        <AgentDetailModal
          agent={selectedAgent}
          mobigo={mobigoByUser[selectedAgent.user]}
          onClose={() => setSelectedAgent(null)}
        />
      )}

      {/* Add Agent Dialog */}
      <AddExternalAgentDialog
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onConfirm={() => {
          setShowAdd(false);
          refetch();
        }}
      />
    </div>
  );
}