// src/pages/super-admin/ClientDetail.tsx
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Building2, Mail, Phone, MapPin, Calendar,
  Users, Truck, GitBranch, DollarSign, Clock, CheckCircle2,
  XCircle, ShieldOff, Edit2, Save, X, AlertCircle,
  CreditCard, Activity, Settings
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDealer } from "@/hooks/useDealers";
import { useSuspendDealer, useActivateDealer } from "@/hooks/useDealers";
import { SubscriptionPlanManager } from "@/pages/super-admin/SubscriptionPlanManager";
import { InvoiceHistory } from "@/pages/super-admin/InvoiceHistory";
import UsersPage from "@/pages/super-admin/Users";
import DealerSettings from "@/pages/super-admin/DealerSettings";
import { useToastNotifications } from "@/hooks/useToastNotifications";
import { errorMessages, successMessages } from "@/lib/toast";

type TabType = "overview" | "branches" | "users" | "billing" | "settings";

// Helper Components
function InfoCard({ icon: Icon, label, value, isEditing }: {
  icon: React.ElementType;
  label: string;
  value: string;
  isEditing: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      {isEditing ? (
        <input
          type="text"
          defaultValue={value}
          className="w-full rounded-md border border-border bg-accent px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      ) : (
        <p className="text-sm text-foreground font-medium">{value}</p>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, change }: {
  icon: React.ElementType;
  label: string;
  value: string;
  change: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <Icon className="h-5 w-5 text-primary" />
        <span className="text-xs text-muted-foreground">{change}</span>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [isEditing, setIsEditing] = useState(false);

  const { data: dealer, isLoading, error } = useDealer(Number(id));
  const suspendDealerMutation = useSuspendDealer();
  const activateDealerMutation = useActivateDealer();

  // Toast notifications
  useToastNotifications(suspendDealerMutation, {
    successMessage: successMessages.SUSPEND_DEALER_SUCCESS,
    errorMessage: errorMessages.SUSPEND_DEALER_FAILED,
  });

  useToastNotifications(activateDealerMutation, {
    successMessage: successMessages.ACTIVATE_DEALER_SUCCESS,
    errorMessage: errorMessages.ACTIVATE_DEALER_FAILED,
  });

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading client details...</p>
        </div>
      </div>
    );
  }

  if (error || !dealer) {
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">Client Not Found</h2>
          <p className="text-muted-foreground mb-4">The client you're looking for doesn't exist or you don't have access.</p>
          <button
            onClick={() => navigate("/super-admin/clients")}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Back to Clients
          </button>
        </div>
      </div>
    );
  }

  const handleSuspend = () => {
    if (dealer.is_active) {
      suspendDealerMutation.mutate(dealer.id);
    } else {
      activateDealerMutation.mutate(dealer.id);
    }
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: Activity },
    { id: "branches", label: "Branches", icon: GitBranch },
    { id: "users", label: "Users", icon: Users },
    { id: "billing", label: "Billing", icon: CreditCard },
    { id: "settings", label: "Settings", icon: Settings },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/super-admin/clients")}
            className="rounded-md p-2 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="font-heading text-2xl font-bold text-foreground">{dealer.name}</h1>
                <p className="text-sm text-muted-foreground">Dealer ID: #{dealer.id}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
          >
            {isEditing ? <X className="h-4 w-4" /> : <Edit2 className="h-4 w-4" />}
            {isEditing ? "Cancel" : "Edit"}
          </button>
          <button
            onClick={handleSuspend}
            className={cn(
              "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors",
              dealer.is_active
                ? "bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/30"
                : "bg-success/10 text-success hover:bg-success/20 border border-success/30"
            )}
          >
            <ShieldOff className="h-4 w-4" />
            {dealer.is_active ? "Suspend Client" : "Reactivate Client"}
          </button>
        </div>
      </div>

      {/* Status Banner */}
      <div className={cn(
        "rounded-lg border p-4",
        dealer.is_active
          ? "bg-success/5 border-success/20"
          : "bg-destructive/5 border-destructive/20"
      )}>
        <div className="flex items-center gap-2">
          {dealer.is_active ? (
            <CheckCircle2 className="h-5 w-5 text-success" />
          ) : (
            <XCircle className="h-5 w-5 text-destructive" />
          )}
          <span className="text-sm font-medium">
            Status: {dealer.is_active ? "Active" : "Suspended"}
          </span>
          {!dealer.is_active && (
            <span className="text-xs text-muted-foreground ml-2">
              This client's access has been suspended
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all",
                  isActive
                    ? "border-b-2 border-primary text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {/* ── Overview ── */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Info Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <InfoCard
                icon={Mail}
                label="Email"
                value={dealer.email}
                isEditing={isEditing}
              />
              <InfoCard
                icon={Phone}
                label="Phone"
                value={dealer.phone}
                isEditing={isEditing}
              />
              <InfoCard
                icon={MapPin}
                label="Address"
                value={dealer.address || "Not specified"}
                isEditing={isEditing}
              />
              <InfoCard
                icon={Calendar}
                label="Created"
                value={new Date(dealer.created_at).toLocaleDateString()}
                isEditing={false}
              />
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard
                icon={Users}
                label="Total Users"
                value="0"
                change="+0 this month"
              />
              <StatCard
                icon={Truck}
                label="Active Vans"
                value="0"
                change="0 active"
              />
              <StatCard
                icon={GitBranch}
                label="Branches"
                value="0"
                change="0 total"
              />
              <StatCard
                icon={DollarSign}
                label="Revenue"
                value="KES 0"
                change="This month"
              />
            </div>

            {/* Recent Activity */}
            <div className="rounded-lg border border-border bg-card">
              <div className="border-b border-border px-6 py-4">
                <h3 className="font-semibold text-foreground">Recent Activity</h3>
              </div>
              <div className="p-6">
                <div className="flex items-center justify-center py-8 text-center">
                  <div className="text-muted-foreground">
                    <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No recent activity to display</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Branches ── */}
        {activeTab === "branches" && (
          <div className="rounded-lg border border-border bg-card">
            <div className="border-b border-border px-6 py-4">
              <h3 className="font-semibold text-foreground">Branches</h3>
              <p className="text-sm text-muted-foreground">Manage dealer branches</p>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-center py-12 text-center">
                <div className="text-muted-foreground">
                  <GitBranch className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm font-medium">No branches yet</p>
                  <p className="text-xs mt-1">Branches will appear here once created</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Users ── */}
        {activeTab === "users" && (
          <UsersPage />
        )}

        {/* ── Billing ── */}
        {activeTab === "billing" && (
          <div className="space-y-6">
            {/* Subscription Plan Section */}
            <div className="rounded-lg border border-border bg-card">
              <div className="border-b border-border px-6 py-4">
                <h3 className="font-semibold text-foreground">Subscription Plan</h3>
                <p className="text-sm text-muted-foreground">Manage client's subscription and billing</p>
              </div>
              <div className="p-6">
                <SubscriptionPlanManager dealer={dealer} />
              </div>
            </div>

            {/* Invoice History Section */}
            <div className="rounded-lg border border-border bg-card">
              <div className="border-b border-border px-6 py-4">
                <h3 className="font-semibold text-foreground">Invoice History</h3>
                <p className="text-sm text-muted-foreground">Recent invoices and payment status</p>
              </div>
              <div className="p-6">
                <InvoiceHistory dealerId={dealer.id} />
              </div>
            </div>
          </div>
        )}

        {/* ── Settings ── */}
        {activeTab === "settings" && (
          <DealerSettings />
        )}
      </div>

      {/* Save Button when editing */}
      {isEditing && (
        <div className="fixed bottom-6 right-6">
          <button
            onClick={() => setIsEditing(false)}
            className="flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg hover:opacity-90 transition-all"
          >
            <Save className="h-4 w-4" />
            Save Changes
          </button>
        </div>
      )}
    </div>
  );
}