// src/components/layout/MobileBottomBar.tsx
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Layers, TrendingUp, Bell, Settings,
  MoreHorizontal, X, Users, Send, DollarSign, FileText,
  Share2, BarChart3, Package, CheckSquare, CornerDownLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UserRole } from "@/contexts/AuthContext";
import { NavItem, navByRole } from "./AppSidebar";

// ─── Core nav items per role (shown in bottom bar) ────────────────────────────
const coreNavByRole: Record<UserRole, NavItem[]> = {
  super_admin: [
    { title: "Dashboard",  url: "/super-admin/dashboard",  icon: LayoutDashboard },
    { title: "Clients",    url: "/super-admin/clients",    icon: Users           },
    { title: "Billing",    url: "/super-admin/billing",    icon: DollarSign      },
    { title: "Settings",   url: "/super-admin/settings",   icon: Settings        },
  ],
  dealer_owner: [
    { title: "Dashboard",  url: "/owner/dashboard",        icon: LayoutDashboard },
    { title: "Inventory",  url: "/owner/inventory",        icon: Layers          },
    { title: "Reports",    url: "/owner/reports",          icon: FileText        },
    { title: "Commission", url: "/owner/commission",       icon: DollarSign      },
  ],
  operations_manager: [
    { title: "Dashboard",  url: "/operations/dashboard",   icon: LayoutDashboard },
    { title: "Inventory",  url: "/operations/inventory",   icon: Layers          },
    { title: "Issue SIMs", url: "/operations/issue",       icon: Send            },
    { title: "Reports",    url: "/operations/reports",     icon: FileText        },
  ],
  branch_manager: [
    { title: "Dashboard",  url: "/branch/dashboard",       icon: LayoutDashboard },
    { title: "Inventory",  url: "/branch/inventory",       icon: Layers          },
    { title: "Issue SIMs", url: "/branch/issue",           icon: Send            },
    { title: "BAs",        url: "/branch/bas",             icon: Users           },
  ],
  van_team_leader: [
    { title: "Dashboard",  url: "/van/dashboard",          icon: LayoutDashboard },
    { title: "My Stock",   url: "/van/inventory",          icon: Package         },
    { title: "Issue",      url: "/van/issue",              icon: Send            },
    { title: "My BAs",     url: "/van/bas",                icon: Users           },
  ],
  brand_ambassador: [
    { title: "Dashboard",  url: "/ba/dashboard",           icon: LayoutDashboard },
    { title: "My SIMs",    url: "/ba/my-sims",             icon: Layers          },
    { title: "Register",   url: "/ba/registrations",       icon: CheckSquare     },
    { title: "Commission", url: "/ba/commission",          icon: DollarSign      },
  ],
  finance: [
    { title: "Dashboard",  url: "/finance/dashboard",      icon: LayoutDashboard },
    { title: "Commission", url: "/finance/commissions",    icon: DollarSign      },
    { title: "Payments",   url: "/finance/payments",       icon: Share2          },
    { title: "Approve",    url: "/finance/approve",        icon: CheckSquare     },
  ],
};

interface MobileBottomBarProps {
  role: string;
}

export function MobileBottomBar({ role }: MobileBottomBarProps) {
  const location = useLocation();
  const [showMore, setShowMore] = useState(false);

  const typedRole = (role as UserRole) in coreNavByRole ? (role as UserRole) : "dealer_owner";
  const coreItems = coreNavByRole[typedRole];
  const allItems  = navByRole[typedRole] ?? [];

  // Extra items = all items NOT in core
  const coreUrls  = new Set(coreItems.map((i) => i.url));
  const extraItems = allItems.filter((i) => !coreUrls.has(i.url));

  return (
    <>
      {/* ── More drawer / sheet ──────────────────────────────────────── */}
      {showMore && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm md:hidden"
            onClick={() => setShowMore(false)}
          />
          <div className="fixed bottom-16 left-0 right-0 z-50 bg-card border-t border-border rounded-t-2xl shadow-2xl md:hidden max-h-[60vh] overflow-y-auto">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-sm font-semibold text-foreground">More</span>
              <button
                onClick={() => setShowMore(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1 p-3">
              {extraItems.map((item) => {
                const isActive =
                  location.pathname === item.url ||
                  location.pathname.startsWith(item.url + "/");
                return (
                  <Link
                    key={item.url}
                    to={item.url}
                    onClick={() => setShowMore(false)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-xl p-3 text-center transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    <span className="text-[10px] font-medium leading-tight line-clamp-2">
                      {item.title}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ── Bottom navigation bar ────────────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border md:hidden">
        <div className="flex items-stretch h-16 safe-area-inset-bottom">
          {coreItems.map((item) => {
            const isActive =
              location.pathname === item.url ||
              location.pathname.startsWith(item.url + "/");
            return (
              <Link
                key={item.url}
                to={item.url}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-1 px-1 transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon
                  className={cn("h-5 w-5 shrink-0", isActive && "text-primary")}
                />
                <span
                  className={cn(
                    "text-[10px] font-medium truncate w-full text-center",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {item.title}
                </span>
                {isActive && (
                  <span className="absolute bottom-0 h-0.5 w-8 bg-primary rounded-t-full" />
                )}
              </Link>
            );
          })}

          {/* More button */}
          {extraItems.length > 0 && (
            <button
              onClick={() => setShowMore((p) => !p)}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 px-1 transition-colors",
                showMore ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <MoreHorizontal className="h-5 w-5 shrink-0" />
              <span className="text-[10px] font-medium">More</span>
            </button>
          )}
        </div>
      </nav>
    </>
  );
}