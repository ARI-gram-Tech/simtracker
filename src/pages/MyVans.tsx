// src/pages/branch/MyVans.tsx
import { useState, useMemo } from "react";
import {
  Truck, Users, Plus, X, Loader2, AlertCircle,
  User, Search, Trash2, ChevronRight, ChevronDown,
  Building2, UserCheck, UserX, Edit2, Save,
  Mail, Lock, Phone, Eye, EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useAllVanTeams, useAddVanTeamMember, useRemoveVanTeamMember, useUpdateVanTeam, useBranches } from "@/hooks/useDealers";
import { useUsers, useCreateUser } from "@/hooks/useUsers";
import { showSuccess, showError } from "@/lib/toast";
import type { VanTeam, Branch } from "@/types/dealers.types";
import type { UserProfile, UserRole } from "@/types/auth.types";
import { useMobiGos, useUpdateMobiGo } from "@/hooks/useMobigo";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function userFullName(u: UserProfile) {
  return [u.first_name, u.last_name].filter(Boolean).join(" ") || u.email;
}

function userInitials(u: UserProfile) {
  const parts = [u.first_name, u.last_name].filter(Boolean);
  return parts.length
    ? parts.map(p => p[0]).join("").slice(0, 2).toUpperCase()
    : u.email.slice(0, 2).toUpperCase();
}

// ─── Create BA Dialog ─────────────────────────────────────────────────────────

function CreateBADialog({
  open,
  onClose,
  onSuccess,
  dealerId,
  branchId,
  vans,
  autoAssignVan,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  dealerId: number;
  branchId: number;
  vans: VanTeam[];
  autoAssignVan?: VanTeam;
}) {
  const [name,             setName]             = useState("");
  const [email,            setEmail]            = useState("");
  const [phone,            setPhone]            = useState("");
  const [password,         setPassword]         = useState("");
  const [showPassword,     setShowPassword]     = useState(false);
  const [selectedVanId,    setSelectedVanId]    = useState<string>("");
  const [apiError,         setApiError]         = useState("");
  const [assignedMobigoId, setAssignedMobigoId] = useState<string>("");

  const { data: mobigoData } = useMobiGos(dealerId);
  const unassignedMobigos = (mobigoData ?? []).filter(m => !m.assigned_ba && m.is_active);

  const createUser   = useCreateUser();
  const addMember    = useAddVanTeamMember();
  const updateMobiGo = useUpdateMobiGo();

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

  const reset = () => {
    setName(""); setEmail(""); setPhone(""); setPassword("");
    setShowPassword(false); setSelectedVanId(""); setApiError("");
    setAssignedMobigoId("");
    onClose();
  };

  const handleSubmit = async () => {
    if (!isValid || !targetVan) return;
    setApiError("");

    const [first_name, ...rest] = name.trim().split(" ");
    const last_name = rest.join(" ") || "-";

    try {
      const newUser = await createUser.mutateAsync({
        email:     email.trim(),
        password:  password.trim(),
        first_name,
        last_name,
        phone:     "+254" + phone.replace(/\D/g, ""),
        role:      "brand_ambassador" as UserRole,
        dealer_id: dealerId,
      });

      await addMember.mutateAsync({
        dealerId,
        branchId,
        teamId: targetVan.id,
        data:   { agent: newUser.id },
      });

      // Assign MobiGo if selected — non-fatal if it fails
      if (assignedMobigoId) {
        try {
          await updateMobiGo.mutateAsync({
            dealerId,
            mobigoId: Number(assignedMobigoId),
            data: { assigned_ba: newUser.id },
          });
        } catch {
          showError("BA created but MobiGo assignment failed. Assign it manually in Settings.");
        }
      }

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={reset} />
      <div className="relative w-full max-w-md rounded-xl border border-border bg-card shadow-2xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
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

          {/* Personal details */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Personal Details</p>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                <User className="inline h-3.5 w-3.5 mr-1 text-muted-foreground" />
                Full Name <span className="text-destructive">*</span>
              </label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Alice Wanjiku"
                className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                <Phone className="inline h-3.5 w-3.5 mr-1 text-muted-foreground" />
                Phone <span className="text-destructive">*</span>
              </label>
              <div className="flex">
                <span className="inline-flex items-center rounded-l-md border border-r-0 border-border bg-accent/60 px-2 text-xs text-muted-foreground">
                  +254
                </span>
                <input
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, ""))}
                  placeholder="7XX XXX XXX"
                  maxLength={9}
                  className="w-full rounded-r-md border border-border bg-accent py-2 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {/* Account credentials */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Account Credentials</p>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                <Mail className="inline h-3.5 w-3.5 mr-1 text-muted-foreground" />
                Email Address <span className="text-destructive">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="alice@example.com"
                className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                <Lock className="inline h-3.5 w-3.5 mr-1 text-muted-foreground" />
                Temporary Password <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full rounded-md border border-border bg-accent py-2 pl-3 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">The user can change this after first login.</p>
            </div>
          </div>

          {/* Van assignment — only shown for branch_manager */}
          {!isVanLeader && (
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Van Assignment</p>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  <Truck className="inline h-3.5 w-3.5 mr-1 text-muted-foreground" />
                  Assign to Van <span className="text-destructive">*</span>
                </label>
                <select
                  value={selectedVanId}
                  onChange={e => setSelectedVanId(e.target.value)}
                  className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
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

          {/* MobiGo Assignment */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">MobiGo Device</p>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Assign MobiGo <span className="text-muted-foreground font-normal text-xs">(optional)</span>
              </label>
              <select
                value={assignedMobigoId}
                onChange={e => setAssignedMobigoId(e.target.value)}
                className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">— No device yet —</option>
                {unassignedMobigos.map(m => (
                  <option key={m.id} value={String(m.id)}>
                    {m.imis || m.sim_serial_number || `Device #${m.id}`}
                  </option>
                ))}
              </select>
              {unassignedMobigos.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  No unassigned MobiGo devices available. Add one in Settings → MobiGo Devices.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 border-t border-border px-6 py-4 sticky bottom-0 bg-card">
          <button
            onClick={reset}
            disabled={loading}
            className="flex-1 rounded-md border border-border py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isValid || loading}
            className="flex-1 flex items-center justify-center gap-2 rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Creating…" : "Create & Assign"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Add Member Dialog (kept for reference, not surfaced in UI) ───────────────

function AddMemberDialog({
  open,
  van,
  dealerId,
  onClose,
  onSuccess,
}: {
  open: boolean;
  van: VanTeam;
  dealerId: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [search, setSearch] = useState("");
  const addMember = useAddVanTeamMember();

  const { data: baData, isLoading } = useUsers({ role: "brand_ambassador", dealer_id: dealerId });
  const allBAs: UserProfile[] = baData?.results ?? [];

  const existingMemberIds = new Set((van.members ?? []).map(m => m.agent));
  const available = allBAs.filter(u =>
    u.is_active &&
    !existingMemberIds.has(u.id) &&
    userFullName(u).toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async (ba: UserProfile) => {
    try {
      await addMember.mutateAsync({
        dealerId,
        branchId: van.branch,
        teamId: van.id,
        data: { agent: ba.id },
      });
      showSuccess(`${userFullName(ba)} added to ${van.name}`);
      onSuccess();
    } catch {
      showError("Failed to add member. They may already be in another van.");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl border border-border bg-card shadow-2xl max-h-[80vh] flex flex-col">

        <div className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-500/10">
              <UserCheck className="h-4 w-4 text-pink-400" />
            </div>
            <div>
              <h3 className="font-heading text-base font-semibold">Add Existing BA</h3>
              <p className="text-xs text-muted-foreground">to {van.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-3 border-b border-border shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search brand ambassadors…"
              className="w-full rounded-md border border-border bg-accent py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {isLoading && (
            <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading brand ambassadors…</span>
            </div>
          )}
          {!isLoading && available.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {search ? "No results match your search." : "All active brand ambassadors are already assigned."}
            </div>
          )}
          {available.map(ba => (
            <div key={ba.id} className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3 hover:bg-accent/40 transition-colors">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-pink-500/10 flex items-center justify-center text-xs font-semibold text-pink-400 shrink-0">
                  {userInitials(ba)}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{userFullName(ba)}</p>
                  <p className="text-xs text-muted-foreground">{ba.phone || ba.email}</p>
                </div>
              </div>
              <button
                onClick={() => handleAdd(ba)}
                disabled={addMember.isPending}
                className="flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </button>
            </div>
          ))}
        </div>

        <div className="border-t border-border px-6 py-4 shrink-0">
          <button onClick={onClose} className="w-full rounded-md border border-border py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Van Card ─────────────────────────────────────────────────────────────────

function VanCard({
  van,
  dealerId,
  branches,
  currentUserRole,
  autoAssignVan,
  branchVans,
  branchId,
}: {
  van: VanTeam;
  dealerId: number;
  branches: Branch[];
  currentUserRole: string;
  autoAssignVan?: VanTeam;
  branchVans: VanTeam[];
  branchId: number;
}) {
  const [expanded,     setExpanded]     = useState(false);
  const [showCreateBA, setShowCreateBA] = useState(false);
  const [editingName,  setEditingName]  = useState(false);
  const [nameValue,    setNameValue]    = useState(van.name);
  const [savingName,   setSavingName]   = useState(false);
  const [removingId,   setRemovingId]   = useState<number | null>(null);

  const removeMember  = useRemoveVanTeamMember();
  const updateVanTeam = useUpdateVanTeam();

  const branchName  = branches.find(b => b.id === van.branch)?.name ?? "—";
  const memberCount = van.members?.length ?? 0;

  const handleRemoveMember = async (memberId: number, memberName: string) => {
    setRemovingId(memberId);
    try {
      await removeMember.mutateAsync({ dealerId, branchId: van.branch, teamId: van.id, memberId });
      showSuccess(`${memberName} removed from ${van.name}`);
    } catch {
      showError("Failed to remove member.");
    } finally {
      setRemovingId(null);
    }
  };

  const handleSaveName = async () => {
    if (!nameValue.trim() || nameValue.trim() === van.name) {
      setEditingName(false);
      setNameValue(van.name);
      return;
    }
    setSavingName(true);
    try {
      await updateVanTeam.mutateAsync({ dealerId, branchId: van.branch, teamId: van.id, data: { name: nameValue.trim() } });
      showSuccess("Van team name updated.");
      setEditingName(false);
    } catch {
      showError("Failed to update van team name.");
      setNameValue(van.name);
    } finally {
      setSavingName(false);
    }
  };

  return (
    <div className={cn("rounded-xl border border-border bg-card transition-all duration-200", expanded && "shadow-lg")}>

      {/* Van Header */}
      <div className="flex items-center gap-4 px-5 py-4 cursor-pointer" onClick={() => setExpanded(e => !e)}>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 shrink-0">
          <Truck className="h-5 w-5 text-blue-400" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate">{van.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <Building2 className="h-3 w-3 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">{branchName}</p>
            <span className="text-muted-foreground/40">·</span>
            <Users className="h-3 w-3 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">{memberCount} member{memberCount !== 1 ? "s" : ""}</p>
          </div>
        </div>

        {/* Leader badge */}
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          {van.leader_details ? (
            <div className="flex items-center gap-1.5 rounded-full bg-green-500/10 px-3 py-1">
              <div className="h-4 w-4 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                <User className="h-2.5 w-2.5 text-green-500" />
              </div>
              <span className="text-xs font-medium text-green-500">{van.leader_details.full_name}</span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground italic">No leader</span>
          )}
        </div>

        <div className={cn("h-2 w-2 rounded-full shrink-0", van.is_active ? "bg-success" : "bg-destructive")} />
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200", expanded && "rotate-180")} />
      </div>

      {/* Expanded Members */}
      {expanded && (
        <div className="border-t border-border px-5 py-4 space-y-4">

          {/* Leader info (mobile) */}
          <div className="sm:hidden flex items-center gap-2">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Leader:</span>
            {van.leader_details ? (
              <span className="text-xs font-medium text-foreground">{van.leader_details.full_name}</span>
            ) : (
              <span className="text-xs text-muted-foreground italic">Unassigned</span>
            )}
          </div>

          {/* Members header */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Brand Ambassadors ({memberCount})
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCreateBA(true)}
                className="flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                New BA
              </button>
            </div>
          </div>

          {/* Members list */}
          {memberCount === 0 ? (
            <div className="rounded-lg border border-dashed border-border py-8 text-center">
              <Users className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No brand ambassadors yet.</p>
              <div className="flex items-center justify-center mt-2">
                <button onClick={() => setShowCreateBA(true)} className="text-xs text-primary underline">
                  Create new BA
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-accent/40 text-muted-foreground text-xs">
                    <th className="py-2.5 px-4 text-left font-medium">Ambassador</th>
                    <th className="py-2.5 px-4 text-left font-medium hidden sm:table-cell">Phone</th>
                    <th className="py-2.5 px-4 text-left font-medium">Status</th>
                    <th className="py-2.5 px-4 text-left font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {van.members?.map(m => {
                    const fullName = m.agent_details?.full_name || `Agent #${m.agent}`;
                    const initials = m.agent_details?.full_name
                      ? m.agent_details.full_name.split(" ").map((p: string) => p[0]).join("").slice(0, 2).toUpperCase()
                      : "?";
                    const isRemoving = removingId === m.id;

                    return (
                      <tr key={m.id} className="border-b border-border/50 last:border-0 hover:bg-accent/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-full bg-pink-500/10 flex items-center justify-center text-xs font-semibold text-pink-400 shrink-0">
                              {initials}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">{fullName}</p>
                              <span className="inline-block rounded-full bg-pink-500/15 px-2 py-0.5 text-[10px] font-medium text-pink-400 mt-0.5">
                                Brand Ambassador
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground hidden sm:table-cell">
                          {m.agent_details?.phone || "—"}
                        </td>
                        <td className="py-3 px-4">
                          <span className="flex items-center gap-1 text-xs font-medium text-success w-fit">
                            <span className="h-1.5 w-1.5 rounded-full bg-success inline-block" />
                            Active
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleRemoveMember(m.id, fullName)}
                            disabled={isRemoving}
                            className="flex items-center gap-1 text-xs text-destructive hover:bg-destructive/10 rounded-md px-2 py-1 transition-colors disabled:opacity-50"
                          >
                            {isRemoving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserX className="h-3.5 w-3.5" />}
                            <span className="hidden sm:inline">Remove</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Rename shortcut */}
          {editingName ? (
            <div className="pt-2 border-t border-border/50 flex items-center gap-2" onClick={e => e.stopPropagation()}>
              <input
                value={nameValue}
                onChange={e => setNameValue(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleSaveName(); if (e.key === "Escape") { setEditingName(false); setNameValue(van.name); } }}
                autoFocus
                className="flex-1 rounded-md border border-border bg-accent py-1.5 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                onClick={handleSaveName}
                disabled={savingName}
                className="flex items-center gap-1 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
              >
                {savingName ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                Save
              </button>
              <button
                onClick={() => { setEditingName(false); setNameValue(van.name); }}
                className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="pt-2 border-t border-border/50 flex justify-end">
              <button
                onClick={() => setEditingName(true)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Edit2 className="h-3 w-3" />
                Rename van
              </button>
            </div>
          )}
        </div>
      )}

      {/* Create new BA dialog */}
      <CreateBADialog
        open={showCreateBA}
        onClose={() => setShowCreateBA(false)}
        onSuccess={() => setShowCreateBA(false)}
        dealerId={dealerId}
        branchId={branchId}
        vans={branchVans}
        autoAssignVan={autoAssignVan}
      />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MyVans() {
  const { user } = useAuth();
  const dealerId  = user?.dealer_id   ? Number(user.dealer_id)   : undefined;
  const branchId  = user?.branch_id   ? Number(user.branch_id)   : undefined;
  const vanTeamId = user?.van_team_id ? Number(user.van_team_id) : undefined;

  const { data: branchesData } = useBranches(dealerId);
  const branches: Branch[] = branchesData ?? [];

  const singleBranch = branchId ? branches.filter(b => b.id === branchId) : branches;
  const { data: vanTeams, isLoading } = useAllVanTeams(dealerId, singleBranch);
  const isError = false;

  const [search, setSearch] = useState("");

  const filtered = useMemo(() =>
    (vanTeams ?? []).filter(v => v.name.toLowerCase().includes(search.toLowerCase())),
    [vanTeams, search]
  );

  const myBranch     = branches.find(b => b.id === branchId);
  const totalMembers = (vanTeams ?? []).reduce((sum, v) => sum + (v.members?.length ?? 0), 0);

  const ownVan     = vanTeamId ? (vanTeams ?? []).find(v => v.id === vanTeamId) : undefined;
  const isVanLeader = user?.role === "van_team_leader";

  return (
    <div className="space-y-6">

      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">My Vans</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {myBranch ? `Managing van teams for ${myBranch.name}` : "Manage your branch van teams"}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: "Van Teams",     value: vanTeams?.length ?? 0, icon: Truck,     color: "text-blue-400",  bg: "bg-blue-500/10"  },
          { label: "Total Members", value: totalMembers,           icon: Users,     color: "text-pink-400",  bg: "bg-pink-500/10"  },
          { label: "Branch",        value: myBranch?.name ?? "—", icon: Building2, color: "text-amber-500", bg: "bg-amber-500/10" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="rounded-xl border border-border bg-card px-5 py-4">
            <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center mb-3", bg)}>
              <Icon className={cn("h-4 w-4", color)} />
            </div>
            <p className="text-2xl font-bold text-foreground truncate">{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search van teams…"
          className="w-full rounded-md border border-border bg-accent py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading van teams…</span>
        </div>
      )}

      {isError && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Failed to load van teams.</span>
        </div>
      )}

      {!isLoading && !isError && filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <Truck className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">
            {search ? "No van teams match your search." : "No van teams in your branch yet."}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Van teams are created by your dealer owner or operations manager.
          </p>
        </div>
      )}

      {!isLoading && !isError && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map(van => (
            <div key={van.id} className="group">
              <VanCard
                van={van}
                dealerId={dealerId!}
                branches={branches}
                branchId={branchId!}
                branchVans={vanTeams ?? []}
                currentUserRole={user?.role ?? ""}
                autoAssignVan={isVanLeader && ownVan?.id === van.id ? ownVan : undefined}
              />
            </div>
          ))}
          <p className="text-xs text-muted-foreground pt-1">
            {filtered.length} van team{filtered.length !== 1 ? "s" : ""}
            {search && ` matching "${search}"`}
          </p>
        </div>
      )}

      <div className="rounded-lg border border-border bg-accent/30 px-4 py-3 flex items-start gap-3">
        <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          You can rename van teams, and add or remove brand ambassadors. To create new van teams or change the van team leader, contact your dealer owner or operations manager.
        </p>
      </div>
    </div>
  );
}