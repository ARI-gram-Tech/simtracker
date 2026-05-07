// src/pages/super-admin/DealerSettings.tsx
// Route: /super-admin/clients/:id/settings
// Super admin managing a specific dealer's settings.

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Building2, Lock, Bell,
  AlertTriangle, Save, Eye, EyeOff, Trash2,
  ShieldOff, RefreshCw, UserCheck, Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDealer, useUpdateDealer, useSuspendDealer, useActivateDealer, useDeleteDealer } from "@/hooks/useDealers";
import { useToastNotifications } from "@/hooks/useToastNotifications";
import { successMessages, errorMessages } from "@/lib/toast";

// ── Shared input style ────────────────────────────────────────────────────────

const inputCls =
  "w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary";

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({
  title, description, children, danger,
}: {
  title: string; description?: string; children: React.ReactNode; danger?: boolean;
}) {
  return (
    <div className={cn(
      "rounded-xl border bg-card",
      danger ? "border-destructive/40" : "border-border"
    )}>
      <div className={cn("px-6 py-4 border-b", danger ? "border-destructive/40" : "border-border")}>
        <h2 className={cn("text-base font-semibold", danger ? "text-destructive" : "text-foreground")}>
          {title}
        </h2>
        {description && (
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

// ── Field ─────────────────────────────────────────────────────────────────────

function Field({ label, required, children }: {
  label: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1.5">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      {children}
    </div>
  );
}

// ── Confirm Modal ─────────────────────────────────────────────────────────────

function ConfirmModal({
  open, title, message, confirmLabel, danger, onConfirm, onClose, requireText,
}: {
  open: boolean; title: string; message: string; confirmLabel: string;
  danger?: boolean; onConfirm: () => void; onClose: () => void;
  requireText?: string;
}) {
  const [input, setInput] = useState("");
  const canConfirm = !requireText || input === requireText;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-xl border border-border bg-card shadow-2xl p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-9 w-9 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <h3 className="font-heading text-lg font-semibold text-foreground">{title}</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">{message}</p>
        {requireText && (
          <div className="mb-4">
            <p className="text-xs text-muted-foreground mb-2">
              Type <span className="font-mono font-semibold text-foreground">{requireText}</span> to confirm
            </p>
            <input value={input} onChange={(e) => setInput(e.target.value)}
              placeholder={requireText}
              className={inputCls} />
          </div>
        )}
        <div className="flex gap-2">
          <button onClick={() => { setInput(""); onClose(); }}
            className="flex-1 rounded-md border border-border py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors">
            Cancel
          </button>
          <button disabled={!canConfirm}
            onClick={() => { onConfirm(); setInput(""); onClose(); }}
            className={cn("flex-1 rounded-md py-2 text-sm font-semibold text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
              danger ? "bg-destructive hover:bg-destructive/90" : "bg-primary hover:opacity-90")}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Profile Tab ───────────────────────────────────────────────────────────────

function ProfileTab({ dealerId }: { dealerId: number }) {
  const { data: dealer, isLoading } = useDealer(dealerId);
  const updateDealer = useUpdateDealer();

  const [form, setForm] = useState({
    name: "", email: "", phone: "", address: "",
    billing_cycle: "monthly" as "monthly" | "yearly",
  });
  const [saved, setSaved] = useState(false);

  // Populate form once dealer data loads
  useEffect(() => {
    if (dealer) {
      setForm({
        name: dealer.name,
        email: dealer.email,
        phone: dealer.phone,
        address: dealer.address,
        billing_cycle: dealer.billing_cycle,
      });
    }
  }, [dealer]);

  if (isLoading || !dealer) {
    return <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>;
  }

  const handleSave = async () => {
    await updateDealer.mutateAsync({ id: dealerId, data: form });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      <Section title="Organisation Profile" description="Basic information about this dealer.">
        <div className="space-y-4">
          <Field label="Company Name" required>
            <input value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Enlight Communications Ltd"
              className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Email" required>
              <input value={form.email}
                onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                type="email" placeholder="info@company.co.ke"
                className={inputCls} />
            </Field>
            <Field label="Phone" required>
              <input value={form.phone}
                onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="+254 7XX XXX XXX"
                className={inputCls} />
            </Field>
          </div>
          <Field label="Address">
            <input value={form.address}
              onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))}
              placeholder="123 Kenyatta Avenue, Nairobi"
              className={inputCls} />
          </Field>
        </div>
      </Section>

      <Section title="Billing" description="Subscription and billing cycle settings.">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-border bg-background p-4">
              <p className="text-xs text-muted-foreground mb-1">Current Plan</p>
              <p className="text-sm font-semibold text-foreground capitalize">{dealer.subscription_plan}</p>
            </div>
            <div className="rounded-lg border border-border bg-background p-4">
              <p className="text-xs text-muted-foreground mb-1">Subscription Status</p>
              <p className="text-sm font-semibold text-foreground capitalize">{dealer.subscription_status}</p>
            </div>
          </div>
          <Field label="Billing Cycle">
            <select value={form.billing_cycle}
              onChange={(e) => setForm(f => ({ ...f, billing_cycle: e.target.value as "monthly" | "yearly" }))}
              className={inputCls}>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </Field>
        </div>
      </Section>

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={updateDealer.isPending}
          className="flex items-center gap-2 rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50">
          {saved ? <><Check className="h-4 w-4" /> Saved</> : <><Save className="h-4 w-4" /> Save Changes</>}
        </button>
      </div>
    </div>
  );
}

// ── Password Tab ──────────────────────────────────────────────────────────────

function PasswordTab({ dealerId }: { dealerId: number }) {
  const { data: dealer } = useDealer(dealerId);
  const [form, setForm] = useState({ password: "", confirm: "" });
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isValid = form.password.length >= 8 && form.password === form.confirm;

  const handleReset = async () => {
    if (!isValid) {
      setError(form.password !== form.confirm ? "Passwords do not match." : "Minimum 8 characters.");
      return;
    }
    setError(null);
    // POST to reset password for the dealer owner user
    // await authService.adminResetPassword({ user_id: dealer?.owner, password: form.password });
    setSuccess(true);
    setForm({ password: "", confirm: "" });
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      <Section
        title="Reset Owner Password"
        description={`Set a new password for ${dealer?.owner_details?.full_name ?? "the dealer owner"}. They should change it after their next login.`}
      >
        <div className="space-y-4">
          <Field label="New Password" required>
            <div className="relative">
              <input value={form.password}
                onChange={(e) => { setForm(f => ({ ...f, password: e.target.value })); setError(null); }}
                type={showPass ? "text" : "password"}
                placeholder="Min. 8 characters"
                className={`${inputCls} pr-10`} />
              <button type="button" tabIndex={-1}
                onClick={() => setShowPass(p => !p)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground transition-colors">
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Field>
          <Field label="Confirm Password" required>
            <div className="relative">
              <input value={form.confirm}
                onChange={(e) => { setForm(f => ({ ...f, confirm: e.target.value })); setError(null); }}
                type={showConfirm ? "text" : "password"}
                placeholder="Repeat the password"
                className={`${inputCls} pr-10`} />
              <button type="button" tabIndex={-1}
                onClick={() => setShowConfirm(p => !p)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground transition-colors">
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Field>

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}
          {success && (
            <div className="rounded-md border border-success/30 bg-success/10 px-3 py-2">
              <p className="text-xs text-success flex items-center gap-1">
                <Check className="h-3.5 w-3.5" /> Password reset successfully.
              </p>
            </div>
          )}
        </div>
      </Section>

      <div className="flex justify-end">
        <button onClick={handleReset} disabled={!isValid}
          className="flex items-center gap-2 rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50">
          <Lock className="h-4 w-4" /> Reset Password
        </button>
      </div>
    </div>
  );
}

// ── Notifications Tab ─────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className={cn("relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none",
        checked ? "bg-primary" : "bg-border")}>
      <span className={cn("inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform",
        checked ? "translate-x-4.5" : "translate-x-0.5")} />
    </button>
  );
}

function NotificationsTab() {
  const [prefs, setPrefs] = useState({
    payment_alerts: true,
    subscription_reminders: true,
    user_activity: false,
    system_updates: true,
    weekly_summary: true,
    overage_warnings: true,
  });

  const [saved, setSaved] = useState(false);

  const set = (key: keyof typeof prefs, value: boolean) =>
    setPrefs(p => ({ ...p, [key]: value }));

  const handleSave = () => {
    // persist prefs via API
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const items: { key: keyof typeof prefs; label: string; description: string }[] = [
    { key: "payment_alerts",        label: "Payment Alerts",        description: "Notify when a payment is received or fails." },
    { key: "subscription_reminders",label: "Subscription Reminders",description: "Remind before renewal or trial expiry." },
    { key: "overage_warnings",      label: "Overage Warnings",      description: "Alert when usage approaches plan limits." },
    { key: "user_activity",         label: "User Activity",         description: "Notify on logins or new user creation." },
    { key: "system_updates",        label: "System Updates",        description: "Important platform announcements." },
    { key: "weekly_summary",        label: "Weekly Summary",        description: "A weekly digest of dealer activity." },
  ];

  return (
    <div className="space-y-6">
      <Section title="Email Notifications" description="Control which emails are sent to this dealer.">
        <div className="divide-y divide-border">
          {items.map(({ key, label, description }) => (
            <div key={key} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
              <div>
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
              </div>
              <Toggle checked={prefs[key]} onChange={(v) => set(key, v)} />
            </div>
          ))}
        </div>
      </Section>

      <div className="flex justify-end">
        <button onClick={handleSave}
          className="flex items-center gap-2 rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity">
          {saved ? <><Check className="h-4 w-4" /> Saved</> : <><Save className="h-4 w-4" /> Save Preferences</>}
        </button>
      </div>
    </div>
  );
}

// ── Danger Zone Tab ───────────────────────────────────────────────────────────

function DangerZoneTab({ dealer }: { dealer: { id: number; name: string; is_active: boolean } }) {
  const navigate = useNavigate();
  const suspendDealer = useSuspendDealer();
  const activateDealer = useActivateDealer();
  const deleteDealer = useDeleteDealer();

  const [modal, setModal] = useState<"suspend" | "delete" | "reset" | "transfer" | null>(null);

  useToastNotifications(suspendDealer, {
    successMessage: successMessages.SUSPEND_DEALER_SUCCESS,
    errorMessage: errorMessages.SUSPEND_DEALER_FAILED,
  });
  useToastNotifications(activateDealer, {
    successMessage: successMessages.ACTIVATE_DEALER_SUCCESS,
    errorMessage: errorMessages.ACTIVATE_DEALER_FAILED,
  });

  const actions = [
    {
      key: "suspend" as const,
      icon: ShieldOff,
      label: dealer.is_active ? "Suspend Dealer" : "Reactivate Dealer",
      description: dealer.is_active
        ? "Immediately revoke access for all users under this dealer. Reversible."
        : "Restore access for all users under this dealer.",
      buttonLabel: dealer.is_active ? "Suspend" : "Reactivate",
      danger: dealer.is_active,
    },
    {
      key: "reset" as const,
      icon: RefreshCw,
      label: "Reset All Data",
      description: "Wipe all branches, van teams, SIM records, and reports for this dealer. Cannot be undone.",
      buttonLabel: "Reset Data",
      danger: true,
    },
    {
      key: "transfer" as const,
      icon: UserCheck,
      label: "Transfer Ownership",
      description: "Assign a different user as the dealer owner. The previous owner loses admin access.",
      buttonLabel: "Transfer",
      danger: false,
    },
    {
      key: "delete" as const,
      icon: Trash2,
      label: "Delete Account",
      description: "Permanently delete this dealer and all associated data. This cannot be undone.",
      buttonLabel: "Delete",
      danger: true,
    },
  ];

    const handleConfirm = async (key: typeof modal) => {
    if (key === "suspend") {
        if (dealer.is_active) {
        await suspendDealer.mutateAsync(dealer.id);
        } else {
        await activateDealer.mutateAsync(dealer.id);
        }
    }
    if (key === "delete") {
        await deleteDealer.mutateAsync(dealer.id);
        navigate("/super-admin/clients");
    }
    // reset and transfer would call their own endpoints
    };

  return (
    <div className="space-y-4">
      {actions.map(({ key, icon: Icon, label, description, buttonLabel, danger }) => (
        <div key={key}
          className={cn("flex items-start justify-between gap-4 rounded-xl border p-5",
            danger ? "border-destructive/30 bg-destructive/5" : "border-border bg-card")}>
          <div className="flex items-start gap-3">
            <div className={cn("mt-0.5 h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
              danger ? "bg-destructive/10" : "bg-accent")}>
              <Icon className={cn("h-4 w-4", danger ? "text-destructive" : "text-foreground")} />
            </div>
            <div>
              <p className={cn("text-sm font-semibold", danger ? "text-destructive" : "text-foreground")}>
                {label}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            </div>
          </div>
          <button onClick={() => setModal(key)}
            className={cn("shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold border transition-colors",
              danger
                ? "border-destructive/40 text-destructive hover:bg-destructive hover:text-white"
                : "border-border text-foreground hover:bg-accent")}>
            {buttonLabel}
          </button>
        </div>
      ))}

      {/* Suspend / Reactivate */}
      <ConfirmModal
        open={modal === "suspend"}
        title={dealer.is_active ? "Suspend Dealer" : "Reactivate Dealer"}
        message={dealer.is_active
          ? `Suspending ${dealer.name} will immediately revoke access for all their users. You can reactivate at any time.`
          : `Reactivating ${dealer.name} will restore access for all their users.`}
        confirmLabel={dealer.is_active ? "Yes, Suspend" : "Yes, Reactivate"}
        danger={dealer.is_active}
        onConfirm={() => handleConfirm("suspend")}
        onClose={() => setModal(null)}
      />

      {/* Reset Data */}
      <ConfirmModal
        open={modal === "reset"}
        title="Reset All Data"
        message={`This will permanently wipe all branches, van teams, SIM records and reports for ${dealer.name}. This cannot be undone.`}
        confirmLabel="Yes, Reset Everything"
        danger
        requireText={dealer.name}
        onConfirm={() => handleConfirm("reset")}
        onClose={() => setModal(null)}
      />

      {/* Transfer Ownership */}
      <ConfirmModal
        open={modal === "transfer"}
        title="Transfer Ownership"
        message="Enter the email of the new owner. They must already have an account in this dealer."
        confirmLabel="Transfer Ownership"
        danger={false}
        onConfirm={() => handleConfirm("transfer")}
        onClose={() => setModal(null)}
      />

      {/* Delete Account */}
      <ConfirmModal
        open={modal === "delete"}
        title="Delete Dealer Account"
        message={`This will permanently delete ${dealer.name} and all associated data. There is no recovery.`}
        confirmLabel="Yes, Delete Forever"
        danger
        requireText={dealer.name}
        onConfirm={() => handleConfirm("delete")}
        onClose={() => setModal(null)}
      />
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type Tab = "profile" | "password" | "notifications" | "danger";

const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "profile",       label: "Profile",       icon: Building2 },
  { key: "password",      label: "Password",      icon: Lock },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "danger",        label: "Danger Zone",   icon: AlertTriangle },
];

export default function DealerSettings() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dealerId = Number(id);

  const { data: dealer, isLoading } = useDealer(dealerId);
  const [activeTab, setActiveTab] = useState<Tab>("profile");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-muted-foreground">Loading dealer…</p>
      </div>
    );
  }

  if (!dealer) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-destructive">Dealer not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Back + Header */}
      <div>
        <button onClick={() => navigate(`/super-admin/clients/${dealerId}`)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to {dealer.name}
        </button>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">Dealer Settings</h1>
            <p className="text-sm text-muted-foreground">{dealer.name}</p>
          </div>
        </div>
      </div>

      {/* Tab Nav */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
              key === "danger" && activeTab !== "danger"
                ? "border-transparent text-muted-foreground hover:text-destructive"
                : activeTab === key
                  ? key === "danger"
                    ? "border-destructive text-destructive"
                    : "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
            )}>
            <Icon className={cn("h-4 w-4", key === "danger" ? "text-destructive" : "")} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "profile"       && <ProfileTab dealerId={dealerId} />}
        {activeTab === "password"      && <PasswordTab dealerId={dealerId} />}
        {activeTab === "notifications" && <NotificationsTab />}
        {activeTab === "danger"        && (
          <DangerZoneTab dealer={{ id: dealer.id, name: dealer.name, is_active: dealer.is_active }} />
        )}
      </div>
    </div>
  );
}