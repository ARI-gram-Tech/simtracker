// src/components/MobiGoTab.tsx
import { useState } from "react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/StatusBadge";
import { useCreateMobiGo, useUpdateMobiGo } from "@/hooks/useMobigo";
import { showSuccess, showError } from "@/lib/toast";
import type { MobiGo, CreateMobiGoRequest, MobiGoDeviceType } from "@/types/dealers.types";
import type { UserProfile } from "@/types/auth.types";
import {
  X, Plus, Smartphone, User, Loader2, AlertCircle,
  Edit2, UserX, UserCheck, Trash2, Phone, Hash,
} from "lucide-react";

// ─── helpers ──────────────────────────────────────────────────────────────────

function userFullName(u: UserProfile) {
  return [u.first_name, u.last_name].filter(Boolean).join(" ") || u.email;
}

// ─── API error → friendly message map ────────────────────────────────────────

const MOBIGO_FIELD_ERRORS: Record<string, string> = {
  assigned_ba:       "This Brand Ambassador already has a MobiGo assigned. One device per BA.",
  imis:              "This IMEI / iMIS is already registered on another device.",
  sim_serial_number: "This SIM Serial Number is already in use.",
  mobigo_sim_number: "This MobiGo SIM Number is invalid or already registered.",
  ba_msisdn:         "BA MSISDN is invalid — include digits only after +254.",
  agent_msisdn:      "Agent MSISDN is invalid.",
  non_field_errors:  "Validation failed. Please review your inputs.",
};

function parseMobiGoError(raw: Record<string, unknown>): string {
  return Object.entries(raw)
    .map(([field, msgs]) => {
      const text = Array.isArray(msgs) ? msgs.join(" ") : String(msgs);
      return MOBIGO_FIELD_ERRORS[field] ?? `${field}: ${text}`;
    })
    .join(" · ");
}

// ─── Add MobiGo Dialog ────────────────────────────────────────────────────────

function AddMobiGoDialog({
  open, onClose, onSuccess, dealerId,
  baUsers,       
  agentUsers,     
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  dealerId?: number;
  baUsers: UserProfile[];
  agentUsers: UserProfile[];  
}) {
  const [deviceType,      setDeviceType]      = useState<MobiGoDeviceType>("mobigo");
  const [imis,            setImis]            = useState("");
  const [mobigoSimNumber, setMobigoSimNumber] = useState("");
  const [simSerialNumber, setSimSerialNumber] = useState("");
  const [baMsisdn,        setBaMsisdn]        = useState("");
  const [agentMsisdn,     setAgentMsisdn]     = useState("");
  const [assignedBa,      setAssignedBa]      = useState("");
  const [notes,           setNotes]           = useState("");
  const [apiError,        setApiError]        = useState("");

  const createMobiGo = useCreateMobiGo();

  if (!open) return null;

  const isValid =
    imis.trim() &&
    simSerialNumber.trim();
  const handleAdd = async () => {
    if (!isValid || !dealerId) return;
    setApiError("");
    try {
      await createMobiGo.mutateAsync({
        dealerId,
        data: {
          device_type:       deviceType,
          imis:              imis.trim(),
          mobigo_sim_number: mobigoSimNumber.trim(),
          sim_serial_number: simSerialNumber.trim(),
          ba_msisdn:         baMsisdn.trim() ? "+254" + baMsisdn.replace(/\D/g, "") : "",
          agent_msisdn:      agentMsisdn.trim() ? "+254" + agentMsisdn.replace(/\D/g, "") : "",
          assigned_ba:       assignedBa ? Number(assignedBa) : null,
          notes:             notes.trim(),
        } as CreateMobiGoRequest,
      });
      showSuccess("MobiGo device added successfully!");
      onSuccess();
      reset();
    } catch (err: unknown) {
      const e = err as { response?: { data?: Record<string, unknown> }; message?: string };
      const detail = e?.response?.data;
      const message =
        detail && typeof detail === "object"
          ? parseMobiGoError(detail as Record<string, unknown>)
          : e?.message ?? "Failed to add MobiGo device. Please try again.";
      setApiError(message); // inline banner — visible when scrolled to top
      showError(message);   // toast — always visible regardless of scroll
    }
  };

  const reset = () => {
    setDeviceType("mobigo"); setImis(""); setMobigoSimNumber("");
    setSimSerialNumber(""); setBaMsisdn(""); setAgentMsisdn("");
    setAssignedBa(""); setNotes(""); setApiError("");
    onClose();
  };

  const loading = createMobiGo.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={reset} />
      <div className="relative w-full max-w-md rounded-xl border border-border bg-card shadow-2xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 sticky top-0 bg-card z-10">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10">
              <Smartphone className="h-4 w-4 text-green-500" />
            </div>
            <h3 className="font-heading text-lg font-semibold">Add MobiGo Device</h3>
          </div>
          <button onClick={reset} className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {apiError && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{apiError}</span>
            </div>
          )}

          {/* Device Type */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Device Type</p>
            <div className="flex rounded-md border border-border overflow-hidden text-sm">
              <button
                onClick={() => setDeviceType("mobigo")}
                className={cn("flex-1 py-2 font-medium transition-colors",
                  deviceType === "mobigo" ? "bg-primary text-primary-foreground" : "bg-accent text-muted-foreground")}>
                MobiGo Device
              </button>
              <button
                onClick={() => setDeviceType("enrolled_phone")}
                className={cn("flex-1 py-2 font-medium transition-colors",
                  deviceType === "enrolled_phone" ? "bg-primary text-primary-foreground" : "bg-accent text-muted-foreground")}>
                Enrolled Phone
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              {deviceType === "mobigo"
                ? "A dedicated Safaricom MobiGo device issued to the BA."
                : "A personal phone enrolled by the TDR to act as a MobiGo substitute."}
            </p>
          </div>

          {/* Device Details */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Device Details</p>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                iMIS / IMEI <span className="text-destructive">*</span>
              </label>
              <input
                value={imis}
                onChange={e => setImis(e.target.value.replace(/\D/g, ""))}
                placeholder="354123456789012"
                maxLength={15}
                className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <p className="text-xs text-muted-foreground mt-1">Device IMEI — dial *#06# or check device box.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                SIM Serial Number <span className="text-destructive">*</span>
              </label>
              <input
                value={simSerialNumber}
                onChange={e => setSimSerialNumber(e.target.value)}
                placeholder="e.g. 8925401234567890123"
                className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <p className="text-xs text-muted-foreground mt-1">
                This is the key field used to match rows in Safaricom reports (Column F).
              </p>
            </div>

            {deviceType === "mobigo" && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  MobiGo SIM Number
                  <span className="text-xs font-normal text-muted-foreground ml-1">(internet SIM inside device)</span>
                </label>
                <div className="flex">
                  <span className="inline-flex items-center rounded-l-md border border-r-0 border-border bg-accent/60 px-2 text-xs text-muted-foreground">+254</span>
                  <input
                    value={mobigoSimNumber}
                    onChange={e => setMobigoSimNumber(e.target.value.replace(/\D/g, ""))}
                    placeholder="7XX XXX XXX"
                    maxLength={9}
                    className="w-full rounded-r-md border border-border bg-accent py-2 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            )}
          </div>

          {/* MSISDN Numbers */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">MSISDN Numbers</p>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                <Phone className="inline h-3.5 w-3.5 mr-1 text-muted-foreground" />
                BA MSISDN
                <span className="text-xs font-normal text-muted-foreground ml-1">(BA's personal Safaricom number, optional)</span>
              </label>
              <div className="flex">
                <span className="inline-flex items-center rounded-l-md border border-r-0 border-border bg-accent/60 px-2 text-xs text-muted-foreground">+254</span>
                <input
                  value={baMsisdn}
                  onChange={e => setBaMsisdn(e.target.value.replace(/\D/g, ""))}
                  placeholder="7XX XXX XXX"
                  maxLength={9}
                  className="w-full rounded-r-md border border-border bg-accent py-2 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                <Hash className="inline h-3.5 w-3.5 mr-1 text-muted-foreground" />
                Agent MSISDN
                <span className="text-xs font-normal text-muted-foreground ml-1">(outlet/dealer shop number)</span>
              </label>
              <div className="flex">
                <span className="inline-flex items-center rounded-l-md border border-r-0 border-border bg-accent/60 px-2 text-xs text-muted-foreground">+254</span>
                <input
                  value={agentMsisdn}
                  onChange={e => setAgentMsisdn(e.target.value.replace(/\D/g, ""))}
                  placeholder="7XX XXX XXX"
                  maxLength={9}
                  className="w-full rounded-r-md border border-border bg-accent py-2 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {/* BA / Agent Assignment */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Device Assignment
            </p>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                <User className="inline h-3.5 w-3.5 mr-1 text-muted-foreground" />
                Assign to User
                <span className="text-xs font-normal text-muted-foreground ml-1">
                  (Brand Ambassador or External Agent)
                </span>
              </label>
              <select value={assignedBa} onChange={e => setAssignedBa(e.target.value)}
                className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="">— Unassigned —</option>
                {baUsers.length > 0 && (
                  <optgroup label="Brand Ambassadors">
                    {baUsers.map(u => (
                      <option key={u.id} value={String(u.id)}>
                        {userFullName(u)} · {u.phone || "no phone"}
                      </option>
                    ))}
                  </optgroup>
                )}
                {agentUsers.length > 0 && (
                  <optgroup label="External Agents">
                    {agentUsers.map(u => (
                      <option key={u.id} value={String(u.id)}>
                        {userFullName(u)} · {u.phone || "no phone"}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                One device per person. Brand Ambassadors and External Agents are eligible.
              </p>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Notes <span className="text-muted-foreground font-normal text-xs">(optional)</span>
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Issued to BA on 01 Jan 2025, screen crack noted"
              className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          </div>
        </div>

        <div className="flex gap-2 border-t border-border px-6 py-4 sticky bottom-0 bg-card">
          <button onClick={reset} disabled={loading}
            className="flex-1 rounded-md border border-border py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!isValid || loading}
            className="flex-1 flex items-center justify-center gap-2 rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Adding…" : "Add MobiGo"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit MobiGo Drawer ───────────────────────────────────────────────────────

function EditMobiGoDrawer({
  mobigo,
  dealerId,
  onClose,
  baUsers,
  agentUsers,
}: {
  mobigo: MobiGo;
  dealerId: number;
  onClose: () => void;
  baUsers: UserProfile[];
  agentUsers: UserProfile[];
}) {
  const [imis,            setImis]            = useState(mobigo.imis);
  const [mobigoSimNumber, setMobigoSimNumber] = useState(mobigo.mobigo_sim_number);
  const [simSerialNumber, setSimSerialNumber] = useState(mobigo.sim_serial_number);
  const [baMsisdn,        setBaMsisdn]        = useState(mobigo.ba_msisdn.replace("+254", ""));
  const [agentMsisdn,     setAgentMsisdn]     = useState(mobigo.agent_msisdn.replace("+254", ""));
  const [assignedBa,      setAssignedBa]      = useState(mobigo.assigned_ba ? String(mobigo.assigned_ba) : "");
  const [notes,           setNotes]           = useState(mobigo.notes);
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState("");

  const updateMobiGo = useUpdateMobiGo();

  return (
    <>
      <div className="fixed inset-0 z-40 bg-background/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm border-l border-border bg-card shadow-2xl flex flex-col">
        <div className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10">
              <Smartphone className="h-4 w-4 text-green-500" />
            </div>
            <h2 className="font-heading text-base font-semibold">Edit MobiGo</h2>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="rounded-lg border border-border bg-background p-3 space-y-1">
            <p className="text-xs text-muted-foreground">Device Type</p>
            <p className="text-sm font-medium text-foreground capitalize">
              {mobigo.device_type === "mobigo" ? "MobiGo Device" : "Enrolled Phone"}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">iMIS / IMEI</label>
            <input value={imis} onChange={e => setImis(e.target.value.replace(/\D/g, ""))} maxLength={15}
              className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              SIM Serial Number <span className="text-destructive">*</span>
            </label>
            <input value={simSerialNumber} onChange={e => setSimSerialNumber(e.target.value)}
              className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            <p className="text-xs text-muted-foreground mt-1">Used to match Safaricom report rows.</p>
          </div>

          {mobigo.device_type === "mobigo" && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">MobiGo SIM Number</label>
              <div className="flex">
                <span className="inline-flex items-center rounded-l-md border border-r-0 border-border bg-accent/60 px-2 text-xs text-muted-foreground">+254</span>
                <input value={mobigoSimNumber} onChange={e => setMobigoSimNumber(e.target.value.replace(/\D/g, ""))} maxLength={9}
                  className="w-full rounded-r-md border border-border bg-accent py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">BA MSISDN</label>
            <div className="flex">
              <span className="inline-flex items-center rounded-l-md border border-r-0 border-border bg-accent/60 px-2 text-xs text-muted-foreground">+254</span>
              <input value={baMsisdn} onChange={e => setBaMsisdn(e.target.value.replace(/\D/g, ""))} maxLength={9}
                className="w-full rounded-r-md border border-border bg-accent py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Agent MSISDN</label>
            <div className="flex">
              <span className="inline-flex items-center rounded-l-md border border-r-0 border-border bg-accent/60 px-2 text-xs text-muted-foreground">+254</span>
              <input value={agentMsisdn} onChange={e => setAgentMsisdn(e.target.value.replace(/\D/g, ""))} maxLength={9}
                className="w-full rounded-r-md border border-border bg-accent py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              <User className="inline h-3.5 w-3.5 mr-1 text-muted-foreground" />
              Assigned BA
            </label>
            <select value={assignedBa} onChange={e => setAssignedBa(e.target.value)}
              className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
              <option value="">— Unassigned —</option>
              {baUsers.map(u => (
                <option key={u.id} value={String(u.id)}>
                  {userFullName(u)} · {u.phone || "no phone"}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Notes</label>
            <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
              className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
          </div>

          <div className="rounded-lg border border-border bg-background p-3 space-y-1">
            <p className="text-xs text-muted-foreground">MobiGo ID</p>
            <p className="text-sm font-medium text-foreground">#{mobigo.id}</p>
          </div>
        </div>

        <div className="flex gap-2 border-t border-border px-6 py-4 shrink-0">
          <button onClick={onClose} disabled={loading}
            className="flex-1 rounded-md border border-border py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button
            disabled={loading}
            onClick={async () => {
              setLoading(true);
              setError("");
              try {
                await updateMobiGo.mutateAsync({
                  dealerId,
                  mobigoId: mobigo.id,
                  data: {
                    imis:              imis.trim(),
                    mobigo_sim_number: mobigoSimNumber.trim() ? "+254" + mobigoSimNumber.trim() : "",
                    sim_serial_number: simSerialNumber.trim(),
                    ba_msisdn:         baMsisdn.trim() ? "+254" + baMsisdn.trim() : "",
                    agent_msisdn:      agentMsisdn.trim() ? "+254" + agentMsisdn.trim() : "",
                    assigned_ba:       assignedBa ? Number(assignedBa) : null,
                    notes:             notes.trim(),
                  },
                });
                showSuccess("MobiGo updated successfully!");
                onClose();
              } catch (err: unknown) {
                const e = err as { response?: { data?: Record<string, unknown> } };
                const detail = e?.response?.data;
                const message = detail
                  ? parseMobiGoError(detail as Record<string, unknown>)
                  : "Failed to update MobiGo. Please try again.";
                setError(message);  // inline banner — visible at top of drawer
                showError(message); // toast — always visible regardless of scroll
              } finally {
                setLoading(false);
              }
            }}
            className="flex-1 flex items-center justify-center gap-2 rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50 hover:opacity-90 transition-opacity">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── MobiGo Details Drawer ────────────────────────────────────────────────────

function MobiGoDrawer({
  mobigo,
  onClose,
  baUsers,
}: {
  mobigo: MobiGo | null;
  onClose: () => void;
  baUsers: UserProfile[];
}) {
  if (!mobigo) return null;

  const baName = mobigo.assigned_ba_details?.full_name
    ?? (mobigo.assigned_ba
      ? userFullName(baUsers.find(u => u.id === mobigo.assigned_ba)!)
      : null);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-background/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm border-l border-border bg-card shadow-2xl flex flex-col">
        <div className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10">
              <Smartphone className="h-4 w-4 text-green-500" />
            </div>
            <h2 className="font-heading text-base font-semibold">MobiGo Details</h2>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Identity */}
          <div className="flex flex-col items-center text-center gap-2">
            <div className="h-14 w-14 rounded-xl bg-green-500/10 flex items-center justify-center">
              <Smartphone className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-base font-semibold text-foreground font-mono">{mobigo.imis || "—"}</p>
              <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                {mobigo.device_type === "mobigo" ? "MobiGo Device" : "Enrolled Phone"}
              </p>
              <div className="mt-1">
                <StatusBadge status={mobigo.is_active ? "activated" : "Inactive"} />
              </div>
            </div>
          </div>

          {/* Info rows */}
          <div className="space-y-3">
            {[
              { label: "SIM Serial Number", value: mobigo.sim_serial_number || "—", mono: true },
              { label: "MobiGo SIM Number", value: mobigo.mobigo_sim_number || "—", mono: true },
              { label: "BA MSISDN",          value: mobigo.ba_msisdn || "—",         mono: true },
              { label: "Agent MSISDN",       value: mobigo.agent_msisdn || "—",      mono: true },
            ].map(({ label, value, mono }) => (
              <div key={label} className="rounded-lg border border-border bg-background p-3">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className={cn("text-sm font-medium text-foreground mt-0.5", mono && "font-mono")}>{value}</p>
              </div>
            ))}

            {/* Assigned BA */}
            <div className="rounded-lg border border-border bg-background p-3">
              <div className="flex items-center gap-2 mb-1">
                <User className="h-3.5 w-3.5 text-pink-400" />
                <p className="text-xs text-muted-foreground">Assigned Brand Ambassador</p>
              </div>
              {baName ? (
                <p className="text-sm font-medium text-foreground">{baName}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">Unassigned</p>
              )}
            </div>

            {/* Notes */}
            {mobigo.notes && (
              <div className="rounded-lg border border-border bg-background p-3">
                <p className="text-xs text-muted-foreground">Notes</p>
                <p className="text-sm text-foreground mt-0.5">{mobigo.notes}</p>
              </div>
            )}

            {/* Meta */}
            <div className="rounded-lg border border-border bg-background p-3 space-y-2">
              <div>
                <p className="text-xs text-muted-foreground">MobiGo ID</p>
                <p className="text-sm font-medium text-foreground">#{mobigo.id}</p>
              </div>
              {mobigo.created_at && (
                <div>
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="text-sm font-medium text-foreground">
                    {new Date(mobigo.created_at).toLocaleDateString("en-KE", { year: "numeric", month: "long", day: "numeric" })}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── MobiGo Tab ───────────────────────────────────────────────────────────────

export function MobiGoTab({
  mobigos,
  isLoading,
  dealerId,
  baUsers,
  agentUsers,
  onAdd,
  onEdit,
  onViewDetails,
  onConfirm,
  showAdd,
}: {
  mobigos: MobiGo[];
  isLoading: boolean;
  dealerId?: number;
  baUsers: UserProfile[];
  agentUsers: UserProfile[];
  onAdd: () => void;
  onEdit: (m: MobiGo) => void;
  onViewDetails: (m: MobiGo) => void;
  onConfirm: (c: { type: "activate" | "deactivate" | "delete"; mobigo: MobiGo }) => void;
  showAdd: boolean;
}) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editMobiGo,    setEditMobiGo]    = useState<MobiGo | null>(null);
  const [activeMobiGo,  setActiveMobiGo]  = useState<MobiGo | null>(null);
  const [page,          setPage]          = useState(1);   
  const PAGE_SIZE = 20;                                    
  const totalPages = Math.ceil(mobigos.length / PAGE_SIZE);
  const paginatedMobigos = mobigos.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading text-lg font-semibold">MobiGo Devices</h3>
        {showAdd && (
          <button
            onClick={() => setShowAddDialog(true)}
            className="btn-press flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity">
            <Plus className="h-4 w-4" /> Add MobiGo
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total",    value: mobigos.length,                           color: "text-foreground"  },
          { label: "Active",   value: mobigos.filter(m =>  m.is_active).length, color: "text-success"     },
          { label: "Inactive", value: mobigos.filter(m => !m.is_active).length, color: "text-destructive" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-lg border border-border bg-accent/30 px-4 py-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={cn("text-xl font-bold mt-0.5", color)}>{value}</p>
          </div>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading MobiGo devices…</span>
        </div>
      )}

      {/* Table */}
      {!isLoading && (
        <>
          <div className="rounded-lg border border-border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-xs">
                  <th className="py-3 px-4 text-left font-medium">iMIS / IMEI</th>
                  <th className="py-3 px-4 text-left font-medium">SIM Serial</th>
                  <th className="py-3 px-4 text-left font-medium">BA MSISDN</th>
                  <th className="py-3 px-4 text-left font-medium">Agent MSISDN</th>
                  <th className="py-3 px-4 text-left font-medium">Assigned BA</th>
                  <th className="py-3 px-4 text-left font-medium">Type</th>
                  <th className="py-3 px-4 text-left font-medium">Status</th>
                  <th className="py-3 px-4 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {mobigos.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
                      No MobiGo devices yet. Add your first device.
                    </td>
                  </tr>
                ) : (
                  paginatedMobigos.map(m => {
                    const baName = m.assigned_ba_details?.full_name
                      ?? (m.assigned_ba
                        ? userFullName(baUsers.find(u => u.id === m.assigned_ba)!)
                        : null);
                    return (
                      <tr
                        key={m.id}
                        onClick={() => setActiveMobiGo(m)}
                        className={cn(
                          "border-b border-border/50 hover:bg-accent/40 transition-colors cursor-pointer",
                          !m.is_active && "opacity-60"
                        )}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                              <Smartphone className="h-3.5 w-3.5 text-green-500" />
                            </div>
                            <span className="font-mono text-xs text-foreground">{m.imis || "—"}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-muted-foreground">{m.sim_serial_number || "—"}</td>
                        <td className="py-3 px-4 font-mono text-xs text-muted-foreground">{m.ba_msisdn || "—"}</td>
                        <td className="py-3 px-4 font-mono text-xs text-muted-foreground">{m.agent_msisdn || "—"}</td>
                        <td className="py-3 px-4">
                          {baName ? (
                            <div className="flex items-center gap-1.5">
                              <div className="h-5 w-5 rounded-full bg-pink-500/15 flex items-center justify-center shrink-0">
                                <User className="h-3 w-3 text-pink-400" />
                              </div>
                              <span className="text-xs font-medium text-foreground">{baName}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Unassigned</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-medium",
                            m.device_type === "mobigo"
                              ? "bg-green-500/15 text-green-500"
                              : "bg-blue-500/15 text-blue-400"
                          )}>
                            {m.device_type === "mobigo" ? "MobiGo" : "Enrolled"}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={m.is_active ? "activated" : "Inactive"} />
                        </td>
                        <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setEditMobiGo(m)}
                              className="group relative p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                              <Edit2 className="h-3.5 w-3.5" />
                              <span className="absolute -top-7 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 transition-transform bg-popover border border-border text-foreground text-xs rounded px-1.5 py-0.5 whitespace-nowrap shadow-md">Edit</span>
                            </button>
                            <button
                              onClick={() => onConfirm({ type: m.is_active ? "deactivate" : "activate", mobigo: m })}
                              className={cn(
                                "group relative p-1.5 rounded-md transition-colors",
                                m.is_active ? "text-destructive hover:bg-destructive/10" : "text-success hover:bg-success/10"
                              )}>
                              {m.is_active ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                              <span className="absolute -top-7 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 transition-transform bg-popover border border-border text-foreground text-xs rounded px-1.5 py-0.5 whitespace-nowrap shadow-md">
                                {m.is_active ? "Deactivate" : "Activate"}
                              </span>
                            </button>
                            <button
                              onClick={() => onConfirm({ type: "delete", mobigo: m })}
                              className="group relative p-1.5 rounded-md text-destructive hover:bg-destructive/10 transition-colors">
                              <Trash2 className="h-3.5 w-3.5" />
                              <span className="absolute -top-7 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 transition-transform bg-popover border border-border text-foreground text-xs rounded px-1.5 py-0.5 whitespace-nowrap shadow-md">Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-muted-foreground">
              {mobigos.length} device{mobigos.length !== 1 ? "s" : ""} registered
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent disabled:opacity-50 transition-colors">
                  Prev
                </button>
                <span className="text-xs text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent disabled:opacity-50 transition-colors">
                  Next
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Dialogs & Drawers */}
      <AddMobiGoDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onSuccess={() => { setShowAddDialog(false); }}
        dealerId={dealerId}
        baUsers={baUsers}
        agentUsers={agentUsers}
      />

      {editMobiGo && dealerId && (
        <EditMobiGoDrawer
          mobigo={editMobiGo}
          dealerId={dealerId}
          onClose={() => setEditMobiGo(null)}
          baUsers={baUsers}
          agentUsers={agentUsers}
        />
      )}

      <MobiGoDrawer
        mobigo={activeMobiGo}
        onClose={() => setActiveMobiGo(null)}
        baUsers={baUsers}
      />
    </div>
  );
}