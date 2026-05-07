// src/pages/BADashboard.tsx
import { useState, useMemo } from "react";
import {
  Search, UserPlus, X, Smartphone, AlertTriangle, CheckCircle2,
  Loader2, AlertCircle, Truck, UserCheck, UserX, Building2,
  Phone, Mail, User, Eye, EyeOff, Lock, Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useUsers, useCreateUser, useDeactivateUser, useActivateUser } from "@/hooks/useUsers";
import { useBranches, useAllVanTeams, useAddVanTeamMember } from "@/hooks/useDealers";
import { useMobiGos, useCreateMobiGo } from "@/hooks/useMobigo";
import { showSuccess, showError } from "@/lib/toast";
import { StatusBadge } from "@/components/StatusBadge";
import type { UserProfile, UserRole } from "@/types/auth.types";
import type { VanTeam, Branch, MobiGo, MobiGoDeviceType, CreateMobiGoRequest } from "@/types/dealers.types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function userFullName(u: UserProfile) {
  return [u.first_name, u.last_name].filter(Boolean).join(" ") || u.email;
}

function userInitials(u: UserProfile) {
  const parts = [u.first_name, u.last_name].filter(Boolean);
  return parts.length
    ? parts.map(p => p[0]).join("").slice(0, 2).toUpperCase()
    : u.email.slice(0, 2).toUpperCase();
}

// ── MobiGo error parser (same as MobiGoTab) ───────────────────────────────────

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

// ── Role config ───────────────────────────────────────────────────────────────

const PAGE_TITLE: Record<string, string> = {
  dealer_owner:       "All Brand Ambassadors",
  operations_manager: "All Brand Ambassadors",
  branch_manager:     "My BAs",
  van_team_leader:    "My BAs",
  finance:            "All Brand Ambassadors",
};

const CAN_ADD_BA = new Set(["dealer_owner", "operations_manager", "branch_manager", "van_team_leader"]);
const CAN_TOGGLE = new Set(["dealer_owner", "operations_manager", "branch_manager", "van_team_leader"]);
const CAN_MOBIGO = new Set(["dealer_owner", "operations_manager", "branch_manager"]);

// ── Issue MobiGo Dialog (full form, identical logic to MobiGoTab) ─────────────

function IssueMobiGoDialog({
  open, onClose, onSuccess, dealerId, ba,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  dealerId: number;
  ba: UserProfile;
}) {
  const [deviceType,      setDeviceType]      = useState<MobiGoDeviceType>("mobigo");
  const [imis,            setImis]            = useState("");
  const [mobigoSimNumber, setMobigoSimNumber] = useState("");
  const [simSerialNumber, setSimSerialNumber] = useState("");
  const [baMsisdn,        setBaMsisdn]        = useState(ba.phone?.replace("+254", "") ?? "");
  const [agentMsisdn,     setAgentMsisdn]     = useState("");
  const [notes,           setNotes]           = useState("");
  const [apiError,        setApiError]        = useState("");

  const createMobiGo = useCreateMobiGo();

  if (!open) return null;

  const isValid = imis.trim() && simSerialNumber.trim() && baMsisdn.trim();
  const loading  = createMobiGo.isPending;

  const handleAdd = async () => {
    if (!isValid) return;
    setApiError("");
    try {
      await createMobiGo.mutateAsync({
        dealerId,
        data: {
          device_type:       deviceType,
          imis:              imis.trim(),
          mobigo_sim_number: mobigoSimNumber.trim() ? "+254" + mobigoSimNumber.replace(/\D/g, "") : "",
          sim_serial_number: simSerialNumber.trim(),
          ba_msisdn:         "+254" + baMsisdn.replace(/\D/g, ""),
          agent_msisdn:      agentMsisdn.trim() ? "+254" + agentMsisdn.replace(/\D/g, "") : "",
          assigned_ba:       ba.id,
          notes:             notes.trim(),
        } as CreateMobiGoRequest,
      });
      showSuccess(`MobiGo issued to ${userFullName(ba)} successfully!`);
      onSuccess();
      reset();
    } catch (err: unknown) {
      const e = err as { response?: { data?: Record<string, unknown> }; message?: string };
      const detail = e?.response?.data;
      const message = detail && typeof detail === "object"
        ? parseMobiGoError(detail as Record<string, unknown>)
        : e?.message ?? "Failed to issue MobiGo device.";
      setApiError(message);
      showError(message);
    }
  };

  const reset = () => {
    setDeviceType("mobigo"); setImis(""); setMobigoSimNumber("");
    setSimSerialNumber(""); setBaMsisdn(ba.phone?.replace("+254", "") ?? "");
    setAgentMsisdn(""); setNotes(""); setApiError("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={reset} />
      <div className="relative w-full max-w-md rounded-xl border border-border bg-card shadow-2xl max-h-[90vh] overflow-y-auto">

        <div className="flex items-center justify-between border-b border-border px-6 py-4 sticky top-0 bg-card z-10">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10">
              <Smartphone className="h-4 w-4 text-green-500" />
            </div>
            <div>
              <h3 className="font-heading text-base font-semibold">Issue MobiGo Device</h3>
              <p className="text-xs text-muted-foreground">to {userFullName(ba)}</p>
            </div>
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
              <button onClick={() => setDeviceType("mobigo")}
                className={cn("flex-1 py-2 font-medium transition-colors",
                  deviceType === "mobigo" ? "bg-primary text-primary-foreground" : "bg-accent text-muted-foreground")}>
                MobiGo Device
              </button>
              <button onClick={() => setDeviceType("enrolled_phone")}
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
              <input value={imis} onChange={e => setImis(e.target.value.replace(/\D/g, ""))}
                placeholder="354123456789012" maxLength={15}
                className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              <p className="text-xs text-muted-foreground mt-1">Dial *#06# or check device box.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                SIM Serial Number <span className="text-destructive">*</span>
              </label>
              <input value={simSerialNumber} onChange={e => setSimSerialNumber(e.target.value)}
                placeholder="e.g. 8925401234567890123"
                className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              <p className="text-xs text-muted-foreground mt-1">Used to match Safaricom report rows (Column F).</p>
            </div>
            {deviceType === "mobigo" && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  MobiGo SIM Number
                  <span className="text-xs font-normal text-muted-foreground ml-1">(internet SIM inside device)</span>
                </label>
                <div className="flex">
                  <span className="inline-flex items-center rounded-l-md border border-r-0 border-border bg-accent/60 px-2 text-xs text-muted-foreground">+254</span>
                  <input value={mobigoSimNumber} onChange={e => setMobigoSimNumber(e.target.value.replace(/\D/g, ""))}
                    placeholder="7XX XXX XXX" maxLength={9}
                    className="w-full rounded-r-md border border-border bg-accent py-2 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
              </div>
            )}
          </div>

          {/* MSISDNs */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">MSISDN Numbers</p>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                BA MSISDN <span className="text-destructive">*</span>
                <span className="text-xs font-normal text-muted-foreground ml-1">(BA's personal Safaricom number)</span>
              </label>
              <div className="flex">
                <span className="inline-flex items-center rounded-l-md border border-r-0 border-border bg-accent/60 px-2 text-xs text-muted-foreground">+254</span>
                <input value={baMsisdn} onChange={e => setBaMsisdn(e.target.value.replace(/\D/g, ""))}
                  placeholder="7XX XXX XXX" maxLength={9}
                  className="w-full rounded-r-md border border-border bg-accent py-2 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Agent MSISDN
                <span className="text-xs font-normal text-muted-foreground ml-1">(outlet/dealer shop number)</span>
              </label>
              <div className="flex">
                <span className="inline-flex items-center rounded-l-md border border-r-0 border-border bg-accent/60 px-2 text-xs text-muted-foreground">+254</span>
                <input value={agentMsisdn} onChange={e => setAgentMsisdn(e.target.value.replace(/\D/g, ""))}
                  placeholder="7XX XXX XXX" maxLength={9}
                  className="w-full rounded-r-md border border-border bg-accent py-2 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
            </div>
          </div>

          {/* Pre-filled BA */}
          <div className="rounded-lg border border-border bg-background p-3 flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-pink-500/15 flex items-center justify-center text-xs font-semibold text-pink-400 shrink-0">
              {userInitials(ba)}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Assigning to</p>
              <p className="text-sm font-medium text-foreground">{userFullName(ba)}</p>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Notes <span className="text-xs font-normal text-muted-foreground">(optional)</span>
            </label>
            <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Issued on 1 May 2026, screen protector applied"
              className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
          </div>
        </div>

        <div className="flex gap-2 border-t border-border px-6 py-4 sticky bottom-0 bg-card">
          <button onClick={reset} disabled={loading}
            className="flex-1 rounded-md border border-border py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button onClick={handleAdd} disabled={!isValid || loading}
            className="flex-1 flex items-center justify-center gap-2 rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Issuing…" : "Issue MobiGo"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Create BA Dialog (MyVans pattern) ─────────────────────────────────────────

function CreateBADialog({
  open, onClose, onSuccess, dealerId, branchId, vans, autoAssignVan,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  dealerId: number;
  branchId: number;
  vans: VanTeam[];
  autoAssignVan?: VanTeam;
}) {
  const [name,          setName]          = useState("");
  const [email,         setEmail]         = useState("");
  const [phone,         setPhone]         = useState("");
  const [password,      setPassword]      = useState("");
  const [showPassword,  setShowPassword]  = useState(false);
  const [selectedVanId, setSelectedVanId] = useState("");
  const [apiError,      setApiError]      = useState("");

  const createUser = useCreateUser();
  const addMember  = useAddVanTeamMember();

  if (!open) return null;

  const isVanLeader = !!autoAssignVan;
  const targetVan   = isVanLeader ? autoAssignVan : vans.find(v => String(v.id) === selectedVanId);
  const vanOptions  = vans.filter(v => v.is_active);

  const isValid =
    name.trim().length >= 2 &&
    email.trim().includes("@") &&
    phone.trim().length >= 9 &&
    password.trim().length >= 6 &&
    (isVanLeader || !!selectedVanId);

  const loading = createUser.isPending || addMember.isPending;

  const handleSubmit = async () => {
    if (!isValid || !targetVan) return;
    setApiError("");
    const [first_name, ...rest] = name.trim().split(" ");
    const last_name = rest.join(" ") || "-";
    try {
      const newUser = await createUser.mutateAsync({
        email:      email.trim(),
        password:   password.trim(),
        first_name,
        last_name,
        phone:      "+254" + phone.replace(/\D/g, ""),
        role:       "brand_ambassador" as UserRole,
        dealer_id:  dealerId,
      });
      await addMember.mutateAsync({
        dealerId,
        branchId,
        teamId: targetVan.id,
        data:   { agent: newUser.id },
      });
      showSuccess(`${name.trim()} created and added to ${targetVan.name}`);
      reset();
      onSuccess();
    } catch (err: unknown) {
      const e = err as { response?: { data?: Record<string, unknown> }; message?: string };
      const detail = e?.response?.data;
      if (detail && typeof detail === "object") {
        const messages = Object.entries(detail)
          .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(", ") : String(msgs)}`)
          .join(" | ");
        setApiError(messages);
      } else {
        setApiError(e?.message ?? "Failed to create brand ambassador.");
      }
    }
  };

  const reset = () => {
    setName(""); setEmail(""); setPhone(""); setPassword("");
    setShowPassword(false); setSelectedVanId(""); setApiError("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={reset} />
      <div className="relative w-full max-w-md rounded-xl border border-border bg-card shadow-2xl max-h-[90vh] overflow-y-auto">

        <div className="flex items-center justify-between border-b border-border px-6 py-4 sticky top-0 bg-card z-10">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-500/10">
              <UserCheck className="h-4 w-4 text-pink-400" />
            </div>
            <div>
              <h3 className="font-heading text-base font-semibold">New Brand Ambassador</h3>
              {targetVan && (
                <p className="text-xs text-muted-foreground">
                  Will be assigned to <span className="font-medium text-foreground">{targetVan.name}</span>
                </p>
              )}
            </div>
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

          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Personal Details</p>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                <User className="inline h-3.5 w-3.5 mr-1 text-muted-foreground" />
                Full Name <span className="text-destructive">*</span>
              </label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Alice Wanjiku"
                className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                <Phone className="inline h-3.5 w-3.5 mr-1 text-muted-foreground" />
                Phone <span className="text-destructive">*</span>
              </label>
              <div className="flex">
                <span className="inline-flex items-center rounded-l-md border border-r-0 border-border bg-accent/60 px-2 text-xs text-muted-foreground">+254</span>
                <input value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ""))}
                  placeholder="7XX XXX XXX" maxLength={9}
                  className="w-full rounded-r-md border border-border bg-accent py-2 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Account Credentials</p>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                <Mail className="inline h-3.5 w-3.5 mr-1 text-muted-foreground" />
                Email Address <span className="text-destructive">*</span>
              </label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="alice@example.com"
                className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                <Lock className="inline h-3.5 w-3.5 mr-1 text-muted-foreground" />
                Temporary Password <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} value={password}
                  onChange={e => setPassword(e.target.value)} placeholder="Min. 6 characters"
                  className="w-full rounded-md border border-border bg-accent py-2 pl-3 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                <button type="button" onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">The user can change this after first login.</p>
            </div>
          </div>

          {/* Van picker — branch_manager only */}
          {!isVanLeader && (
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Van Assignment</p>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  <Truck className="inline h-3.5 w-3.5 mr-1 text-muted-foreground" />
                  Assign to Van <span className="text-destructive">*</span>
                </label>
                <select value={selectedVanId} onChange={e => setSelectedVanId(e.target.value)}
                  className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                  <option value="">— Select a van —</option>
                  {vanOptions.map(v => (
                    <option key={v.id} value={String(v.id)}>
                      {v.name}
                      {v.leader_details?.full_name ? ` — Leader: ${v.leader_details.full_name}` : " — No leader"}
                      {" "}({v.members?.length ?? 0} members)
                    </option>
                  ))}
                </select>
                {vanOptions.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1">No active vans in this branch.</p>
                )}
              </div>
            </div>
          )}

          {/* Auto-assign info for van leader */}
          {isVanLeader && autoAssignVan && (
            <div className="rounded-lg border border-border bg-accent/30 px-4 py-3 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 shrink-0">
                <Truck className="h-4 w-4 text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Will be added to</p>
                <p className="text-sm font-medium text-foreground">{autoAssignVan.name}</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 border-t border-border px-6 py-4 sticky bottom-0 bg-card">
          <button onClick={reset} disabled={loading}
            className="flex-1 rounded-md border border-border py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={!isValid || loading}
            className="flex-1 flex items-center justify-center gap-2 rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Creating…" : "Create & Assign"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── BA Detail Drawer (right-side, same pattern as Settings UserDrawer) ────────

function BADetailDrawer({
  ba, vanTeams, branches, mobigos, dealerId, onClose, role, onToggleActive, toggling,
}: {
  ba: UserProfile;
  vanTeams: VanTeam[];
  branches: Branch[];
  mobigos: MobiGo[];
  dealerId: number;
  onClose: () => void;
  role: string;
  onToggleActive: (ba: UserProfile) => void;
  toggling: boolean;
}) {
  const [showIssueMobiGo, setShowIssueMobiGo] = useState(false);

  const memberVan    = vanTeams.find(v => v.members?.some(m => String(m.agent) === String(ba.id)));
  const memberBranch = memberVan ? branches.find(b => b.id === memberVan.branch) : null;
  const device       = mobigos.find(m => m.assigned_ba === Number(ba.id));
  const initials     = userInitials(ba);
  const fullName     = userFullName(ba);
  const canIssueMobiGo = CAN_MOBIGO.has(role) && !device;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-background/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm border-l border-border bg-card shadow-2xl flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0">
          <h2 className="font-heading text-base font-semibold text-foreground">BA Details</h2>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Identity */}
          <div className="flex flex-col items-center text-center gap-3">
            <div className="h-16 w-16 rounded-full bg-pink-500/10 flex items-center justify-center text-xl font-semibold text-pink-400">
              {initials}
            </div>
            <div>
              <p className="text-base font-semibold text-foreground">{fullName}</p>
              <span className="mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium bg-pink-500/15 text-pink-400">
                Brand Ambassador
              </span>
            </div>
          </div>

          {/* Contact & info rows */}
          <div className="space-y-3">
            {[
              { icon: Mail,  label: "Email", value: ba.email        },
              { icon: Phone, label: "Phone", value: ba.phone || "—" },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
                <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-sm font-medium text-foreground break-all">{value}</p>
                </div>
              </div>
            ))}

            {/* Status */}
            <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
              <div className={cn("h-2 w-2 rounded-full shrink-0", ba.is_active ? "bg-success" : "bg-destructive")} />
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <p className={cn("text-sm font-medium", ba.is_active ? "text-success" : "text-destructive")}>
                  {ba.is_active ? "Active" : "Inactive"}
                </p>
              </div>
            </div>

            {/* Joined */}
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-xs text-muted-foreground">Joined</p>
              <p className="text-sm font-medium text-foreground">
                {ba.date_joined
                  ? new Date(ba.date_joined).toLocaleDateString("en-KE", { year: "numeric", month: "long", day: "numeric" })
                  : "—"}
              </p>
            </div>

            {/* Van assignment */}
            <div className="rounded-lg border border-border bg-background p-3">
              <div className="flex items-center gap-2 mb-1">
                <Truck className="h-3.5 w-3.5 text-pink-400" />
                <p className="text-xs text-muted-foreground">Van Team Assignment</p>
              </div>
              {memberVan ? (
                <div>
                  <p className="text-sm font-medium text-foreground">{memberVan.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Branch: {memberBranch?.name ?? "—"}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">Not assigned to any van team</p>
              )}
            </div>

            {/* MobiGo Device */}
            <div className="rounded-lg border border-border bg-background p-3">
              <div className="flex items-center gap-2 mb-1">
                <Smartphone className="h-3.5 w-3.5 text-green-500" />
                <p className="text-xs text-muted-foreground">MobiGo Device</p>
              </div>
              {device ? (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground font-mono">{device.imis || "—"}</p>
                  <p className="text-xs text-muted-foreground">SIM Serial: {device.sim_serial_number || "—"}</p>
                  <p className="text-xs text-muted-foreground">
                    Type: {device.device_type === "mobigo" ? "MobiGo Device" : "Enrolled Phone"}
                  </p>
                  <StatusBadge status={device.is_active ? "activated" : "Inactive"} />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No MobiGo assigned</p>
              )}
            </div>
          </div>

          {/* Issue MobiGo button */}
          {canIssueMobiGo && (
            <button
              onClick={() => setShowIssueMobiGo(true)}
              className="w-full flex items-center justify-center gap-2 rounded-md bg-green-500/10 border border-green-500/30 px-4 py-2.5 text-sm font-semibold text-green-500 hover:bg-green-500/20 transition-colors"
            >
              <Smartphone className="h-4 w-4" />
              Issue MobiGo Device
            </button>
          )}

          {/* Already has device */}
          {device && CAN_MOBIGO.has(role) && (
            <div className="rounded-lg border border-border bg-accent/30 px-4 py-3 text-xs text-muted-foreground text-center">
              Device already issued. Edit it in Settings → MobiGo Devices.
            </div>
          )}
        </div>

        {/* Footer */}
        {CAN_TOGGLE.has(role) && (
          <div className="flex gap-2 border-t border-border px-6 py-4 shrink-0">
            <button onClick={onClose}
              className="flex-1 rounded-md border border-border py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors">
              Close
            </button>
            <button onClick={() => onToggleActive(ba)} disabled={toggling}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 rounded-md py-2 text-sm font-semibold transition-opacity disabled:opacity-50",
                ba.is_active
                  ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                  : "bg-success/10 text-success hover:bg-success/20"
              )}>
              {toggling && <Loader2 className="h-4 w-4 animate-spin" />}
              {ba.is_active ? <><UserX className="h-4 w-4" /> Deactivate</> : <><UserCheck className="h-4 w-4" /> Activate</>}
            </button>
          </div>
        )}
        {!CAN_TOGGLE.has(role) && (
          <div className="border-t border-border px-6 py-4 shrink-0">
            <button onClick={onClose}
              className="w-full rounded-md border border-border py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors">
              Close
            </button>
          </div>
        )}
      </div>

      {/* Issue MobiGo — z-[60] floats above the drawer */}
      {showIssueMobiGo && (
        <IssueMobiGoDialog
          open={showIssueMobiGo}
          onClose={() => setShowIssueMobiGo(false)}
          onSuccess={() => setShowIssueMobiGo(false)}
          dealerId={dealerId}
          ba={ba}
        />
      )}
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function BADashboard() {
  const { user } = useAuth();
  const role       = user?.role ?? "dealer_owner";
  const dealerId   = user?.dealer_id   ? Number(user.dealer_id)   : undefined;
  const branchId   = user?.branch_id   ? Number(user.branch_id)   : undefined;
  const vanTeamId  = user?.van_team_id ? Number(user.van_team_id) : undefined;

  const [search,     setSearch]     = useState("");
  const [selectedBA, setSelectedBA] = useState<UserProfile | null>(null);
  const [showAddBA,  setShowAddBA]  = useState(false);
  const [toggling,   setToggling]   = useState(false);

  // ── Fetch BAs — same pattern as Settings UsersTab ─────────────────────────
  const { data: baData, isLoading, isError, refetch } = useUsers({
    role: "brand_ambassador",
    ...(dealerId ? { dealer_id: dealerId } : {}),
  });
  const allBAs = useMemo<UserProfile[]>(() => baData?.results ?? [], [baData]);

  // ── Branches & van teams ──────────────────────────────────────────────────
  const { data: branchesData } = useBranches(dealerId);
  const branches = useMemo<Branch[]>(() => branchesData ?? [], [branchesData]);

  const scopedBranches = useMemo(() => {
    if (role === "branch_manager" && branchId) return branches.filter(b => b.id === branchId);
    return branches;
  }, [branches, role, branchId]);

  const { data: vanTeams = [] } = useAllVanTeams(dealerId, scopedBranches);

  // ── MobiGos — same as Settings ────────────────────────────────────────────
  const { data: mobigoData } = useMobiGos(dealerId);
  const mobigos = useMemo<MobiGo[]>(() => mobigoData ?? [], [mobigoData]);

  // ── Scope BAs by role ─────────────────────────────────────────────────────
  const scopedBAs = useMemo(() => {
    if (role === "branch_manager" && branchId) {
      const branchVanIds = new Set(vanTeams.filter(v => v.branch === branchId).map(v => v.id));
      return allBAs.filter(ba =>
        vanTeams.some(v =>
          branchVanIds.has(v.id) &&
          v.members?.some(m => String(m.agent) === String(ba.id))
        )
      );
    }
    if (role === "van_team_leader" && vanTeamId) {
      const myVan = vanTeams.find(v => v.id === vanTeamId);
      const myMemberIds = new Set((myVan?.members ?? []).map(m => String(m.agent)));
      return allBAs.filter(ba => myMemberIds.has(String(ba.id)));
    }
    return allBAs;
  }, [allBAs, vanTeams, role, branchId, vanTeamId]);

  // ── Search ────────────────────────────────────────────────────────────────
  const filteredBAs = useMemo(() => {
    if (!search) return scopedBAs;
    const q = search.toLowerCase();
    return scopedBAs.filter(ba =>
      userFullName(ba).toLowerCase().includes(q) ||
      ba.phone?.includes(q) ||
      ba.email.toLowerCase().includes(q)
    );
  }, [scopedBAs, search]);

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const totalBAs    = scopedBAs.length;
  const activeBAs   = scopedBAs.filter(ba =>  ba.is_active).length;
  const inactiveBAs = scopedBAs.filter(ba => !ba.is_active).length;
  const assignedIds = new Set(vanTeams.flatMap(v => (v.members ?? []).map(m => String(m.agent))));
  const unassigned  = scopedBAs.filter(ba => !assignedIds.has(String(ba.id))).length;

  // ── Toggle active/inactive ────────────────────────────────────────────────
  const deactivate = useDeactivateUser();
  const activate   = useActivateUser();

  const handleToggleActive = async (ba: UserProfile) => {
    setToggling(true);
    try {
      if (ba.is_active) {
        await deactivate.mutateAsync(ba.id);
        showSuccess(`${userFullName(ba)} deactivated.`);
      } else {
        await activate.mutateAsync(ba.id);
        showSuccess(`${userFullName(ba)} activated.`);
      }
      setSelectedBA(null);
    } catch {
      showError("Failed to update BA status.");
    } finally {
      setToggling(false);
    }
  };

  // ── Derive van/branch per BA for table ────────────────────────────────────
  const getBaVan    = (ba: UserProfile) => vanTeams.find(v => v.members?.some(m => String(m.agent) === String(ba.id)));
  const getBaBranch = (ba: UserProfile) => { const van = getBaVan(ba); return van ? branches.find(b => b.id === van.branch) : undefined; };

  // ── Add BA dialog props ───────────────────────────────────────────────────
  const myVan          = vanTeamId ? vanTeams.find(v => v.id === vanTeamId) : undefined;
  const addBranchId    = branchId ?? myVan?.branch;
  const myBranchVans   = vanTeams.filter(v => addBranchId ? v.branch === addBranchId : true);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">{PAGE_TITLE[role] ?? "Brand Ambassadors"}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Dashboard › Brand Ambassadors</p>
        </div>
        {CAN_ADD_BA.has(role) && dealerId && addBranchId && (
          <button
            onClick={() => setShowAddBA(true)}
            className="btn-press flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <UserPlus className="h-4 w-4" /> Add BA
          </button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-lg border border-border bg-card px-4 py-4">
          <p className="text-xs text-muted-foreground mb-1">Total BAs</p>
          <p className="text-2xl font-bold font-heading text-foreground">{totalBAs}</p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-4">
          <p className="text-xs text-muted-foreground mb-1">Active</p>
          <p className="text-2xl font-bold font-heading text-success">{activeBAs}</p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-4">
          <p className="text-xs text-muted-foreground mb-1">Inactive</p>
          <p className={cn("text-2xl font-bold font-heading", inactiveBAs > 0 ? "text-destructive" : "text-foreground")}>{inactiveBAs}</p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-4">
          <p className="text-xs text-muted-foreground mb-1">Unassigned</p>
          <p className={cn("text-2xl font-bold font-heading", unassigned > 0 ? "text-warning" : "text-foreground")}>{unassigned}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, phone, email..."
          className="w-full rounded-md border border-border bg-accent py-2 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading brand ambassadors…</span>
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Failed to load brand ambassadors.</span>
          <button onClick={() => refetch()} className="ml-auto underline text-xs">Retry</button>
        </div>
      )}

      {/* Table */}
      {!isLoading && !isError && (
        <>
          <div className="rounded-lg border border-border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-xs">
                  <th className="py-3 px-4 text-left font-medium">User</th>
                  <th className="py-3 px-4 text-left font-medium">Phone</th>
                  {(role === "dealer_owner" || role === "operations_manager" || role === "finance") && (
                    <th className="py-3 px-4 text-left font-medium">Branch</th>
                  )}
                  {role !== "van_team_leader" && (
                    <th className="py-3 px-4 text-left font-medium">Van</th>
                  )}
                  <th className="py-3 px-4 text-left font-medium">MobiGo</th>
                  <th className="py-3 px-4 text-left font-medium">Status</th>
                  <th className="py-3 px-4 text-left font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {filteredBAs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                      {search ? `No BAs match "${search}".` : "No brand ambassadors found."}
                    </td>
                  </tr>
                ) : (
                  filteredBAs.map((ba, i) => {
                    const van      = getBaVan(ba);
                    const branch   = getBaBranch(ba);
                    const device   = mobigos.find(m => m.assigned_ba === Number(ba.id));
                    const initials = userInitials(ba);
                    const fullName = userFullName(ba);

                    return (
                      <tr
                        key={ba.id}
                        onClick={() => setSelectedBA(ba)}
                        className={cn(
                          "border-b border-border/50 hover:bg-accent/40 transition-colors cursor-pointer",
                          i % 2 === 0 ? "bg-accent/10" : "",
                          !ba.is_active && "opacity-60"
                        )}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-full bg-pink-500/15 flex items-center justify-center text-xs font-semibold text-pink-400 shrink-0">
                              {initials}
                            </div>
                            <div>
                              <p className="font-medium text-foreground text-sm">{fullName}</p>
                              <p className="text-xs text-muted-foreground">{ba.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">{ba.phone || "—"}</td>
                        {(role === "dealer_owner" || role === "operations_manager" || role === "finance") && (
                          <td className="py-3 px-4 text-xs text-muted-foreground">
                            {branch ? <div className="flex items-center gap-1"><Building2 className="h-3 w-3" />{branch.name}</div> : "—"}
                          </td>
                        )}
                        {role !== "van_team_leader" && (
                          <td className="py-3 px-4 text-xs text-muted-foreground">
                            {van
                              ? <div className="flex items-center gap-1"><Truck className="h-3 w-3" />{van.name}</div>
                              : <span className="text-warning italic">Unassigned</span>
                            }
                          </td>
                        )}
                        <td className="py-3 px-4">
                          {device ? (
                            <div className="flex items-center gap-1.5">
                              <div className="h-5 w-5 rounded-md bg-green-500/10 flex items-center justify-center shrink-0">
                                <Smartphone className="h-3 w-3 text-green-500" />
                              </div>
                              <span className="text-xs font-mono text-muted-foreground truncate max-w-[80px]">{device.imis}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className={cn("flex items-center gap-1 text-xs font-medium w-fit",
                            ba.is_active ? "text-success" : "text-destructive")}>
                            {ba.is_active
                              ? <><CheckCircle2 className="h-3.5 w-3.5" /> Active</>
                              : <><AlertTriangle className="h-3.5 w-3.5" /> Inactive</>
                            }
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">
                          {ba.date_joined ? new Date(ba.date_joined).toLocaleDateString("en-KE") : "—"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">
            {filteredBAs.length} of {scopedBAs.length} BA{scopedBAs.length !== 1 ? "s" : ""}
            {search && ` matching "${search}"`}
          </p>
        </>
      )}

      {/* BA Detail Drawer */}
      {selectedBA && dealerId && (
        <BADetailDrawer
          ba={selectedBA}
          vanTeams={vanTeams}
          branches={branches}
          mobigos={mobigos}
          dealerId={dealerId}
          onClose={() => setSelectedBA(null)}
          role={role}
          onToggleActive={handleToggleActive}
          toggling={toggling}
        />
      )}

      {/* Create BA Dialog */}
      {showAddBA && dealerId && addBranchId && (
        <CreateBADialog
          open={showAddBA}
          onClose={() => setShowAddBA(false)}
          onSuccess={() => setShowAddBA(false)}
          dealerId={dealerId}
          branchId={addBranchId}
          vans={myBranchVans}
          autoAssignVan={role === "van_team_leader" ? myVan : undefined}
        />
      )}
    </div>
  );
}