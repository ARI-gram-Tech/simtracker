from django.urls import path
from .views import (
    InvoiceListCreateView,
    InvoiceDetailView,
    MarkInvoicePaidView,
    CancelInvoiceView,
    ChangeDealerPlanView,
    PlanSettingsView,
    TriggerBillingView,
)

urlpatterns = [
    path("",
         InvoiceListCreateView.as_view(), name="invoice_list"),
    path("<int:pk>/",
         InvoiceDetailView.as_view(),     name="invoice_detail"),
    path("<int:pk>/mark-paid/",
         MarkInvoicePaidView.as_view(),   name="invoice_mark_paid"),
    path("<int:pk>/cancel/",
         CancelInvoiceView.as_view(),     name="invoice_cancel"),
    path("dealers/<int:dealer_id>/change-plan/",
         ChangeDealerPlanView.as_view(),  name="change_plan"),
    path("plan-settings/",
         PlanSettingsView.as_view(),      name="plan_settings"),
    path("trigger-billing/",
         TriggerBillingView.as_view(),    name="trigger_billing"),
]
