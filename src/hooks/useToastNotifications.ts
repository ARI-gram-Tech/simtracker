// src/hooks/useToastNotifications.ts
import { useEffect } from 'react';
import { showError, showSuccess } from '@/lib/toast';

interface MutationState {
  isError: boolean;
  error: Error | null;
  isSuccess: boolean;
  isPending: boolean;
}

export function useToastNotifications(
  mutation: MutationState,
  options: {
    loadingMessage?: string;
    successMessage?: string;
    errorMessage?: string;
    onSuccess?: () => void;
  }
) {
  // Show loading toast when pending (optional)
  useEffect(() => {
    if (mutation.isPending && options.loadingMessage) {
      // You can implement loading toast if needed
      console.log(options.loadingMessage);
    }
  }, [mutation.isPending, options.loadingMessage]); // ✅ Added dependency

  // Show success toast
  useEffect(() => {
    if (mutation.isSuccess && options.successMessage) {
      showSuccess(options.successMessage);
      options.onSuccess?.();
    }
  }, [mutation.isSuccess, options.successMessage, options.onSuccess]); // ✅ Added dependencies

  // Show error toast
  useEffect(() => {
    if (mutation.isError && options.errorMessage) {
      showError(options.errorMessage);
    }
  }, [mutation.isError, options.errorMessage]); // ✅ Added dependency
}