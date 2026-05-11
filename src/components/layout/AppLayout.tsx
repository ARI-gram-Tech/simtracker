// src/components/layout/AppLayout.tsx
import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { TopBar } from "./TopBar";
import { MobileBottomBar } from "./MobileBottomBar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationToast } from "@/components/NotificationToast";
import { useIsMobile } from "@/hooks/useIsMobile";

export function AppLayout() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const location = useLocation();

  // Desktop: sidebar collapse state
  const [collapsed, setCollapsed] = useState(false);

  // Mobile: drawer open state
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Auto-collapse sidebar on tablet (768–1024px)
  useEffect(() => {
    const mql = window.matchMedia("(min-width: 768px) and (max-width: 1023px)");
    if (mql.matches) setCollapsed(true);

    const handler = (e: MediaQueryListEvent) => {
      if (e.matches) setCollapsed(true);
    };
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileDrawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileDrawerOpen]);

  const role = user?.role ?? "dealer_owner";

  return (
    <div className="min-h-screen bg-background">
      <NotificationToast />

      {/* ── Sidebar ───────────────────────────────────────────────────── */}
      <AppSidebar
        role={role}
        collapsed={collapsed}
        mobileOpen={mobileDrawerOpen}
        onMobileClose={() => setMobileDrawerOpen(false)}
      />

      {/* ── Top Bar ───────────────────────────────────────────────────── */}
      <TopBar
        collapsed={collapsed}
        onToggleSidebar={() => setCollapsed((c) => !c)}
        onOpenMobileDrawer={() => setMobileDrawerOpen(true)}
      />

      {/* ── Main content area ─────────────────────────────────────────── */}
      <main
        className={cn(
          "pt-16 min-h-screen transition-all duration-200",
          // Mobile: no left margin (sidebar is a drawer)
          "ml-0",
          // Desktop: offset by sidebar width
          collapsed ? "md:ml-16" : "md:ml-60",
          // Mobile: add bottom padding for bottom nav bar
          "pb-16 md:pb-0"
        )}
      >
        <div className="p-4 md:p-6">
          <Outlet />
        </div>
      </main>

      {/* ── Mobile bottom navigation ──────────────────────────────────── */}
      <div className="md:hidden">
        <MobileBottomBar role={role} />
      </div>
    </div>
  );
}