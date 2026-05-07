// /dialogs/AddExternalAgentDialog.tsx
import { useState } from "react";
import { X, UserPlus, Smartphone, ChevronDown, ChevronUp } from "lucide-react";

interface AddExternalAgentDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm?: (data: ExternalAgentFormData) => void;
}

export interface ExternalAgentFormData {
  name: string;
  idType: "national_id" | "passport";
  idNumber: string;
  country: string;
  county: string;
  street: string;
  phone: string;
  email: string;
  issueDevice: boolean;
  deviceIMEI: string;
  deviceModel: string;
  deviceSerial: string;
  dateOnboarded: string; // ISO string, set automatically
}

const COUNTRIES = ["Kenya", "Uganda", "Tanzania", "Rwanda", "Ethiopia", "Somalia", "DRC", "South Sudan"];

export function AddExternalAgentDialog({ open, onClose, onConfirm }: AddExternalAgentDialogProps) {
  const [name, setName]           = useState("");
  const [idType, setIdType]       = useState<"national_id" | "passport">("national_id");
  const [idNumber, setIdNumber]   = useState("");
  const [country, setCountry]     = useState("");
  const [county, setCounty]       = useState("");
  const [street, setStreet]       = useState("");
  const [phone, setPhone]         = useState("");
  const [email, setEmail]         = useState("");
  const [issueDevice, setIssueDevice] = useState(false);
  const [deviceIMEI, setDeviceIMEI]   = useState("");
  const [deviceModel, setDeviceModel] = useState("");
  const [deviceSerial, setDeviceSerial] = useState("");
  const [deviceOpen, setDeviceOpen]   = useState(false);
  const [loading, setLoading]     = useState(false);

  if (!open) return null;

  const isValid =
    name.trim() !== "" &&
    idNumber.trim() !== "" &&
    country !== "" &&
    phone.trim().length >= 7;

  const deviceValid =
    !issueDevice || (deviceIMEI.trim().length === 15 && deviceModel.trim() !== "");

  const handleConfirm = async () => {
    if (!isValid || !deviceValid) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 900));
    onConfirm?.({
      name, idType, idNumber,
      country, county, street,
      phone, email,
      issueDevice, deviceIMEI, deviceModel, deviceSerial,
      dateOnboarded: new Date().toISOString(),
    });
    setLoading(false);
    handleClose();
  };

  const handleClose = () => {
    setName(""); setIdType("national_id"); setIdNumber("");
    setCountry(""); setCounty(""); setStreet("");
    setPhone(""); setEmail("");
    setIssueDevice(false); setDeviceIMEI(""); setDeviceModel(""); setDeviceSerial("");
    setDeviceOpen(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative w-full max-w-md rounded-xl border border-border bg-card shadow-2xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 sticky top-0 bg-card z-10">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <UserPlus className="h-4 w-4 text-primary" />
            </div>
            <h3 className="font-heading text-lg font-semibold">Add External Agent</h3>
          </div>
          <button onClick={handleClose} className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">

          {/* Personal details */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Personal Details</p>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Full Name</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. James Mwangi"
                className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">ID Type</label>
                <select
                  value={idType}
                  onChange={e => setIdType(e.target.value as "national_id" | "passport")}
                  className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="national_id">National ID</option>
                  <option value="passport">Passport</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  {idType === "passport" ? "Passport Number" : "ID Number"}
                </label>
                <input
                  value={idNumber}
                  onChange={e => setIdNumber(e.target.value)}
                  placeholder={idType === "passport" ? "A12345678" : "12345678"}
                  className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Location</p>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Country</label>
              <select
                value={country}
                onChange={e => setCountry(e.target.value)}
                className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">— Select country —</option>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">County / City</label>
                <input
                  value={county}
                  onChange={e => setCounty(e.target.value)}
                  placeholder="e.g. Nairobi"
                  className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Street / Area</label>
                <input
                  value={street}
                  onChange={e => setStreet(e.target.value)}
                  placeholder="e.g. Tom Mboya St"
                  className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {/* Contact details */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Contact Details</p>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Phone Number</label>
              <input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+254 7XX XXX XXX"
                className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Email <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <input
                value={email}
                onChange={e => setEmail(e.target.value)}
                type="email"
                placeholder="james@example.com"
                className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Onboarding date — read-only, auto-set */}
          <div className="rounded-md border border-border bg-accent/40 px-4 py-3 flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Date Onboarded</span>
            <span className="font-medium text-foreground">
              {new Date().toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
            </span>
          </div>

          {/* Device — collapsible, same pattern as AddBADialog */}
          <div className="rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => { setDeviceOpen(!deviceOpen); setIssueDevice(!deviceOpen); }}
              className="w-full flex items-center justify-between px-4 py-3 bg-accent/30 hover:bg-accent/60 transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">Issue a Device</span>
                <span className="text-xs text-muted-foreground">(optional)</span>
              </div>
              {deviceOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>

            {deviceOpen && (
              <div className="p-4 space-y-3 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  The device IMEI links to Safaricom reports — it identifies registrations from this agent.
                </p>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Device IMEI <span className="text-destructive">*</span></label>
                  <input
                    value={deviceIMEI}
                    onChange={e => setDeviceIMEI(e.target.value.replace(/\D/g, ""))}
                    placeholder="354123456789012"
                    maxLength={15}
                    className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <p className="text-xs text-muted-foreground mt-1">15-digit number on box or *#06#</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Device Model <span className="text-destructive">*</span></label>
                    <input
                      value={deviceModel}
                      onChange={e => setDeviceModel(e.target.value)}
                      placeholder="e.g. Samsung A05"
                      className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Serial No. <span className="text-muted-foreground font-normal">(optional)</span></label>
                    <input
                      value={deviceSerial}
                      onChange={e => setDeviceSerial(e.target.value)}
                      placeholder="R58N123ABCD"
                      className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="flex gap-2 border-t border-border px-6 py-4 sticky bottom-0 bg-card">
          <button
            onClick={handleClose}
            disabled={loading}
            className="flex-1 rounded-md border border-border py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isValid || !deviceValid || loading}
            className="flex-1 rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            {loading ? "Adding Agent…" : issueDevice ? "Add Agent & Issue Device" : "Add Agent"}
          </button>
        </div>
      </div>
    </div>
  );
}