// src/contexts/AuthContext.tsx
import {
  createContext, useContext, useState,
  useCallback, useEffect, ReactNode,
} from "react";
import { authService } from "@/api/auth.service";

// ── Types & helpers (formerly authUtils.ts) ──────────────────────────────────

export type UserRole =
  | "super_admin"
  | "dealer_owner"
  | "operations_manager"
  | "branch_manager"
  | "van_team_leader"
  | "brand_ambassador"
  | "finance";

const roleDashboards: Record<UserRole, string> = {
  super_admin:        "/super-admin/dashboard",
  dealer_owner:       "/owner/dashboard",
  operations_manager: "/operations/dashboard",
  branch_manager:     "/branch/dashboard",
  van_team_leader:    "/van/dashboard",
  brand_ambassador:   "/ba/dashboard",
  finance:            "/finance/dashboard",
};

export function getRoleDashboard(role: UserRole) {
  return roleDashboards[role];
}

// ── Auth context ──────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  dealer_id?: number | null;
  branch_id?: number | null;    
  van_team_id?: number | null;  
  dealerName?: string;
  branch?: string;
  van?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("simtrack_user");
    const token  = localStorage.getItem("access_token");

    if (stored && token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        if (payload.exp * 1000 > Date.now()) {
          setUser(JSON.parse(stored));
        } else {
          clearStorage();
        }
      } catch {
        clearStorage();
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await authService.login({ email, password });

      localStorage.setItem("access_token",  response.access);
      localStorage.setItem("refresh_token", response.refresh);

      const payload = authService.decodeToken(response.access);
      const authUser: AuthUser = {
        id:        payload.user_id,
        name:      payload.full_name,
        email:     payload.email,
        role:      payload.role as UserRole,
        dealer_id: payload.dealer_id ?? null,
        branch_id: payload.branch_id ?? null,
        van_team_id: payload.van_team_id ?? null,
      };

      localStorage.setItem("simtrack_user", JSON.stringify(authUser));
      setUser(authUser);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } }; message?: string };
      throw new Error(err?.response?.data?.detail ?? err?.message ?? "Login failed");
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      const refresh = localStorage.getItem("refresh_token");
      if (refresh) await authService.logout(refresh);
    } catch {
      // blacklist call failed — still clear locally
    } finally {
      clearStorage();
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function clearStorage() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("simtrack_user");
}