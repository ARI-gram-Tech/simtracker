// src/hooks/useInvoices.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { invoiceService } from "@/api/invoice";
import type { CreateInvoiceRequest, InvoiceFilters } from "@/types/invoice.types";

export function useInvoices(filters?: InvoiceFilters) {
  const qc  = useQueryClient();
  const key = ["invoices", filters ?? {}];

  const query = useQuery({
    queryKey: key,
    queryFn:  () => invoiceService.list(filters),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateInvoiceRequest) => invoiceService.create(data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["invoices"] }),
  });

  const markPaidMutation = useMutation({
    mutationFn: ({ id, notes }: { id: number; notes?: string }) =>
      invoiceService.markPaid(id, notes),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoices"] }),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) => invoiceService.cancel(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["invoices"] }),
  });

  const error =
    (query.error as Error)?.message            ||
    (createMutation.error as Error)?.message   ||
    (markPaidMutation.error as Error)?.message ||
    (cancelMutation.error as Error)?.message   ||
    null;

  return {
    invoices: query.data?.results ?? [],
    count:    query.data?.count   ?? 0,
    loading:  query.isLoading,
    error,
    create:   createMutation.mutateAsync,
    markPaid: (id: number, notes?: string) => markPaidMutation.mutateAsync({ id, notes }),
    cancel:   cancelMutation.mutateAsync,
  };
}