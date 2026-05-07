// src/api/invoice.ts
import api from "@/lib/api";
import { ENDPOINTS } from "@/constants/endpoints";
import type { PaginatedResponse } from "@/types/dealers.types";
import type { Invoice, CreateInvoiceRequest, InvoiceFilters } from "@/types/invoice.types";

export const invoiceService = {

  list: (filters?: InvoiceFilters) =>
    api.get<PaginatedResponse<Invoice>>(ENDPOINTS.INVOICES, { params: filters })
       .then(r => r.data),

  get: (id: number) =>
    api.get<Invoice>(ENDPOINTS.INVOICE(id))
       .then(r => r.data),

  create: (data: CreateInvoiceRequest) =>
    api.post<Invoice>(ENDPOINTS.INVOICES, data)
       .then(r => r.data),

  update: (id: number, data: Partial<CreateInvoiceRequest>) =>
    api.patch<Invoice>(ENDPOINTS.INVOICE(id), data)
       .then(r => r.data),

  markPaid: (id: number, notes?: string) =>
    api.post<Invoice>(ENDPOINTS.INVOICE_MARK_PAID(id), { notes: notes ?? "" })
       .then(r => r.data),

  cancel: (id: number) =>
    api.post<Invoice>(ENDPOINTS.INVOICE_CANCEL(id), {})
       .then(r => r.data),
};