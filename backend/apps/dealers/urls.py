from django.urls import path
from .views import (
    DealerActivateView,
    DealerListCreateView,
    DealerDetailView,
    BranchListCreateView,
    BranchDetailView,
    BranchActivateView,
    BranchDeactivateView,
    DealerSuspendView,
    DealerUsageView,
    VanTeamListCreateView,
    VanTeamDetailView,
    VanTeamMemberListCreateView,
    VanTeamMemberDetailView,
    VanTeamActivateView,
    VanTeamDeactivateView,
    # ── MobiGo ────────────────────────────────────────────────────────────
    MobiGoListCreateView,
    MobiGoDetailView,
    MobiGoActivateView,
    MobiGoDeactivateView,
)

urlpatterns = [
    path("",
         DealerListCreateView.as_view(),        name="dealer_list"),
    path("<int:pk>/",
         DealerDetailView.as_view(),            name="dealer_detail"),
    path("<int:pk>/suspend/",
         DealerSuspendView.as_view(),           name="dealer_suspend"),
    path("<int:pk>/activate/",
         DealerActivateView.as_view(),          name="dealer_activate"),

    # ── Usage endpoint ─────────────────────────────────────────────────────
    path("<int:pk>/usage/",
         DealerUsageView.as_view(),             name="dealer_usage"),

    # ── Branches ───────────────────────────────────────────────────────────
    path("<int:dealer_pk>/branches/",
         BranchListCreateView.as_view(),        name="branch_list"),
    path("<int:dealer_pk>/branches/<int:pk>/",
         BranchDetailView.as_view(),            name="branch_detail"),
    path("<int:dealer_pk>/branches/<int:pk>/deactivate/",
         BranchDeactivateView.as_view(),        name="branch_deactivate"),
    path("<int:dealer_pk>/branches/<int:pk>/activate/",
         BranchActivateView.as_view(),          name="branch_activate"),

    # ── Van Teams ──────────────────────────────────────────────────────────
    path("<int:dealer_pk>/branches/<int:branch_pk>/teams/",
         VanTeamListCreateView.as_view(),       name="vanteam_list"),
    path("<int:dealer_pk>/branches/<int:branch_pk>/teams/<int:pk>/",
         VanTeamDetailView.as_view(),           name="vanteam_detail"),
    path("<int:dealer_pk>/branches/<int:branch_pk>/teams/<int:pk>/deactivate/",
         VanTeamDeactivateView.as_view(),       name="vanteam_deactivate"),
    path("<int:dealer_pk>/branches/<int:branch_pk>/teams/<int:pk>/activate/",
         VanTeamActivateView.as_view(),         name="vanteam_activate"),

    # ── Van Team Members ───────────────────────────────────────────────────
    path("<int:dealer_pk>/branches/<int:branch_pk>/teams/<int:team_pk>/members/",
         VanTeamMemberListCreateView.as_view(), name="vanteammember_list"),
    path("<int:dealer_pk>/branches/<int:branch_pk>/teams/<int:team_pk>/members/<int:pk>/",
         VanTeamMemberDetailView.as_view(),     name="vanteammember_detail"),

    # ── MobiGo Devices ─────────────────────────────────────────────────────
    path("<int:dealer_pk>/mobigo/",
         MobiGoListCreateView.as_view(),        name="mobigo_list"),
    path("<int:dealer_pk>/mobigo/<int:pk>/",
         MobiGoDetailView.as_view(),            name="mobigo_detail"),
    path("<int:dealer_pk>/mobigo/<int:pk>/deactivate/",
         MobiGoDeactivateView.as_view(),        name="mobigo_deactivate"),
    path("<int:dealer_pk>/mobigo/<int:pk>/activate/",
         MobiGoActivateView.as_view(),          name="mobigo_activate"),
]
