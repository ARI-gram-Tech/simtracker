// src/hooks/usePasswordReset.ts
import { useMutation } from "@tanstack/react-query";
import { authService } from "@/api/auth.service";
import type {
  PasswordResetRequest,
  PasswordResetConfirmRequest,
} from "@/types/auth.types";

/** Step 1 — request the email */
export function useRequestPasswordReset() {
  return useMutation({
    mutationFn: (data: PasswordResetRequest) =>
      authService.requestPasswordReset(data),
  });
}

/** Step 2 — submit uid + token + new password */
export function useConfirmPasswordReset() {
  return useMutation({
    mutationFn: (data: PasswordResetConfirmRequest) =>
      authService.confirmPasswordReset(data),
  });
}