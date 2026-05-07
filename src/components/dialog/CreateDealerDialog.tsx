// src/components/dialog/CreateDealerDialog.tsx
import { useState } from "react";
import { X, Building2, User, ChevronRight, ChevronLeft, Check, Eye, EyeOff, Mail } from "lucide-react";
import { errorMessages } from "@/lib/toast";
import { useSendEmail } from "@/hooks/useNotifications";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CreateUserFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  password: string;
  role: string;
}

export interface CreateDealerFormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  owner: number;
}

interface CreateDealerDialogProps {
  open: boolean;
  onClose: () => void;
  onCreateUser: (data: CreateUserFormData) => Promise<number>;
  onCreateDealer: (data: CreateDealerFormData) => Promise<void>;
  isLoading?: boolean;
}

type ApiError = {
  response?: {
    data?: Record<string, string | string[]>;
  };
};

// ── Email builder ─────────────────────────────────────────────────────────────

function buildInvitationEmail(user: CreateUserFormData): {
  subject: string;
  body: string;
  html_body: string;
} {
  const frontendUrl = import.meta.env.VITE_FRONTEND_URL ?? window.location.origin;
  const loginUrl    = `${frontendUrl}/login`;
  const firstName   = user.first_name;
  const userInitials = `${user.first_name[0] ?? ""}${user.last_name[0] ?? ""}`.toUpperCase();

  const subject = "Your SimTrack Account — Login Details";

  const body = [
    `Hi ${firstName},`,
    "",
    "Your SimTrack account is ready. Here are your login details:",
    "",
    `  Email:     ${user.email}`,
    `  Password:  ${user.password}`,
    `  Role:      Dealer Owner`,
    `  Login:     ${loginUrl}`,
    "",
    "Please log in and change your password immediately.",
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
                    <p style="margin:0 0 4px;font-size:20px;font-weight:700;color:#18181b;">Welcome, ${firstName}! 🎉</p>
                    <p style="margin:0;font-size:14px;color:#71717a;">Your SimTrack dealer account is ready to use.</p>
                  </td>
                </tr>
              </table>

              <!-- Role Badge -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:10px;padding:14px 18px;">
                    <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.1em;color:#7c3aed;text-transform:uppercase;">Your Role</p>
                    <p style="margin:0;font-size:16px;font-weight:700;color:#5b21b6;">Dealer Owner</p>
                  </td>
                </tr>
              </table>

              <!-- Credentials Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;border:1px solid #e4e4e7;border-radius:10px;overflow:hidden;">
                <tr>
                  <td style="background:#fafafa;padding:12px 20px;border-bottom:1px solid #e4e4e7;">
                    <p style="margin:0;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#a1a1aa;">Account Credentials</p>
                  </td>
                </tr>
                <tr>
                  <td style="background:#ffffff;padding:14px 20px;border-bottom:1px solid #f4f4f5;">
                    <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.07em;text-transform:uppercase;color:#a1a1aa;">Email Address</p>
                    <p style="margin:0;font-size:15px;font-weight:500;color:#18181b;font-family:'Courier New',monospace;">${user.email}</p>
                  </td>
                </tr>
                <tr>
                  <td style="background:#18181b;padding:14px 20px;border-bottom:1px solid #f4f4f5;">
                    <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.07em;text-transform:uppercase;color:rgba(255,255,255,0.5);">Temporary Password</p>
                    <p style="margin:0;font-size:20px;font-weight:700;color:#a78bfa;font-family:'Courier New',monospace;letter-spacing:1.5px;">${user.password}</p>
                  </td>
                </tr>
                <tr>
                  <td style="background:#ffffff;padding:14px 20px;">
                    <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.07em;text-transform:uppercase;color:#a1a1aa;">Login URL</p>
                    <p style="margin:0;font-size:14px;color:#7c3aed;font-family:'Courier New',monospace;">${loginUrl}</p>
                  </td>
                </tr>
              </table>

              <!-- Warning Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="background:#fefce8;border:1px solid #fde68a;border-radius:10px;padding:16px 20px;">
                    <p style="margin:0;font-size:13px;color:#92400e;line-height:1.6;">
                      <strong style="color:#78350f;">&#9888;&#65039; Security Notice</strong><br/>
                      This is a temporary password. You must change it immediately after logging in. Never share this password with anyone.
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
                      Change Password &amp; Log In &#8594;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
                <tr><td style="border-top:1px solid #e4e4e7;"></td></tr>
              </table>

              <p style="margin:0;font-size:12px;color:#a1a1aa;text-align:center;line-height:1.6;">
                If you did not expect this email, please contact your system administrator immediately.
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

// ── Stepper indicator ─────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      <div className="flex items-center gap-1.5">
        <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
          step >= 1 ? "bg-primary text-primary-foreground" : "bg-accent text-muted-foreground"
        }`}>
          {step > 1 ? <Check className="h-3.5 w-3.5" /> : "1"}
        </div>
        <span className={`text-xs font-medium transition-colors ${
          step === 1 ? "text-foreground" : "text-muted-foreground"
        }`}>
          Owner Account
        </span>
      </div>
      <div className={`flex-1 h-px transition-colors ${step > 1 ? "bg-primary" : "bg-border"}`} />
      <div className="flex items-center gap-1.5">
        <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
          step >= 2 ? "bg-primary text-primary-foreground" : "bg-accent text-muted-foreground"
        }`}>
          2
        </div>
        <span className={`text-xs font-medium transition-colors ${
          step === 2 ? "text-foreground" : "text-muted-foreground"
        }`}>
          Dealer Details
        </span>
      </div>
    </div>
  );
}

// ── Field component ───────────────────────────────────────────────────────────

function Field({
  label, required, hint, children,
}: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1.5">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

const inputCls =
  "w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary";

// ── Step 1: Create Owner User ─────────────────────────────────────────────────

function StepOneForm({
  data,
  onChange,
}: {
  data: CreateUserFormData;
  onChange: (field: keyof CreateUserFormData, value: string) => void;
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-4">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Owner Account Details
      </p>

      <div className="grid grid-cols-2 gap-3">
        <Field label="First Name" required>
          <input
            value={data.first_name}
            onChange={(e) => onChange("first_name", e.target.value)}
            placeholder="John"
            className={inputCls}
          />
        </Field>
        <Field label="Last Name" required>
          <input
            value={data.last_name}
            onChange={(e) => onChange("last_name", e.target.value)}
            placeholder="Doe"
            className={inputCls}
          />
        </Field>
      </div>

      <Field label="Email" required>
        <input
          value={data.email}
          onChange={(e) => onChange("email", e.target.value)}
          placeholder="owner@company.co.ke"
          type="email"
          className={inputCls}
        />
        {data.email.trim() && (
          <p className="flex items-center gap-1.5 text-xs text-primary mt-1.5">
            <Mail className="h-3 w-3 shrink-0" />
            Login credentials (including password) will be emailed automatically after account creation.
          </p>
        )}
      </Field>

      <Field label="Phone" required>
        <div className="flex">
          <span className="inline-flex items-center rounded-l-md border border-r-0 border-border bg-accent/60 px-2 text-xs text-muted-foreground">
            +254
          </span>
          <input
            value={data.phone}
            onChange={(e) => onChange("phone", e.target.value.replace(/\D/g, ""))}
            placeholder="7XX XXX XXX"
            maxLength={9}
            className="w-full rounded-r-md border border-border bg-accent py-2 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </Field>

      <Field label="Role" required>
        <select
          value={data.role}
          onChange={(e) => onChange("role", e.target.value)}
          className={inputCls}
        >
          <option value="dealer_owner">Dealer Owner</option>
        </select>
      </Field>

      <Field
        label="Temporary Password"
        required
        hint="The owner can change this after first login."
      >
        <div className="relative">
          <input
            value={data.password}
            onChange={(e) => onChange("password", e.target.value)}
            placeholder="Min. 8 characters"
            type={showPassword ? "text" : "password"}
            className={`${inputCls} pr-10`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground transition-colors"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </Field>
    </div>
  );
}

// ── Step 2: Dealer Details ────────────────────────────────────────────────────

function StepTwoForm({
  data,
  ownerEmail,
  emailSent,
  onChange,
}: {
  data: Omit<CreateDealerFormData, "owner">;
  ownerEmail: string;
  emailSent: boolean;
  onChange: (field: keyof Omit<CreateDealerFormData, "owner">, value: string) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Owner confirmation badge */}
      <div className="flex items-center gap-2 rounded-lg border border-border bg-primary/5 px-3 py-2">
        <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
          <User className="h-3.5 w-3.5 text-primary" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Owner account created</p>
          <p className="text-xs font-medium text-foreground">{ownerEmail}</p>
        </div>
        <Check className="h-4 w-4 text-primary ml-auto" />
      </div>

      {/* Email sent confirmation */}
      <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors ${
        emailSent
          ? "border-green-500/30 bg-green-500/10"
          : "border-primary/20 bg-primary/5"
      }`}>
        <Mail className={`h-3.5 w-3.5 shrink-0 ${emailSent ? "text-green-500" : "text-primary"}`} />
        <p className={`text-xs ${emailSent ? "text-green-600" : "text-primary"}`}>
          {emailSent ? (
            <>
              <span className="font-semibold">✓ Invitation email sent</span> — credentials delivered to{" "}
              <span className="font-semibold">{ownerEmail}</span>
            </>
          ) : (
            <>Sending login credentials to <span className="font-semibold">{ownerEmail}</span>…</>
          )}
        </p>
      </div>

      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Organisation Details
      </p>

      <Field label="Company Name" required>
        <input
          value={data.name}
          onChange={(e) => onChange("name", e.target.value)}
          placeholder="e.g. Enlight Communications Ltd"
          className={inputCls}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Email" required>
          <input
            value={data.email}
            onChange={(e) => onChange("email", e.target.value)}
            placeholder="info@company.co.ke"
            type="email"
            className={inputCls}
          />
        </Field>
        <Field label="Phone" required>
          <div className="flex">
            <span className="inline-flex items-center rounded-l-md border border-r-0 border-border bg-accent/60 px-2 text-xs text-muted-foreground">
              +254
            </span>
            <input
              value={data.phone}
              onChange={(e) => onChange("phone", e.target.value.replace(/\D/g, ""))}
              placeholder="7XX XXX XXX"
              maxLength={9}
              className="w-full rounded-r-md border border-border bg-accent py-2 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </Field>
      </div>

      <Field label="Address" required>
        <input
          value={data.address}
          onChange={(e) => onChange("address", e.target.value)}
          placeholder="123 Kenyatta Avenue, Nairobi"
          className={inputCls}
        />
      </Field>
    </div>
  );
}

// ── Main Dialog ───────────────────────────────────────────────────────────────

export function CreateDealerDialog({
  open,
  onClose,
  onCreateUser,
  onCreateDealer,
  isLoading = false,
}: CreateDealerDialogProps) {
  const sendEmail = useSendEmail();

  const [step, setStep]               = useState<1 | 2>(1);
  const [createdUserId, setCreatedUserId] = useState<number | null>(null);
  const [emailSent, setEmailSent]     = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [stepLoading, setStepLoading] = useState(false);

  const [userForm, setUserForm] = useState<CreateUserFormData>({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    password: "",
    role: "dealer_owner",
  });

  const [dealerForm, setDealerForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });

  if (!open) return null;

  const updateUserForm = (field: keyof CreateUserFormData, value: string) => {
    setError(null);
    setUserForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateDealerForm = (field: keyof Omit<CreateDealerFormData, "owner">, value: string) => {
    setError(null);
    setDealerForm((prev) => ({ ...prev, [field]: value }));
  };

  const isStep1Valid =
    userForm.first_name.trim() &&
    userForm.last_name.trim() &&
    userForm.email.trim() &&
    userForm.phone.trim() &&
    userForm.password.length >= 8;

  const isStep2Valid =
    dealerForm.name.trim() &&
    dealerForm.email.trim() &&
    dealerForm.phone.trim() &&
    dealerForm.address.trim();

  const handleStep1Next = async () => {
    if (!isStep1Valid) return;
    setStepLoading(true);
    setError(null);
    setEmailSent(false);

    try {
      // 1. Create the user account
      const userId = await onCreateUser({
        ...userForm,
        phone: `+254${userForm.phone}`,
      });
      setCreatedUserId(userId);

      // 2. Automatically send the styled HTML invitation email
      //    This includes the temporary password since we still have it in memory.
      try {
        const emailPayload = buildInvitationEmail(userForm);
        await sendEmail.mutateAsync({
          recipient_email: userForm.email,
          ...emailPayload,
        });
        setEmailSent(true);
      } catch (emailErr) {
        // Email failure must never block the flow — just note it
        console.warn("Invitation email failed to send:", emailErr);
        setEmailSent(false);
      }

      // 3. Advance to step 2
      setStep(2);
    } catch (err: unknown) {
      console.error("🔴 [Step 1] Full error:", err);
      const detail = (err as ApiError)?.response?.data;
      if (detail && typeof detail === "object") {
        const messages = Object.entries(detail)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
          .join(" · ");
        setError(messages);
      } else {
        setError(errorMessages.UNKNOWN_ERROR);
      }
    } finally {
      setStepLoading(false);
    }
  };

  const handleStep2Submit = async () => {
    if (!isStep2Valid || !createdUserId) return;
    setStepLoading(true);
    setError(null);
    try {
      await onCreateDealer({
        ...dealerForm,
        phone: `+254${dealerForm.phone}`,
        owner: createdUserId,
      });
      reset();
    } catch (err: unknown) {
      console.error("🔴 [Step 2] Full error:", err);
      const detail = (err as ApiError)?.response?.data;
      if (detail && typeof detail === "object") {
        const messages = Object.entries(detail)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
          .join(" · ");
        setError(messages);
      } else {
        setError(errorMessages.CREATE_DEALER_FAILED);
      }
    } finally {
      setStepLoading(false);
    }
  };

  const reset = () => {
    setStep(1);
    setCreatedUserId(null);
    setEmailSent(false);
    setError(null);
    setUserForm({ first_name: "", last_name: "", email: "", phone: "", password: "", role: "dealer_owner" });
    setDealerForm({ name: "", email: "", phone: "", address: "" });
    onClose();
  };

  const loading = isLoading || stepLoading;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-background/60 backdrop-blur-sm"
        onClick={!loading ? reset : undefined}
      />
      <div className="relative w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 sticky top-0 bg-card z-10">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="h-4 w-4 text-primary" />
            </div>
            <h3 className="font-heading text-lg font-semibold">Add New Dealer</h3>
          </div>
          <button
            onClick={reset}
            disabled={loading}
            className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <StepIndicator step={step} />

          {step === 1 ? (
            <StepOneForm data={userForm} onChange={updateUserForm} />
          ) : (
            <StepTwoForm
              data={dealerForm}
              ownerEmail={userForm.email}
              emailSent={emailSent}
              onChange={updateDealerForm}
            />
          )}

          {error && (
            <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 border-t border-border px-6 py-4 sticky bottom-0 bg-card">
          {step === 1 ? (
            <>
              <button
                onClick={reset}
                disabled={loading}
                className="flex-1 rounded-md border border-border py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleStep1Next}
                disabled={!isStep1Valid || loading}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
              >
                {loading
                  ? "Creating & sending email…"
                  : <><span>Next</span><ChevronRight className="h-4 w-4" /></>}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setStep(1)}
                disabled={loading}
                className="flex items-center gap-1 rounded-md border border-border py-2 px-4 text-sm font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" /> Back
              </button>
              <button
                onClick={handleStep2Submit}
                disabled={!isStep2Valid || loading}
                className="flex-1 rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
              >
                {loading ? "Creating dealer…" : "Create Dealer"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}