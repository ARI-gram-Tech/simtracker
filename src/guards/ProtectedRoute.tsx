import { Navigate, Outlet } from "react-router-dom";
import { useAuth, UserRole, getRoleDashboard } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  requiredRole: UserRole;
}

export function ProtectedRoute({ requiredRole }: ProtectedRouteProps) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== requiredRole) {
    return <Navigate to={getRoleDashboard(user.role)} replace />;
  }

  return <Outlet />;
}
