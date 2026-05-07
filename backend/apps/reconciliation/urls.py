from django.urls import path
from .views import (
    FraudSummaryView,
    SafaricomReportListCreateView,
    SafaricomReportDetailView,
    ProcessReportView,
    ResetReportView,
    ReconciliationRecordListView,
    MyReconciliationHistoryView,
    RaiseComplaintView,
)

urlpatterns = [
    path("",                       SafaricomReportListCreateView.as_view(),
         name="report_list"),
    path("<int:pk>/",              SafaricomReportDetailView.as_view(),
         name="report_detail"),
    path("<int:pk>/process/",      ProcessReportView.as_view(),
         name="report_process"),
    path("<int:pk>/reset/",        ResetReportView.as_view(),
         name="reset_report"),
    path("<int:pk>/records/",      ReconciliationRecordListView.as_view(),
         name="report_records"),
    path("fraud-summary/",         FraudSummaryView.as_view(),
         name="fraud_summary"),
    path("my-history/",            MyReconciliationHistoryView.as_view(),
         name="my_recon_history"),
    path("raise-complaint/", RaiseComplaintView.as_view(), name="raise_complaint"),
]
