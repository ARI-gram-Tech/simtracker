// /src/components/dialog/AddBADialog.tsx
import { useState } from "react";
import { X, UserPlus, Smartphone, ChevronDown, ChevronUp } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface AddBADialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm?: (data: BAFormData) => void;
}

export interface BAFormData {
  // Personal
  name: string;
  phone: string;
  idNumber: string;
  // Assignment
  branch: string;
  van: string;
  // Device
  issueDevice: boolean;
  deviceIMEI: string;
  deviceModel: string;
  deviceSerial: string;
}

const BRANCHES = ["Embakasi", "Eastleigh", "Westlands", "Mombasa", "Kisumu"];
const VANS: Record<string, string[]> = {
  Embakasi:  ["Van KCK 001", "Van KCH 002", "Direct (no van)"],
  Eastleigh: ["Van KDA 003", "Direct (no van)"],
  Westlands: ["Van KBZ 004", "Direct (no van)"],
  Mombasa:   ["Direct (no van)"],
  Kisumu:    ["Direct (no van)"],
};

// Roles that can assign a van (branch manager and above)
const CAN_ASSIGN_VAN  = new Set(["dealer_owner", "operations_manager", "branch_manager"]);
// Roles that can pick the branch (ops manager and owner only)
const CAN_PICK_BRANCH = new Set(["dealer_owner", "operations_manager"]);

export function AddBADialog({ open, onClose, onConfirm }: AddBADialogProps) {
  const { user } = useAuth();
  const role = user?.role ?? "dealer_owner";

  const [name, setName]           = useState("");
  const [phone, setPhone]         = useState("");
  const [idNumber, setIdNumber]   = useState("");
  const [branch, setBranch]       = useState(user?.branch ?? "");
  const [van, setVan]             = useState(role === "van_team_leader" ? (user?.van ?? "") : "");
  const [issueDevice, setIssueDevice] = useState(false);
  const [deviceIMEI, setDeviceIMEI]   = useState("");
  const [deviceModel, setDeviceModel] = useState("");
  const [deviceSerial, setDeviceSerial] = useState("");
  const [loading, setLoading]     = useState(false);
  const [deviceOpen, setDeviceOpen] = useState(false);

  if (!open) return null;

  const isValid = name.trim() !== "" && phone.trim().length >= 9 && idNumber.trim() !== "" && branch !== "";
  const deviceValid = !issueDevice || (deviceIMEI.trim() !== "" && deviceModel.trim() !== "");

  const handleConfirm = async () => {
    if (!isValid || !deviceValid) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 900));
    onConfirm?.({ name, phone, idNumber, branch, van, issueDevice, deviceIMEI, deviceModel, deviceSerial });
    setLoading(false);
    handleClose();
  };

  const handleClose = () => {
    setName(""); setPhone(""); setIdNumber("");
    setBranch(user?.branch ?? ""); setVan(role === "van_team_leader" ? (user?.van ?? "") : "");
    setIssueDevice(false); setDeviceIMEI(""); setDeviceModel(""); setDeviceSerial("");
    setDeviceOpen(false);
    onClose();
  };

  const vanOptions = branch ? (VANS[branch] ?? ["Direct (no van)"]) : [];

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
            <h3 className="font-heading text-lg font-semibold">Add Brand Ambassador</h3>
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
                placeholder="e.g. Alice Wanjiku"
                className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Phone Number</label>
                <div className="flex">
                  <span className="inline-flex items-center rounded-l-md border border-r-0 border-border bg-accent/60 px-2 text-xs text-muted-foreground">+254</span>
                  <input
                    value={phone}
                    onChange={e => setPhone(e.target.value.replace(/\D/g, ""))}
                    placeholder="7XX XXX XXX"
                    maxLength={9}
                    className="w-full rounded-r-md border border-border bg-accent py-2 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">ID Number</label>
                <input
                  value={idNumber}
                  onChange={e => setIdNumber(e.target.value.replace(/\D/g, ""))}
                  placeholder="12345678"
                  className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {/* Assignment */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Assignment</p>

            {/* Branch — fixed for BM and VTL, selectable for owner/ops */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Branch</label>
              {CAN_PICK_BRANCH.has(role) ? (
                <select
                  value={branch}
                  onChange={e => { setBranch(e.target.value); setVan(""); }}
                  className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">— Select branch —</option>
                  {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              ) : (
                <div className="w-full rounded-md border border-border bg-accent/40 py-2 px-3 text-sm text-muted-foreground">
                  {branch || "—"}
                </div>
              )}
            </div>

            {/* Van — fixed for VTL, selectable for BM and above */}
            {CAN_ASSIGN_VAN.has(role) && branch && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Assign to Van <span className="text-muted-foreground font-normal">(optional)</span></label>
                <select
                  value={van}
                  onChange={e => setVan(e.target.value)}
                  className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">— Select van —</option>
                  {vanOptions.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
            )}

            {role === "van_team_leader" && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Van</label>
                <div className="w-full rounded-md border border-border bg-accent/40 py-2 px-3 text-sm text-muted-foreground">
                  {user?.van ?? "—"}
                </div>
              </div>
            )}
          </div>

          {/* Device section — collapsible */}
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
                  The device IMEI links to Safaricom reports and dealer reports — it identifies which registrations came from this BA.
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
                  <p className="text-xs text-muted-foreground mt-1">15-digit number found on device box or *#06#</p>
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
            {loading ? "Adding BA…" : issueDevice ? "Add BA & Issue Device" : "Add BA"}
          </button>
        </div>
      </div>
    </div>
  );
}