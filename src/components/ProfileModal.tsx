// src/components/ProfileModal.tsx
import { useState } from "react";
import { X, User, Mail, Phone, Shield, Building2, Truck, Lock, Eye, EyeOff, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { authService } from "@/api/auth.service";
import { useChangePassword } from "@/hooks/useAuth";
import type { UserProfile } from "@/types/auth.types";

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
}

type Tab = "info" | "password";

const ROLE_LABELS: Record<string, string> = {
  dealer_owner:       "Dealer Owner",
  operations_manager: "Operations Manager",
  branch_manager:     "Branch Manager",
  van_team_leader:    "Van Team Leader",
  brand_ambassador:   "Brand Ambassador",
  external_agent:     "External Agent",
  finance:            "Finance Admin",
  super_admin:        "Super Admin",
};

function InfoRow({
  icon, label, value, loading,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string | null;
  loading?: boolean;
}) {
  if (!loading && !value) return null;
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-0">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div className="flex-1">
        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
        {loading ? (
          <div className="h-4 w-32 rounded bg-accent animate-pulse" />
        ) : (
          <p className="text-sm font-medium text-foreground">{value}</p>
        )}
      </div>
    </div>
  );
}

export function ProfileModal({ open, onClose }: ProfileModalProps) {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("info");

  const role   = user?.role ?? "";

  // ── Fetch full profile from /api/auth/me/ ─────────────────────────────
  const { data: profile, isLoading: profileLoading } = useQuery<UserProfile>({
    queryKey: ["me"],
    queryFn: authService.me,
    enabled: open,
  });

  // All assignment data comes directly from the profile (serializer computes it)
  const assignmentLoading = profileLoading;
  const assignedBranchName = profile?.branch_name ?? null;
  const assignedVanName    = profile?.van_team_name ?? null;
  const assignedVanBranch  = profile?.branch_name ?? null;

  // ── Change password ───────────────────────────────────────────────────
  const { mutate: changePassword, isPending, isSuccess, isError } = useChangePassword();
  const [oldPw,     setOldPw]     = useState("");
  const [newPw,     setNewPw]     = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showOld,   setShowOld]   = useState(false);
  const [showNew,   setShowNew]   = useState(false);
  const [localErr,  setLocalErr]  = useState("");

  const handlePasswordSubmit = () => {
    setLocalErr("");
    if (!oldPw || !newPw || !confirmPw) { setLocalErr("All fields are required."); return; }
    if (newPw.length < 8) { setLocalErr("New password must be at least 8 characters."); return; }
    if (newPw !== confirmPw) { setLocalErr("New passwords do not match."); return; }
    changePassword(
      { old_password: oldPw, new_password: newPw },
      { onSuccess: () => { setOldPw(""); setNewPw(""); setConfirmPw(""); } }
    );
  };

  if (!open) return null;

  const fullName = profile
    ? `${profile.first_name} ${profile.last_name}`.trim()
    : user?.name ?? "";

  const initials = fullName
    .split(" ").filter(Boolean).map(n => n[0]).join("").slice(0, 2).toUpperCase() || "??";

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-foreground">My Profile</h2>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Avatar + name */}
        <div className="flex items-center gap-4 px-5 py-5 border-b border-border">
          <div className="h-14 w-14 rounded-full bg-primary/15 flex items-center justify-center text-lg font-bold text-primary shrink-0">
            {initials}
          </div>
          <div>
            {profileLoading
              ? <div className="h-4 w-36 rounded bg-accent animate-pulse mb-1.5" />
              : <p className="text-base font-semibold text-foreground">{fullName}</p>
            }
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {ROLE_LABELS[role] ?? role}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {(["info", "password"] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "flex-1 py-2.5 text-sm font-medium transition-colors",
                tab === t ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t === "info" ? "Profile Info" : "Change Password"}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="px-5 py-4 min-h-[220px]">

          {/* ── Info tab ── */}
          {tab === "info" && (
            <div>
              <InfoRow icon={<Mail   className="h-4 w-4" />} label="Email" value={profile?.email}             loading={profileLoading} />
              <InfoRow icon={<Phone  className="h-4 w-4" />} label="Phone" value={profile?.phone || "Not set"} loading={profileLoading} />
              <InfoRow icon={<Shield className="h-4 w-4" />} label="Role"  value={ROLE_LABELS[role] ?? role}   loading={profileLoading} />

              {/* Branch manager → their branch */}
              {role === "branch_manager" && (
                <InfoRow
                  icon={<Building2 className="h-4 w-4" />}
                  label="Assigned Branch"
                  value={assignedBranchName ?? "Not assigned"}
                  loading={assignmentLoading}
                />
              )}

              {/* Van team leader → their van and branch */}
              {role === "van_team_leader" && (
                <>
                  <InfoRow
                    icon={<Truck className="h-4 w-4" />}
                    label="Assigned Van Team"
                    value={assignedVanName ?? "Not assigned"}
                    loading={assignmentLoading}
                  />
                  {assignedVanName && (
                    <InfoRow
                      icon={<Building2 className="h-4 w-4" />}
                      label="Branch"
                      value={assignedVanBranch ?? "—"}
                      loading={assignmentLoading}
                    />
                  )}
                </>
              )}

              {/* Brand ambassador → their van and branch */}
              {role === "brand_ambassador" && (
                <>
                  <InfoRow
                    icon={<Truck className="h-4 w-4" />}
                    label="Van Team"
                    value={assignedVanName ?? "Not assigned"}
                    loading={assignmentLoading}
                  />
                  {assignedVanName && (
                    <InfoRow
                      icon={<Building2 className="h-4 w-4" />}
                      label="Branch"
                      value={assignedVanBranch ?? "—"}
                      loading={assignmentLoading}
                    />
                  )}
                </>
              )}

              {!["branch_manager", "van_team_leader", "brand_ambassador"].includes(role) && (
                <InfoRow icon={<User className="h-4 w-4" />} label="Access" value="All dealer branches" />
              )}
            </div>
          )}

          {/* ── Password tab ── */}
          {tab === "password" && (
            <div className="space-y-3 pt-1">
              {isSuccess && (
                <div className="flex items-center gap-2 rounded-md bg-green-500/10 border border-green-500/20 px-3 py-2 text-sm text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  Password changed successfully.
                </div>
              )}
              {(localErr || isError) && (
                <div className="flex items-center gap-2 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {localErr || "Failed to change password. Check your current password."}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Current Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input type={showOld ? "text" : "password"} value={oldPw} onChange={e => setOldPw(e.target.value)}
                    className="w-full rounded-md border border-border bg-accent pl-10 pr-10 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Current password" />
                  <button type="button" onClick={() => setShowOld(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showOld ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input type={showNew ? "text" : "password"} value={newPw} onChange={e => setNewPw(e.target.value)}
                    className="w-full rounded-md border border-border bg-accent pl-10 pr-10 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Min. 8 characters" />
                  <button type="button" onClick={() => setShowNew(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Confirm New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handlePasswordSubmit()}
                    className="w-full rounded-md border border-border bg-accent pl-10 pr-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Repeat new password" />
                </div>
              </div>

              <button onClick={handlePasswordSubmit} disabled={isPending}
                className="w-full flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors mt-1">
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {isPending ? "Updating…" : "Update Password"}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}