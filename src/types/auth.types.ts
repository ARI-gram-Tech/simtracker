// src/types/auth.types.ts
export type UserRole =
  | "super_admin"
  | "dealer_owner"
  | "operations_manager"
  | "branch_manager"
  | "van_team_leader"
  | "brand_ambassador"
  | "external_agent"   
  | "finance";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  dealer_id?: number | null; 
  dealerName?: string;
  branch?: string;
  van?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
}

export interface JWTPayload {
  user_id: string;
  email: string;
  role: UserRole;
  full_name: string;
  exp: number;
}

export interface ChangePasswordRequest {
  old_password: string;
  new_password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: UserRole;
}

export interface UserProfile {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: UserRole;
  is_active: boolean;
  date_joined: string;
  dealer_id?:     number | null;
  branch_id?:     number | null;
  branch_name?:   string | null;
  van_team_id?:   number | null;
  van_team_name?: string | null;
}


export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirmRequest {
  uid: string;
  token: string;
  new_password: string;
}

export interface MessageResponse {
  detail: string;
}