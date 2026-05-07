// src/types/dealers.types.ts

export interface Dealer {
  id:         number;
  name:       string;
  owner:      number;
  owner_details?: {
    id:        number;
    full_name: string;
    email:     string;
  };
  phone:    string;
  email:    string;
  address:  string;
  is_active: boolean;
  created_at: string;

  // ── Subscription ────────────────────────────────────────────────────────
  subscription_plan:   "trial" | "basic" | "pro" | "enterprise";
  subscription_status: "active" | "trial" | "overdue" | "suspended";
  billing_cycle:       "monthly" | "yearly";

  subscription_started_at: string | null;
  trial_ends_at:           string | null;
  next_billing_date:       string | null;   // date string YYYY-MM-DD

  // Set when a downgrade is pending — null means no pending change
  pending_plan_change:    "trial" | "basic" | "pro" | "enterprise" | null;
  pending_plan_change_at: string | null;
}

export interface Branch {
  id:      number;
  dealer:  number;
  name:    string;
  manager: number | null;
  manager_details?: {
    id:        number;
    full_name: string;
  };
  phone:     string;
  address:   string;
  is_active: boolean;
  is_warehouse: boolean;
  created_at: string;
}

export interface VanTeam {
  id:     number;
  branch: number;
  name:   string;
  leader: number | null;
  leader_details?: {
    id:        number;
    full_name: string;
  };
  members:   VanTeamMember[];
  is_active:  boolean;
  created_at: string;
}

export interface VanTeamMember {
  id:     number;
  team:   number;
  agent:  number;
  agent_details?: {
    id:         number;
    full_name:  string;
    phone?:     string;
    email?:     string;
  };
  joined_at: string;
}

 
export type MobiGoDeviceType = "mobigo" | "enrolled_phone";
 
export interface MobiGo {
  id:                number;
  dealer:            number;
  imis:              string;              
  mobigo_sim_number: string;             
  sim_serial_number: string;             
  ba_msisdn:         string;             
  agent_msisdn:      string;             
  device_type:       MobiGoDeviceType;
  assigned_ba:       number | null;     
  assigned_ba_details?: {
    id:        number;
    full_name: string;
    phone:     string;
  };
  is_active:   boolean;
  notes:       string;
  created_at:  string;
}
 
export interface CreateMobiGoRequest {
  imis:              string;
  mobigo_sim_number: string;
  sim_serial_number: string;
  ba_msisdn:         string;
  agent_msisdn:      string;
  device_type:       MobiGoDeviceType;
  assigned_ba?:      number | null;
  notes?:            string;
}

export interface PaginatedResponse<T> {
  count:    number;
  next:     string | null;
  previous: string | null;
  results:  T[];
}

// ── Request types ───────────────────────────────────────────────────────────

export interface CreateDealerRequest {
  name:    string;
  owner:   number;
  phone:   string;
  email:   string;
  address?: string;
  subscription_plan?:   Dealer["subscription_plan"];
  subscription_status?: Dealer["subscription_status"];
  billing_cycle?:       Dealer["billing_cycle"];
}

export interface CreateBranchRequest {
  name:     string;
  manager?: number | null;
  phone?:   string;
  address?: string;
}

export interface CreateVanTeamRequest {
  name:    string;
  branch?: number;
  leader?: number | null;
}

export interface AddVanTeamMemberRequest {
  agent: number;
}

export type BusinessType =
  | "shop"
  | "kiosk"
  | "supermarket"
  | "pharmacy"
  | "hardware"
  | "other";

export interface ExternalAgent {
  id: number;
  user: number;
  user_details?: {
    id: number;
    full_name: string;
    email: string;
    phone: string;
  };
  dealer: number;
  shop_name: string;
  location: string;
  id_number: string;
  business_type: BusinessType;
  business_type_other: string;
  commission_eligible: boolean;
  notes: string;
  created_at: string;
}

export interface CreateExternalAgentRequest {
  user: number;          
  shop_name: string;
  location?: string;
  id_number?: string;
  business_type: BusinessType;
  business_type_other?: string;
  commission_eligible?: boolean;
  notes?: string;
}