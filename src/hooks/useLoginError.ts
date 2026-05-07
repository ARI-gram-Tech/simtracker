// src/hooks/useLoginError.ts
import { useState, useCallback } from 'react';
import { errorMessages, showError } from '@/lib/toast';

interface LoginErrorState {
  message: string;
  field?: 'email' | 'password' | 'general';
}

export function useLoginError() {
  const [error, setError] = useState<LoginErrorState | null>(null);

  const handleLoginError = useCallback((err: unknown) => {
    const axiosErr = err as { 
      response?: { 
        status?: number;
        data?: { 
          detail?: string;
          email?: string[];
          password?: string[];
          non_field_errors?: string[];
        } 
      };
      message?: string;
    };

    // Network errors
    if (!axiosErr.response) {
      setError({ message: errorMessages.LOGIN_NETWORK_ERROR, field: 'general' });
      showError(errorMessages.LOGIN_NETWORK_ERROR);
      return;
    }

    const status = axiosErr.response.status;
    const data = axiosErr.response.data;

    // Handle specific HTTP status codes
    switch (status) {
      case 400:
        if (data?.email) {
          setError({ message: data.email[0], field: 'email' });
          showError(data.email[0]);
        } else if (data?.password) {
          setError({ message: data.password[0], field: 'password' });
          showError(data.password[0]);
        } else if (data?.non_field_errors) {
          setError({ message: data.non_field_errors[0], field: 'general' });
          showError(data.non_field_errors[0]);
        } else {
          setError({ message: errorMessages.LOGIN_FAILED, field: 'general' });
          showError(errorMessages.LOGIN_FAILED);
        }
        break;
      
      case 401:
        setError({ message: errorMessages.LOGIN_FAILED, field: 'general' });
        showError(errorMessages.LOGIN_FAILED);
        break;
      
      case 403:
        setError({ message: errorMessages.ACCOUNT_INACTIVE, field: 'general' });
        showError(errorMessages.ACCOUNT_INACTIVE);
        break;
      
      case 429:
        setError({ message: errorMessages.ACCOUNT_LOCKED, field: 'general' });
        showError(errorMessages.ACCOUNT_LOCKED);
        break;
      
      case 500:
      case 502:
      case 503:
        setError({ message: errorMessages.LOGIN_SERVER_ERROR, field: 'general' });
        showError(errorMessages.LOGIN_SERVER_ERROR);
        break;
      
      default:
        setError({ message: data?.detail || errorMessages.LOGIN_FAILED, field: 'general' });
        showError(data?.detail || errorMessages.LOGIN_FAILED);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return { error, handleLoginError, clearError };
}