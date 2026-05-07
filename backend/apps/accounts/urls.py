from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    LoginView,
    LogoutView,
    RegisterView,
    MeView,
    ChangePasswordView,
    UserDetailView,
    UserListView,
    PasswordResetRequestView,
    PasswordResetConfirmView,
    ExternalAgentListCreateView,
    ExternalAgentDetailView,
)

urlpatterns = [
    path("login/",           LoginView.as_view(),          name="login"),
    path("logout/",          LogoutView.as_view(),          name="logout"),
    path("token/refresh/",   TokenRefreshView.as_view(),    name="token_refresh"),
    path("register/",        RegisterView.as_view(),        name="register"),
    path("me/",              MeView.as_view(),              name="me"),
    path("change-password/", ChangePasswordView.as_view(),  name="change_password"),
    path("users/",           UserListView.as_view(),        name="user_list"),
    path("password-reset/",
         PasswordResetRequestView.as_view(), name="password_reset"),
    path("password-reset/confirm/",
         PasswordResetConfirmView.as_view(), name="password_reset_confirm"),
    path("users/<int:pk>/",
         UserDetailView.as_view(), name="user_detail"),
    path("<int:dealer_pk>/external-agents/",
         ExternalAgentListCreateView.as_view(), name="external-agent-list",
         ),
    path("<int:dealer_pk>/external-agents/<int:pk>/",
         ExternalAgentDetailView.as_view(), name="external-agent-detail",
         ),
]
