import { Component, ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/guards/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { SuperAdminLayout } from "@/components/layout/SuperAdminLayout";

import Landing from "./pages/Landing";
import Login from "./pages/auth/Login";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import NotFound from "./pages/NotFound";
import PlaceholderPage from "./pages/PlaceholderPage";

// Shared pages
import SimInventory from "./pages/SimInventory";
import IssueSims from "./pages/IssueSims";
import ReturnSims from "./pages/ReturnSims";
import BADashboardOld from "./pages/BADashboard";
import SafaricomReports from "./pages/SafaricomReports";
import Reconciliation from "./pages/Reconciliation";
import Commission from "./pages/Commission";
import FraudDetection from "./pages/FraudDetection";
import SettingsPage from "./pages/Settings";
import DailyPerformance from "./pages/DailyPerformance";
import AgentPerformance from "./pages/AgentPerformance";
import SuperAdminUsers from "./pages/super-admin/Users";
import Analytics from "./pages/Analytics";
import BranchReport from "@/pages/BranchReport";

// Role dashboards
import OwnerDashboard from "./pages/owner/Dashboard";
import OperationsDashboard from "./pages/operations/Dashboard";
import BranchDashboard from "./pages/branch/Dashboard";
import VanDashboard from "./pages/van/Dashboard";
import BADashboard from "./pages/ba/Dashboard";
import FinanceDashboard from "./pages/finance/Dashboard";
import ExternalAgentDashboard from "./pages/ExternalAgentDashboard";

// Super Admin pages
import SuperAdminDashboard from "./pages/super-admin/Dashboard";
import SuperAdminClients from "./pages/super-admin/Clients";
import SuperAdminClientDetail from "./pages/super-admin/ClientDetail";
import SuperAdminBilling from "./pages/super-admin/Billing";
import SuperAdminSettings from "./pages/super-admin/Settings";
import SuperAdminNotifications from "./pages/super-admin/Notifications";
import SuperAdminRecycleBin from "./pages/super-admin/RecycleBin";
import DealerSettings from "./pages/super-admin/DealerSettings";

// Operations Manager pages
import BranchesPage from "./pages/operations/Branches";
import VansPage from "./pages/operations/Vans";

// Finance pages
import BAPayments from "./pages/finance/BAPayments";
import ApprovePayouts from "./pages/finance/ApprovePayouts";
import PayoutHistory  from "./pages/finance/PayoutHistory";
import ExportReports  from "./pages/finance/ExportReports";

// Branch Manager pages
import MyVans from "./pages/MyVans";

// Brand Ambassador pages
import RegisterSims from "./pages/ba/RegisterSims";
import BAReturnSims from "./pages/ba/ReturnSims";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* ── Super Admin ───────────────────────────────── */}
            <Route element={<ProtectedRoute requiredRole="super_admin" />}>
              <Route element={<SuperAdminLayout />}>
                <Route path="/super-admin/dashboard"     element={<SuperAdminDashboard />}     />
                <Route path="/super-admin/clients"       element={<SuperAdminClients />}       />
                <Route path="/super-admin/clients/:id"   element={<SuperAdminClientDetail />} />                <Route path="/super-admin/billing"       element={<SuperAdminBilling />}       />
                <Route path="/super-admin/notifications" element={<SuperAdminNotifications />} />
                <Route path="/super-admin/settings"      element={<SuperAdminSettings />}      />
                <Route path="/super-admin/recycle-bin"   element={<SuperAdminRecycleBin />}    />
                <Route path="/super-admin/users"         element={<SuperAdminUsers />} />
                <Route path="/super-admin/clients/:id"          element={<SuperAdminClientDetail />} />
                <Route path="/super-admin/clients/:id/settings" element={<DealerSettings />} />              
              </Route>
            </Route>

            {/* ── Dealer Owner ──────────────────────────────── */}
            <Route element={<ProtectedRoute requiredRole="dealer_owner" />}>
              <Route element={<AppLayout />}>
                <Route path="/owner/dashboard"         element={<OwnerDashboard />}           />
                <Route path="/owner/inventory"         element={<SimInventory />}             />
                <Route path="/owner/distribution"      element={<IssueSims />}                />
                <Route path="/owner/returns"           element={<ReturnSims />}               />
                <Route path="/owner/daily-performance" element={<DailyPerformance />}         />
                <Route path="/owner/external-agents"   element={<ExternalAgentDashboard />}   />
                <Route path="/owner/agent-performance" element={<AgentPerformance />}         />
                <Route path="/owner/reports"           element={<SafaricomReports />}         />
                <Route path="/owner/reconciliation"    element={<Reconciliation />}           />
                <Route path="/owner/commission"        element={<Commission />}               />
                <Route path="/owner/fraud"             element={<FraudDetection />}           />
                <Route path="/owner/analytics"         element={<Analytics />} />
                <Route path="/owner/settings"          element={<SettingsPage />}             />
              </Route>
            </Route>

            {/* ── Operations Manager ────────────────────────── */}
            <Route element={<ProtectedRoute requiredRole="operations_manager" />}>
              <Route element={<AppLayout />}>
                <Route path="/operations/dashboard"         element={<OperationsDashboard />}   />
                <Route path="/operations/inventory"         element={<SimInventory />}          />
                <Route path="/operations/issue"             element={<IssueSims />}             />
                <Route path="/operations/returns"           element={<ReturnSims />}            />
                <Route path="/operations/branches"          element={<BranchesPage />}          />
                <Route path="/operations/vans"              element={<VansPage />}              />

                <Route path="/operations/daily-performance" element={<DailyPerformance />}      />
                <Route path="/operations/bas"               element={<BADashboardOld />}        />
                <Route path="/operations/external-agents"   element={<ExternalAgentDashboard />}/>
                <Route path="/operations/agent-performance" element={<AgentPerformance />}      />
                <Route path="/operations/reports"           element={<SafaricomReports />}      />
                <Route path="/operations/reconciliation"    element={<Reconciliation />}        />
                <Route path="/operations/commission"        element={<Commission />}            />
                <Route path="/operations/replacements"      element={<PlaceholderPage title="Replacement SIMs" />} />
                <Route path="/operations/settings"          element={<SettingsPage />}          />
              </Route>
            </Route>

            {/* ── Branch Manager ────────────────────────────── */}
            <Route element={<ProtectedRoute requiredRole="branch_manager" />}>
              <Route element={<AppLayout />}>
                <Route path="/branch/dashboard"         element={<BranchDashboard />}    />
                <Route path="/branch/inventory"         element={<SimInventory />}       />
                <Route path="/branch/issue"             element={<IssueSims />}          />
                <Route path="/branch/returns"           element={<ReturnSims />}         />
                <Route path="/branch/vans"              element={<MyVans />} />
                <Route path="/branch/bas"               element={<BADashboardOld />}     />
                <Route path="/branch/daily-performance" element={<DailyPerformance />}  />
                <Route path="/branch/reports"           element={<BranchReport />}   />
                <Route path="/branch/settings"          element={<SettingsPage />}       />
              </Route>
            </Route>

            {/* ── Van Team Leader ───────────────────────────── */}
            <Route element={<ProtectedRoute requiredRole="van_team_leader" />}>
              <Route element={<AppLayout />}>
                <Route path="/van/dashboard"   element={<VanDashboard />} />
                <Route path="/van/inventory"   element={<SimInventory />} />
                <Route path="/van/issue"       element={<IssueSims />}    />
                <Route path="/van/returns"     element={<ReturnSims />}   />
                <Route path="/van/bas"         element={<BADashboardOld />} />
                <Route path="/van/performance" element={<DailyPerformance />} />
                <Route path="/van/settings"    element={<SettingsPage />} />
              </Route>
            </Route>

            {/* ── Brand Ambassador ──────────────────────────── */}
            <Route element={<ProtectedRoute requiredRole="brand_ambassador" />}>
              <Route element={<AppLayout />}>
                <Route path="/ba/dashboard"    element={<BADashboard />}  />
                <Route path="/ba/my-sims"      element={<SimInventory />} />
                <Route path="/ba/registrations" element={<RegisterSims />} />
                <Route path="/ba/return"       element={<BAReturnSims />} />
                <Route path="/ba/commission"   element={<Commission />}    />
                <Route path="/ba/performance"  element={<DailyPerformance />} />
                <Route path="/ba/notifications"element={<PlaceholderPage title="Notifications" />}    />
              </Route>
            </Route>

            {/* ── Finance ───────────────────────────────────── */}
            <Route element={<ProtectedRoute requiredRole="finance" />}>
              <Route element={<AppLayout />}>
                <Route path="/finance/dashboard"   element={<FinanceDashboard />}     />
                <Route path="/finance/commissions" element={<Commission       />}     />
                <Route path="/finance/payments"    element={<BAPayments       />}      />
                <Route path="/finance/approve"     element={<ApprovePayouts   />}     />
                <Route path="/finance/history"     element={<PayoutHistory    />}     />
                <Route path="/finance/export"      element={<ExportReports    />}     />
                <Route path="/finance/settings"    element={<SettingsPage     />}     />
              </Route>
            </Route>

            <Route path="/"      element={<Landing />} />
            <Route path="/login" element={<Login />}   />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
      </AuthErrorBoundary>
    </TooltipProvider>
  </QueryClientProvider>
);

export class AuthErrorBoundary extends Component<{ children: ReactNode }, { errored: boolean }> {
  state = { errored: false };
  
  componentDidCatch(error: Error) {
    if (error.message.includes("useAuth must be used within AuthProvider")) {
      window.location.reload();
    }
  }
  
  static getDerivedStateFromError() {
    return { errored: true };
  }
  
  render() {
    return this.state.errored ? null : this.props.children;
  }
}
export default App;