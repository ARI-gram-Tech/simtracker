import { useMutation } from "@tanstack/react-query";
import { useAuth as useAuthContext } from "@/contexts/AuthContext";
import { authService } from "@/api/auth.service";

export function useAuth() {
  return useAuthContext();
}

export function useChangePassword() {
  return useMutation({
    mutationFn: authService.changePassword,
  });
}

export function useRegisterUser() {
  return useMutation({
    mutationFn: authService.register,
  });
}

export function useMe() {
  return useMutation({
    mutationFn: authService.me,
  });
}