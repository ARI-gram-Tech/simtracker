import api from "@/lib/api";
import { ENDPOINTS } from "@/constants/endpoints";
import type {
  LoginRequest, LoginResponse,
  ChangePasswordRequest, RegisterRequest, UserProfile,
  PasswordResetRequest, PasswordResetConfirmRequest, MessageResponse,  // ← new
} from "@/types/auth.types";

export type TokenPayload = {
  user_id: string;
  email: string;
  role: string;
  full_name: string;
  dealer_id?: number | null;
  branch_id?: number | null;    
  van_team_id?: number | null;  
  exp: number;
};

export const authService = {
  login: (data: LoginRequest) =>
    api.post<LoginResponse>(ENDPOINTS.LOGIN, data).then(r => r.data),

  logout: (refresh: string) =>
    api.post(ENDPOINTS.LOGOUT, { refresh }),

  me: () =>
    api.get<UserProfile>(ENDPOINTS.ME).then(r => r.data),

  changePassword: (data: ChangePasswordRequest) =>
    api.post(ENDPOINTS.CHANGE_PASSWORD, data),

  register: (data: RegisterRequest) =>
    api.post<UserProfile>(ENDPOINTS.REGISTER, data).then(r => r.data),

  // ── Forgot / Reset Password ──────────────────────────────────────────────

  requestPasswordReset: (data: PasswordResetRequest) =>
    api
      .post<MessageResponse>(ENDPOINTS.PASSWORD_RESET, data)
      .then(r => r.data),

  confirmPasswordReset: (data: PasswordResetConfirmRequest) =>
    api
      .post<MessageResponse>(ENDPOINTS.PASSWORD_RESET_CONFIRM, data)
      .then(r => r.data),

  // ── Helpers ──────────────────────────────────────────────────────────────

  decodeToken: (token: string): TokenPayload => {
    return JSON.parse(atob(token.split(".")[1])) as TokenPayload;
  },
};