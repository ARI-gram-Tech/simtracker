# inventory/urls.py  — full updated file
from django.urls import path
from .views import (
    SIMBatchListCreateView,
    SIMBatchDetailView,
    SIMListView,
    SIMDetailView,
    SIMMovementListView,
    BulkIssueView,
    BulkReturnView,
    SIMMovementBulkListView,
    BulkRegisterView,
    SIMTraceView,
    BulkDeleteSIMsView,          # ← new
)

urlpatterns = [
    # ── Specific action paths first ──────────────────────────────────────────
    path("batches/",
         SIMBatchListCreateView.as_view(), name="batch_list"),
    path("batches/<int:pk>/",
         SIMBatchDetailView.as_view(),     name="batch_detail"),
    path("actions/bulk-issue/",
         BulkIssueView.as_view(),          name="bulk_issue"),
    path("actions/bulk-return/",
         BulkReturnView.as_view(),         name="bulk_return"),
    path("actions/bulk-register/",
         BulkRegisterView.as_view(),       name="bulk_register"),
    path("actions/bulk-delete/",           # ← new
         BulkDeleteSIMsView.as_view(),     name="bulk_delete"),
    path("movements/",
         SIMMovementBulkListView.as_view(), name="movement_list"),

    # ── List view ────────────────────────────────────────────────────────────
    path("",
         SIMListView.as_view(),            name="sim_list"),

    # ── Per-SIM paths — trace MUST come before the catch-all detail view ────
    path("<str:serial_number>/trace/",
         SIMTraceView.as_view(),           name="sim_trace"),
    path("<str:serial_number>/movements/",
         SIMMovementListView.as_view(),    name="sim_movements"),
    path("<str:serial_number>/",
         SIMDetailView.as_view(),          name="sim_detail"),
]
