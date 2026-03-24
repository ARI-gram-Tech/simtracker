import { useLocation, Link } from "react-router-dom";
import {
  LayoutDashboard, Layers, Share2, Users, FileText, GitMerge,
  DollarSign, ShieldAlert, BarChart3, Settings, Send, Building,
  Truck, TrendingUp, Bell, CheckSquare, CreditCard, Clock,
  Download, RefreshCw, Package, CornerDownLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UserRole } from "@/contexts/AuthContext";

type NavItem = { title: string; url: string; icon: React.ElementType };

const navByRole: Record<UserRole, NavItem[]> = {
  dealer_owner: [
    { title: "Dashboard", url: "/owner/dashboard", icon: LayoutDashboard },
    { title: "SIM Inventory", url: "/owner/inventory", icon: Layers },
    { title: "Distribution", url: "/owner/distribution", icon: Share2 },
    { title: "BA Performance", url: "/owner/ba-performance", icon: Users },
    { title: "Safaricom Reports", url: "/owner/reports", icon: FileText },
    { title: "Reconciliation", url: "/owner/reconciliation", icon: GitMerge },
    { title: "Commission", url: "/owner/commission", icon: DollarSign },
    { title: "Fraud Detection", url: "/owner/fraud", icon: ShieldAlert },
    { title: "Analytics", url: "/owner/analytics", icon: BarChart3 },
    { title: "Settings", url: "/owner/settings", icon: Settings },
  ],
  operations_manager: [
    { title: "Dashboard", url: "/operations/dashboard", icon: LayoutDashboard },
    { title: "SIM Inventory", url: "/operations/inventory", icon: Layers },
    { title: "Issue SIMs", url: "/operations/issue", icon: Send },
    { title: "Return SIMs", url: "/operations/returns", icon: CornerDownLeft },
    { title: "Branches", url: "/operations/branches", icon: Building },
    { title: "Vans", url: "/operations/vans", icon: Truck },
    { title: "Brand Ambassadors", url: "/operations/bas", icon: Users },
    { title: "Safaricom Reports", url: "/operations/reports", icon: FileText },
    { title: "Reconciliation", url: "/operations/reconciliation", icon: GitMerge },
    { title: "Replacement SIMs", url: "/operations/replacements", icon: RefreshCw },
    { title: "Settings", url: "/operations/settings", icon: Settings },
  ],
  brand_ambassador: [
    { title: "My Dashboard", url: "/ba/dashboard", icon: LayoutDashboard },
    { title: "My SIMs", url: "/ba/my-sims", icon: Layers },
    { title: "My Registrations", url: "/ba/registrations", icon: CheckSquare },
    { title: "My Commission", url: "/ba/commission", icon: DollarSign },
    { title: "My Performance", url: "/ba/performance", icon: TrendingUp },
    { title: "Notifications", url: "/ba/notifications", icon: Bell },
  ],
  finance: [
    { title: "Dashboard", url: "/finance/dashboard", icon: LayoutDashboard },
    { title: "Commission Reports", url: "/finance/commissions", icon: DollarSign },
    { title: "BA Payments", url: "/finance/payments", icon: CreditCard },
    { title: "Approve Payouts", url: "/finance/approve", icon: CheckSquare },
    { title: "Payout History", url: "/finance/history", icon: Clock },
    { title: "Export Reports", url: "/finance/export", icon: Download },
    { title: "Settings", url: "/finance/settings", icon: Settings },
  ],
};

interface AppSidebarProps {
  role: string;
  collapsed: boolean;
}

export function AppSidebar({ role, collapsed }: AppSidebarProps) {
  const location = useLocation();
  const items = navByRole[role as UserRole] || navByRole.dealer_owner;

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen border-r border-border bg-card transition-all duration-200 flex flex-col",
        collapsed ? "w-16" : "w-60"
      )}
    >
      <div className="flex h-16 items-center gap-2 border-b border-border px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
          <Layers className="h-4 w-4 text-primary-foreground" />
        </div>
        {!collapsed && (
          <span className="font-heading text-lg font-bold text-foreground">
            Sim<span className="text-primary">Track</span>
          </span>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {items.map((item) => {
          const isActive = location.pathname === item.url;
          return (
            <Link
              key={item.title}
              to={item.url}
              className={cn(
                "group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-150",
                "hover:bg-accent hover:text-foreground",
                isActive
                  ? "bg-accent text-primary border-l-2 border-primary"
                  : "text-muted-foreground border-l-2 border-transparent"
              )}
            >
              <item.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
              {!collapsed && <span>{item.title}</span>}
            </Link>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="border-t border-border p-4">
          <p className="text-xs text-muted-foreground">Enlight Communications</p>
          <p className="text-xs text-muted-foreground">Dealer Code: D-E019</p>
        </div>
      )}
    </aside>
  );
}
