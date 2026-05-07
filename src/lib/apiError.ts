// src/lib/apiError.ts

interface ApiErrorResponse {
  detail?: string;
  token?: string;
  uid?: string;
  [key: string]: string | undefined;
}

interface ApiError {
  response?: {
    data?: ApiErrorResponse;
  };
  message?: string;
}

export function getApiError(
  error: unknown,
  fields: (keyof ApiErrorResponse)[] = ["detail"],
): string {
  const err = error as ApiError;
  for (const field of fields) {
    const val = err?.response?.data?.[field];
    if (val) return val;
  }
  return err?.message ?? "";
}