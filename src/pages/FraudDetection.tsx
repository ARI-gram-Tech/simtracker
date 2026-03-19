import { ShieldAlert, AlertTriangle, Copy, UserX, Phone, UserCheck } from "lucide-react";
import { KpiCard } from "@/components/KpiCard";
import { StatusBadge } from "@/components/StatusBadge";
import { fraudIncidents, brandAmbassadors } from "@/data/mockData";

export default function FraudDetection() {
  const sortedBAs = [...brandAmbassadors].sort((a, b) => b.riskScore - a.riskScore);
  const unknownBACount = fraudIncidents.filter(i => i.type === "Unknown BA Phone").length;
  const agentBACount = fraudIncidents.filter(i => i.type === "Agent = BA Fraud").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Fraud Detection</h1>
        <p className="text-sm text-muted-foreground">Suspicious activity flagged by the reconciliation engine</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <KpiCard icon={ShieldAlert} value="12" label="Fraud Flagged by Safaricom" iconColor="text-destructive" />
        <KpiCard icon={Copy} value="5" label="Duplicate Claims" iconColor="text-warning" />
        <KpiCard icon={AlertTriangle} value="3" label="Wrong Dealer SIMs" iconColor="text-warning" />
        <KpiCard icon={UserX} value="2" label="Suspicious BAs" iconColor="text-destructive" />
        <KpiCard icon={Phone} value={String(unknownBACount)} label="Unknown BA Phone" iconColor="text-destructive" />
        <KpiCard icon={UserCheck} value={String(agentBACount)} label="Agent = BA Fraud" iconColor="text-destructive" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Incidents */}
        <div className="lg:col-span-3 space-y-3">
          <h3 className="font-heading text-lg font-semibold">Flagged Incidents</h3>
          {fraudIncidents.map((inc) => (
            <div key={inc.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <StatusBadge status={inc.severity} />
                  <div>
                    <p className="text-sm font-medium text-foreground">{inc.type}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{inc.description}</p>
                    <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                      <span>SIM: <span className="font-mono text-primary">{inc.serial}</span></span>
                      <span>BA: {inc.ba}</span>
                      <span>{inc.time}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button className="btn-press rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">Investigate</button>
                <button className="btn-press rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">Dismiss</button>
              </div>
            </div>
          ))}
        </div>

        {/* Risk Scores */}
        <div className="lg:col-span-2 rounded-lg border border-border bg-card p-5">
          <h3 className="font-heading text-lg font-semibold">BA Risk Scores</h3>
          <p className="text-xs text-muted-foreground mb-4">Based on claim patterns</p>
          <div className="space-y-4">
            {sortedBAs.map((ba) => {
              const level = ba.riskScore >= 60 ? "HIGH" : ba.riskScore >= 30 ? "MEDIUM" : "LOW";
              const barColor = level === "HIGH" ? "bg-destructive" : level === "MEDIUM" ? "bg-warning" : "bg-success";
              return (
                <div key={ba.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-foreground">{ba.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{ba.riskScore}</span>
                      <StatusBadge status={level} />
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-accent overflow-hidden">
                    <div className={`h-full rounded-full ${barColor}`} style={{ width: `${ba.riskScore}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
