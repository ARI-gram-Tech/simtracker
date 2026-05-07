import { Navigate, Outlet } from "react-router-dom";
import { useAuth, UserRole, getRoleDashboard } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  requiredRole: UserRole;
}

export function ProtectedRoute({ requiredRole }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();

  // ⏳ Wait for session restore before making any redirect decision
  if (isLoading) {
    return null; // or a spinner if you prefer
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== requiredRole) {
    return <Navigate to={getRoleDashboard(user.role)} replace />;
  }

  return <Outlet />;
}