// src/lib/toast.ts
import { toast } from "sonner";

// Predefined error messages
export const errorMessages = {
    // Auth errors
  LOGIN_FAILED: "Invalid email or password. Please try again.",
  LOGIN_NETWORK_ERROR: "Network error. Please check your internet connection.",
  LOGIN_SERVER_ERROR: "Server error. Please try again later.",
  ACCOUNT_INACTIVE: "Your account is inactive. Please contact support.",
  ACCOUNT_LOCKED: "Your account has been locked due to too many failed attempts.",
  SESSION_EXPIRED: "Your session has expired. Please login again.",
  UNAUTHORIZED_ACCESS: "You don't have permission to access this resource.",
   
  // Invoice errors
  CREATE_INVOICE_FAILED: "Failed to generate invoice. Please try again.",
  MARK_PAID_FAILED: "Failed to mark invoice as paid. Please try again.",
  CANCEL_INVOICE_FAILED: "Failed to cancel invoice. Please try again.",
  FETCH_INVOICES_FAILED: "Failed to load invoices. Please refresh the page.",

  // Dealers
  CREATE_DEALER_FAILED: "Failed to create dealer. Please check the owner ID and try again.",
  UPDATE_DEALER_FAILED: "Failed to update dealer information.",
  DELETE_DEALER_FAILED: "Failed to delete dealer. Please try again.",
  SUSPEND_DEALER_FAILED: "Failed to suspend dealer. Please try again.",
  ACTIVATE_DEALER_FAILED: "Failed to activate dealer. Please try again.",
  FETCH_DEALERS_FAILED: "Failed to load dealers. Please refresh the page.",
  
  // Branches
  CREATE_BRANCH_FAILED: "Failed to create branch. Please check the information and try again.",
  UPDATE_BRANCH_FAILED: "Failed to update branch information.",
  DELETE_BRANCH_FAILED: "Failed to delete branch.",
  
  // Van Teams
  CREATE_TEAM_FAILED: "Failed to create van team. Please try again.",
  ADD_MEMBER_FAILED: "Failed to add member to team. Please try again.",
  REMOVE_MEMBER_FAILED: "Failed to remove member from team.",
  
  // MobiGo errors
  CREATE_MOBIGO_FAILED:     "Failed to add MobiGo device. Please try again.",
  UPDATE_MOBIGO_FAILED:     "Failed to update MobiGo device.",
  DELETE_MOBIGO_FAILED:     "Failed to delete MobiGo device.",
  MOBIGO_BA_CONFLICT:       "This Brand Ambassador already has a MobiGo assigned.",
  MOBIGO_IMIS_DUPLICATE:    "This IMEI / iMIS is already registered.",
  MOBIGO_SIM_DUPLICATE:     "This SIM Serial Number is already in use.",

  // Network/Generic
  NETWORK_ERROR: "Network error. Please check your internet connection.",
  UNAUTHORIZED: "You are not authorized to perform this action.",
  SERVER_ERROR: "Server error. Please try again later.",
  UNKNOWN_ERROR: "An unexpected error occurred. Please try again.",
};

// Predefined success messages
export const successMessages = {
  // Auth success
  LOGOUT_SUCCESS: "Logged out successfully.",
  PASSWORD_CHANGED: "Password changed successfully.",

  // Dealers
  CREATE_DEALER_SUCCESS: "Dealer created successfully!",
  UPDATE_DEALER_SUCCESS: "Dealer updated successfully!",
  DELETE_DEALER_SUCCESS: "Dealer deleted successfully!",
  SUSPEND_DEALER_SUCCESS: "Dealer suspended successfully.",
  ACTIVATE_DEALER_SUCCESS: "Dealer activated successfully.",
  
  // Invoices
  CREATE_INVOICE_SUCCESS: "Invoice generated successfully!",
  MARK_PAID_SUCCESS: "Invoice marked as paid.",
  CANCEL_INVOICE_SUCCESS: "Invoice cancelled.",
  
  // Branches
  CREATE_BRANCH_SUCCESS: "Branch created successfully!",
  UPDATE_BRANCH_SUCCESS: "Branch updated successfully!",
  DELETE_BRANCH_SUCCESS: "Branch deleted successfully!",
  
  // Van Teams
  CREATE_TEAM_SUCCESS: "Van team created successfully!",
  ADD_MEMBER_SUCCESS: "Member added to team successfully!",
  REMOVE_MEMBER_SUCCESS: "Member removed from team successfully!",

  // MobiGo success
  CREATE_MOBIGO_SUCCESS:    "MobiGo device added successfully!",
  UPDATE_MOBIGO_SUCCESS:    "MobiGo device updated successfully!",
  DELETE_MOBIGO_SUCCESS:    "MobiGo device deleted.",
  ACTIVATE_MOBIGO_SUCCESS:  "MobiGo device activated.",
  DEACTIVATE_MOBIGO_SUCCESS:"MobiGo device deactivated.",
};

// Helper functions
export const showError = (message: string) => {
  toast.error(message);
};

export const showSuccess = (message: string) => {
  toast.success(message);
};

export const showInfo = (message: string) => {
  toast.info(message);
};

export const showWarning = (message: string) => {
  toast.warning(message);
};