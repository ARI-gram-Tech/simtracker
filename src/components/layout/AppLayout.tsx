import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { TopBar } from "./TopBar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationToast } from "@/components/NotificationToast";

export function AppLayout() {
  const { user } = useAuth();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setCollapsed(true);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const toggleSidebar = () => {
    if (isMobile) {
      setMobileOpen((prev) => !prev);
    } else {
      setCollapsed((prev) => !prev);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <NotificationToast />

      {/* Mobile backdrop */}
      {isMobile && mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed left-0 top-0 z-40 h-screen transition-transform duration-200",
          isMobile
            ? mobileOpen
              ? "translate-x-0"
              : "-translate-x-full"
            : "translate-x-0"
        )}
      >
        <AppSidebar
          role={user?.role || "dealer_owner"}
          collapsed={!isMobile && collapsed}
        />
      </div>

      {/* Top bar */}
      <TopBar
        collapsed={!isMobile && collapsed}
        onToggleSidebar={toggleSidebar}
        isMobile={isMobile}
      />

      {/* Main content */}
      <main
        className={cn(
          "pt-16 transition-all duration-200 min-h-screen",
          isMobile ? "ml-0" : collapsed ? "ml-16" : "ml-60"
        )}
      >
        <div className="p-4 md:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}