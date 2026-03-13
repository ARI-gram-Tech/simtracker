import { useState } from "react";
import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { TopBar } from "./TopBar";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  role?: string;
}

export function AppLayout({ role = "dealer" }: AppLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar role={role} collapsed={collapsed} />
      <TopBar collapsed={collapsed} onToggleSidebar={() => setCollapsed(!collapsed)} />
      <main
        className={cn(
          "pt-16 transition-all duration-200 min-h-screen",
          collapsed ? "ml-16" : "ml-60"
        )}
      >
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
