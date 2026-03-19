import { useLocation, Link } from "react-router-dom";
import {
  LayoutDashboard, Layers, Share2, Users, FileText, GitMerge,
  DollarSign, ShieldAlert, BarChart3, Settings, Send, Building,
  Truck, TrendingUp, Bell, CheckSquare,
  CreditCard, Clock, Download, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = { title: string; url: string; icon: React.ElementType };

const dealerNav: NavItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "SIM Inventory", url: "/inventory", icon: Layers },
  { title: "Distribution", url: "/issue", icon: Share2 },
  { title: "BA Performance", url: "/ba-performance", icon: Users },
  { title: "Safaricom Reports", url: "/reports", icon: FileText },
  { title: "Reconciliation", url: "/reconciliation", icon: GitMerge },
  { title: "Commission", url: "/commission", icon: DollarSign },
  { title: "Fraud Detection", url: "/fraud", icon: ShieldAlert },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Settings", url: "/settings", icon: Settings },
];

const opsNav: NavItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "SIM Inventory", url: "/inventory", icon: Layers },
  { title: "Issue SIMs", url: "/issue", icon: Send },
  { title: "Branches", url: "/settings", icon: Building },
  { title: "Vans", url: "/settings", icon: Truck },
  { title: "Brand Ambassadors", url: "/ba-performance", icon: Users },
  { title: "Safaricom Reports", url: "/reports", icon: FileText },
  { title: "Reconciliation", url: "/reconciliation", icon: GitMerge },
  { title: "Replacement SIMs", url: "/inventory", icon: RefreshCw },
];

const baNav: NavItem[] = [
  { title: "My Dashboard", url: "/ba-dashboard", icon: LayoutDashboard },
  { title: "My SIMs", url: "/ba-dashboard", icon: Layers },
  { title: "My Registrations", url: "/ba-dashboard", icon: CheckSquare },
  { title: "My Commission", url: "/ba-dashboard", icon: DollarSign },
  { title: "My Performance", url: "/ba-dashboard", icon: TrendingUp },
  { title: "Notifications", url: "/ba-dashboard", icon: Bell },
];

const financeNav: NavItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Commission Reports", url: "/commission", icon: DollarSign },
  { title: "BA Payments", url: "/commission", icon: CreditCard },
  { title: "Payout History", url: "/commission", icon: Clock },
  { title: "Export Reports", url: "/commission", icon: Download },
];

const roleNavMap: Record<string, NavItem[]> = {
  dealer: dealerNav,
  ops: opsNav,
  ba: baNav,
  finance: financeNav,
};

interface AppSidebarProps {
  role: string;
  collapsed: boolean;
}

export function AppSidebar({ role, collapsed }: AppSidebarProps) {
  const location = useLocation();
  const items = roleNavMap[role] || dealerNav;

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen border-r border-border bg-card transition-all duration-200 flex flex-col",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
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

      {/* Nav items */}
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

      {/* Bottom */}
      {!collapsed && (
        <div className="border-t border-border p-4">
          <p className="text-xs text-muted-foreground">Enlight Communications</p>
          <p className="text-xs text-muted-foreground">Dealer Code: D-E019</p>
        </div>
      )}
    </aside>
  );
}
