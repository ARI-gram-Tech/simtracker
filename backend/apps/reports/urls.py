# apps/reports/urls.py
from django.urls import path
from .views import (
    DailyPerformanceListView,
    DailyPerformanceDetailView,
    WeeklySummaryView,
    AgentPerformanceSummaryView,
    LivePerformanceSummaryView,
    DailySnapshotByDateView,
    AgentPerformanceView,
)

urlpatterns = [
    path("daily/",          DailyPerformanceListView.as_view(),
         name="daily_performance"),
    path("daily/<int:pk>/", DailyPerformanceDetailView.as_view(),
         name="daily_performance_detail"),
    path("weekly-summary/", WeeklySummaryView.as_view(),
         name="weekly_summary"),
    path("agent-summary/",  AgentPerformanceSummaryView.as_view(),
         name="agent_summary"),
    path("live-summary/",   LivePerformanceSummaryView.as_view(),
         name="live_summary"),
    path("daily-by-date/", DailySnapshotByDateView.as_view(),
         name="daily_by_date"),
    path("agent-performance/", AgentPerformanceView.as_view(),
         name="agent_performance_live"),
]
