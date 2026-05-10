// src/pages/super-admin/Users.tsx
// Route: /super-admin/users

import { useState, useMemo } from "react";
import {
  Search, Plus, Users as UsersIcon, MoreVertical,
  CheckCircle2, XCircle, Mail, Phone, Shield,
  Eye, UserX, UserCheck, Trash2, X, Check,
  EyeOff, Send, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUsers, useCreateUser, useDeactivateUser, useActivateUser, useDeleteUser } from "@/hooks/useUsers";
import { useSendEmail } from "@/hooks/useNotifications";
import type { UserProfile, UserRole } from "@/types/auth.types";

// ── Constants ─────────────────────────────────────────────────────────────────

const roleLabels: Record<UserRole, string> = {
  super_admin:         "Super Admin",
  dealer_owner:        "Dealer Owner",
  operations_manager:  "Operations Manager",
  branch_manager:      "Branch Manager",
  van_team_leader:     "Van Team Leader",
  brand_ambassador:    "Brand Ambassador",
  finance:             "Finance Admin",
  external_agent:      "External Agent",
};

const roleColors: Record<UserRole, string> = {
  super_admin:        "bg-primary/15 text-primary",
  dealer_owner:       "bg-blue-500/15 text-blue-400",
  operations_manager: "bg-purple-500/15 text-purple-400",
  branch_manager:     "bg-amber-500/15 text-amber-500",
  van_team_leader:    "bg-green-500/15 text-green-500",
  brand_ambassador:   "bg-pink-500/15 text-pink-400",
  finance:            "bg-teal-500/15 text-teal-400",
  external_agent:     "bg-orange-500/15 text-orange-400",
};

const inputCls =
  "w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary";

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(user: UserProfile) {
  return `${user.first_name[0] ?? ""}${user.last_name[0] ?? ""}`.toUpperCase();
}

function buildInvitationEmail(user: UserProfile): {
  subject: string;
  body: string;
  html_body: string;
} {
  const frontendUrl = import.meta.env.VITE_FRONTEND_URL ?? window.location.origin;
  const loginUrl    = `${frontendUrl}/login`;
  const roleName    = roleLabels[user.role];
  const firstName   = user.first_name;
  const userInitials = initials(user);

  const subject = "Your SimTrack Account — Login Details";

  const body = [
    `Hi ${firstName},`,
    "",
    "Your SimTrack account is ready. Here are your login details:",
    "",
    `  Email:  ${user.email}`,
    `  Role:   ${roleName}`,
    `  Login:  ${loginUrl}`,
    "",
    "If you haven't set a password yet or have forgotten it, use the",
    '"Forgot password?" link on the login page to set a new one.',
    "",
    "— SimTrack Admin",
  ].join("\n");

  const html_body = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:#18181b;border-radius:16px 16px 0 0;padding:28px 32px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-right:12px;vertical-align:middle;">
                    <div style="width:32px;height:32px;background:#7c3aed;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="2" y="3" width="20" height="14" rx="2"/>
                        <path d="M8 21h8M12 17v4"/>
                      </svg>
                    </div>
                  </td>
                  <td style="vertical-align:middle;">
                    <span style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">Sim<span style="color:#a78bfa;">Track</span></span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:40px 32px 32px;">

              <!-- Avatar + Greeting -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="vertical-align:middle;padding-right:16px;" width="56">
                    <div style="width:52px;height:52px;border-radius:50%;background:#ede9fe;text-align:center;line-height:52px;">
                      <span style="font-size:18px;font-weight:700;color:#5b21b6;">${userInitials}</span>
                    </div>
                  </td>
                  <td style="vertical-align:middle;">
                    <p style="margin:0 0 4px;font-size:20px;font-weight:700;color:#18181b;">Hi ${firstName}! 👋</p>
                    <p style="margin:0;font-size:14px;color:#71717a;">Your SimTrack account is ready to use.</p>
                  </td>
                </tr>
              </table>

              <!-- Role Badge -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:10px;padding:14px 18px;">
                    <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.1em;color:#7c3aed;text-transform:uppercase;">Your Role</p>
                    <p style="margin:0;font-size:16px;font-weight:700;color:#5b21b6;">${roleName}</p>
                  </td>
                </tr>
              </table>

              <!-- Credentials Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;border:1px solid #e4e4e7;border-radius:10px;overflow:hidden;">
                <tr>
                  <td style="background:#fafafa;padding:12px 20px;border-bottom:1px solid #e4e4e7;">
                    <p style="margin:0;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#a1a1aa;">Login Details</p>
                  </td>
                </tr>
                <tr>
                  <td style="background:#ffffff;padding:14px 20px;border-bottom:1px solid #f4f4f5;">
                    <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.07em;text-transform:uppercase;color:#a1a1aa;">Email Address</p>
                    <p style="margin:0;font-size:15px;font-weight:500;color:#18181b;font-family:'Courier New',monospace;">${user.email}</p>
                  </td>
                </tr>
                <tr>
                  <td style="background:#ffffff;padding:14px 20px;">
                    <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.07em;text-transform:uppercase;color:#a1a1aa;">Login URL</p>
                    <p style="margin:0;font-size:14px;color:#7c3aed;font-family:'Courier New',monospace;">${loginUrl}</p>
                  </td>
                </tr>
              </table>

              <!-- Info Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="background:#fefce8;border:1px solid #fde68a;border-radius:10px;padding:16px 20px;">
                    <p style="margin:0;font-size:13px;color:#92400e;line-height:1.6;">
                      <strong style="color:#78350f;">&#8505;&#65039; First time logging in?</strong><br/>
                      Use the <strong>&ldquo;Forgot password?&rdquo;</strong> link on the login page to set your password before signing in.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td align="center">
                    <a href="${loginUrl}"
                      style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 40px;border-radius:10px;letter-spacing:0.3px;">
                      Log In to SimTrack &#8594;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
                <tr><td style="border-top:1px solid #e4e4e7;"></td></tr>
              </table>

              <p style="margin:0;font-size:12px;color:#a1a1aa;text-align:center;line-height:1.6;">
                If you did not expect this email, please contact your system administrator.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#fafafa;border:1px solid #e4e4e7;border-top:none;border-radius:0 0 12px 12px;padding:20px 32px;text-align:center;">
              <p style="margin:0 0 6px;font-size:12px;color:#a1a1aa;">
                Sent by <strong style="color:#71717a;">SimTrack</strong> &mdash; SIM Distribution &amp; Commission Management
              </p>
              <p style="margin:0;font-size:11px;color:#d1d5db;">
                &copy; ${new Date().getFullYear()} SimTrack &nbsp;&middot;&nbsp;
                <a href="${frontendUrl}" style="color:#7c3aed;text-decoration:none;">${frontendUrl}</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, body, html_body };
}

// ── Confirm Dialog ────────────────────────────────────────────────────────────

function ConfirmDialog({
  open, title, message, danger, confirmLabel, onConfirm, onClose,
}: {
  open: boolean; title: string; message: string;
  danger?: boolean; confirmLabel?: string;
  onConfirm: () => void; onClose: () => void;
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

// ── Create User Dialog ────────────────────────────────────────────────────────

function InviteUserDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createUser = useCreateUser();

  const [form, setForm] = useState({
    first_name: "", last_name: "", email: "",
    phone: "", role: "dealer_owner" as UserRole, password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isValid =
    form.first_name.trim() &&
    form.last_name.trim() &&
    form.email.trim() &&
    form.password.length >= 8;

  const reset = () => {
    setForm({ first_name: "", last_name: "", email: "", phone: "", role: "dealer_owner", password: "" });
    setError(null);
    setSuccess(false);
    onClose();
  };

  const handleSubmit = async () => {
    if (!isValid) return;
    setError(null);
    try {
      await createUser.mutateAsync({
        ...form,
        phone: form.phone ? `+254${form.phone}` : "",
      });
      setSuccess(true);
      setTimeout(reset, 1500);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: Record<string, string | string[]> } })?.response?.data;
      if (detail && typeof detail === "object") {
        const msg = Object.entries(detail)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
          .join(" · ");
        setError(msg);
      } else {
        setError("Failed to create user. Please try again.");
      }
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={reset} />
      <div className="relative w-full max-w-md rounded-xl border border-border bg-card shadow-2xl">

        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <UsersIcon className="h-4 w-4 text-primary" />
            </div>
            <h3 className="font-heading text-base font-semibold">Create User</h3>
          </div>
          <button onClick={reset}
            className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                First Name <span className="text-destructive">*</span>
              </label>
              <input value={form.first_name}
                onChange={(e) => setForm(f => ({ ...f, first_name: e.target.value }))}
                placeholder="John" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Last Name <span className="text-destructive">*</span>
              </label>
              <input value={form.last_name}
                onChange={(e) => setForm(f => ({ ...f, last_name: e.target.value }))}
                placeholder="Doe" className={inputCls} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Email <span className="text-destructive">*</span>
            </label>
            <input value={form.email}
              onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
              type="email" placeholder="user@company.co.ke" className={inputCls} />
            {form.email.trim() && (
              <p className="flex items-center gap-1.5 text-xs text-primary mt-1.5">
                <Mail className="h-3 w-3 shrink-0" />
                Login credentials will be emailed to this address after account creation.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Phone</label>
            <div className="flex">
              <span className="inline-flex items-center rounded-l-md border border-r-0 border-border bg-accent/60 px-2 text-xs text-muted-foreground">
                +254
              </span>
              <input value={form.phone}
                onChange={(e) => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, "") }))}
                placeholder="7XX XXX XXX" maxLength={9}
                className="w-full rounded-r-md border border-border bg-accent py-2 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Role <span className="text-destructive">*</span>
            </label>
            <select value={form.role}
              onChange={(e) => setForm(f => ({ ...f, role: e.target.value as UserRole }))}
              className={inputCls}>
              <option value="dealer_owner">Dealer Owner</option>
              <option value="operations_manager">Operations Manager</option>
              <option value="branch_manager">Branch Manager</option>
              <option value="van_team_leader">Van Team Leader</option>
              <option value="brand_ambassador">Brand Ambassador</option>
              <option value="finance">Finance Admin</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Temporary Password <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <input value={form.password}
                onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                type={showPassword ? "text" : "password"}
                placeholder="Min. 8 characters"
                className={`${inputCls} pr-10`} />
              <button type="button" tabIndex={-1}
                onClick={() => setShowPassword(p => !p)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground transition-colors">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">User can change this after first login.</p>
          </div>

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}
          {success && (
            <div className="rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2">
              <p className="text-xs text-green-500 flex items-center gap-1">
                <Check className="h-3.5 w-3.5" />
                User created. Login credentials sent to {form.email}.
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-2 border-t border-border px-6 py-4">
          <button onClick={reset} disabled={createUser.isPending}
            className="flex-1 rounded-md border border-border py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={!isValid || createUser.isPending}
            className="flex-1 rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity">
            {createUser.isPending ? "Creating..." : "Create User"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── User Detail Drawer ────────────────────────────────────────────────────────

function UserDrawer({ user, onClose }: { user: UserProfile | null; onClose: () => void }) {
  const sendEmail = useSendEmail();
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const handleResend = async () => {
    if (!user || resendState === "sending") return;
    setResendState("sending");
    try {
      await sendEmail.mutateAsync({
        recipient_email: user.email,
        ...buildInvitationEmail(user),
      });
      setResendState("sent");
      setTimeout(() => setResendState("idle"), 4000);
    } catch {
      setResendState("error");
      setTimeout(() => setResendState("idle"), 4000);
    }
  };

  if (!user) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-background/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm border-l border-border bg-card shadow-2xl flex flex-col">

        <div className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0">
          <h2 className="font-heading text-base font-semibold text-foreground">User Details</h2>
          <button onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Avatar + name */}
          <div className="flex flex-col items-center text-center gap-3">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-xl font-semibold text-primary">
              {initials(user)}
            </div>
            <div>
              <p className="text-base font-semibold text-foreground">
                {user.first_name} {user.last_name}
              </p>
              <span className={cn(
                "mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium",
                roleColors[user.role],
              )}>
                {roleLabels[user.role]}
              </span>
            </div>
          </div>

          {/* Info rows */}
          <div className="space-y-3">
            {[
              { icon: Mail,   label: "Email",  value: user.email },
              { icon: Phone,  label: "Phone",  value: user.phone || "—" },
              { icon: Shield, label: "Status", value: user.is_active ? "Active" : "Inactive" },
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
                {new Date(user.date_joined).toLocaleDateString("en-KE", {
                  year: "numeric", month: "long", day: "numeric",
                })}
              </p>
            </div>
          </div>

          {/* Resend Invitation card */}
          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <div>
              <p className="text-sm font-medium text-foreground">Resend Invitation</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Send login instructions to{" "}
                <span className="font-medium text-foreground">{user.email}</span>.
                Includes a link to reset their password if needed.
              </p>
            </div>

            <button
              onClick={handleResend}
              disabled={resendState === "sending" || resendState === "sent"}
              className={cn(
                "w-full flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-all",
                resendState === "sent"
                  ? "bg-success/10 text-success border border-success/30 cursor-default"
                  : resendState === "error"
                  ? "bg-destructive/10 text-destructive border border-destructive/30 hover:bg-destructive/20"
                  : "bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 disabled:opacity-50 disabled:cursor-not-allowed",
              )}
            >
              {resendState === "sending" && <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</>}
              {resendState === "sent"    && <><Check className="h-4 w-4" /> Invitation Sent</>}
              {resendState === "error"   && <><Send className="h-4 w-4" /> Failed — Try Again</>}
              {resendState === "idle"    && <><Send className="h-4 w-4" /> Resend Invitation Email</>}
            </button>
          </div>

        </div>
      </div>
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function UsersPage({ dealerId }: { dealerId?: number } = {}) {
  const [search, setSearch]             = useState("");
  const [roleFilter, setRoleFilter]     = useState<UserRole | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [showCreate, setShowCreate]     = useState(false);
  const [menuOpen, setMenuOpen]         = useState<number | null>(null);
  const [activeUser, setActiveUser]     = useState<UserProfile | null>(null);
  const [menuResend, setMenuResend]     = useState<Record<number, "idle" | "sending" | "sent" | "error">>({});
  const [confirm, setConfirm]           = useState<{
    type: "deactivate" | "activate" | "delete"; user: UserProfile;
  } | null>(null);

  const { data, isLoading, error: queryError } = useUsers({
    ...(roleFilter !== "all" ? { role: roleFilter } : {}),
    ...(dealerId ? { dealer_id: dealerId } : {}),
  });

  const deactivateUser = useDeactivateUser();
  const activateUser   = useActivateUser();
  const deleteUser     = useDeleteUser();
  const sendEmail      = useSendEmail();

  const allUsers = useMemo(() => data?.results ?? [], [data?.results]);

  const filtered = useMemo(() =>
    allUsers.filter((u) => {
      const q = search.toLowerCase();
      if (statusFilter === "active"   && !u.is_active) return false;
      if (statusFilter === "inactive" &&  u.is_active) return false;
      return (
        !q ||
        u.first_name.toLowerCase().includes(q) ||
        u.last_name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
      );
    }),
    [allUsers, search, statusFilter],
  );

  const handleConfirm = async () => {
    if (!confirm) return;
    if (confirm.type === "deactivate") await deactivateUser.mutateAsync(confirm.user.id);
    if (confirm.type === "activate")   await activateUser.mutateAsync(confirm.user.id);
    if (confirm.type === "delete")     await deleteUser.mutateAsync(confirm.user.id);
  };

  const handleMenuResend = async (user: UserProfile) => {
    setMenuOpen(null);
    setMenuResend(prev => ({ ...prev, [user.id]: "sending" }));
    try {
      await sendEmail.mutateAsync({
        recipient_email: user.email,
        ...buildInvitationEmail(user),
      });
      setMenuResend(prev => ({ ...prev, [user.id]: "sent" }));
      setTimeout(() => setMenuResend(prev => ({ ...prev, [user.id]: "idle" })), 4000);
    } catch {
      setMenuResend(prev => ({ ...prev, [user.id]: "error" }));
      setTimeout(() => setMenuResend(prev => ({ ...prev, [user.id]: "idle" })), 4000);
    }
  };

  const error = queryError instanceof Error ? queryError.message : null;

  const totalUsers    = data?.count ?? allUsers.length;
  const activeCount   = allUsers.filter(u =>  u.is_active).length;
  const inactiveCount = allUsers.filter(u => !u.is_active).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Users</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {totalUsers} registered users{dealerId ? " for this dealer" : " across all dealers"}
          </p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity">
          <Plus className="h-4 w-4" /> Create User
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Users", value: totalUsers,    color: "text-foreground"  },
          { label: "Active",      value: activeCount,   color: "text-success"     },
          { label: "Inactive",    value: inactiveCount, color: "text-destructive" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-lg border border-border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={cn("text-2xl font-bold mt-0.5", color)}>{value}</p>
          </div>
        ))}
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or email..."
            className="w-full rounded-md border border-border bg-accent py-2 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
        <select value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as UserRole | "all")}
          className="rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
          <option value="all">All Roles</option>
          <option value="dealer_owner">Dealer Owner</option>
          <option value="operations_manager">Operations Manager</option>
          <option value="branch_manager">Branch Manager</option>
          <option value="van_team_leader">Van Team Leader</option>
          <option value="brand_ambassador">Brand Ambassador</option>
          <option value="finance">Finance Admin</option>
        </select>
        <select value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
          className="rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground text-xs">
              <th className="py-3 px-5 text-left font-medium">User</th>
              <th className="py-3 px-4 text-left font-medium">Role</th>
              <th className="py-3 px-4 text-left font-medium">Contact</th>
              <th className="py-3 px-4 text-left font-medium">Status</th>
              <th className="py-3 px-4 text-left font-medium">Joined</th>
              <th className="py-3 px-4" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                  Loading users…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                  No users match your filters.
                </td>
              </tr>
            ) : (
              filtered.map((user) => {
                const resendStatus = menuResend[user.id] ?? "idle";
                return (
                  <tr key={user.id}
                    className={cn(
                      "border-b border-border/50 hover:bg-accent/40 transition-colors cursor-pointer",
                      !user.is_active && "opacity-60",
                    )}
                    onClick={() => setActiveUser(user)}>

                    {/* User */}
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                          {initials(user)}
                        </div>
                        <div>
                          <p className="font-medium text-foreground text-sm">
                            {user.first_name} {user.last_name}
                          </p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="py-3 px-4">
                      <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium",
                        roleColors[user.role])}>
                        {roleLabels[user.role]}
                      </span>
                    </td>

                    {/* Contact */}
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-0.5 text-xs">
                        <span className="flex items-center gap-1 text-foreground">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          {user.email}
                        </span>
                        {user.phone && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {user.phone}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <span className={cn("flex items-center gap-1 text-xs font-medium",
                        user.is_active ? "text-success" : "text-destructive")}>
                        {user.is_active
                          ? <><CheckCircle2 className="h-3.5 w-3.5" /> Active</>
                          : <><XCircle className="h-3.5 w-3.5" /> Inactive</>}
                      </span>
                    </td>

                    {/* Joined */}
                    <td className="py-3 px-4 text-xs text-muted-foreground">
                      {new Date(user.date_joined).toLocaleDateString()}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 relative" onClick={(e) => e.stopPropagation()}>
                      {resendStatus === "sending" && (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mx-auto" />
                      )}
                      {resendStatus === "sent" && (
                        <span className="flex items-center gap-1 text-xs text-success font-medium">
                          <Check className="h-3.5 w-3.5" /> Sent
                        </span>
                      )}
                      {resendStatus === "error" && (
                        <span className="text-xs text-destructive font-medium">Failed</span>
                      )}
                      {resendStatus === "idle" && (
                        <button
                          onClick={() => setMenuOpen(menuOpen === user.id ? null : user.id)}
                          className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      )}

                      {menuOpen === user.id && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(null)} />
                          <div className="absolute right-4 top-10 z-50 w-48 rounded-md border border-border bg-card shadow-xl py-1">
                            <button
                              onClick={() => { setActiveUser(user); setMenuOpen(null); }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent">
                              <Eye className="h-4 w-4" /> View Details
                            </button>
                            <button
                              onClick={() => handleMenuResend(user)}
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-primary hover:bg-accent">
                              <Send className="h-4 w-4" /> Resend Invitation
                            </button>
                            <div className="border-t border-border my-1" />
                            {user.is_active ? (
                              <button
                                onClick={() => { setConfirm({ type: "deactivate", user }); setMenuOpen(null); }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-warning hover:bg-accent">
                                <UserX className="h-4 w-4" /> Deactivate
                              </button>
                            ) : (
                              <button
                                onClick={() => { setConfirm({ type: "activate", user }); setMenuOpen(null); }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-success hover:bg-accent">
                                <UserCheck className="h-4 w-4" /> Activate
                              </button>
                            )}
                            <button
                              onClick={() => { setConfirm({ type: "delete", user }); setMenuOpen(null); }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-accent">
                              <Trash2 className="h-4 w-4" /> Delete
                            </button>
                          </div>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} of {allUsers.length} users
      </p>

      <InviteUserDialog open={showCreate} onClose={() => setShowCreate(false)} />
      <UserDrawer user={activeUser} onClose={() => setActiveUser(null)} />

      <ConfirmDialog
        open={!!confirm}
        title={
          confirm?.type === "deactivate" ? "Deactivate User" :
          confirm?.type === "activate"   ? "Activate User"   : "Delete User"
        }
        message={
          confirm?.type === "deactivate"
            ? `Deactivate ${confirm.user.first_name} ${confirm.user.last_name}? They will lose access immediately.`
            : confirm?.type === "activate"
            ? `Reactivate ${confirm?.user.first_name} ${confirm?.user.last_name}? They will regain access.`
            : `Permanently delete ${confirm?.user.first_name} ${confirm?.user.last_name}? This cannot be undone.`
        }
        confirmLabel={
          confirm?.type === "deactivate" ? "Deactivate" :
          confirm?.type === "activate"   ? "Activate"   : "Delete"
        }
        danger={confirm?.type !== "activate"}
        onConfirm={handleConfirm}
        onClose={() => setConfirm(null)}
      />
    </div>
  );
}