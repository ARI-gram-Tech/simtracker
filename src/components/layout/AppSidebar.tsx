// /src/components/layout/AppSidebar.tsx
import { useLocation, Link } from "react-router-dom";
import {
  LayoutDashboard, Layers, Share2, Users, FileText, GitMerge,
  DollarSign, ShieldAlert, BarChart3, Settings, Send, Building,
  Truck, TrendingUp, Bell, CheckSquare, CreditCard, Clock,
  Download, RefreshCw, Package, CornerDownLeft,
  Globe, Trash2, RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UserRole } from "@/contexts/AuthContext";

type NavItem = { title: string; url: string; icon: React.ElementType };

const navByRole: Record<UserRole, NavItem[]> = {
  super_admin: [
    { title: "Dashboard",          url: "/super-admin/dashboard",          icon: LayoutDashboard },
    { title: "Clients",            url: "/super-admin/clients",            icon: Users           },
    { title: "Billing",            url: "/super-admin/billing",            icon: DollarSign      },
    { title: "Notifications",      url: "/super-admin/notifications",      icon: Bell            },
    { title: "Settings",           url: "/super-admin/settings",           icon: Settings        },
    { title: "Recycle Bin",        url: "/super-admin/recycle-bin",        icon: Trash2          },
  ],
dealer_owner: [
    { title: "Dashboard",          url: "/owner/dashboard",          icon: LayoutDashboard },
    { title: "SIM Inventory",      url: "/owner/inventory",          icon: Layers          },
    { title: "Distribution",       url: "/owner/distribution",       icon: Share2          },
    { title: "Return SIMs",        url: "/owner/returns",            icon: CornerDownLeft  },
    { title: "Daily Performance",  url: "/owner/daily-performance",  icon: TrendingUp      },
    { title: "Agent Performance",  url: "/owner/agent-performance",  icon: TrendingUp },    
    { title: "Safaricom Reports",  url: "/owner/reports",            icon: FileText        },
    { title: "Reconciliation",     url: "/owner/reconciliation",     icon: GitMerge        },
    { title: "Commission",         url: "/owner/commission",         icon: DollarSign      },
    { title: "Fraud Detection",    url: "/owner/fraud",              icon: ShieldAlert     },
    { title: "Analytics",          url: "/owner/analytics",          icon: BarChart3       },
    { title: "Settings",           url: "/owner/settings",           icon: Settings        },
  ],
  operations_manager: [
    { title: "Dashboard",          url: "/operations/dashboard",          icon: LayoutDashboard },
    { title: "SIM Inventory",      url: "/operations/inventory",          icon: Layers          },
    { title: "Issue SIMs",         url: "/operations/issue",              icon: Send            },
    { title: "Return SIMs",        url: "/operations/returns",            icon: CornerDownLeft  },
    { title: "Branches",           url: "/operations/branches",           icon: Building        },
    { title: "Vans",               url: "/operations/vans",               icon: Truck           },
    { title: "Daily Performance",  url: "/operations/daily-performance",  icon: TrendingUp      },
    { title: "Brand Ambassadors",  url: "/operations/bas",                icon: Users           },
    { title: "External Agents",    url: "/operations/external-agents",    icon: Globe      },
    { title: "Agent Performance",  url: "/operations/agent-performance",  icon: TrendingUp },    
    { title: "Safaricom Reports",  url: "/operations/reports",            icon: FileText        },
    { title: "Reconciliation",     url: "/operations/reconciliation",     icon: GitMerge        },
    { title: "Replacement SIMs",   url: "/operations/replacements",       icon: RefreshCw       },
    { title: "Settings",           url: "/operations/settings",           icon: Settings        },
  ],
  branch_manager: [
    { title: "Dashboard",          url: "/branch/dashboard",          icon: LayoutDashboard },
    { title: "SIM Inventory",      url: "/branch/inventory",          icon: Layers          },
    { title: "Issue SIMs",         url: "/branch/issue",              icon: Send            },
    { title: "Return SIMs",        url: "/branch/returns",            icon: CornerDownLeft  },
    { title: "My Vans",            url: "/branch/vans",               icon: Truck           },
    { title: "Daily Performance",  url: "/branch/daily-performance",  icon: TrendingUp      },
    { title: "Brand Ambassadors",  url: "/branch/bas",                icon: Users           },
    { title: "My Branch Report",   url: "/branch/reports",            icon: BarChart3       },
    { title: "Settings",           url: "/branch/settings",           icon: Settings        },
  ],
  van_team_leader: [
    { title: "Dashboard",         url: "/van/dashboard",         icon: LayoutDashboard },
    { title: "My SIM Stock",      url: "/van/inventory",         icon: Package         },
    { title: "Issue to BAs",      url: "/van/issue",             icon: Send            },
    { title: "Return SIMs",       url: "/van/returns",           icon: CornerDownLeft  },
    { title: "My BAs",            url: "/van/bas",               icon: Users           },
    { title: "Performance",       url: "/van/performance",       icon: TrendingUp      },
    { title: "Settings",          url: "/van/settings",          icon: Settings        },
  ],
  brand_ambassador: [
    { title: "My Dashboard",      url: "/ba/dashboard",          icon: LayoutDashboard },
    { title: "My SIMs",           url: "/ba/my-sims",            icon: Layers          },
    { title: "My Registrations",  url: "/ba/registrations",      icon: CheckSquare     },
    { title: "Return SIMs",       url: "/ba/return",             icon: RotateCcw       },  
    { title: "My Commission",     url: "/ba/commission",         icon: DollarSign      },
    { title: "My Performance",    url: "/ba/performance",        icon: TrendingUp      },
    { title: "Notifications",     url: "/ba/notifications",      icon: Bell            },
  ],
  finance: [
    { title: "Dashboard",         url: "/finance/dashboard",     icon: LayoutDashboard },
    { title: "Commission Reports",url: "/finance/commissions",   icon: DollarSign      },
    { title: "BA Payments",       url: "/finance/payments",      icon: CreditCard      },
    { title: "Approve Payouts",   url: "/finance/approve",       icon: CheckSquare     },
    { title: "Payout History",    url: "/finance/history",       icon: Clock           },
    { title: "Export Reports",    url: "/finance/export",        icon: Download        },
    { title: "Settings",          url: "/finance/settings",      icon: Settings        },
  ],
};

const roleLabels: Record<UserRole, string> = {
  super_admin:        "Super Admin",
  dealer_owner:       "Dealer Owner",
  operations_manager: "Operations Manager",
  branch_manager:     "Branch Manager",
  van_team_leader:    "Van Team Leader",
  brand_ambassador:   "Brand Ambassador",
  finance:            "Finance",
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
          <p className="text-xs text-muted-foreground mt-1 capitalize">{roleLabels[role as UserRole]}</p>
        </div>
      )}
    </aside>
  );
}