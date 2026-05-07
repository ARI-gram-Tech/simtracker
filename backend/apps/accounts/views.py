# apps/accounts/views.py (UPGRADED)
# ─────────────────────────────────────────────────────────────────────────────
# RegisterView now:
#   1. Enforces the dealer's max_users plan limit.
#   2. Sends a welcome email with login credentials after user creation.
# ─────────────────────────────────────────────────────────────────────────────

from functools import wraps

from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import PermissionDenied
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.tokens import default_token_generator
from django.shortcuts import get_object_or_404
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from .serializers import PasswordResetRequestSerializer, PasswordResetConfirmSerializer, ExternalAgentSerializer


from .models import User, ExternalAgent
from .serializers import (
    CustomTokenObtainPairSerializer,
    UserSerializer,
    RegisterSerializer,
    ChangePasswordSerializer,
)
from services.plan_service import require_active_subscription, enforce_limit, require_feature
from apps.dealers.models import Dealer, Branch, VanTeam, VanTeamMember
from apps.invoices.serializers import InvoiceSerializer

import logging

from django.db import models

logger = logging.getLogger(__name__)


# ─── Feature Gate Decorator ───────────────────────────────────────────────────

def feature_required(feature_name: str):
    """
    Class-based view decorator that gates a view behind a plan feature.

    Usage:
        @feature_required("analytics_dashboard")
        class AnalyticsDashboardView(APIView):
            ...

    Resolves dealer from:
        1. request.user.dealer (owner)
        2. branch manager → dealer
        3. team leader / member → dealer
    """
    def decorator(view_class):
        original_dispatch = view_class.dispatch

        @wraps(original_dispatch)
        def patched_dispatch(self, request, *args, **kwargs):
            dealer = _resolve_dealer(request.user)
            if dealer is None:
                if not request.user.is_staff:
                    raise PermissionDenied(
                        {"error": "Could not resolve dealer for this user."})
            else:
                require_feature(dealer, feature_name)
            return original_dispatch(self, request, *args, **kwargs)

        view_class.dispatch = patched_dispatch
        return view_class

    return decorator


def _resolve_dealer(user) -> Dealer | None:
    # For dealer_owner: use the OneToOne reverse
    try:
        return user.dealer  # still correct for dealer_owner
    except Dealer.DoesNotExist:
        pass
    # For everyone else: check the FK field directly
    if user.dealer_org_id:                         # ← add this
        return user.dealer_org
    branch = Branch.objects.filter(manager=user).first()
    if branch:
        return branch.dealer
    team = VanTeam.objects.filter(leader=user).first()
    if team:
        return team.branch.dealer
    member = VanTeamMember.objects.filter(agent=user).first()
    if member:
        return member.team.branch.dealer
    return None

# ─── Auth Views ───────────────────────────────────────────────────────────────


class LoginView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            token = RefreshToken(request.data["refresh"])
            token.blacklist()
            return Response({"detail": "Logged out successfully."})
        except Exception:
            return Response(
                {"detail": "Invalid token."},
                status=status.HTTP_400_BAD_REQUEST,
            )


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user
        if not user.check_password(serializer.validated_data["old_password"]):
            return Response(
                {"detail": "Wrong password."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.set_password(serializer.validated_data["new_password"])
        user.save()
        return Response({"detail": "Password updated."})


class UserListView(generics.ListAPIView):
    serializer_class = UserSerializer
    # ← allow any logged-in user
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        # Django staff/superadmin sees everyone
        if user.is_staff:
            qs = User.objects.all()

        elif user.role == "dealer_owner":
            dealer = Dealer.objects.filter(owner=user).first()
            if not dealer:
                return User.objects.none()
            qs = User.objects.filter(
                models.Q(dealer_org=dealer) |
                models.Q(managed_branch__dealer=dealer) |
                models.Q(led_team__branch__dealer=dealer) |
                models.Q(team_memberships__team__branch__dealer=dealer) |
                models.Q(external_agent_profile__dealer=dealer) |   # ← new
                models.Q(id=dealer.owner_id)
            ).distinct()

        elif user.role == "operations_manager":
            dealer = _resolve_dealer(user)
            if not dealer:
                return User.objects.none()
            qs = User.objects.filter(
                models.Q(dealer_org=dealer) |
                models.Q(managed_branch__dealer=dealer) |
                models.Q(led_team__branch__dealer=dealer) |
                models.Q(team_memberships__team__branch__dealer=dealer) |
                models.Q(external_agent_profile__dealer=dealer)    # ← new
            ).distinct()

        # Branch manager sees users in their branch only
        elif user.role == "branch_manager":
            branch = Branch.objects.filter(manager=user).first()
            if not branch:
                return User.objects.none()
            qs = User.objects.filter(
                models.Q(led_team__branch=branch) |
                models.Q(team_memberships__team__branch=branch)
            ).distinct()

        # Van team leader sees members of their team only
        elif user.role == "van_team_leader":
            team = VanTeam.objects.filter(leader=user).first()
            if not team:
                return User.objects.none()
            qs = User.objects.filter(
                team_memberships__team=team
            ).distinct()

        else:
            return User.objects.none()

        # Optional filters from query params
        role = self.request.query_params.get("role")
        search = self.request.query_params.get("search")

        if role:
            qs = qs.filter(role=role)
        if search:
            qs = qs.filter(
                models.Q(first_name__icontains=search) |
                models.Q(last_name__icontains=search) |
                models.Q(email__icontains=search)
            )

        return qs.order_by("-date_joined")

# ─── Register View ────────────────────────────────────────────────────────────


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    # ← changed from IsAdminUser
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        # ── 0. Role check ─────────────────────────────────────────────────────
        allowed_roles = {
            "super_admin", "dealer_owner", "operations_manager",
            "branch_manager", "van_team_leader",
        }
        if not request.user.is_staff and request.user.role not in allowed_roles:
            return Response(
                {"error": "You do not have permission to create users."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # ── 1. Capture raw password before serializer hashes it ───────────────
        plain_password = request.data.get("password", "")

        dealer_id = request.data.get("dealer_id")
        overage_invoice = None

        # ── 2. Plan limit enforcement (if dealer_id provided) ─────────────────
        if dealer_id:
            try:
                dealer = Dealer.objects.get(id=dealer_id)
            except Dealer.DoesNotExist:
                return Response(
                    {"error": "Dealer not found.", "dealer_id": dealer_id},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            require_active_subscription(dealer)
            overage_invoice = enforce_limit(dealer, "users")

        # ── 3. Create the user ────────────────────────────────────────────────
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Link the new user to the dealer
        if dealer_id:
            user.dealer_org = dealer
            user.save(update_fields=["dealer_org"])

        # ── 3b. Auto-create ExternalAgent profile if role is external_agent ───
        if user.role == "external_agent" and dealer_id:
            ExternalAgent.objects.get_or_create(
                user=user,
                defaults={
                    "dealer":              dealer,
                    "shop_name":           request.data.get("shop_name", "").strip() or f"{user.full_name}'s Shop",
                    "location":            request.data.get("location", "").strip(),
                    "id_number":           request.data.get("id_number", "").strip(),
                    "business_type":       request.data.get("business_type", "shop"),
                    "business_type_other": request.data.get("business_type_other", "").strip(),
                    "commission_eligible": request.data.get("commission_eligible", False),
                    "notes":               request.data.get("notes", "").strip(),
                }
            )
        # ── 4. Send welcome email ─────────────────────────────────────────────
        try:
            from apps.notifications.service import send_welcome_email
            send_welcome_email(user, plain_password)
        except Exception as exc:
            logger.error(
                "Welcome email failed for user %s (%s): %s",
                user.email, user.id, exc,
            )

        # ── 5. Build response ─────────────────────────────────────────────────
        response_data = UserSerializer(user).data

        if overage_invoice:
            response_data = {
                **response_data,
                "overage_invoice": InvoiceSerializer(overage_invoice).data,
                "warning": (
                    "User limit exceeded for this dealer's plan. "
                    "An overage invoice has been generated."
                ),
            }

        return Response(response_data, status=status.HTTP_201_CREATED)


class PasswordResetRequestView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]

        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            # Explicit — fine for SimTrack since users don't self-register
            return Response(
                {"detail": "No account found with that email address."},
                status=status.HTTP_404_NOT_FOUND,
            )

        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)

        try:
            from apps.notifications.service import send_password_reset_email
            send_password_reset_email(user, uid, token)
        except Exception as exc:
            logger.error("Password reset email failed for %s: %s",
                         user.email, exc)

        return Response({"detail": "Password reset link sent. Please check your email."})


class PasswordResetConfirmView(APIView):
    """
    POST /api/accounts/password-reset/confirm/
    Body: { "uid": "...", "token": "...", "new_password": "..." }
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data["user"]
        user.set_password(serializer.validated_data["new_password"])
        user.save(update_fields=["password"])

        return Response({"detail": "Password has been reset successfully."})


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return User.objects.all()
        dealer = _resolve_dealer(user)
        if not dealer:
            return User.objects.none()
        return User.objects.filter(
            models.Q(dealer_org=dealer) |
            models.Q(managed_branch__dealer=dealer) |
            models.Q(led_team__branch__dealer=dealer) |
            models.Q(team_memberships__team__branch__dealer=dealer)
        ).distinct()

    def update(self, request, *args, **kwargs):
        new_role = request.data.get("role")
        if new_role in ("dealer_owner", "super_admin") and not request.user.is_staff:
            return Response({"error": "You cannot assign this role."}, status=status.HTTP_403_FORBIDDEN)

        # Get old role before update
        instance = self.get_object()
        old_role = instance.role

        response = super().update(request, *args, **kwargs)

        # ─── ADD THIS NOTIFICATION (if role changed) ───────────────────────────
        if new_role and old_role != new_role:
            from apps.notifications.models import Notification

            Notification.objects.create(
                recipient=instance,
                title="🔄 User Role Changed",
                message=(
                    f"Your account role has been changed.\n\n"
                    f"Old role: {old_role.replace('_', ' ').title()}\n"
                    f"New role: {new_role.replace('_', ' ').title()}\n"
                    f"Changed by: {request.user.full_name}\n\n"
                    f"Please log out and log back in for changes to take full effect. "
                    f"Your dashboard and permissions have been updated."
                ),
                type=Notification.Type.SYSTEM,
            )

            # Notify dealer owner (if different from the user)
            dealer = _resolve_dealer(instance)
            if dealer and dealer.owner and dealer.owner.id != instance.id:
                Notification.objects.create(
                    recipient=dealer.owner,
                    title="🔄 User Role Changed",
                    message=(
                        f"A user's role has been changed.\n\n"
                        f"User: {instance.full_name} ({instance.email})\n"
                        f"Old role: {old_role.replace('_', ' ').title()}\n"
                        f"New role: {new_role.replace('_', ' ').title()}\n"
                        f"Changed by: {request.user.full_name}"
                    ),
                    type=Notification.Type.SYSTEM,
                )
        # ───────────────────────────────────────────────────────────────────────

        return response


# ─── External Agents ──────────────────────────────────────────────────────────

class ExternalAgentListCreateView(generics.ListCreateAPIView):
    serializer_class = ExternalAgentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ExternalAgent.objects.filter(
            dealer_id=self.kwargs["dealer_pk"]
        ).select_related("user").order_by("-created_at")

    def create(self, request, *args, **kwargs):
        dealer = get_object_or_404(Dealer, pk=self.kwargs["dealer_pk"])
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(dealer=dealer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ExternalAgentDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ExternalAgentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ExternalAgent.objects.filter(
            dealer_id=self.kwargs["dealer_pk"]
        ).select_related("user")
