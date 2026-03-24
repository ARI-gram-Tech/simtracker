import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/guards/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";

import Login from "./pages/auth/Login";
import NotFound from "./pages/NotFound";
import PlaceholderPage from "./pages/PlaceholderPage";

// Owner pages
import OwnerDashboard from "./pages/owner/Dashboard";
import SimInventory from "./pages/SimInventory";
import IssueSims from "./pages/IssueSims";
import BADashboardOld from "./pages/BADashboard";
import SafaricomReports from "./pages/SafaricomReports";
import Reconciliation from "./pages/Reconciliation";
import Commission from "./pages/Commission";
import FraudDetection from "./pages/FraudDetection";
import SettingsPage from "./pages/Settings";

// Role dashboards
import OperationsDashboard from "./pages/operations/Dashboard";
import BADashboard from "./pages/ba/Dashboard";
import FinanceDashboard from "./pages/finance/Dashboard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />

            {/* Dealer Owner */}
            <Route element={<ProtectedRoute requiredRole="dealer_owner" />}>
              <Route element={<AppLayout />}>
                <Route path="/owner/dashboard" element={<OwnerDashboard />} />
                <Route path="/owner/inventory" element={<SimInventory />} />
                <Route path="/owner/distribution" element={<IssueSims />} />
                <Route path="/owner/ba-performance" element={<BADashboardOld />} />
                <Route path="/owner/reports" element={<SafaricomReports />} />
                <Route path="/owner/reconciliation" element={<Reconciliation />} />
                <Route path="/owner/commission" element={<Commission />} />
                <Route path="/owner/fraud" element={<FraudDetection />} />
                <Route path="/owner/analytics" element={<PlaceholderPage title="Analytics" />} />
                <Route path="/owner/settings" element={<SettingsPage />} />
              </Route>
            </Route>

            {/* Operations Manager */}
            <Route element={<ProtectedRoute requiredRole="operations_manager" />}>
              <Route element={<AppLayout />}>
                <Route path="/operations/dashboard" element={<OperationsDashboard />} />
                <Route path="/operations/inventory" element={<SimInventory />} />
                <Route path="/operations/issue" element={<IssueSims />} />
                <Route path="/operations/returns" element={<PlaceholderPage title="Return SIMs" />} />
                <Route path="/operations/branches" element={<PlaceholderPage title="Branches" />} />
                <Route path="/operations/vans" element={<PlaceholderPage title="Vans" />} />
                <Route path="/operations/bas" element={<BADashboardOld />} />
                <Route path="/operations/reports" element={<SafaricomReports />} />
                <Route path="/operations/reconciliation" element={<Reconciliation />} />
                <Route path="/operations/replacements" element={<PlaceholderPage title="Replacement SIMs" />} />
                <Route path="/operations/settings" element={<SettingsPage />} />
              </Route>
            </Route>

            {/* Brand Ambassador */}
            <Route element={<ProtectedRoute requiredRole="brand_ambassador" />}>
              <Route element={<AppLayout />}>
                <Route path="/ba/dashboard" element={<BADashboard />} />
                <Route path="/ba/my-sims" element={<PlaceholderPage title="My SIMs" />} />
                <Route path="/ba/registrations" element={<PlaceholderPage title="My Registrations" />} />
                <Route path="/ba/commission" element={<PlaceholderPage title="My Commission" />} />
                <Route path="/ba/performance" element={<PlaceholderPage title="My Performance" />} />
                <Route path="/ba/notifications" element={<PlaceholderPage title="Notifications" />} />
              </Route>
            </Route>

            {/* Finance */}
            <Route element={<ProtectedRoute requiredRole="finance" />}>
              <Route element={<AppLayout />}>
                <Route path="/finance/dashboard" element={<FinanceDashboard />} />
                <Route path="/finance/commissions" element={<Commission />} />
                <Route path="/finance/payments" element={<PlaceholderPage title="BA Payments" />} />
                <Route path="/finance/approve" element={<PlaceholderPage title="Approve Payouts" />} />
                <Route path="/finance/history" element={<PlaceholderPage title="Payout History" />} />
                <Route path="/finance/export" element={<PlaceholderPage title="Export Reports" />} />
                <Route path="/finance/settings" element={<SettingsPage />} />
              </Route>
            </Route>

            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
