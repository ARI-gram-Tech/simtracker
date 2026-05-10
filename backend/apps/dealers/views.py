# apps/dealers/views.py (UPGRADED)
# ─────────────────────────────────────────────────────────────────────────────
# Plan enforcement is applied via service calls — views stay thin.
# Each creation endpoint: 1) resolves dealer, 2) checks active sub,
# 3) enforces limit, 4) creates resource.
# ─────────────────────────────────────────────────────────────────────────────

from rest_framework import generics, permissions, status
from rest_framework import permissions as drf_permissions
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone

from .models import Dealer, Branch, VanTeam, VanTeamMember, MobiGo
from .serializers import (
    DealerSerializer, BranchSerializer,
    VanTeamSerializer, VanTeamMemberSerializer, MobiGoSerializer
)
from services.plan_service import require_active_subscription, enforce_limit
from services.usage_service import get_usage_summary
from apps.invoices.serializers import InvoiceSerializer


# ─── Ownership Mixin ──────────────────────────────────────────────────────────
class DealerOwnershipMixin:
    def _resolve_user_dealer(self):
        user = self.request.user
        # Dealer owner — linked via OneToOne
        try:
            return user.dealer
        except Exception:
            pass
        # All other staff — linked via dealer_org FK
        if user.dealer_org_id:
            return user.dealer_org
        return None

    def get_dealer(self):
        dealer = get_object_or_404(Dealer, pk=self.kwargs["dealer_pk"])
        if self.request.user.is_staff:
            return dealer
        user_dealer = self._resolve_user_dealer()
        if not user_dealer or user_dealer.pk != dealer.pk:
            raise PermissionDenied(
                "You do not have access to this dealer's resources.")
        return dealer

    def check_dealer_ownership(self, dealer_pk):
        dealer = get_object_or_404(Dealer, pk=dealer_pk)
        if self.request.user.is_staff:
            return dealer
        user_dealer = self._resolve_user_dealer()
        if not user_dealer or user_dealer.pk != dealer.pk:
            raise PermissionDenied(
                "You do not have access to this dealer's resources.")
        return dealer

    def check_dealer_ownership_via_team(self, team_pk):
        dealer = get_object_or_404(
            Dealer, branches__van_teams__id=team_pk)
        if self.request.user.is_staff:
            return dealer
        user_dealer = self._resolve_user_dealer()
        if not user_dealer or user_dealer.pk != dealer.pk:
            raise PermissionDenied(
                "You do not have access to this dealer's resources.")
        return dealer


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _get_dealer_from_request(request) -> Dealer | None:
    """
    Resolve which dealer the request is operating on behalf of.
    Super admins pass ?dealer_id= or it's inferred from their dealer profile.
    Dealer staff always resolve to their own dealer.
    """
    dealer_id = request.query_params.get(
        "dealer_id") or request.data.get("dealer_id")
    if dealer_id:
        return Dealer.objects.filter(id=dealer_id).first()

    try:
        return request.user.dealer
    except Dealer.DoesNotExist:
        pass

    branch = Branch.objects.filter(manager=request.user).first()
    if branch:
        return branch.dealer

    team = VanTeam.objects.filter(leader=request.user).first()
    if team:
        return team.branch.dealer

    member = VanTeamMember.objects.filter(agent=request.user).first()
    if member:
        return member.team.branch.dealer

    return None


# ─── Dealer CRUD ──────────────────────────────────────────────────────────────

class DealerListCreateView(generics.ListCreateAPIView):
    serializer_class = DealerSerializer
    permission_classes = [permissions.IsAdminUser]
    queryset = Dealer.objects.all().order_by("-created_at")

    def perform_create(self, serializer):
        dealer = serializer.save()
        # Auto-set dealer_org on the owner so they can see their own users
        if dealer.owner:
            dealer.owner.dealer_org = dealer
            dealer.owner.save(update_fields=["dealer_org"])


class IsDealerOwnerOrAdmin(drf_permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.user.is_staff:
            return True
        if request.method in drf_permissions.SAFE_METHODS:
            # Check via OneToOne (dealer owner)
            if obj.owner == request.user:
                return True
            # Check via dealer_org FK (all other staff roles)
            if request.user.dealer_org_id == obj.pk:
                return True
            return False
        return False

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated


class DealerDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = DealerSerializer
    permission_classes = [IsDealerOwnerOrAdmin]
    queryset = Dealer.objects.all()

    def perform_update(self, serializer):
        dealer = serializer.save()
        # Keep dealer_org in sync when owner changes
        if dealer.owner and dealer.owner.dealer_org_id != dealer.pk:
            dealer.owner.dealer_org = dealer
            dealer.owner.save(update_fields=["dealer_org"])


class DealerSuspendView(generics.GenericAPIView):
    permission_classes = [permissions.IsAdminUser]
    queryset = Dealer.objects.all()

    def patch(self, request, pk):
        dealer = self.get_object()
        dealer.is_active = False
        dealer.subscription_status = "suspended"
        dealer.save()

        from apps.notifications.models import Notification
        if dealer.owner:
            Notification.objects.create(
                recipient=dealer.owner,
                title="🚫 Account Suspended",
                message=(
                    f"Your SimTrack dealer account has been SUSPENDED.\n\n"
                    f"Suspended by: {request.user.full_name}\n"
                    f"Date: {timezone.now().strftime('%Y-%m-%d %H:%M')}\n\n"
                    f"During suspension:\n"
                    f"• No new SIMs can be issued\n"
                    f"• Commission payouts are frozen\n"
                    f"• User access is restricted\n\n"
                    f"Please contact support to resolve this issue and restore access."
                ),
                type=Notification.Type.ALERT,
            )

        return Response(DealerSerializer(dealer).data, status=status.HTTP_200_OK)


class DealerActivateView(generics.GenericAPIView):
    permission_classes = [permissions.IsAdminUser]
    queryset = Dealer.objects.all()

    def patch(self, request, pk):
        dealer = self.get_object()
        dealer.is_active = True
        dealer.subscription_status = "active"
        dealer.save()

        from apps.notifications.models import Notification
        if dealer.owner:
            Notification.objects.create(
                recipient=dealer.owner,
                title="✅ Account Activated",
                message=(
                    f"Your SimTrack dealer account has been REACTIVATED.\n\n"
                    f"Activated by: {request.user.full_name}\n"
                    f"Date: {timezone.now().strftime('%Y-%m-%d %H:%M')}\n\n"
                    f"Full access has been restored. You can now:\n"
                    f"• Issue and manage SIMs\n"
                    f"• Process commission payouts\n"
                    f"• Access all system features\n\n"
                    f"Welcome back!"
                ),
                type=Notification.Type.SYSTEM,
            )

        return Response(DealerSerializer(dealer).data, status=status.HTTP_200_OK)


# ─── Usage Endpoint ───────────────────────────────────────────────────────────

class DealerUsageView(generics.GenericAPIView):
    """
    GET /api/dealers/{id}/usage/
    Returns real-time usage vs plan limits.
    Only the dealer owner or admin can access this.
    """
    permission_classes = [permissions.IsAuthenticated]
    queryset = Dealer.objects.all()

    def get(self, request, pk):
        dealer = self.get_object()

        # Ownership check — dealer can only view their own usage
        if not request.user.is_staff:
            user_dealer = None
            try:
                user_dealer = request.user.dealer
            except Exception:
                pass
            if not user_dealer and request.user.dealer_org_id:
                user_dealer = request.user.dealer_org
            if not user_dealer or user_dealer.pk != dealer.pk:
                raise PermissionDenied(
                    "You do not have access to this dealer's resources.")

        summary = get_usage_summary(dealer)
        return Response(summary, status=status.HTTP_200_OK)


# ─── Branch CRUD (with limit enforcement) ────────────────────────────────────

class BranchListCreateView(DealerOwnershipMixin, generics.ListCreateAPIView):
    serializer_class = BranchSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        self.get_dealer()
        return Branch.objects.filter(
            dealer_id=self.kwargs["dealer_pk"]
        ).order_by("-created_at")

    def create(self, request, *args, **kwargs):
        dealer = self.get_dealer()

        require_active_subscription(dealer)
        overage_invoice = enforce_limit(dealer, "branches")

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(dealer_id=dealer.id)

        response_data = serializer.data
        if overage_invoice:
            response_data = {
                **serializer.data,
                "overage_invoice": InvoiceSerializer(overage_invoice).data,
                "warning": "Branch limit exceeded. An overage invoice has been generated.",
            }

            from apps.notifications.models import Notification
            if dealer.owner:
                Notification.objects.create(
                    recipient=dealer.owner,
                    title="⚠️ Branch Limit Exceeded",
                    message=(
                        f"Your dealer account has exceeded the branch limit for your current plan.\n\n"
                        f"Branch created: {serializer.data.get('name')}\n"
                        f"Action: Branch was created but an OVERAGE INVOICE has been generated.\n"
                        f"Invoice ID: #{overage_invoice.id}\n"
                        f"Amount: KES {overage_invoice.amount}\n\n"
                        f"Please upgrade your plan or review your branch usage to avoid continued overage charges."
                    ),
                    type=Notification.Type.ALERT,
                )

        return Response(response_data, status=status.HTTP_201_CREATED)


class BranchDetailView(DealerOwnershipMixin, generics.RetrieveUpdateDestroyAPIView):
    serializer_class = BranchSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        self.get_dealer()
        return Branch.objects.filter(dealer_id=self.kwargs["dealer_pk"])


# ─── Branch Activate / Deactivate ─────────────────────────────────────────────

class BranchDeactivateView(DealerOwnershipMixin, generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, dealer_pk, pk):
        self.check_dealer_ownership(dealer_pk)
        branch = get_object_or_404(Branch, pk=pk, dealer_id=dealer_pk)
        branch.is_active = False
        branch.save()
        return Response(BranchSerializer(branch).data, status=status.HTTP_200_OK)


class BranchActivateView(DealerOwnershipMixin, generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, dealer_pk, pk):
        self.check_dealer_ownership(dealer_pk)
        branch = get_object_or_404(Branch, pk=pk, dealer_id=dealer_pk)
        branch.is_active = True
        branch.save()
        return Response(BranchSerializer(branch).data, status=status.HTTP_200_OK)


# ─── Van Team CRUD (with limit enforcement) ───────────────────────────────────

class VanTeamListCreateView(DealerOwnershipMixin, generics.ListCreateAPIView):
    serializer_class = VanTeamSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        self.get_dealer()
        return VanTeam.objects.filter(
            branch_id=self.kwargs["branch_pk"]
        ).order_by("-created_at")

    def create(self, request, *args, **kwargs):
        dealer = self.get_dealer()

        require_active_subscription(dealer)
        overage_invoice = enforce_limit(dealer, "vans")

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(branch_id=self.kwargs["branch_pk"])

        response_data = serializer.data
        if overage_invoice:
            response_data = {
                **serializer.data,
                "overage_invoice": InvoiceSerializer(overage_invoice).data,
                "warning": "Van limit exceeded. An overage invoice has been generated.",
            }

            from apps.notifications.models import Notification
            if dealer.owner:
                Notification.objects.create(
                    recipient=dealer.owner,
                    title="⚠️ Van Limit Exceeded",
                    message=(
                        f"Your dealer account has exceeded the van/team limit for your current plan.\n\n"
                        f"Van created: {serializer.data.get('name')}\n"
                        f"Action: Van was created but an OVERAGE INVOICE has been generated.\n"
                        f"Invoice ID: #{overage_invoice.id}\n"
                        f"Amount: KES {overage_invoice.amount}\n\n"
                        f"Please upgrade your plan or review your van usage to avoid continued overage charges."
                    ),
                    type=Notification.Type.ALERT,
                )

        return Response(response_data, status=status.HTTP_201_CREATED)


class VanTeamDetailView(DealerOwnershipMixin, generics.RetrieveUpdateDestroyAPIView):
    serializer_class = VanTeamSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        self.get_dealer()
        return VanTeam.objects.filter(branch_id=self.kwargs["branch_pk"])


# ─── Van Team Activate / Deactivate ───────────────────────────────────────────

class VanTeamDeactivateView(DealerOwnershipMixin, generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, dealer_pk, branch_pk, pk):
        self.check_dealer_ownership(dealer_pk)
        van = get_object_or_404(VanTeam, pk=pk, branch_id=branch_pk)
        van.is_active = False
        van.save()
        return Response(VanTeamSerializer(van).data, status=status.HTTP_200_OK)


class VanTeamActivateView(DealerOwnershipMixin, generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, dealer_pk, branch_pk, pk):
        self.check_dealer_ownership(dealer_pk)
        van = get_object_or_404(VanTeam, pk=pk, branch_id=branch_pk)
        van.is_active = True
        van.save()
        return Response(VanTeamSerializer(van).data, status=status.HTTP_200_OK)


# ─── Van Team Members (with user limit enforcement) ───────────────────────────

class VanTeamMemberListCreateView(DealerOwnershipMixin, generics.ListCreateAPIView):
    serializer_class = VanTeamMemberSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        self.check_dealer_ownership_via_team(self.kwargs["team_pk"])
        return VanTeamMember.objects.filter(team_id=self.kwargs["team_pk"])

    def create(self, request, *args, **kwargs):
        dealer = self.check_dealer_ownership_via_team(self.kwargs["team_pk"])

        require_active_subscription(dealer)
        overage_invoice = enforce_limit(dealer, "users")

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        member = serializer.save(team_id=self.kwargs["team_pk"])

        response_data = serializer.data
        if overage_invoice:
            response_data = {
                **serializer.data,
                "overage_invoice": InvoiceSerializer(overage_invoice).data,
                "warning": "User limit exceeded. An overage invoice has been generated.",
            }

            from apps.notifications.models import Notification
            if dealer.owner:
                Notification.objects.create(
                    recipient=dealer.owner,
                    title="⚠️ User Limit Exceeded",
                    message=(
                        f"Your dealer account has exceeded the user limit for your current plan.\n\n"
                        f"User added: {member.agent.full_name} (Role: {member.agent.role})\n"
                        f"Action: User was added but an OVERAGE INVOICE has been generated.\n"
                        f"Invoice ID: #{overage_invoice.id}\n"
                        f"Amount: KES {overage_invoice.amount}\n\n"
                        f"Please upgrade your plan or review your user count to avoid continued overage charges."
                    ),
                    type=Notification.Type.ALERT,
                )

        from apps.notifications.models import Notification
        team = member.team
        Notification.objects.create(
            recipient=member.agent,
            title="👥 Added to Van Team",
            message=(
                f"You have been added to van team '{team.name}'.\n\n"
                f"Branch: {team.branch.name if team.branch else 'N/A'}\n"
                f"Added by: {request.user.full_name}\n\n"
                f"Welcome to the team! You can now access SIM inventory and perform registrations."
            ),
            type=Notification.Type.SYSTEM,
        )

        return Response(response_data, status=status.HTTP_201_CREATED)


class VanTeamMemberDetailView(DealerOwnershipMixin, generics.RetrieveDestroyAPIView):
    serializer_class = VanTeamMemberSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        self.check_dealer_ownership_via_team(self.kwargs["team_pk"])
        return VanTeamMember.objects.filter(team_id=self.kwargs["team_pk"])


# ─── MobiGo CRUD (with limit enforcement) ────────────────────────────────────

# apps/dealers/views.py

class MobiGoListCreateView(DealerOwnershipMixin, generics.ListCreateAPIView):
    serializer_class = MobiGoSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None  # ← add this line

    def get_queryset(self):
        self.get_dealer()
        return MobiGo.objects.filter(
            dealer_id=self.kwargs["dealer_pk"]
        ).select_related("assigned_ba").order_by("-created_at")

    def create(self, request, *args, **kwargs):
        dealer = self.get_dealer()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(dealer=dealer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class MobiGoDetailView(DealerOwnershipMixin, generics.RetrieveUpdateDestroyAPIView):
    serializer_class = MobiGoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        self.get_dealer()
        return MobiGo.objects.filter(
            dealer_id=self.kwargs["dealer_pk"]
        ).select_related("assigned_ba")


# ─── MobiGo Activate / Deactivate ─────────────────────────────────────────────

class MobiGoDeactivateView(DealerOwnershipMixin, generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, dealer_pk, pk):
        self.check_dealer_ownership(dealer_pk)
        mobigo = get_object_or_404(MobiGo, pk=pk, dealer_id=dealer_pk)
        mobigo.is_active = False
        mobigo.save()
        return Response(MobiGoSerializer(mobigo).data, status=status.HTTP_200_OK)


class MobiGoActivateView(DealerOwnershipMixin, generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, dealer_pk, pk):
        self.check_dealer_ownership(dealer_pk)
        mobigo = get_object_or_404(MobiGo, pk=pk, dealer_id=dealer_pk)
        mobigo.is_active = True
        mobigo.save()
        return Response(MobiGoSerializer(mobigo).data, status=status.HTTP_200_OK)
