import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/AppLayout";
import Login from "./pages/Login";
import DealerDashboard from "./pages/DealerDashboard";
import SimInventory from "./pages/SimInventory";
import IssueSims from "./pages/IssueSims";
import BADashboard from "./pages/BADashboard";
import SafaricomReports from "./pages/SafaricomReports";
import Reconciliation from "./pages/Reconciliation";
import Commission from "./pages/Commission";
import FraudDetection from "./pages/FraudDetection";
import SettingsPage from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<AppLayout role="dealer" />}>
            <Route path="/" element={<DealerDashboard />} />
            <Route path="/inventory" element={<SimInventory />} />
            <Route path="/issue" element={<IssueSims />} />
            <Route path="/ba-performance" element={<BADashboard />} />
            <Route path="/ba-dashboard" element={<BADashboard />} />
            <Route path="/reports" element={<SafaricomReports />} />
            <Route path="/reconciliation" element={<Reconciliation />} />
            <Route path="/commission" element={<Commission />} />
            <Route path="/fraud" element={<FraudDetection />} />
            <Route path="/analytics" element={<DealerDashboard />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
