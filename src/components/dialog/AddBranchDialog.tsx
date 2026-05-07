// src/components/dialog/AddBranchDialog.tsx
import { useState } from "react";
import { X, Building2, MapPin, Phone, Mail, User } from "lucide-react";

interface AddBranchDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (data: BranchFormData) => Promise<void>; // ← async now
}

export interface BranchFormData {
  name: string;
  region: string;
  address: string;
  phone: string;
  email: string;
  managerName: string;
  managerPhone: string;
}

const REGIONS = ["Nairobi", "Central", "Coast", "Eastern", "Western", "Nyanza", "Rift Valley"];

export function AddBranchDialog({ open, onClose, onAdd }: AddBranchDialogProps) {
  const [name,         setName]         = useState("");
  const [region,       setRegion]       = useState("");
  const [address,      setAddress]      = useState("");
  const [phone,        setPhone]        = useState("");
  const [email,        setEmail]        = useState("");
  const [managerName,  setManagerName]  = useState("");
  const [managerPhone, setManagerPhone] = useState("");
  const [loading,      setLoading]      = useState(false);

  if (!open) return null;

  const isValid = name.trim() !== "" && region !== "" && phone.trim() !== "";

  const handleAdd = async () => {
    if (!isValid) return;
    setLoading(true);
    try {
      await onAdd({
        name:         name.trim(),
        region,
        address:      address.trim(),
        phone:        phone.trim(),
        email:        email.trim(),
        managerName:  managerName.trim(),
        managerPhone: managerPhone.trim(),
      });
      reset(); // only runs if onAdd succeeds
    } catch {
      // error toast is handled by handleAddBranch in Settings — nothing to do here
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setName("");
    setRegion("");
    setAddress("");
    setPhone("");
    setEmail("");
    setManagerName("");
    setManagerPhone("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={reset} />
      <div className="relative w-full max-w-md rounded-xl border border-border bg-card shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Building2 className="h-4 w-4 text-primary" />
            </div>
            <h3 className="font-heading text-lg font-semibold">Add Branch</h3>
          </div>
          <button
            onClick={reset}
            className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">

          {/* Branch Name */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Branch Name <span className="text-destructive">*</span>
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Embakasi, Westlands, Mombasa..."
              className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Region + Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                <MapPin className="inline h-3.5 w-3.5 mr-1 text-muted-foreground" />
                Region <span className="text-destructive">*</span>
              </label>
              <select
                value={region}
                onChange={e => setRegion(e.target.value)}
                className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">— Select region —</option>
                {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
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

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              <Mail className="inline h-3.5 w-3.5 mr-1 text-muted-foreground" />
              Email <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <input
              value={email}
              onChange={e => setEmail(e.target.value)}
              type="email"
              placeholder="branch@example.com"
              className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Physical Address
            </label>
            <textarea
              rows={2}
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="e.g. 3rd Floor, Iconic Building, Mombasa Road"
              className="w-full rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 border-t border-border px-6 py-4">
          <button
            onClick={reset}
            disabled={loading}
            className="flex-1 rounded-md border border-border py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!isValid || loading}
            className="flex-1 rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            {loading ? "Adding…" : "Add Branch"}
          </button>
        </div>
      </div>
    </div>
  );
}