import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { useNavigate } from "react-router-dom";

export type UserRole = "dealer_owner" | "operations_manager" | "brand_ambassador" | "finance";

export interface AuthUser {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  dealerName: string;
  branch?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (phone: string, password: string, role?: UserRole) => void;
  logout: () => void;
}

const roleDashboards: Record<UserRole, string> = {
  dealer_owner: "/owner/dashboard",
  operations_manager: "/operations/dashboard",
  brand_ambassador: "/ba/dashboard",
  finance: "/finance/dashboard",
};

const mockUsers: Record<UserRole, AuthUser> = {
  dealer_owner: { id: "u1", name: "James Ochieng", phone: "0712000001", role: "dealer_owner", dealerName: "Enlight Communications Ltd" },
  operations_manager: { id: "u2", name: "Alice Muthoni", phone: "0712000002", role: "operations_manager", dealerName: "Enlight Communications Ltd" },
  brand_ambassador: { id: "u3", name: "John Kamau", phone: "0712345678", role: "brand_ambassador", dealerName: "Enlight Communications Ltd", branch: "Embakasi" },
  finance: { id: "u4", name: "Grace Wambui", phone: "0712000004", role: "finance", dealerName: "Enlight Communications Ltd" },
};

const AuthContext = createContext<AuthContextType | null>(null);

export function getRoleDashboard(role: UserRole) {
  return roleDashboards[role];
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = sessionStorage.getItem("simtrack_user");
    return stored ? JSON.parse(stored) : null;
  });

  const login = useCallback((phone: string, _password: string, role?: UserRole) => {
    const selectedRole = role || "dealer_owner";
    const mockUser = mockUsers[selectedRole];
    sessionStorage.setItem("simtrack_user", JSON.stringify(mockUser));
    setUser(mockUser);
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem("simtrack_user");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
