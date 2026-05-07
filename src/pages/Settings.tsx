// src/pages/Settings.tsx
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/contexts/AuthContext";
import { useUsers, useCreateUser, useDeactivateUser, useActivateUser, useUpdateUser, useDeleteUser } from "@/hooks/useUsers";
import { useSendEmail } from "@/hooks/useNotifications";
import { showSuccess, showError, errorMessages, successMessages } from "@/lib/toast";
import type { Branch, VanTeam, MobiGo } from "@/types/dealers.types";
import type { CommissionRule } from "@/types/commissions.types";
import type { UserRole, UserProfile } from "@/types/auth.types";
import { useExternalAgents, useCreateExternalAgent } from "@/hooks/useExternalAgents";
import type { BusinessType } from "@/types/dealers.types";
import { useTheme } from "@/contexts/ThemeContext";
import {
  X, Plus, Truck, Users, Building2, Smartphone,
  User, Phone, Hash, Briefcase, MapPin, ShieldAlert,
  Mail, Lock, Eye, EyeOff, Loader2, AlertCircle,
  Search, CheckCircle2, XCircle, Edit2, UserX, UserCheck, Trash2,
  AlertTriangle, Save, ToggleLeft, ToggleRight,
  DollarSign, Moon, Sun, Monitor, Store,
} from "lucide-react";

import {
  useDealers, useDealer,
  useBranches, useCreateBranch, useCreateVanTeam, useAllVanTeams,
  useUpdateVanTeam, useUpdateBranch, useAddVanTeamMember, useRemoveVanTeamMember,
  useDeactivateBranch, useActivateBranch, useDeleteBranch,         
  useDeactivateVanTeam, useActivateVanTeam, useDeleteVanTeam,
  useUpdateDealer,     
} from "@/hooks/useDealers";
import { useCommissionRules, useCreateCommissionRule, useToggleCommissionRule, useDeleteCommissionRule } from "@/hooks/useCommissions";
import { useDeductionRules, useCreateDeductionRule, useToggleDeductionRule, useDeleteDeductionRule } from "@/hooks/useCommissions";
import type { DeductionRule } from "@/types/commissions.types";
import { useMobiGos, useCreateMobiGo, useUpdateMobiGo, useDeactivateMobiGo, useActivateMobiGo, useDeleteMobiGo } from "@/hooks/useMobigo";
import { MobiGoTab } from "@/components/MobiGoTab";
import { NotificationsTab } from "@/components/NotificationsTab";
import {
  AddBranchDialog,
  AddCommissionRuleDialog,
  AddDeductionRuleDialog,
  AddVanDialog,
  type BranchFormData,
  type CommissionRuleFormData,
  type VanFormData,
} from "@/components/dialog";

// ─── Tab order ────────────────────────────────────────────────────────────────

const TABS = [
  { id: "dealer",        label: "Dealer Profile",    permission: "canViewDealerProfile"   },
  { id: "dealer",        label: "Dealer Profile",    permission: "canEditDealerProfile"   },
  { id: "branches",      label: "Branches",          permission: "canManageBranches"      },
  { id: "vans",          label: "Vans",              permission: "canManageVans"          },
  { id: "mobigo",        label: "MobiGo Devices",    permission: "canManageAssets" },
  { id: "users",         label: "Users & Roles",     permission: "canManageUsers"         },
  { id: "commission",    label: "Commission Rules",  permission: "canManageCommission"    },
  { id: "notifications", label: "Notifications",     permission: "canManageNotifications" },
];

// ─── Permission matrix ────────────────────────────────────────────────────────

const SETTINGS_PERMISSIONS = {
  dealer_owner: {
    canView: true,
    canViewDealerProfile: true,
    canEditDealerProfile: false,
    canManageBranches: true,
    canManageVans: true,
    canManageAssets: true,
    canManageUsers: true,
    canManageCommission: true,
    canManageNotifications: true,
    canBypassManagerConflict: true,
  },
  operations_manager: {
    canView: true,
    canViewDealerProfile: true,
    canEditDealerProfile: false,
    canManageBranches: true,
    canManageVans: true,
    canManageAssets: true,
    canManageUsers: true,
    canManageCommission: false,
    canManageNotifications: true,
    canBypassManagerConflict: false,
  },
  branch_manager: {
    canView: true,
    canViewDealerProfile: false,
    canEditDealerProfile: false,
    canManageBranches: false,
    canManageVans: true,
    canManageAssets: true,
    canManageUsers: true,
    canManageCommission: false,
    canManageNotifications: false,
    canBypassManagerConflict: false,
  },
  van_team_leader: {
    canView: true,
    canViewDealerProfile: false,
    canEditDealerProfile: false,
    canManageBranches: false,
    canManageVans: false,
    canManageAssets: true,
    canManageUsers: true,
    canManageCommission: false,
    canManageNotifications: false,
    canBypassManagerConflict: false,
  },
  brand_ambassador: {
    canView: false,
    canViewDealerProfile: false,
    canEditDealerProfile: false,
    canManageBranches: false,
    canManageVans: false,
    canManageAssets: false,
    canManageUsers: false,
    canManageCommission: false,
    canManageNotifications: false,
    canBypassManagerConflict: false,
  },
  external_agent: {
    canView: false,
    canViewDealerProfile: false,
    canEditDealerProfile: false,
    canManageBranches: false,
    canManageVans: false,
    canManageAssets: false,
    canManageUsers: false,
    canManageCommission: false,
    canManageNotifications: false,
    canBypassManagerConflict: false,
  },
  finance: {
    canView: true,
    canViewDealerProfile: false,
    canEditDealerProfile: false,
    canManageBranches: false,
    canManageVans: false,
    canManageAssets: false,
    canManageUsers: false,
    canManageCommission: true,
    canManageNotifications: false,
    canBypassManagerConflict: false,
  },
};

// ─── Static data ───────────────────────────────────────────────────────────────

const ROLES: { value: string; label: string }[] = [
  { value: "dealer_owner",       label: "Dealer Owner"       },
  { value: "operations_manager", label: "Operations Manager" },
  { value: "branch_manager",     label: "Branch Manager"     },
  { value: "van_team_leader",    label: "Van Team Leader"    },
  { value: "brand_ambassador",   label: "Brand Ambassador"   },
  { value: "external_agent", label: "External Agent" },
  { value: "finance",            label: "Finance"            },
];

const BRANCH_ROLES = new Set(["branch_manager", "brand_ambassador"]);
const VAN_ROLES    = new Set(["van_team_leader", "brand_ambassador"]);
const VIOLATION_LABELS: Record<string, string> = {
  stale_sim: "SIM Held Too Long",
  damaged:   "Damaged / Defective",
  fraud:     "Fraud Flagged SIM",
  lost:      "Lost / Unaccounted",
  manual:    "Manual Deduction",
};

const SEED_COMMISSION_RULES: Array<{
  id: string; name: string; simType: "New" | "Replacement" | "Migration";
  region: string; topupMin: number; topupMax: number; amount: number;
  validFrom: string; validTo: string; status: "Active" | "Inactive"; notes: string;
}> = [
  { id: "c1", name: "Standard New Line", simType: "New",         region: "All",     topupMin: 50,  topupMax: 500,  amount: 100, validFrom: "2024-01-01", validTo: "", status: "Active", notes: "" },
  { id: "c2", name: "Premium New Line",  simType: "New",         region: "Nairobi", topupMin: 500, topupMax: 5000, amount: 150, validFrom: "2024-01-01", validTo: "", status: "Active", notes: "" },
  { id: "c3", name: "Replacement",       simType: "Replacement", region: "All",     topupMin: 0,   topupMax: 500,  amount: 50,  validFrom: "2024-01-01", validTo: "", status: "Active", notes: "" },
];

// ─── User helpers ─────────────────────────────────────────────────────────────

function userFullName(u: UserProfile) {
  return [u.first_name, u.last_name].filter(Boolean).join(" ") || u.email;
}

function userInitials(u: UserProfile) {
  const parts = [u.first_name, u.last_name].filter(Boolean);
  return parts.length
    ? parts.map(p => p[0]).join("").slice(0, 2).toUpperCase()
    : u.email.slice(0, 2).toUpperCase();
}

// ─── Branch Drawer ────────────────────────────────────────────────────────────

function BranchDrawer({
  branch,
  onClose,
  vanTeams,
  allBranchManagers,
}: {
  branch: Branch | null;
  onClose: () => void;
  vanTeams: VanTeam[];
  allBranchManagers: UserProfile[];
}) {
  if (!branch) return null;

  const branchVans   = vanTeams.filter(v => v.branch === branch.id);
  const totalMembers = branchVans.reduce((sum, v) => sum + (v.members?.length ?? 0), 0);

  const managerName =
    branch.manager_details?.full_name ??
    (branch.manager
      ? userFullName(allBranchManagers.find(u => String(u.id) === String(branch.manager))!)
      : null);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-background/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm border-l border-border bg-card shadow-2xl flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Building2 className="h-4 w-4 text-primary" />
            </div>
            <h2 className="font-heading text-base font-semibold">Branch Details</h2>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Identity */}
          <div className="flex flex-col items-center text-center gap-2">
            <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-base font-semibold text-foreground">{branch.name}</p>
              <div className="flex items-center justify-center gap-2 mt-1">
                <StatusBadge status={branch.is_active ? "activated" : "Inactive"} />
                {branch.is_warehouse && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-500">
                    <Building2 className="h-3 w-3" /> Warehouse
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Van Teams",     value: branchVans.length   },
              { label: "Total Members", value: totalMembers         },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-lg border border-border bg-accent/30 px-4 py-3 text-center">
                <p className="text-xl font-bold text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Info rows */}
          <div className="space-y-3">
            {[
              { icon: Phone,   label: "Phone",   value: branch.phone   || "—" },
              { icon: MapPin,  label: "Address", value: branch.address || "—" },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
                <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-sm font-medium text-foreground">{value}</p>
                </div>
              </div>
            ))}

            {/* Manager */}
            <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
              <User className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Branch Manager</p>
                {managerName ? (
                  <p className="text-sm font-medium text-foreground">{managerName}</p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Unassigned</p>
                )}
              </div>
            </div>

            {/* Branch ID + created */}
            <div className="rounded-lg border border-border bg-background p-3 space-y-2">
              <div>
                <p className="text-xs text-muted-foreground">Branch ID</p>
                <p className="text-sm font-medium text-foreground">#{branch.id}</p>
              </div>
              {branch.created_at && (
                <div>
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="text-sm font-medium text-foreground">
                    {new Date(branch.created_at).toLocaleDateString("en-KE", { year: "numeric", month: "long", day: "numeric" })}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Van Teams list */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
              Van Teams ({branchVans.length})
            </p>
            {branchVans.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No van teams in this branch yet.</p>
            ) : (
              <div className="space-y-2">
                {branchVans.map(v => (
                  <div key={v.id} className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-md bg-blue-500/10 flex items-center justify-center shrink-0">
                        <Truck className="h-3 w-3 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{v.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {v.leader_details?.full_name ?? (v.leader ? "Leader assigned" : "No leader")}
                          {" · "}
                          {v.members?.length ?? 0} member{(v.members?.length ?? 0) !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={v.is_active ? "activated" : "Inactive"} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Van Drawer ───────────────────────────────────────────────────────────────

function VanDrawer({
  van,
  onClose,
  branches,
  allVanLeaders,
}: {
  van: VanTeam | null;
  onClose: () => void;
  branches: Branch[];
  allVanLeaders: UserProfile[];
}) {
  if (!van) return null;

  const branchName = branches.find(b => b.id === van.branch)?.name ?? "—";

  const leaderName =
    van.leader_details?.full_name ??
    (van.leader
      ? userFullName(allVanLeaders.find(u => String(u.id) === String(van.leader))!)
      : null);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-background/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm border-l border-border bg-card shadow-2xl flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
              <Truck className="h-4 w-4 text-blue-400" />
            </div>
            <h2 className="font-heading text-base font-semibold">Van Team Details</h2>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Identity */}
          <div className="flex flex-col items-center text-center gap-2">
            <div className="h-14 w-14 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Truck className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <p className="text-base font-semibold text-foreground">{van.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{branchName}</p>
              <div className="mt-1">
                <StatusBadge status={van.is_active ? "activated" : "Inactive"} />
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Members", value: van.members?.length ?? 0 },
              { label: "Van ID",  value: `#${van.id}`             },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-lg border border-border bg-accent/30 px-4 py-3 text-center">
                <p className="text-xl font-bold text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Info rows */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
              <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Branch</p>
                <p className="text-sm font-medium text-foreground">{branchName}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
              <User className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Team Leader</p>
                {leaderName ? (
                  <p className="text-sm font-medium text-foreground">{leaderName}</p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Unassigned</p>
                )}
              </div>
            </div>

            {van.created_at && (
              <div className="rounded-lg border border-border bg-background p-3">
                <p className="text-xs text-muted-foreground">Created</p>
                <p className="text-sm font-medium text-foreground">
                  {new Date(van.created_at).toLocaleDateString("en-KE", { year: "numeric", month: "long", day: "numeric" })}
                </p>
              </div>
            )}
          </div>

          {/* Members list */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
              Members ({van.members?.length ?? 0})
            </p>
            {!van.members || van.members.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No members in this van team yet.</p>
            ) : (
              <div className="space-y-2">
                {van.members.map(m => {
                  const name     = m.agent_details?.full_name || `Agent #${m.agent}`;
                  const initials = m.agent_details?.full_name
                    ? m.agent_details.full_name.split(" ").map((p: string) => p[0]).join("").slice(0, 2).toUpperCase()
                    : "?";
                  return (
                    <div key={m.id} className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2.5">
                      <div className="h-8 w-8 rounded-full bg-pink-500/10 flex items-center justify-center text-xs font-semibold text-pink-400 shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{name}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Edit Branch Drawer ───────────────────────────────────────────────────────

function EditBranchDrawer({
  branch,
  dealerId,
  onClose,
  onSave,
  unassignedManagers,
}: {
  branch: Branch;
  dealerId: number;
  onClose: () => void;
  onSave: (branchId: number, data: { name?: string; phone?: string; address?: string; manager?: number | null; is_warehouse?: boolean }) => Promise<void>;
  unassignedManagers: UserProfile[];
}) {
  const [name,        setName]        = useState(branch.name);
  const [phone,       setPhone]       = useState(branch.phone ?? "");
  const [address,     setAddress]     = useState(branch.address ?? "");
  const [managerId,   setManagerId]   = useState<string>(branch.manager ? String(branch.manager) : "");
  const [isWarehouse, setIsWarehouse] = useState(branch.is_warehouse ?? false);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");

  const managerOptions = [
    ...(branch.manager_details ? [{
      id: String(branch.manager),
      label: `${branch.manager_details.full_name} (current)`,
    }] : []),
    ...unassignedManagers
      .filter(u => String(u.id) !== String(branch.manager))
      .map(u => ({ id: String(u.id), label: userFullName(u) })),
  ];

  return (
    <>
      <div className="fixed inset-0 z-40 bg-background/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm border-l border-border bg-card shadow-2xl flex flex-col">
        <div className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Building2 className="h-4 w-4 text-primary" />
            </div>
            <h2 className="font-heading text-base font-semibold">Edit Branch</h2>
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

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Branch Name</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Phone</label>
            <div className="flex">
              <span className="inline-flex items-center rounded-l-md border border-r-0 border-border bg-accent/60 px-2 text-xs text-muted-foreground">+254</span>
              <input value={phone.replace("+254", "")} onChange={e => setPhone(e.target.value.replace(/\D/g, ""))} maxLength={9}
                className="w-full rounded-r-md border border-border bg-accent py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Address</label>
            <textarea rows={2} value={address} onChange={e => setAddress(e.target.value)}
              className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              <User className="inline h-3.5 w-3.5 mr-1 text-muted-foreground" />
              Branch Manager
            </label>
            <select value={managerId} onChange={e => setManagerId(e.target.value)}
              className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
              <option value="">— Unassigned —</option>
              {managerOptions.map(m => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1">Only unassigned branch managers are shown.</p>
          </div>

          <div className="rounded-lg border border-border bg-background p-3 space-y-1">
            <p className="text-xs text-muted-foreground">Branch ID</p>
            <p className="text-sm font-medium text-foreground">#{branch.id}</p>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border bg-background p-3">
            <div>
              <p className="text-sm font-medium text-foreground">Warehouse Branch</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Marks this as the central warehouse. SIM batches from Safaricom are received here first.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsWarehouse(w => !w)}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none",
                isWarehouse ? "bg-amber-500" : "bg-accent"
              )}>
              <span className={cn(
                "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transform transition-transform duration-200",
                isWarehouse ? "translate-x-5" : "translate-x-0"
              )} />
            </button>
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
              setLoading(true); setError("");
              try {
                await onSave(branch.id, {
                  name:         name.trim(),
                  phone:        phone.trim() ? "+254" + phone.replace("+254", "").trim() : "",
                  address:      address.trim(),
                  manager:      managerId ? Number(managerId) : null,
                  is_warehouse: isWarehouse,
                });
              } catch (err: unknown) {
                const e = err as { response?: { data?: Record<string, unknown> } };
                const detail = e?.response?.data;
                setError(detail ? Object.values(detail).flat().join(" | ") : "Failed to update branch.");
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

// ─── Edit Van Drawer ──────────────────────────────────────────────────────────

function EditVanDrawer({
  van,
  dealerId,
  branches,
  onClose,
  onSave,
  unassignedLeaders,
}: {
  van: VanTeam;
  dealerId: number;
  branches: Branch[];
  onClose: () => void;
  onSave: (van: VanTeam, data: { name?: string; leader?: number | null }) => Promise<void>;
  unassignedLeaders: UserProfile[];
}) {
  const [name,     setName]     = useState(van.name);
  const [leaderId, setLeaderId] = useState<string>(van.leader ? String(van.leader) : "");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const branchName = branches.find(b => b.id === van.branch)?.name ?? "—";

  const leaderOptions = [
    ...(van.leader_details ? [{
      id: String(van.leader),
      label: `${van.leader_details.full_name} (current)`,
    }] : []),
    ...unassignedLeaders
      .filter(u => String(u.id) !== String(van.leader))
      .map(u => ({ id: String(u.id), label: userFullName(u) })),
  ];

  return (
    <>
      <div className="fixed inset-0 z-40 bg-background/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm border-l border-border bg-card shadow-2xl flex flex-col">
        <div className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
              <Truck className="h-4 w-4 text-blue-400" />
            </div>
            <h2 className="font-heading text-base font-semibold">Edit Van Team</h2>
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

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Van Team Name</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>

          <div className="rounded-lg border border-border bg-background p-3 space-y-1">
            <p className="text-xs text-muted-foreground">Branch</p>
            <p className="text-sm font-medium text-foreground">{branchName}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              <User className="inline h-3.5 w-3.5 mr-1 text-muted-foreground" />
              Van Team Leader
            </label>
            <select value={leaderId} onChange={e => setLeaderId(e.target.value)}
              className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
              <option value="">— Unassigned —</option>
              {leaderOptions.map(l => (
                <option key={l.id} value={l.id}>{l.label}</option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1">Only unassigned van team leaders are shown.</p>
          </div>

          <div className="rounded-lg border border-border bg-background p-3 space-y-1">
            <p className="text-xs text-muted-foreground">Van Team ID</p>
            <p className="text-sm font-medium text-foreground">#{van.id}</p>
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
              setLoading(true); setError("");
              try {
                await onSave(van, {
                  name:   name.trim(),
                  leader: leaderId ? Number(leaderId) : null,
                });
              } catch (err: unknown) {
                const e = err as { response?: { data?: Record<string, unknown> } };
                const detail = e?.response?.data;
                setError(detail ? Object.values(detail).flat().join(" | ") : "Failed to update van team.");
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

// ─── Add User Dialog ──────────────────────────────────────────────────────────

function AddUserDialog({
  open,
  onClose,
  onSuccess,
  vans,
  branches,
  currentUserRole,
  dealerId,
  canBypass,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  vans: {
    id: string;
    name: string;
    branch: string;
    branchId: number;
    hasLeader: boolean;
    leaderName: string;
  }[];
  branches: Branch[];
  currentUserRole: string;
  dealerId?: number;
  canBypass: boolean;
}) {
  const [name,            setName]            = useState("");
  const [email,           setEmail]           = useState("");
  const [password,        setPassword]        = useState("");
  const [showPassword,    setShowPassword]    = useState(false);
  const [contact,         setContact]         = useState("");
  const [idNumber,        setIdNumber]        = useState("");
  const [role,            setRole]            = useState("");
  const [allocType,       setAllocType]       = useState<"branch" | "van" | "none">("none");
  const [allocVal,        setAllocVal]        = useState("");
  const [vanBranchFilter, setVanBranchFilter] = useState("");
  const [apiError,        setApiError]        = useState("");
  const [conflictWarning, setConflictWarning] = useState("");
  const [bypassConfirmed, setBypassConfirmed] = useState(false);

  // External agent profile fields
  const [shopName,          setShopName]          = useState("");
  const [location,          setLocation]          = useState("");
  const [businessType,      setBusinessType]      = useState("");
  const [businessTypeOther, setBusinessTypeOther] = useState("");
  const [commissionEligible,setCommissionEligible]= useState(false);
  const [agentNotes,        setAgentNotes]        = useState("");

  const createUser    = useCreateUser();
  const updateVanTeam = useUpdateVanTeam();
  const createExternalAgent = useCreateExternalAgent(dealerId ?? 0);
  const updateBranch  = useUpdateBranch();
  const addMember     = useAddVanTeamMember();

  if (!open) return null;

  const getAvailableRoles = () => {
    switch (currentUserRole) {
      case "dealer_owner":       return ROLES;
      case "operations_manager": return ROLES.filter(r => r.value !== "dealer_owner");
      case "branch_manager":     return ROLES.filter(r => r.value === "brand_ambassador");
      case "van_team_leader":    return ROLES.filter(r => r.value === "brand_ambassador");
      default:                   return [];
    }
  };

  const handleRoleChange = (r: string) => {
    setRole(r);
    setAllocVal("");
    setVanBranchFilter("");
    setConflictWarning("");
    setBypassConfirmed(false);
    // reset agent fields
    setShopName(""); setLocation(""); setBusinessType("");
    setBusinessTypeOther(""); setCommissionEligible(false); setAgentNotes("");

    if      (BRANCH_ROLES.has(r) && VAN_ROLES.has(r)) setAllocType("branch");
    else if (BRANCH_ROLES.has(r))                      setAllocType("branch");
    else if (VAN_ROLES.has(r))                         setAllocType("van");
    else                                                setAllocType("none");
  };

  const handleBranchSelect = (branchId: string) => {
    setAllocVal(branchId);
    setConflictWarning("");
    setBypassConfirmed(false);
    if (role === "branch_manager") {
      const branch = branches.find(b => String(b.id) === branchId);
      if (branch?.manager) {  // ← check the ID, not the nested details object
        const managerName = branch.manager_details?.full_name ?? "an existing manager";
        setConflictWarning(`${branch.name} already has a branch manager: ${managerName}.`);
      }
    }
  };

  const handleVanSelect = (vanId: string) => {
    setAllocVal(vanId);
    setConflictWarning("");
    setBypassConfirmed(false);
    const van = vans.find(v => v.id === vanId);
    if (van?.hasLeader) {
      setConflictWarning(`${van.name} already has a team leader: ${van.leaderName}.`);
    }
  };

  const showBothPickers  = role === "brand_ambassador";
  const showBranchPicker = allocType === "branch";
  const showVanPicker    = allocType === "van";
  const filteredVans     = vanBranchFilter ? vans.filter(v => v.branch === vanBranchFilter) : vans;
  const conflictBlocks   = !!conflictWarning && !(canBypass && bypassConfirmed);

  const isValid =
    name.trim() &&
    email.trim().includes("@") &&
    password.trim().length >= 6 &&
    contact.trim().length >= 9 &&
    idNumber.trim() &&
    role &&
    !conflictBlocks &&
    (role !== "external_agent" || (
      shopName.trim() !== "" &&
      businessType !== "" &&
      (businessType !== "other" || businessTypeOther.trim() !== "")
    ));

  const handleAdd = async () => {
    if (!isValid) return;
    setApiError("");
    const [first_name, ...rest] = name.trim().split(" ");
    const last_name = rest.join(" ") || "-";
    try {
      const newUser = await createUser.mutateAsync({
        email:      email.trim(),
        password:   password.trim(),
        first_name,
        last_name,
        phone:      "+254" + contact.trim(),
        role:       role as UserRole,
        ...(dealerId ? { dealer_id: dealerId } : {}),
        // ── agent profile fields (backend ignores these for non-agents) ──
        ...(role === "external_agent" ? {
          shop_name:           shopName.trim(),
          location:            location.trim(),
          id_number:           idNumber.trim(),
          business_type:       businessType,
          business_type_other: businessTypeOther.trim(),
          commission_eligible: commissionEligible,
          notes:               agentNotes.trim(),
        } : {}),
      });

      if (role === "branch_manager" && allocVal && dealerId) {
        try {
          await updateBranch.mutateAsync({
            dealerId,
            branchId: Number(allocVal),
            data: { manager: newUser.id },
          });
        } catch {
          setApiError("User created, but failed to assign as branch manager. Please update the branch manually.");
          onSuccess();
          return;
        }
      }

if (role === "van_team_leader" && allocVal && dealerId) {
        const selectedVan = vans.find(v => v.id === allocVal);
        if (selectedVan) {
          try {
            await updateVanTeam.mutateAsync({
              dealerId,
              branchId: selectedVan.branchId,
              teamId:   Number(selectedVan.id),
              data:     { leader: newUser.id },
            });
          } catch {
            setApiError("User created, but failed to assign as van team leader. Please update the van team manually.");
            onSuccess();
            return;
          }
        }
      }

      if (role === "brand_ambassador" && allocType === "van" && allocVal && dealerId) {
        const selectedVan = vans.find(v => v.id === allocVal);
        if (selectedVan) {
          try {
            await addMember.mutateAsync({
              dealerId,
              branchId: selectedVan.branchId,
              teamId:   Number(selectedVan.id),
              data:     { agent: newUser.id },
            });
          } catch {
            setApiError("User created, but failed to add as van team member. Please update the van team manually.");
            onSuccess();
            return;
          }
        }
      }

      onSuccess();
      reset();
    } catch (err: unknown) {
      const e = err as { response?: { data?: Record<string, unknown> }; message?: string };
      const detail = e?.response?.data;
      if (detail && typeof detail === "object") {
        const messages = Object.entries(detail)
          .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(", ") : String(msgs)}`)
          .join(" | ");
        setApiError(messages);
      } else {
        setApiError(e?.message ?? "Failed to create user. Please try again.");
      }
    }
  };

  const reset = () => {
    setName(""); setEmail(""); setPassword(""); setShowPassword(false);
    setContact(""); setIdNumber(""); setRole(""); setAllocType("none");
    setAllocVal(""); setVanBranchFilter(""); setApiError("");
    setConflictWarning(""); setBypassConfirmed(false);
    setShopName(""); setLocation(""); setBusinessType("");
    setBusinessTypeOther(""); setCommissionEligible(false); setAgentNotes("");
    onClose();
  };

  const loading = createUser.isPending || updateVanTeam.isPending || updateBranch.isPending || addMember.isPending || createExternalAgent.isPending;
  const availableRoles = getAvailableRoles();
  const branchNames    = branches.map(b => b.name);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={reset} />
      <div className="relative w-full max-w-md rounded-xl border border-border bg-card shadow-2xl max-h-[90vh] overflow-y-auto">

        <div className="flex items-center justify-between border-b border-border px-6 py-4 sticky top-0 bg-card z-10">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <h3 className="font-heading text-lg font-semibold">Add User</h3>
          </div>
          <button onClick={reset} className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  <Phone className="inline h-3.5 w-3.5 mr-1 text-muted-foreground" />
                  Phone <span className="text-destructive">*</span>
                </label>
                <div className="flex">
                  <span className="inline-flex items-center rounded-l-md border border-r-0 border-border bg-accent/60 px-2 text-xs text-muted-foreground">+254</span>
                  <input value={contact} onChange={e => setContact(e.target.value.replace(/\D/g, ""))}
                    placeholder="7XX XXX XXX" maxLength={9}
                    className="w-full rounded-r-md border border-border bg-accent py-2 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  <Hash className="inline h-3.5 w-3.5 mr-1 text-muted-foreground" />
                  ID / Passport <span className="text-destructive">*</span>
                </label>
                <input value={idNumber} onChange={e => setIdNumber(e.target.value)} placeholder="12345678"
                  className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
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
              <p className="text-xs text-muted-foreground mt-1.5">The user can change this after their first login.</p>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Role & Access</p>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                <Briefcase className="inline h-3.5 w-3.5 mr-1 text-muted-foreground" />
                Role <span className="text-destructive">*</span>
              </label>
              <select value={role} onChange={e => handleRoleChange(e.target.value)}
                className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="">— Select role —</option>
                {availableRoles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          </div>
          {/* Agent Profile — shown when External Agent role is selected */}
          {role === "external_agent" && (
            <div className="space-y-3 pt-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Agent Profile</p>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  <Store className="inline h-3.5 w-3.5 mr-1 text-muted-foreground" />
                  Shop Name <span className="text-destructive">*</span>
                </label>
                <input value={shopName} onChange={e => setShopName(e.target.value)}
                  placeholder="e.g. Mama Jane Shop"
                  className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  <MapPin className="inline h-3.5 w-3.5 mr-1 text-muted-foreground" />
                  Location / Address
                </label>
                <input value={location} onChange={e => setLocation(e.target.value)}
                  placeholder="e.g. Ngong Road, Nairobi"
                  className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  <Briefcase className="inline h-3.5 w-3.5 mr-1 text-muted-foreground" />
                  Business Type <span className="text-destructive">*</span>
                </label>
                <select value={businessType}
                  onChange={e => { setBusinessType(e.target.value); setBusinessTypeOther(""); }}
                  className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                  <option value="">— Select type —</option>
                  <option value="shop">Shop</option>
                  <option value="kiosk">Kiosk</option>
                  <option value="supermarket">Supermarket</option>
                  <option value="pharmacy">Pharmacy</option>
                  <option value="hardware">Hardware</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {businessType === "other" && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Specify Business Type <span className="text-destructive">*</span>
                  </label>
                  <input value={businessTypeOther} onChange={e => setBusinessTypeOther(e.target.value)}
                    placeholder="e.g. Mobile Money Agent"
                    className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
              )}

              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input type="checkbox" checked={commissionEligible}
                  onChange={e => setCommissionEligible(e.target.checked)}
                  className="h-4 w-4 rounded border-border accent-primary" />
                <span className="text-sm text-foreground">Eligible for commission</span>
              </label>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Notes</label>
                <textarea rows={2} value={agentNotes} onChange={e => setAgentNotes(e.target.value)}
                  placeholder="Any additional notes…"
                  className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
              </div>
            </div>
          )}
          {role && allocType !== "none" && (
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Allocation</p>

              {showBothPickers && (
                <>
                  <div className="flex rounded-md border border-border overflow-hidden text-sm">
                    <button
                      onClick={() => { setAllocType("branch"); setAllocVal(""); setVanBranchFilter(""); setConflictWarning(""); setBypassConfirmed(false); }}
                      className={cn("flex-1 py-2 font-medium transition-colors",
                        allocType === "branch" ? "bg-primary text-primary-foreground" : "bg-accent text-muted-foreground")}>
                      Under Branch
                    </button>
                    <button
                      onClick={() => { setAllocType("van"); setAllocVal(""); setVanBranchFilter(""); setConflictWarning(""); setBypassConfirmed(false); }}
                      className={cn("flex-1 py-2 font-medium transition-colors",
                        allocType === "van" ? "bg-primary text-primary-foreground" : "bg-accent text-muted-foreground")}>
                      Under Van
                    </button>
                  </div>

                  {allocType === "branch" && (
                    <select value={allocVal} onChange={e => setAllocVal(e.target.value)}
                      className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                      <option value="">— Select branch —</option>
                      {branchNames.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  )}

                  {allocType === "van" && (
                    <div className="space-y-2">
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">
                          <MapPin className="inline h-3 w-3 mr-1" />Filter by Branch
                        </label>
                        <select value={vanBranchFilter}
                          onChange={e => { setVanBranchFilter(e.target.value); setAllocVal(""); setConflictWarning(""); setBypassConfirmed(false); }}
                          className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                          <option value="">— All branches —</option>
                          {branchNames.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">
                          <Truck className="inline h-3 w-3 mr-1" />Select Van
                        </label>
                        <select value={allocVal} onChange={e => setAllocVal(e.target.value)}
                          className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                          <option value="">— Select van —</option>
                          {filteredVans.map(v => (
                            <option key={v.id} value={v.id}>{v.name} ({v.branch})</option>
                          ))}
                        </select>
                        {vanBranchFilter && filteredVans.length === 0 && (
                          <p className="text-xs text-muted-foreground mt-1">No vans in this branch.</p>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}

              {!showBothPickers && showBranchPicker && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    <MapPin className="inline h-3.5 w-3.5 mr-1 text-muted-foreground" />
                    Assigned Branch <span className="text-destructive">*</span>
                  </label>
                  <select value={allocVal} onChange={e => handleBranchSelect(e.target.value)}
                    className={cn(
                      "w-full rounded-md border bg-accent py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1",
                      conflictWarning ? "border-amber-500/60 focus:ring-amber-500" : "border-border focus:ring-primary"
                    )}>
                    <option value="">— Select branch —</option>
                    {branches.map(b => (
                      <option key={b.id} value={String(b.id)}>
                        {b.name}{b.manager_details?.full_name ? ` (Manager: ${b.manager_details.full_name})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {!showBothPickers && showVanPicker && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      <MapPin className="inline h-3.5 w-3.5 mr-1 text-muted-foreground" />
                      Branch <span className="text-xs text-muted-foreground font-normal">(filters vans)</span>
                    </label>
                    <select value={vanBranchFilter}
                      onChange={e => { setVanBranchFilter(e.target.value); setAllocVal(""); setConflictWarning(""); setBypassConfirmed(false); }}
                      className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                      <option value="">— All branches —</option>
                      {branchNames.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      <Truck className="inline h-3.5 w-3.5 mr-1 text-muted-foreground" />
                      Assigned Van <span className="text-destructive">*</span>
                    </label>
                    <select value={allocVal} onChange={e => handleVanSelect(e.target.value)}
                      className={cn(
                        "w-full rounded-md border bg-accent py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1",
                        conflictWarning ? "border-amber-500/60 focus:ring-amber-500" : "border-border focus:ring-primary"
                      )}>
                      <option value="">— Select van —</option>
                      {filteredVans.map(v => (
                        <option key={v.id} value={v.id}>
                          {v.name} ({v.branch}){v.hasLeader ? ` — Leader: ${v.leaderName}` : ""}
                        </option>
                      ))}
                    </select>
                    {vanBranchFilter && filteredVans.length === 0 && (
                      <p className="text-xs text-muted-foreground mt-1">No vans in this branch yet.</p>
                    )}
                  </div>
                </div>
              )}

              {conflictWarning && (
                <div className={cn(
                  "rounded-md border px-4 py-3 space-y-2",
                  canBypass ? "border-amber-500/40 bg-amber-500/10" : "border-destructive/40 bg-destructive/10"
                )}>
                  <div className="flex items-start gap-2">
                    <AlertTriangle className={cn("h-4 w-4 shrink-0 mt-0.5", canBypass ? "text-amber-500" : "text-destructive")} />
                    <div className="text-sm">
                      <p className={cn("font-medium", canBypass ? "text-amber-600 dark:text-amber-400" : "text-destructive")}>
                        {canBypass ? "Conflict — Dealer Owner Override Available" : "Assignment Conflict"}
                      </p>
                      <p className="text-muted-foreground mt-0.5">{conflictWarning}</p>
                      {canBypass && (
                        <p className="text-muted-foreground mt-1">
                          Proceeding will replace the existing assignment. The previous manager/leader will retain their user account and role but lose this allocation.
                        </p>
                      )}
                      {!canBypass && (
                        <p className="text-muted-foreground mt-1">
                          Only a Dealer Owner can override this. Please select a different {role === "branch_manager" ? "branch" : "van"}.
                        </p>
                      )}
                    </div>
                  </div>
                  {canBypass && (
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input type="checkbox" checked={bypassConfirmed} onChange={e => setBypassConfirmed(e.target.checked)}
                        className="h-4 w-4 rounded border-border accent-amber-500" />
                      <span className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                        I understand — proceed with this assignment anyway
                      </span>
                    </label>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2 border-t border-border px-6 py-4 sticky bottom-0 bg-card">
          <button onClick={reset} disabled={loading}
            className="flex-1 rounded-md border border-border py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button onClick={handleAdd} disabled={!isValid || loading}
            className="flex-1 flex items-center justify-center gap-2 rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Adding…" : "Add User"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────

function ConfirmDialog({
  open, title, message, danger, confirmLabel, onConfirm, onClose,
}: {
  open: boolean; title: string; message: string;
  danger?: boolean; confirmLabel?: string;
  onConfirm: () => Promise<void>; onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-xl border border-border bg-card shadow-2xl p-6">
        <h3 className="font-heading text-lg font-semibold text-foreground mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-6">{message}</p>
        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 rounded-md border border-border py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors">
            Cancel
          </button>
          <button onClick={() => { onConfirm(); onClose(); }}
            className={cn(
              "flex-1 rounded-md py-2 text-sm font-semibold text-white transition-colors",
              danger ? "bg-destructive hover:bg-destructive/90" : "bg-primary hover:opacity-90"
            )}>
            {confirmLabel ?? "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── User Drawer ──────────────────────────────────────────────────────────────

function UserDrawer({
  user,
  onClose,
  branches,
  vanTeams,
  mobigos, 
}: {
  user: UserProfile | null;
  onClose: () => void;
  branches: Branch[];
  vanTeams: VanTeam[];
  mobigos: MobiGo[]; 
}) {
  const sendEmail = useSendEmail();
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const handleResend = async () => {
    if (!user || resendState === "sending") return;
    setResendState("sending");
    try {
      await sendEmail.mutateAsync({
        recipient_email: user.email,
        subject: "Your SimTrack Account — Login Details",
        body: `Hi ${user.first_name},\n\nYour SimTrack account credentials:\n\nEmail: ${user.email}\nLogin: ${window.location.origin}/login\n\nUse "Forgot password?" to set your password.\n\n— SimTrack Admin`,
        html_body: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px;"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;"><tr><td style="background:#18181b;border-radius:16px 16px 0 0;padding:28px 32px;"><span style="font-size:20px;font-weight:700;color:#fff;">Sim<span style="color:#a78bfa;">Track</span></span></td></tr><tr><td style="background:#fff;padding:40px 32px 32px;"><p style="margin:0 0 4px;font-size:20px;font-weight:700;color:#18181b;">Hi ${user.first_name}! 👋</p><p style="margin:0;font-size:14px;color:#71717a;">Your SimTrack account is ready to use.</p><p style="margin:16px 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;color:#a1a1aa;">Email Address</p><p style="margin:0;font-size:15px;font-weight:500;color:#18181b;font-family:'Courier New',monospace;">${user.email}</p><p style="margin:16px 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;color:#a1a1aa;">Login URL</p><p style="margin:0;font-size:14px;color:#7c3aed;font-family:'Courier New',monospace;">${window.location.origin}/login</p><p style="margin:24px 0;font-size:13px;color:#92400e;background:#fefce8;border:1px solid #fde68a;border-radius:10px;padding:16px 20px;"><strong>ℹ️ First time logging in?</strong><br/>Use the "Forgot password?" link on the login page to set your password.</p><a href="${window.location.origin}/login" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 40px;border-radius:10px;">Log In to SimTrack →</a></td></tr></table></td></tr></table></body></html>`,
      });
      setResendState("sent");
      setTimeout(() => setResendState("idle"), 4000);
    } catch {
      setResendState("error");
      setTimeout(() => setResendState("idle"), 4000);
    }
  };

  if (!user) return null;

  const fullName  = userFullName(user);
  const initials  = userInitials(user);
  const roleLabel = ROLES.find(r => r.value === user.role)?.label ?? user.role;

  // Derive branch/van assignment from live data
  const assignedBranch = branches.find(b => String(b.manager) === String(user.id));
  const assignedVan    = vanTeams.find(v => String(v.leader) === String(user.id));

  const roleColors: Record<string, string> = {
    super_admin:        "bg-primary/15 text-primary",
    dealer_owner:       "bg-blue-500/15 text-blue-400",
    operations_manager: "bg-purple-500/15 text-purple-400",
    branch_manager:     "bg-amber-500/15 text-amber-500",
    van_team_leader:    "bg-green-500/15 text-green-500",
    brand_ambassador:   "bg-pink-500/15 text-pink-400",
    external_agent:     "bg-orange-500/15 text-orange-400",
    finance:            "bg-teal-500/15 text-teal-400",
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-background/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm border-l border-border bg-card shadow-2xl flex flex-col">
        <div className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0">
          <h2 className="font-heading text-base font-semibold text-foreground">User Details</h2>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-xl font-semibold text-primary">
              {initials}
            </div>
            <div>
              <p className="text-base font-semibold text-foreground">{fullName}</p>
              <span className={cn("mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium", roleColors[user.role] ?? "bg-accent text-muted-foreground")}>
                {roleLabel}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {[
              { icon: Mail,        label: "Email",  value: user.email },
              { icon: Phone,       label: "Phone",  value: user.phone || "—" },
              { icon: ShieldAlert, label: "Status", value: user.is_active ? "Active" : "Inactive" },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
                <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-sm font-medium text-foreground">{value}</p>
                </div>
              </div>
            ))}

            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-xs text-muted-foreground">Joined</p>
              <p className="text-sm font-medium text-foreground">
                {user.date_joined ? new Date(user.date_joined).toLocaleDateString("en-KE", { year: "numeric", month: "long", day: "numeric" }) : "—"}
              </p>
            </div>

            {/* Assignment info based on role */}
            {user.role === "branch_manager" && (
              <div className="rounded-lg border border-border bg-background p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="h-3.5 w-3.5 text-amber-500" />
                  <p className="text-xs text-muted-foreground">Assigned Branch</p>
                </div>
                {assignedBranch ? (
                  <p className="text-sm font-medium text-foreground">{assignedBranch.name}</p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Not assigned to any branch</p>
                )}
              </div>
            )}

            {user.role === "van_team_leader" && (
              <div className="rounded-lg border border-border bg-background p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Truck className="h-3.5 w-3.5 text-green-500" />
                  <p className="text-xs text-muted-foreground">Assigned Van Team</p>
                </div>
                {assignedVan ? (
                  <div>
                    <p className="text-sm font-medium text-foreground">{assignedVan.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Branch: {branches.find(b => b.id === assignedVan.branch)?.name ?? "—"}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Not assigned to any van team</p>
                )}
              </div>
            )}
            {user.role === "brand_ambassador" && (() => {
              const memberVan = vanTeams.find(v =>
                v.members?.some(m => String(m.agent) === String(user.id))
              );
              const memberBranch = memberVan
                ? branches.find(b => b.id === memberVan.branch)
                : null;
              return (
                <div className="rounded-lg border border-border bg-background p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Truck className="h-3.5 w-3.5 text-pink-400" />
                    <p className="text-xs text-muted-foreground">Van Team Assignment</p>
                  </div>
                  {memberVan ? (
                    <div>
                      <p className="text-sm font-medium text-foreground">{memberVan.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Branch: {memberBranch?.name ?? "—"}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Not assigned to any van team</p>
                  )}
                </div>
              );
            })()}
            {(user.role === "brand_ambassador" || user.role === "external_agent") && (() => {
              const device = mobigos.find(m => m.assigned_ba === Number(user.id));
              return (
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
              );
            })()}
          </div>

          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <div>
              <p className="text-sm font-medium text-foreground">Resend Invitation</p>
              <p className="text-xs text-muted-foreground mt-0.5">Send login instructions to <span className="font-medium text-foreground">{user.email}</span>.</p>
            </div>
            <button onClick={handleResend} disabled={resendState === "sending" || resendState === "sent"}
              className={cn(
                "w-full flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-all",
                resendState === "sent"  ? "bg-success/10 text-success border border-success/30 cursor-default"
                : resendState === "error" ? "bg-destructive/10 text-destructive border border-destructive/30 hover:bg-destructive/20"
                : "bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 disabled:opacity-50 disabled:cursor-not-allowed",
              )}>
              {resendState === "sending" && <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</>}
              {resendState === "sent"    && <><CheckCircle2 className="h-4 w-4" /> Invitation Sent</>}
              {resendState === "error"   && <><Mail className="h-4 w-4" /> Failed — Try Again</>}
              {resendState === "idle"    && <><Mail className="h-4 w-4" /> Resend Invitation Email</>}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Edit User Drawer ─────────────────────────────────────────────────────────

function EditUserDrawer({ user, onClose, onSave, branches, vanTeams, dealerId }: {
  user: UserProfile;
  onClose: () => void;
  onSave: (data: Partial<UserProfile>) => Promise<void>;
  branches: Branch[];
  vanTeams: VanTeam[];
  dealerId?: number;
}) {
  const [firstName, setFirstName] = useState(user.first_name);
  const [lastName,  setLastName]  = useState(user.last_name);
  const [phone,     setPhone]     = useState(user.phone?.replace("+254", "") ?? "");
  const [role,      setRole]      = useState(user.role);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");

  // Branch assignment state (for branch_manager)
  const currentBranch = branches.find(b => String(b.manager) === String(user.id));
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    currentBranch ? String(currentBranch.id) : ""
  );

  // Van assignment state (for van_team_leader)
  const currentVan = vanTeams.find(v => String(v.leader) === String(user.id));
  const [selectedVanId, setSelectedVanId] = useState<string>(
    currentVan ? String(currentVan.id) : ""
  );

  // Van member state (for brand_ambassador)
  const currentMemberVan = vanTeams.find(v =>
    v.members?.some(m => String(m.agent) === String(user.id))
  );
  const [selectedMemberVanId, setSelectedMemberVanId] = useState<string>(
    currentMemberVan ? String(currentMemberVan.id) : ""
  );
  const [vanBranchFilter, setVanBranchFilter] = useState<string>(
    currentMemberVan ? String(branches.find(b => b.id === currentMemberVan.branch)?.name ?? "") : ""
  );

  const updateBranch  = useUpdateBranch();
  const updateVanTeam = useUpdateVanTeam();
  const addMember     = useAddVanTeamMember();
  const removeMember  = useRemoveVanTeamMember();

  const filteredVans = vanBranchFilter
    ? vanTeams.filter(v => branches.find(b => b.id === v.branch)?.name === vanBranchFilter)
    : vanTeams;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-background/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm border-l border-border bg-card shadow-2xl flex flex-col">
        <div className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <User className="h-4 w-4 text-primary" />
            </div>
            <h2 className="font-heading text-base font-semibold">Edit User</h2>
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

          {/* Personal info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">First Name</label>
              <input value={firstName} onChange={e => setFirstName(e.target.value)}
                className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Last Name</label>
              <input value={lastName} onChange={e => setLastName(e.target.value)}
                className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Phone</label>
            <div className="flex">
              <span className="inline-flex items-center rounded-l-md border border-r-0 border-border bg-accent/60 px-2 text-xs text-muted-foreground">+254</span>
              <input value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ""))} maxLength={9}
                className="w-full rounded-r-md border border-border bg-accent py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Role</label>
            <select value={role} onChange={e => setRole(e.target.value as UserRole)}
              className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>

          {/* Branch assignment — branch_manager */}
          {user.role === "branch_manager" && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                <Building2 className="inline h-3.5 w-3.5 mr-1 text-muted-foreground" />
                Assigned Branch
              </label>
              <select value={selectedBranchId} onChange={e => setSelectedBranchId(e.target.value)}
                className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="">— Unassigned —</option>
                {branches.map(b => (
                  <option key={b.id} value={String(b.id)}>
                    {b.name}{String(b.manager) !== String(user.id) && b.manager ? " (has manager)" : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Van assignment — van_team_leader */}
          {user.role === "van_team_leader" && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                <Truck className="inline h-3.5 w-3.5 mr-1 text-muted-foreground" />
                Assigned Van Team
              </label>
              <select value={selectedVanId} onChange={e => setSelectedVanId(e.target.value)}
                className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="">— Unassigned —</option>
                {vanTeams.map(v => {
                  const branchName = branches.find(b => b.id === v.branch)?.name ?? "—";
                  const hasOtherLeader = v.leader && String(v.leader) !== String(user.id);
                  return (
                    <option key={v.id} value={String(v.id)}>
                      {v.name} ({branchName}){hasOtherLeader ? " — has leader" : ""}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Van membership — brand_ambassador */}
          {user.role === "brand_ambassador" && (
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Van Team Assignment</p>
              {!currentMemberVan && (
                <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2.5">
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    This brand ambassador is not assigned to any van team. Assign them below.
                  </p>
                </div>
              )}
              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  <MapPin className="inline h-3 w-3 mr-1" />Filter by Branch
                </label>
                <select value={vanBranchFilter} onChange={e => { setVanBranchFilter(e.target.value); setSelectedMemberVanId(""); }}
                  className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                  <option value="">— All branches —</option>
                  {branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  <Truck className="inline h-3 w-3 mr-1" />Van Team
                </label>
                <select value={selectedMemberVanId} onChange={e => setSelectedMemberVanId(e.target.value)}
                  className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                  <option value="">— Unassigned —</option>
                  {filteredVans.map(v => {
                    const branchName = branches.find(b => b.id === v.branch)?.name ?? "—";
                    return (
                      <option key={v.id} value={String(v.id)}>
                        {v.name} ({branchName})
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          )}

          <div className="rounded-lg border border-border bg-background p-3 space-y-2">
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="text-sm font-medium text-foreground">{user.email}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Joined</p>
              <p className="text-sm font-medium text-foreground">
                {user.date_joined ? new Date(user.date_joined).toLocaleDateString("en-KE", { year: "numeric", month: "long", day: "numeric" }) : "—"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-2 border-t border-border px-6 py-4 shrink-0">
          <button onClick={onClose} disabled={loading}
            className="flex-1 rounded-md border border-border py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button disabled={loading}
            onClick={async () => {
              setLoading(true); setError("");
              try {
                // 1. Save core user fields
                await onSave({ first_name: firstName.trim(), last_name: lastName.trim(), phone: "+254" + phone.trim(), role: role as UserRole });

                if (dealerId) {
                  // 2. Branch manager assignment
                  if (user.role === "branch_manager") {
                    // Unassign from old branch if changed
                    if (currentBranch && String(currentBranch.id) !== selectedBranchId) {
                      await updateBranch.mutateAsync({ dealerId, branchId: currentBranch.id, data: { manager: null } });
                    }
                    // Assign to new branch
                    if (selectedBranchId) {
                      await updateBranch.mutateAsync({ dealerId, branchId: Number(selectedBranchId), data: { manager: user.id } });
                    }
                  }

                  // 3. Van team leader assignment
                  if (user.role === "van_team_leader") {
                    // Unassign from old van if changed
                    if (currentVan && String(currentVan.id) !== selectedVanId) {
                      await updateVanTeam.mutateAsync({ dealerId, branchId: currentVan.branch, teamId: currentVan.id, data: { leader: null } });
                    }
                    // Assign to new van
                    if (selectedVanId) {
                      const newVan = vanTeams.find(v => String(v.id) === selectedVanId);
                      if (newVan) await updateVanTeam.mutateAsync({ dealerId, branchId: newVan.branch, teamId: newVan.id, data: { leader: user.id } });
                    }
                  }

                  // 4. Brand ambassador van membership
                  if (user.role === "brand_ambassador") {
                    const oldVanChanged = currentMemberVan && String(currentMemberVan.id) !== selectedMemberVanId;
                    const newVanSelected = selectedMemberVanId && String(currentMemberVan?.id) !== selectedMemberVanId;

                    // Remove from old van
                    if (oldVanChanged) {
                      const oldMembership = currentMemberVan.members?.find(m => String(m.agent) === String(user.id));
                      if (oldMembership) {
                        await removeMember.mutateAsync({ dealerId, branchId: currentMemberVan.branch, teamId: currentMemberVan.id, memberId: oldMembership.id });
                      }
                    }
                    // Add to new van
                    if (newVanSelected) {
                      const newVan = vanTeams.find(v => String(v.id) === selectedMemberVanId);
                      if (newVan) await addMember.mutateAsync({ dealerId, branchId: newVan.branch, teamId: newVan.id, data: { agent: user.id } });
                    }
                  }
                }

                onClose();
              } catch (err: unknown) {
                const e = err as { response?: { data?: Record<string, unknown> } };
                const detail = e?.response?.data;
                setError(detail ? Object.values(detail).flat().join(" | ") : "Failed to update user.");
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

// ─── Users Tab ────────────────────────────────────────────────────

function UsersTab({
  showAdd,
  onAddClick,
  fixedRole,
  branches,
  vanTeams,
  dealerId,
  mobigos,
}: {
  showAdd: boolean;
  onAddClick: () => void;
  fixedRole?: string;
  branches: Branch[];
  vanTeams: VanTeam[];
  dealerId?: number;
  mobigos: MobiGo[];
}) {
  const [search,        setSearch]        = useState("");
  const [selectedRole,  setSelectedRole]  = useState(fixedRole ?? "");
  const [statusFilter,  setStatusFilter]  = useState<"all" | "active" | "inactive">("all");
  const [activeUser,    setActiveUser]    = useState<UserProfile | null>(null);
  const [confirm,       setConfirm]       = useState<{ type: "deactivate" | "activate"; user: UserProfile } | null>(null);
  const [editUser,      setEditUser]      = useState<UserProfile | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<UserProfile | null>(null);

  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  const queryParams = {
    ...(selectedRole ? { role: selectedRole } : {}),
    ...(search       ? { search }             : {}),
  };

  const { data, isLoading, isError, refetch } = useUsers(queryParams);
  const deactivate = useDeactivateUser();
  const activate   = useActivateUser();

  const allUsers: UserProfile[] = data?.results ?? [];

  const filtered = allUsers.filter((u) => {
    if (statusFilter === "active"   && !u.is_active) return false;
    if (statusFilter === "inactive" &&  u.is_active) return false;
    return true;
  });

  const activeCount   = allUsers.filter(u =>  u.is_active).length;
  const inactiveCount = allUsers.filter(u => !u.is_active).length;

  const roleColors: Record<string, string> = {
    super_admin:        "bg-primary/15 text-primary",
    dealer_owner:       "bg-blue-500/15 text-blue-400",
    operations_manager: "bg-purple-500/15 text-purple-400",
    branch_manager:     "bg-amber-500/15 text-amber-500",
    van_team_leader:    "bg-green-500/15 text-green-500",
    brand_ambassador:   "bg-pink-500/15 text-pink-400",
    external_agent:     "bg-orange-500/15 text-orange-400",
    finance:            "bg-teal-500/15 text-teal-400",
  };

  return (
    <div className="space-y-4">
      <SectionHeader title="Users & Roles" onAdd={onAddClick} addLabel="Add User" showAdd={showAdd} />

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total",    value: data?.count ?? allUsers.length, color: "text-foreground"  },
          { label: "Active",   value: activeCount,                    color: "text-success"     },
          { label: "Inactive", value: inactiveCount,                  color: "text-destructive" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-lg border border-border bg-accent/30 px-4 py-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={cn("text-xl font-bold mt-0.5", color)}>{value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or email…"
            autoComplete="off"      
            name="user-search"  
            className="w-full rounded-md border border-border bg-accent py-1.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
        {!fixedRole && (
          <select value={selectedRole} onChange={e => setSelectedRole(e.target.value)}
            className="rounded-md border border-border bg-accent py-1.5 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
            <option value="">All Roles</option>
            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        )}
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
          className="rounded-md border border-border bg-accent py-1.5 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading users…</span>
        </div>
      )}

      {isError && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Failed to load users.</span>
          <button onClick={() => refetch()} className="ml-auto underline text-xs">Retry</button>
        </div>
      )}

      {!isLoading && !isError && (
        <>
          <div className="rounded-lg border border-border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-xs">
                  <th className="py-3 px-4 text-left font-medium">User</th>
                  <th className="py-3 px-4 text-left font-medium">Role</th>
                  <th className="py-3 px-4 text-left font-medium">Phone</th>
                  <th className="py-3 px-4 text-left font-medium">Assignment</th>
                  <th className="py-3 px-4 text-left font-medium">Status</th>
                  <th className="py-3 px-4 text-left font-medium">Joined</th>
                  <th className="py-3 px-4 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                      No users match your filters.
                    </td>
                  </tr>
                ) : (
                  filtered.map(u => {
                    const roleLabel     = ROLES.find(r => r.value === u.role)?.label ?? u.role;
                    const fullName      = userFullName(u);
                    const initials      = userInitials(u);
                    const isActive      = u.is_active;
                    const togglePending = deactivate.isPending || activate.isPending;

                    // Derive assignment
                    const assignedBranch = branches.find(b => String(b.manager) === String(u.id));
                    const assignedVan    = vanTeams.find(v => String(v.leader) === String(u.id));
                    const memberVan      = vanTeams.find(v => v.members?.some(m => String(m.agent) === String(u.id)));
                    const assignment = assignedBranch
                      ? `Branch: ${assignedBranch.name}`
                      : assignedVan
                      ? `Van: ${assignedVan.name}`
                      : memberVan
                      ? `Van: ${memberVan.name}`
                      : "—";

                    return (
                      <tr key={u.id} onClick={() => setActiveUser(u)}
                        className={cn("border-b border-border/50 hover:bg-accent/40 transition-colors cursor-pointer", !isActive && "opacity-60")}>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                              {initials}
                            </div>
                            <div>
                              <p className="font-medium text-foreground text-sm">{fullName}</p>
                              <p className="text-xs text-muted-foreground">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", roleColors[u.role] ?? "bg-accent text-muted-foreground")}>
                            {roleLabel}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">{u.phone || "—"}</td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">{assignment}</td>
                        <td className="py-3 px-4">
                          <span className={cn("flex items-center gap-1 text-xs font-medium w-fit", isActive ? "text-success" : "text-destructive")}>
                            {isActive ? <><CheckCircle2 className="h-3.5 w-3.5" /> Active</> : <><XCircle className="h-3.5 w-3.5" /> Inactive</>}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">
                          {u.date_joined ? new Date(u.date_joined).toLocaleDateString() : "—"}
                        </td>
                        <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => setEditUser(u)} title="Edit"
                              className="group relative p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                              <Edit2 className="h-3.5 w-3.5" />
                              <span className="absolute -top-7 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 transition-transform bg-popover border border-border text-foreground text-xs rounded px-1.5 py-0.5 whitespace-nowrap shadow-md">Edit</span>
                            </button>
                            <button disabled={togglePending}
                              onClick={() => setConfirm({ type: isActive ? "deactivate" : "activate", user: u })}
                              title={isActive ? "Deactivate" : "Activate"}
                              className={cn("group relative p-1.5 rounded-md transition-colors disabled:opacity-50",
                                isActive ? "text-destructive hover:bg-destructive/10" : "text-success hover:bg-success/10")}>
                              {isActive ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                              <span className="absolute -top-7 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 transition-transform bg-popover border border-border text-foreground text-xs rounded px-1.5 py-0.5 whitespace-nowrap shadow-md">
                                {isActive ? "Deactivate" : "Activate"}
                              </span>
                            </button>
                            <button onClick={() => setDeleteConfirm(u)} title="Delete"
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
          <p className="text-xs text-muted-foreground">{filtered.length} of {allUsers.length} users</p>
        </>
      )}

      <UserDrawer user={activeUser} onClose={() => setActiveUser(null)} branches={branches} vanTeams={vanTeams} mobigos={mobigos} />

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.type === "deactivate" ? "Deactivate User" : "Activate User"}
        message={confirm?.type === "deactivate"
          ? `Deactivate ${confirm.user.first_name} ${confirm.user.last_name}? They will lose access immediately.`
          : `Reactivate ${confirm?.user.first_name} ${confirm?.user.last_name}? They will regain access.`}
        confirmLabel={confirm?.type === "deactivate" ? "Deactivate" : "Activate"}
        danger={confirm?.type === "deactivate"}
        onConfirm={async () => {
          if (!confirm) return;
          if (confirm.type === "deactivate") await deactivate.mutateAsync(confirm.user.id);
          else                               await activate.mutateAsync(confirm.user.id);
        }}
        onClose={() => setConfirm(null)}
      />

      {editUser && (
        <EditUserDrawer
          user={editUser}
          onClose={() => setEditUser(null)}
          branches={branches}
          vanTeams={vanTeams}
          dealerId={dealerId}
          onSave={async (data) => {
            await updateUser.mutateAsync({ id: Number(editUser.id), data });
            showSuccess("User updated successfully!");
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleteConfirm}
        title="Delete User"
        message={`Permanently delete ${deleteConfirm?.first_name} ${deleteConfirm?.last_name}? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={async () => {
          if (!deleteConfirm) return;
          await deleteUser.mutateAsync(Number(deleteConfirm.id));
          setDeleteConfirm(null);
          showSuccess("User deleted.");
        }}
        onClose={() => setDeleteConfirm(null)}
      />
    </div>
  );
}

// ─── Dealer Profile Tab ───────────────────────────────────────────────────────

function DealerProfileTab({ dealerId, canEdit }: { dealerId?: number; canEdit?: boolean }) {
  const { data: dealerData, isLoading } = useDealer(dealerId!);
  const updateDealer = useUpdateDealer();

  const [companyName,  setCompanyName]  = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [address,      setAddress]      = useState("");
  const [saving,       setSaving]       = useState(false);

  useEffect(() => {
    if (dealerData) {
      setCompanyName(dealerData.name    ?? "");
      setContactEmail(dealerData.email  ?? "");
      setContactPhone(dealerData.phone  ?? "");
      setAddress(dealerData.address     ?? "");
    }
  }, [dealerData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading dealer profile…</span>
      </div>
    );
  }

  const dealerCode = dealerData?.id ? `D-${String(dealerData.id).padStart(4, "0")}` : "—";

  const fieldClass = (editable: boolean) => cn(
    "w-full rounded-md border border-border py-2 px-3 text-sm text-foreground focus:outline-none",
    editable
      ? "bg-accent focus:ring-1 focus:ring-primary"
      : "bg-muted text-muted-foreground cursor-not-allowed"
  );
  
  return (
    <div className="max-w-lg space-y-4">
      <FieldRow label="Company Name">
        <input value={companyName} onChange={e => setCompanyName(e.target.value)}
          readOnly={!canEdit} className={fieldClass(!!canEdit)} />
      </FieldRow>

      <FieldRow label="Dealer Code">
        <div className="flex">
          <input value={dealerCode} readOnly className="w-full rounded-l-md border border-border bg-muted py-2 px-3 text-sm text-muted-foreground" />
          <button onClick={() => navigator.clipboard.writeText(dealerCode)}
            className="rounded-r-md border border-l-0 border-border px-3 text-xs text-muted-foreground hover:text-foreground transition-colors">
            Copy
          </button>
        </div>
      </FieldRow>

      <FieldRow label="Contact Email">
        <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)}
          readOnly={!canEdit} className={fieldClass(!!canEdit)} />
      </FieldRow>

      <FieldRow label="Contact Phone">
        <input value={contactPhone} onChange={e => setContactPhone(e.target.value)}
          readOnly={!canEdit} className={fieldClass(!!canEdit)} />
      </FieldRow>

      <FieldRow label="Address">
        <textarea rows={2} value={address} onChange={e => setAddress(e.target.value)}
          readOnly={!canEdit} className={cn(fieldClass(!!canEdit), "resize-none")} />
      </FieldRow>

      <div className="flex items-center gap-3 flex-wrap">
        <StatusBadge status={dealerData?.is_active ? "activated" : "Inactive"} />
        <span className="text-sm text-muted-foreground capitalize">
          {dealerData?.subscription_plan ?? "—"} Plan
        </span>
        <span className="text-xs text-muted-foreground">·</span>
        <span className="text-sm text-muted-foreground capitalize">
          {dealerData?.subscription_status ?? "—"}
        </span>
      </div>

      {/* Save button only renders when canEdit is true */}
      {canEdit && (
        <button
          disabled={saving || !dealerData?.id}
          onClick={async () => {
            if (!dealerData?.id) return;
            setSaving(true);
            try {
              await updateDealer.mutateAsync({
                id: dealerData.id,
                data: { name: companyName.trim(), email: contactEmail.trim(), phone: contactPhone.trim(), address: address.trim() },
              });
              showSuccess("Dealer profile updated successfully!");
            } catch {
              showError("Failed to update dealer profile.");
            } finally {
              setSaving(false);
            }
          }}
          className="btn-press flex items-center gap-2 rounded-md bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50 hover:opacity-90 transition-opacity"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? "Saving…" : "Save Changes"}
        </button>
      )}

      {/* Read-only notice for dealer_owner */}
      {!canEdit && (
        <p className="text-xs text-muted-foreground">
          This profile is managed by your system administrator.
        </p>
      )}
    </div>
  );
}

function AppearanceSection() {
  const { theme, setTheme } = useTheme();

  const options: { value: "dark" | "light"; label: string; icon: React.ElementType; description: string }[] = [
    { value: "dark",  label: "Dark",  icon: Moon, description: "Easy on the eyes at night" },
    { value: "light", label: "Light", icon: Sun,  description: "Clean and bright"           },
  ];

  return (
    <div className="mt-8 pt-6 border-t border-border max-w-lg">
      <h3 className="font-heading text-base font-semibold text-foreground mb-1">Appearance</h3>
      <p className="text-xs text-muted-foreground mb-4">Choose your preferred colour theme.</p>
      <div className="grid grid-cols-2 gap-3">
        {options.map(({ value, label, icon: Icon, description }) => (
          <button
            key={value}
            onClick={() => setTheme(value)}
            className={cn(
              "flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all",
              theme === value
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-accent/30 text-muted-foreground hover:border-border/80 hover:text-foreground"
            )}
          >
            <div className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg",
              theme === value ? "bg-primary/20" : "bg-accent"
            )}>
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <p className={cn("text-sm font-semibold", theme === value ? "text-primary" : "text-foreground")}>
                {label}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            </div>
            {theme === value && (
              <span className="ml-auto mt-auto text-[10px] font-bold uppercase tracking-wide text-primary">
                Active
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main Settings page ───────────────────────────────────────────────────────

export default function Settings() {
  const { user } = useAuth();
  const role = user?.role as keyof typeof SETTINGS_PERMISSIONS;

  const userBranch = user?.branch;
  const userVan    = user?.van;
  const dealerId   = user?.dealer_id ? Number(user.dealer_id) : undefined;

  const [activeTab,             setActiveTab]             = useState("dealer");
  const { data: branchesData, isLoading: branchesLoading, isError: branchesError } = useBranches(dealerId);
  const branches: Branch[] = branchesData ?? [];
  const createBranch  = useCreateBranch();
  const updateBranch  = useUpdateBranch();
  const [showAddBranch,  setShowAddBranch]  = useState(false);
  const [editBranch,     setEditBranch]     = useState<Branch | null>(null);
  const [showAddVan,     setShowAddVan]     = useState(false);
  const [editVan,        setEditVan]        = useState<VanTeam | null>(null);
  const [activeBranch,   setActiveBranch]   = useState<Branch | null>(null);
  const [activeVan,      setActiveVan]      = useState<VanTeam | null>(null);
  const { data: allVanTeamsData, isLoading: vanTeamsLoading } = useAllVanTeams(dealerId, branches);
  const vanTeams = allVanTeamsData ?? [];
  const createVanTeam = useCreateVanTeam();
  const updateVanTeam = useUpdateVanTeam();

  const { data: mobigoData, isLoading: mobigoLoading } = useMobiGos(dealerId);
  const mobigos: MobiGo[] = mobigoData ?? [];
  const createMobiGo     = useCreateMobiGo();
  const deactivateMobiGo = useDeactivateMobiGo();
  const activateMobiGo   = useActivateMobiGo();
  const deleteMobiGo     = useDeleteMobiGo();
  const [showAddMobiGo,  setShowAddMobiGo]  = useState(false);
  const [editMobiGo,     setEditMobiGo]     = useState<MobiGo | null>(null);
  const [activeMobiGo,   setActiveMobiGo]   = useState<MobiGo | null>(null);
  const [mobigoConfirm,  setMobigoConfirm]  = useState<{ type: "activate" | "deactivate" | "delete"; mobigo: MobiGo } | null>(null);

  // ── Branch / Van action state & mutations (add to Settings component) ─────────
  const [branchConfirm,    setBranchConfirm]    = useState<{ type: "activate" | "deactivate" | "delete"; branch: Branch } | null>(null);
  const [vanConfirm,       setVanConfirm]       = useState<{ type: "activate" | "deactivate" | "delete"; van: VanTeam } | null>(null);

  const deactivateBranch  = useDeactivateBranch();
  const activateBranch    = useActivateBranch();
  const deleteBranch      = useDeleteBranch();
  const deactivateVanTeam = useDeactivateVanTeam();
  const activateVanTeam   = useActivateVanTeam();
  const deleteVanTeam     = useDeleteVanTeam();

  const [showAddCommissionRule, setShowAddCommissionRule] = useState(false);
  const { data: commissionRules = [], isLoading: rulesLoading } = useCommissionRules(dealerId);
  const createRule  = useCreateCommissionRule();
  const toggleRule  = useToggleCommissionRule();
  const deleteRule  = useDeleteCommissionRule();
  const [ruleDeleteConfirm, setRuleDeleteConfirm] = useState<CommissionRule | null>(null);
  const [showAddDeductionRule,       setShowAddDeductionRule]       = useState(false);
  const [deductionRuleDeleteConfirm, setDeductionRuleDeleteConfirm] = useState<DeductionRule | null>(null);
  const { data: deductionRules = [], isLoading: deductionRulesLoading } = useDeductionRules(dealerId);
  const createDeductionRule = useCreateDeductionRule();
  const toggleDeductionRule = useToggleDeductionRule();
  const deleteDeductionRule = useDeleteDeductionRule();
  const [showAddUser,           setShowAddUser]           = useState(false);
  const [userSearchKey,         setUserSearchKey]         = useState(0);

  const { refetch: refetchUsers } = useUsers();

  // All branch managers — for the edit branch drawer
  const { data: branchManagersData } = useUsers({ role: "branch_manager" });
  const allBranchManagers = branchManagersData?.results ?? [];

  // All van team leaders — for the edit van drawer
  const { data: vanLeadersData } = useUsers({ role: "van_team_leader" });
  const allVanLeaders = vanLeadersData?.results ?? [];

  // Unassigned branch managers (no branch has them as manager)
  const assignedManagerIds = new Set(branches.map(b => String(b.manager)).filter(Boolean));
  const unassignedManagers = allBranchManagers.filter(u => !assignedManagerIds.has(String(u.id)));

  // Unassigned van leaders (no van has them as leader)
  const assignedLeaderIds = new Set(vanTeams.map(v => String(v.leader)).filter(Boolean));
  const unassignedLeaders = allVanLeaders.filter(u => !assignedLeaderIds.has(String(u.id)));

  const { data: baData } = useUsers({ role: "brand_ambassador", ...(dealerId ? { dealer_id: dealerId } : {}) });
  const { data: agentUsersData } = useUsers({ role: "external_agent",  ...(dealerId ? { dealer_id: dealerId } : {}),});
  const assignableUsers = (baData?.results ?? []).map(u => ({
    id:         String(u.id),
    name:       userFullName(u),
    contact:    u.phone,
    idNumber:   "",
    role:       u.role,
    allocation: "—",
    lastLogin:  "—",
    status:     (u.is_active ? "Active" : "Inactive") as "Active" | "Inactive",
  }));

  const permissions = SETTINGS_PERMISSIONS[role] || SETTINGS_PERMISSIONS.dealer_owner;

  if (!permissions.canView) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <ShieldAlert className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground">Access Denied</h2>
          <p className="text-muted-foreground mt-2">You don't have permission to access Settings.</p>
        </div>
      </div>
    );
  }

  const availableTabs         = TABS.filter(tab => permissions[tab.permission as keyof typeof permissions]);
  const currentTabIsAvailable = availableTabs.some(tab => tab.id === activeTab);
  const selectedTab           = currentTabIsAvailable ? activeTab : (availableTabs[0]?.id || "dealer");

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleAddBranch = async (data: BranchFormData) => {
    if (!permissions.canManageBranches || !dealerId) return;
    try {
      await createBranch.mutateAsync({
        dealerId,
        data: { name: data.name, phone: data.phone, address: data.address },
      });
      showSuccess(successMessages.CREATE_BRANCH_SUCCESS);
      setShowAddBranch(false);
    } catch {
      showError(errorMessages.CREATE_BRANCH_FAILED);
    }
  };

  const handleSaveBranch = async (branchId: number, data: { name?: string; phone?: string; address?: string; manager?: number | null; is_warehouse?: boolean }) => {
    if (!dealerId) return;
    await updateBranch.mutateAsync({ dealerId, branchId, data });
    setEditBranch(null);
    showSuccess("Branch updated successfully!");
  };

  const handleAddVan = async (data: VanFormData) => {
    if (!permissions.canManageVans || !dealerId) return;
    try {
      await createVanTeam.mutateAsync({
        dealerId,
        branchId: data.branchId,
        data: { name: data.name, branch: data.branchId },
      });
      showSuccess("Van team added successfully!");
      setShowAddVan(false);
    } catch {
      showError("Failed to create van team.");
    }
  };

  const handleSaveVan = async (van: VanTeam, data: { name?: string; leader?: number | null }) => {
    if (!dealerId) return;
    await updateVanTeam.mutateAsync({
      dealerId,
      branchId: van.branch,
      teamId:   van.id,
      data,
    });
    setEditVan(null);
    showSuccess("Van team updated successfully!");
  };

  const handleAddCommissionRule = async (data: CommissionRuleFormData) => {
     if (!permissions.canManageCommission || !dealerId) return;
     await createRule.mutateAsync(data);
     showSuccess("Commission rule added successfully!");
     setShowAddCommissionRule(false);
   };

  const dialogBranches: Branch[] =
    role === "branch_manager" && userBranch
      ? branches.filter(b => b.name === userBranch)
      : branches;

  const dialogVans = vanTeams.map(v => ({
    id:         String(v.id),
    name:       v.name,
    branch:     branches.find(b => b.id === v.branch)?.name ?? "—",
    branchId:   v.branch,
    hasLeader:  !!v.leader,
    leaderName: v.leader_details?.full_name
      ?? (v.leader
        ? userFullName(allVanLeaders.find(u => String(u.id) === String(v.leader)) ?? { first_name: "", last_name: "", email: `Leader #${v.leader}` } as UserProfile)
        : ""),
  }));

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {role === "dealer_owner"       && "Full access to all settings"}
            {role === "operations_manager" && "Manage operational settings"}
            {role === "branch_manager"     && `Manage ${userBranch} branch settings`}
            {role === "van_team_leader"    && `Manage ${userVan} van settings`}
            {role === "finance"            && "Manage commission rules"}
          </p>
        </div>
      </div>
      {availableTabs.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {availableTabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={cn(
                "btn-press rounded-md px-4 py-2 text-sm font-medium transition-colors",
                selectedTab === tab.id ? "bg-primary text-primary-foreground" : "bg-accent text-muted-foreground hover:text-foreground"
              )}>
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-border bg-card p-6">

        {/* Dealer Profile */}
        {selectedTab === "dealer" && permissions.canViewDealerProfile && (
          <DealerProfileTab dealerId={dealerId} canEdit={permissions.canEditDealerProfile} />
        )}

        {/* Branches */}
        {selectedTab === "branches" && permissions.canManageBranches && (
          <div>
            <SectionHeader
              title="Branches"
              onAdd={() => setShowAddBranch(true)}
              addLabel="Add Branch"
              showAdd={permissions.canManageBranches && role === "dealer_owner"}
            />
            {branchesLoading && (
              <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Loading branches…</span>
              </div>
            )}
            {branchesError && (
              <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>Failed to load branches.</span>
              </div>
            )}
            {!branchesLoading && !branchesError && (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="pb-3 text-left font-medium">Branch Name</th>
                        <th className="pb-3 text-left font-medium">Address</th>
                        <th className="pb-3 text-left font-medium">Phone</th>
                        <th className="pb-3 text-left font-medium">Manager</th>
                        <th className="pb-3 text-left font-medium">Status</th>
                        <th className="pb-3 text-left font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {branches.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                            No branches yet. Add your first branch.
                          </td>
                        </tr>
                      ) : (
                        branches.map(b => (
                          <tr key={b.id} onClick={() => setActiveBranch(b)} className="border-b border-border/50 hover:bg-accent/50 transition-colors cursor-pointer">
                            <td className="py-3">
                              <div className="flex items-center gap-2">
                                <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                  <Building2 className="h-3.5 w-3.5 text-primary" />
                                </div>
                                <span className="font-medium text-foreground">{b.name}</span>
                              </div>
                            </td>
                            <td className="py-3 text-muted-foreground text-xs">{b.address || "—"}</td>
                            <td className="py-3 text-muted-foreground text-xs">{b.phone || "—"}</td>
                            <td className="py-3">
                              {(() => {
                                const managerName =
                                  b.manager_details?.full_name ??
                                  (b.manager
                                    ? userFullName(allBranchManagers.find(u => String(u.id) === String(b.manager)) ?? { first_name: "", last_name: "", email: `Manager #${b.manager}` } as UserProfile)
                                    : null);
                                return managerName ? (
                                  <div className="flex items-center gap-1.5">
                                    <div className="h-5 w-5 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0">
                                      <User className="h-3 w-3 text-amber-500" />
                                    </div>
                                    <span className="text-xs font-medium text-foreground">{managerName}</span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground italic">Unassigned</span>
                                );
                              })()}
                            </td>
                            <td className="py-3">
                              <StatusBadge status={b.is_active ? "activated" : "Inactive"} />
                            </td>
                            <td className="py-3" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center gap-1.5">
                                <button onClick={() => setEditBranch(b)}
                                  className="group relative p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                                  <Edit2 className="h-3.5 w-3.5" />
                                  <span className="absolute -top-7 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 transition-transform bg-popover border border-border text-foreground text-xs rounded px-1.5 py-0.5 whitespace-nowrap shadow-md">Edit</span>
                                </button>
                                <button
                                  onClick={() => setBranchConfirm({ type: b.is_active ? "deactivate" : "activate", branch: b })}
                                  className={cn(
                                    "group relative p-1.5 rounded-md transition-colors",
                                    b.is_active ? "text-destructive hover:bg-destructive/10" : "text-success hover:bg-success/10"
                                  )}>
                                  {b.is_active ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                                  <span className="absolute -top-7 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 transition-transform bg-popover border border-border text-foreground text-xs rounded px-1.5 py-0.5 whitespace-nowrap shadow-md">
                                    {b.is_active ? "Deactivate" : "Activate"}
                                  </span>
                                </button>
                                <button onClick={() => setBranchConfirm({ type: "delete", branch: b })}
                                  className="group relative p-1.5 rounded-md text-destructive hover:bg-destructive/10 transition-colors">
                                  <Trash2 className="h-3.5 w-3.5" />
                                  <span className="absolute -top-7 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 transition-transform bg-popover border border-border text-foreground text-xs rounded px-1.5 py-0.5 whitespace-nowrap shadow-md">Delete</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  {branches.length} branch{branches.length !== 1 ? "es" : ""} configured
                </p>
              </>
            )}
          </div>
        )}

        {/* Vans */}
        {selectedTab === "vans" && permissions.canManageVans && (
          <div>
            <SectionHeader
              title="Van Teams"
              onAdd={() => setShowAddVan(true)}
              addLabel="Add Van Team"
              showAdd={permissions.canManageVans && (role === "dealer_owner" || role === "operations_manager" || role === "branch_manager")}
            />
            {vanTeamsLoading && (
              <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Loading van teams…</span>
              </div>
            )}
            {!vanTeamsLoading && (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="pb-3 text-left font-medium">Van Team</th>
                        <th className="pb-3 text-left font-medium">Branch</th>
                        <th className="pb-3 text-left font-medium">Leader</th>
                        <th className="pb-3 text-left font-medium">Members</th>
                        <th className="pb-3 text-left font-medium">Status</th>
                        <th className="pb-3 text-left font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vanTeams.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                            No van teams yet. Add your first van team.
                          </td>
                        </tr>
                      ) : (
                        vanTeams.map(v => (
                          <tr key={v.id} onClick={() => setActiveVan(v)} className="border-b border-border/50 hover:bg-accent/50 transition-colors cursor-pointer">
                            <td className="py-3">
                              <div className="flex items-center gap-2">
                                <div className="h-7 w-7 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                                  <Truck className="h-3.5 w-3.5 text-blue-400" />
                                </div>
                                <span className="font-medium text-foreground">{v.name}</span>
                              </div>
                            </td>
                            <td className="py-3 text-xs text-muted-foreground">
                              {branches.find(b => b.id === v.branch)?.name ?? "—"}
                            </td>
                            <td className="py-3">
                              {(() => {
                                const leaderName =
                                  v.leader_details?.full_name ??
                                  (v.leader
                                    ? userFullName(allVanLeaders.find(u => String(u.id) === String(v.leader)) ?? { first_name: "", last_name: "", email: `Leader #${v.leader}` } as UserProfile)
                                    : null);
                                return leaderName ? (
                                  <div className="flex items-center gap-1.5">
                                    <div className="h-5 w-5 rounded-full bg-green-500/15 flex items-center justify-center shrink-0">
                                      <User className="h-3 w-3 text-green-500" />
                                    </div>
                                    <span className="text-xs font-medium text-foreground">{leaderName}</span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground italic">Unassigned</span>
                                );
                              })()}
                            </td>
                            <td className="py-3 text-sm text-muted-foreground">{v.members?.length ?? 0}</td>
                            <td className="py-3">
                              <StatusBadge status={v.is_active ? "activated" : "Inactive"} />
                            </td>
                            <td className="py-3" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center gap-1.5">
                                <button onClick={() => setEditVan(v)}
                                  className="group relative p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                                  <Edit2 className="h-3.5 w-3.5" />
                                  <span className="absolute -top-7 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 transition-transform bg-popover border border-border text-foreground text-xs rounded px-1.5 py-0.5 whitespace-nowrap shadow-md">Edit</span>
                                </button>
                                <button
                                  onClick={() => setVanConfirm({ type: v.is_active ? "deactivate" : "activate", van: v })}
                                  className={cn(
                                    "group relative p-1.5 rounded-md transition-colors",
                                    v.is_active ? "text-destructive hover:bg-destructive/10" : "text-success hover:bg-success/10"
                                  )}>
                                  {v.is_active ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                                  <span className="absolute -top-7 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 transition-transform bg-popover border border-border text-foreground text-xs rounded px-1.5 py-0.5 whitespace-nowrap shadow-md">
                                    {v.is_active ? "Deactivate" : "Activate"}
                                  </span>
                                </button>
                                <button onClick={() => setVanConfirm({ type: "delete", van: v })}
                                  className="group relative p-1.5 rounded-md text-destructive hover:bg-destructive/10 transition-colors">
                                  <Trash2 className="h-3.5 w-3.5" />
                                  <span className="absolute -top-7 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 transition-transform bg-popover border border-border text-foreground text-xs rounded px-1.5 py-0.5 whitespace-nowrap shadow-md">Delete</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  {vanTeams.length} van team{vanTeams.length !== 1 ? "s" : ""} configured
                </p>
              </>
            )}
          </div>
        )}

        {/* MobiGo */}
        {selectedTab === "mobigo" && permissions.canManageAssets && (
          <MobiGoTab
            mobigos={mobigos}
            isLoading={mobigoLoading}
            dealerId={dealerId}
            baUsers={baData?.results ?? []}
            agentUsers={agentUsersData?.results ?? []}   // ← add
            onAdd={() => setShowAddMobiGo(true)}
            onEdit={setEditMobiGo}
            onViewDetails={setActiveMobiGo}
            onConfirm={setMobigoConfirm}
            showAdd={permissions.canManageAssets}
          />
        )}

        {/* Users */}
        {selectedTab === "users" && permissions.canManageUsers && (
          <UsersTab
            key={userSearchKey}
            showAdd={permissions.canManageUsers}
            onAddClick={() => setShowAddUser(true)}
            fixedRole={role === "branch_manager" || role === "van_team_leader" ? "brand_ambassador" : undefined}
            branches={branches}
            vanTeams={vanTeams}
            dealerId={dealerId}
            mobigos={mobigos}
          />
        )}

        {/* Commission Rules */}
        {selectedTab === "commission" && permissions.canManageCommission && (
          <div>
            <SectionHeader
              title="Commission Rules"
              onAdd={() => setShowAddCommissionRule(true)}
              addLabel="Add Rule"
              showAdd={permissions.canManageCommission}
            />
        
            {rulesLoading && (
              <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Loading commission rules…</span>
              </div>
            )}
        
            {!rulesLoading && commissionRules.length === 0 && (
              <div className="rounded-lg border border-dashed border-border py-16 text-center">
                <DollarSign className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No commission rules yet.</p>
                <button
                  onClick={() => setShowAddCommissionRule(true)}
                  className="mt-3 text-sm text-primary underline"
                >
                  Add your first rule
                </button>
              </div>
            )}
        
            {!rulesLoading && commissionRules.length > 0 && (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground text-xs">
                        <th className="pb-3 text-left font-medium">Rate / Active SIM</th>
                        <th className="pb-3 text-left font-medium">Min Top-up</th>
                        <th className="pb-3 text-left font-medium">Effective From</th>
                        <th className="pb-3 text-left font-medium">Effective To</th>
                        <th className="pb-3 text-left font-medium">Status</th>
                        <th className="pb-3 text-left font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {commissionRules.map(r => (
                        <tr
                          key={r.id}
                          className={cn(
                            "border-b border-border/50 hover:bg-accent/50 transition-colors",
                            !r.is_active && "opacity-60"
                          )}
                        >
                          <td className="py-3 font-semibold text-foreground">
                            KES {Number(r.rate_per_active).toLocaleString()}
                          </td>
                          <td className="py-3 text-muted-foreground text-xs">
                            KES {Number(r.minimum_topup).toLocaleString()}
                          </td>
                          <td className="py-3 text-muted-foreground text-xs">
                            {new Date(r.effective_from).toLocaleDateString("en-KE", {
                              year: "numeric", month: "short", day: "numeric",
                            })}
                          </td>
                          <td className="py-3 text-muted-foreground text-xs">
                            {r.effective_to
                              ? new Date(r.effective_to).toLocaleDateString("en-KE", {
                                  year: "numeric", month: "short", day: "numeric",
                                })
                              : <span className="italic">Open-ended</span>}
                          </td>
                          <td className="py-3">
                            <StatusBadge status={r.is_active ? "activated" : "Inactive"} />
                          </td>
                          <td className="py-3">
                            <div className="flex items-center gap-1.5">
                              {/* Toggle active/inactive */}
                              <button
                                title={r.is_active ? "Deactivate" : "Activate"}
                                disabled={toggleRule.isPending}
                                onClick={() =>
                                  toggleRule.mutateAsync(
                                    { id: r.id, is_active: !r.is_active },
                                    {
                                      onSuccess: () =>
                                        showSuccess(
                                          r.is_active
                                            ? "Rule deactivated."
                                            : "Rule activated."
                                        ),
                                      onError: () => showError("Failed to update rule."),
                                    }
                                  )
                                }
                                className={cn(
                                  "group relative p-1.5 rounded-md transition-colors disabled:opacity-50",
                                  r.is_active
                                    ? "text-destructive hover:bg-destructive/10"
                                    : "text-success hover:bg-success/10"
                                )}
                              >
                                {r.is_active
                                  ? <UserX className="h-3.5 w-3.5" />
                                  : <UserCheck className="h-3.5 w-3.5" />}
                                <span className="absolute -top-7 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 transition-transform bg-popover border border-border text-foreground text-xs rounded px-1.5 py-0.5 whitespace-nowrap shadow-md">
                                  {r.is_active ? "Deactivate" : "Activate"}
                                </span>
                              </button>
        
                              {/* Delete */}
                              <button
                                title="Delete"
                                onClick={() => setRuleDeleteConfirm(r)}
                                className="group relative p-1.5 rounded-md text-destructive hover:bg-destructive/10 transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span className="absolute -top-7 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 transition-transform bg-popover border border-border text-foreground text-xs rounded px-1.5 py-0.5 whitespace-nowrap shadow-md">
                                  Delete
                                </span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  {commissionRules.length} rule{commissionRules.length !== 1 ? "s" : ""} configured
                </p>
              </>
            )}
        
            {/* Delete confirm dialog */}
            <ConfirmDialog
              open={!!ruleDeleteConfirm}
              title="Delete Rule"
              message={`Delete the rule of KES ${Number(ruleDeleteConfirm?.rate_per_active ?? 0).toLocaleString()} / SIM? This cannot be undone.`}
              confirmLabel="Delete"
              danger
              onConfirm={async () => {
                if (!ruleDeleteConfirm) return;
                await deleteRule.mutateAsync(ruleDeleteConfirm.id);
                showSuccess("Rule deleted.");
                setRuleDeleteConfirm(null);
              }}
              onClose={() => setRuleDeleteConfirm(null)}
            />
            {/* ── Deduction Rules ── */}
            <div className="mt-8 pt-6 border-t border-border">
              <SectionHeader
                title="Deduction Rules"
                onAdd={() => setShowAddDeductionRule(true)}
                addLabel="Add Rule"
                showAdd={permissions.canManageCommission}
              />

              <p className="text-sm text-muted-foreground mb-4 -mt-2">
                Penalties applied to agents for violations like holding SIMs too long, fraud, or damage.
              </p>

              {deductionRulesLoading && (
                <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm">Loading deduction rules…</span>
                </div>
              )}

              {!deductionRulesLoading && deductionRules.length === 0 && (
                <div className="rounded-lg border border-dashed border-border py-12 text-center">
                  <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No deduction rules configured.</p>
                  <button onClick={() => setShowAddDeductionRule(true)} className="mt-3 text-sm text-primary underline">
                    Add your first rule
                  </button>
                </div>
              )}

              {!deductionRulesLoading && deductionRules.length > 0 && (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-muted-foreground text-xs">
                          <th className="pb-3 text-left font-medium">Name</th>
                          <th className="pb-3 text-left font-medium">Violation</th>
                          <th className="pb-3 text-left font-medium">Amount</th>
                          <th className="pb-3 text-left font-medium">Threshold</th>
                          <th className="pb-3 text-left font-medium">Settlement</th>
                          <th className="pb-3 text-left font-medium">Status</th>
                          <th className="pb-3 text-left font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deductionRules.map(r => (
                          <tr key={r.id} className={cn("border-b border-border/50 hover:bg-accent/50 transition-colors", !r.is_active && "opacity-60")}>
                            <td className="py-3 font-medium text-foreground">{r.name}</td>
                            <td className="py-3 text-xs text-muted-foreground">{VIOLATION_LABELS[r.violation_type] ?? r.violation_type}</td>
                            <td className="py-3 font-semibold text-foreground">
                              KES {Number(r.amount_per_unit).toLocaleString()}
                              {r.is_per_day && <span className="text-xs text-muted-foreground font-normal"> /day</span>}
                            </td>
                            <td className="py-3 text-xs text-muted-foreground">{r.threshold_days ? `${r.threshold_days} days` : "—"}</td>
                            <td className="py-3 text-xs text-muted-foreground">
                              {r.settlement_mode === "commission_deduction" ? "From commission" : "Standalone"}
                            </td>
                            <td className="py-3"><StatusBadge status={r.is_active ? "activated" : "Inactive"} /></td>
                            <td className="py-3">
                              <div className="flex items-center gap-1.5">
                                <button
                                  title={r.is_active ? "Deactivate" : "Activate"}
                                  disabled={toggleDeductionRule.isPending}
                                  onClick={() => toggleDeductionRule.mutateAsync(
                                    { id: r.id, is_active: !r.is_active },
                                    {
                                      onSuccess: () => showSuccess(r.is_active ? "Rule deactivated." : "Rule activated."),
                                      onError:   () => showError("Failed to update rule."),
                                    }
                                  )}
                                  className={cn("group relative p-1.5 rounded-md transition-colors disabled:opacity-50",
                                    r.is_active ? "text-destructive hover:bg-destructive/10" : "text-success hover:bg-success/10")}>
                                  {r.is_active ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                                </button>
                                <button
                                  title="Delete"
                                  onClick={() => setDeductionRuleDeleteConfirm(r)}
                                  className="group relative p-1.5 rounded-md text-destructive hover:bg-destructive/10 transition-colors">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {deductionRules.length} rule{deductionRules.length !== 1 ? "s" : ""} configured
                  </p>
                </>
              )}

              <ConfirmDialog
                open={!!deductionRuleDeleteConfirm}
                title="Delete Deduction Rule"
                message={`Delete "${deductionRuleDeleteConfirm?.name}"? This cannot be undone.`}
                confirmLabel="Delete"
                danger
                onConfirm={async () => {
                  if (!deductionRuleDeleteConfirm) return;
                  await deleteDeductionRule.mutateAsync(deductionRuleDeleteConfirm.id);
                  showSuccess("Rule deleted.");
                  setDeductionRuleDeleteConfirm(null);
                }}
                onClose={() => setDeductionRuleDeleteConfirm(null)}
              />
            </div>            
          </div>
        )}

        {/* Notifications */}
        {selectedTab === "notifications" && permissions.canManageNotifications && (
          <NotificationsTab dealerId={dealerId} />
        )}

        {/* Appearance */}
        {selectedTab === "dealer" && permissions.canViewDealerProfile && (
          <AppearanceSection />
        )}

      </div>

      {/* ── Dialogs & Drawers ── */}
      <AddVanDialog
        open={showAddVan}
        onClose={() => setShowAddVan(false)}
        onAdd={handleAddVan}
        branches={branches.map(b => ({ id: b.id, name: b.name }))}
      />

      <AddUserDialog
        open={showAddUser}
        onClose={() => setShowAddUser(false)}
        onSuccess={() => { refetchUsers(); setShowAddUser(false); setUserSearchKey(k => k + 1); }}
        vans={dialogVans}
        branches={dialogBranches}
        currentUserRole={role}
        dealerId={dealerId}
        canBypass={permissions.canBypassManagerConflict ?? false}
      />

      <AddBranchDialog
        open={showAddBranch}
        onClose={() => setShowAddBranch(false)}
        onAdd={handleAddBranch}
      />

      {dealerId && (
        <AddDeductionRuleDialog
          open={showAddDeductionRule}
          dealerId={dealerId}
          onClose={() => setShowAddDeductionRule(false)}
          onAdd={async (data) => {
            await createDeductionRule.mutateAsync(data);
            showSuccess("Deduction rule added!");
            setShowAddDeductionRule(false);
          }}
        />
      )}

      {/* Edit Branch Drawer */}
      {editBranch && dealerId && (
        <EditBranchDrawer
          branch={editBranch}
          dealerId={dealerId}
          onClose={() => setEditBranch(null)}
          onSave={handleSaveBranch}
          unassignedManagers={unassignedManagers}
        />
      )}

      {/* Branch Details Drawer */}
      <BranchDrawer
        branch={activeBranch}
        onClose={() => setActiveBranch(null)}
        vanTeams={vanTeams}
        allBranchManagers={allBranchManagers}
      />

      {/* Van Details Drawer */}
      <VanDrawer
        van={activeVan}
        onClose={() => setActiveVan(null)}
        branches={branches}
        allVanLeaders={allVanLeaders}
      />

      {/* Edit Van Drawer */}
      {editVan && dealerId && (
        <EditVanDrawer
          van={editVan}
          dealerId={dealerId}
          branches={branches}
          onClose={() => setEditVan(null)}
          onSave={handleSaveVan}
          unassignedLeaders={unassignedLeaders}
        />
      )}
      
      {/* Branch confirm dialog */}
      <ConfirmDialog
        open={!!branchConfirm}
        title={
          branchConfirm?.type === "delete"     ? "Delete Branch"     :
          branchConfirm?.type === "deactivate" ? "Deactivate Branch" : "Activate Branch"
        }
        message={
          branchConfirm?.type === "delete"
            ? `Permanently delete "${branchConfirm.branch.name}"? This cannot be undone.`
            : branchConfirm?.type === "deactivate"
            ? `Deactivate "${branchConfirm?.branch.name}"? It will be hidden from active operations.`
            : `Reactivate "${branchConfirm?.branch.name}"?`
        }
        confirmLabel={
          branchConfirm?.type === "delete"     ? "Delete"     :
          branchConfirm?.type === "deactivate" ? "Deactivate" : "Activate"
        }
        danger={branchConfirm?.type !== "activate"}
        onConfirm={async () => {
          if (!branchConfirm || !dealerId) return;
          const { type, branch } = branchConfirm;
          if (type === "deactivate") await deactivateBranch.mutateAsync({ dealerId, branchId: branch.id });
          else if (type === "activate") await activateBranch.mutateAsync({ dealerId, branchId: branch.id });
          else await deleteBranch.mutateAsync({ dealerId, branchId: branch.id });
          showSuccess(
            type === "delete" ? "Branch deleted." :
            type === "deactivate" ? "Branch deactivated." : "Branch activated."
          );
        }}
        onClose={() => setBranchConfirm(null)}
      />

      {/* Van confirm dialog */}
      <ConfirmDialog
        open={!!vanConfirm}
        title={
          vanConfirm?.type === "delete"     ? "Delete Van Team"     :
          vanConfirm?.type === "deactivate" ? "Deactivate Van Team" : "Activate Van Team"
        }
        message={
          vanConfirm?.type === "delete"
            ? `Permanently delete "${vanConfirm.van.name}"? This cannot be undone.`
            : vanConfirm?.type === "deactivate"
            ? `Deactivate "${vanConfirm?.van.name}"? It will be hidden from active operations.`
            : `Reactivate "${vanConfirm?.van.name}"?`
        }
        confirmLabel={
          vanConfirm?.type === "delete"     ? "Delete"     :
          vanConfirm?.type === "deactivate" ? "Deactivate" : "Activate"
        }
        danger={vanConfirm?.type !== "activate"}
        onConfirm={async () => {
          if (!vanConfirm || !dealerId) return;
          const { type, van } = vanConfirm;
          const branchId = van.branch;
          if (type === "deactivate") await deactivateVanTeam.mutateAsync({ dealerId, branchId, teamId: van.id });
          else if (type === "activate") await activateVanTeam.mutateAsync({ dealerId, branchId, teamId: van.id });
          else await deleteVanTeam.mutateAsync({ dealerId, branchId, teamId: van.id });
          showSuccess(
            type === "delete" ? "Van team deleted." :
            type === "deactivate" ? "Van team deactivated." : "Van team activated."
          );
        }}
        onClose={() => setVanConfirm(null)}
      />

      {/* MobiGo confirm dialog */}
      <ConfirmDialog
        open={!!mobigoConfirm}
        title={
          mobigoConfirm?.type === "delete"     ? "Delete MobiGo"     :
          mobigoConfirm?.type === "deactivate" ? "Deactivate MobiGo" : "Activate MobiGo"
        }
        message={
          mobigoConfirm?.type === "delete"
            ? `Permanently delete this MobiGo device? This cannot be undone.`
            : mobigoConfirm?.type === "deactivate"
            ? `Deactivate this MobiGo? It will be excluded from report matching.`
            : `Reactivate this MobiGo device?`
        }
        confirmLabel={
          mobigoConfirm?.type === "delete"     ? "Delete"     :
          mobigoConfirm?.type === "deactivate" ? "Deactivate" : "Activate"
        }
        danger={mobigoConfirm?.type !== "activate"}
        onConfirm={async () => {
          if (!mobigoConfirm || !dealerId) return;
          const { type, mobigo } = mobigoConfirm;
          if (type === "deactivate") await deactivateMobiGo.mutateAsync({ dealerId, mobigoId: mobigo.id });
          else if (type === "activate") await activateMobiGo.mutateAsync({ dealerId, mobigoId: mobigo.id });
          else await deleteMobiGo.mutateAsync({ dealerId, mobigoId: mobigo.id });
          showSuccess(
            type === "delete" ? "MobiGo deleted." :
            type === "deactivate" ? "MobiGo deactivated." : "MobiGo activated."
          );
        }}
        onClose={() => setMobigoConfirm(null)}
      />
    </div>
  );
}

// ─── Tiny helpers ─────────────────────────────────────────────────────────────

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function SectionHeader({ title, onAdd, addLabel, showAdd = true }: {
  title: string; onAdd: () => void; addLabel: string; showAdd?: boolean;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="font-heading text-lg font-semibold">{title}</h3>
      {showAdd && (
        <button onClick={onAdd}
          className="btn-press flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity">
          <Plus className="h-4 w-4" /> {addLabel}
        </button>
      )}
    </div>
  );
}