// /src/pages/super-admin/Clients.tsx
import { useToastNotifications } from "@/hooks/useToastNotifications";
import { errorMessages, successMessages } from "@/lib/toast";
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, Plus, Building2, MoreVertical, ShieldOff,
  Eye, Edit2, CheckCircle2, Clock, XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDealers, useCreateDealer, useSuspendDealer, useActivateDealer } from "@/hooks/useDealers";
import type { Dealer } from "@/types/dealers.types";
import { authService } from "@/api/auth.service";
import type { UserRole } from "@/types/auth.types";
import {
  CreateDealerDialog,
  type CreateDealerFormData,
  type CreateUserFormData,
} from "@/components/dialog/CreateDealerDialog";

// ── UI-specific types ─────────────────────────────────────────────────────────

type PlanName = "basic" | "pro" | "enterprise";
type StatusVal = "active" | "trial" | "suspended" | "expired";

interface ClientDealer extends Dealer {
  dealerCode?: string;
  region?: string;
  plan?: PlanName;
  status?: StatusVal;
  currentUsers?: number;
  currentVans?: number;
  currentBranches?: number;
  maxUsers?: number;
  maxVans?: number;
  maxBranches?: number;
  totalRevenue?: number;
  lastLoginAt?: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const planColors: Record<PlanName, string> = {
  enterprise: "bg-primary/15 text-primary",
  pro: "bg-blue-500/15 text-blue-400",
  basic: "bg-muted/50 text-muted-foreground",
};

const statusIcons: Record<StatusVal, React.ElementType> = {
  active: CheckCircle2,
  trial: Clock,
  suspended: ShieldOff,
  expired: XCircle,
};

const statusColors: Record<StatusVal, string> = {
  active: "text-success",
  trial: "text-warning",
  suspended: "text-destructive",
  expired: "text-muted-foreground",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractRegionFromAddress(address: string): string {
  const regions = ["Nairobi", "Coast", "Western", "Central", "Eastern", "Rift Valley", "Nyanza"];
  for (const region of regions) {
    if (address.toLowerCase().includes(region.toLowerCase())) return region;
  }
  return "Nairobi";
}

function mapDealerToClient(dealer: Dealer): ClientDealer {
  return {
    ...dealer,
    dealerCode: `D-${dealer.id.toString().padStart(4, "0")}`,
    region: extractRegionFromAddress(dealer.address),
    plan: "basic",
    status: dealer.is_active ? "active" : "suspended",
    currentUsers: 0,
    currentVans: 0,
    currentBranches: 0,
    maxUsers: 10,
    maxVans: 5,
    maxBranches: 3,
    totalRevenue: 0,
    lastLoginAt: dealer.created_at
      ? new Date(dealer.created_at).toLocaleDateString()
      : "Never",
  };
}

// ── Confirm Dialog ────────────────────────────────────────────────────────────

function ConfirmDialog({
  open, title, message, danger, onConfirm, onClose,
}: {
  open: boolean;
  title: string;
  message: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-xl border border-border bg-card shadow-2xl p-6">
        <h3 className="font-heading text-lg font-semibold text-foreground mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-6">{message}</p>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-md border border-border py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            className={cn(
              "flex-1 rounded-md py-2 text-sm font-semibold text-white",
              danger ? "bg-destructive hover:bg-destructive/90" : "bg-primary hover:opacity-90"
            )}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Clients() {
  const navigate = useNavigate();

  const { data: dealersData, isLoading: loading, error: queryError } = useDealers();
  const createDealerMutation  = useCreateDealer();
  const suspendDealerMutation = useSuspendDealer();
  const activateDealerMutation = useActivateDealer();

  useToastNotifications(createDealerMutation, {
    loadingMessage: "Creating dealer...",
    successMessage: successMessages.CREATE_DEALER_SUCCESS,
    errorMessage: errorMessages.CREATE_DEALER_FAILED,
    onSuccess: () => setShowAdd(false),
  });

  useToastNotifications(suspendDealerMutation, {
    successMessage: successMessages.SUSPEND_DEALER_SUCCESS,
    errorMessage: errorMessages.SUSPEND_DEALER_FAILED,
    onSuccess: () => setConfirmSuspend(null),
  });

  useToastNotifications(activateDealerMutation, {
    successMessage: successMessages.ACTIVATE_DEALER_SUCCESS,
    errorMessage: errorMessages.ACTIVATE_DEALER_FAILED,
    onSuccess: () => setConfirmSuspend(null),
  });

  const [search, setSearch]               = useState("");
  const [filterStatus, setFilterStatus]   = useState<StatusVal | "all">("all");
  const [filterPlan, setFilterPlan]       = useState<PlanName | "all">("all");
  const [showAdd, setShowAdd]             = useState(false);
  const [menuOpen, setMenuOpen]           = useState<string | null>(null);
  const [confirmSuspend, setConfirmSuspend] = useState<ClientDealer | null>(null);

  const clients = useMemo(() => {
    if (!dealersData) return [];
    if (Array.isArray(dealersData)) return dealersData.map(mapDealerToClient);
    if (dealersData.results && Array.isArray(dealersData.results))
      return dealersData.results.map(mapDealerToClient);
    return [];
  }, [dealersData]);

  const filtered = useMemo(() =>
    clients.filter((c) => {
      const q = search.toLowerCase();
      if (filterStatus !== "all" && c.status !== filterStatus) return false;
      if (filterPlan   !== "all" && c.plan   !== filterPlan)   return false;
      return (
        !q ||
        c.name.toLowerCase().includes(q) ||
        (c.dealerCode && c.dealerCode.toLowerCase().includes(q)) ||
        c.email.toLowerCase().includes(q)
      );
    }),
    [clients, search, filterStatus, filterPlan]
  );

  // Step 1: create the owner user — email is sent automatically inside the dialog
  const handleCreateUser = async (data: CreateUserFormData): Promise<number> => {
    const user = await authService.register({
      email:      data.email,
      password:   data.password,
      first_name: data.first_name,
      last_name:  data.last_name,
      phone:      data.phone,
      role:       data.role as UserRole,
    });
    return user.id;
  };

  // Step 2: create the dealer org linked to the new owner
  const handleCreateDealer = async (data: CreateDealerFormData): Promise<void> => {
    await createDealerMutation.mutateAsync(data);
  };

  const handleToggleSuspend = (client: ClientDealer) => {
    if (client.is_active) {
      suspendDealerMutation.mutate(client.id);
    } else {
      activateDealerMutation.mutate(client.id);
    }
  };

  const error      = queryError instanceof Error ? queryError.message : null;
  const totalCount = dealersData?.count ?? clients.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Clients</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {totalCount} registered dealer organisations
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" /> Add Client
        </button>
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
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, code, email..."
            className="w-full rounded-md border border-border bg-accent py-2 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as StatusVal | "all")}
          className="rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="trial">Trial</option>
          <option value="suspended">Suspended</option>
          <option value="expired">Expired</option>
        </select>
        <select
          value={filterPlan}
          onChange={(e) => setFilterPlan(e.target.value as PlanName | "all")}
          className="rounded-md border border-border bg-accent py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="all">All Plans</option>
          <option value="enterprise">Enterprise</option>
          <option value="pro">Pro</option>
          <option value="basic">Basic</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground text-xs">
              <th className="py-3 px-5 text-left font-medium">Client</th>
              <th className="py-3 px-4 text-left font-medium">Region</th>
              <th className="py-3 px-4 text-left font-medium">Plan</th>
              <th className="py-3 px-4 text-left font-medium">Status</th>
              <th className="py-3 px-4 text-left font-medium">Contact</th>
              <th className="py-3 px-4 text-left font-medium">Created</th>
              <th className="py-3 px-4" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                  Loading clients…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                  No clients match your filters.
                </td>
              </tr>
            ) : (
              filtered.map((c) => {
                const StatusIcon = statusIcons[c.status ?? "active"];
                return (
                  <tr
                    key={c.id}
                    className={cn(
                      "border-b border-border/50 hover:bg-accent/40 transition-colors",
                      !c.is_active && "bg-destructive/5"
                    )}
                  >
                    <td className="py-3 px-5">
                      <div
                        className="flex items-center gap-2 cursor-pointer"
                        onClick={() => navigate(`/super-admin/clients/${c.id}`)}
                      >
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Building2 className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground text-sm">{c.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{c.dealerCode}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground">{c.region}</td>
                    <td className="py-3 px-4">
                      <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium capitalize", planColors[c.plan ?? "basic"])}>
                        {c.plan}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={cn("flex items-center gap-1 text-xs font-medium capitalize", statusColors[c.status ?? "active"])}>
                        <StatusIcon className="h-3.5 w-3.5" /> {c.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-xs">
                        <p className="text-foreground">{c.email}</p>
                        <p className="text-muted-foreground">{c.phone}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground">
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 relative">
                      <button
                        onClick={() => setMenuOpen(menuOpen === c.id.toString() ? null : c.id.toString())}
                        className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                      {menuOpen === c.id.toString() && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(null)} />
                          <div className="absolute right-4 top-10 z-50 w-40 rounded-md border border-border bg-card shadow-xl py-1">
                            <button
                              onClick={() => { navigate(`/super-admin/clients/${c.id}`); setMenuOpen(null); }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent"
                            >
                              <Eye className="h-4 w-4" /> View Details
                            </button>
                            <button
                              onClick={() => setMenuOpen(null)}
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent"
                            >
                              <Edit2 className="h-4 w-4" /> Edit Client
                            </button>
                            <div className="border-t border-border my-1" />
                            <button
                              onClick={() => { setConfirmSuspend(c); setMenuOpen(null); }}
                              className={cn(
                                "flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent",
                                c.is_active ? "text-destructive" : "text-success"
                              )}
                            >
                              <ShieldOff className="h-4 w-4" />
                              {c.is_active ? "Suspend" : "Reactivate"}
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
        {filtered.length} of {clients.length} clients
      </p>

      <CreateDealerDialog
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onCreateUser={handleCreateUser}
        onCreateDealer={handleCreateDealer}
        isLoading={createDealerMutation.isPending}
      />

      <ConfirmDialog
        open={!!confirmSuspend}
        title={confirmSuspend?.is_active === false ? "Reactivate Client" : "Suspend Client"}
        message={
          confirmSuspend?.is_active === false
            ? `Reactivate ${confirmSuspend?.name}? They will regain access to their account.`
            : `Suspend ${confirmSuspend?.name}? All their users will lose access immediately.`
        }
        danger={confirmSuspend?.is_active !== false}
        onConfirm={() => confirmSuspend && handleToggleSuspend(confirmSuspend)}
        onClose={() => setConfirmSuspend(null)}
      />
    </div>
  );
}