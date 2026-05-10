# dealers/serializers.py
from rest_framework import serializers
from apps.accounts.serializers import UserSerializer
from apps.accounts.models import User
from .models import Dealer, Branch, VanTeam, VanTeamMember, MobiGo


class DealerSerializer(serializers.ModelSerializer):
    owner_details = UserSerializer(source="owner", read_only=True)

    class Meta:
        model = Dealer
        fields = [
            "id", "name", "owner", "owner_details",
            "phone", "email", "address", "is_active", "created_at",
            # Subscription
            "subscription_plan", "subscription_status", "billing_cycle",
            "subscription_started_at", "trial_ends_at",
            "next_billing_date",
            "pending_plan_change", "pending_plan_change_at",
        ]
        read_only_fields = [
            "id", "created_at",
            "pending_plan_change", "pending_plan_change_at",
        ]


class BranchSerializer(serializers.ModelSerializer):
    manager_details = UserSerializer(source="manager", read_only=True)

    class Meta:
        model = Branch
        fields = [
            "id", "dealer", "name", "manager", "manager_details",
            "phone", "address", "is_active", "is_warehouse", "created_at",
        ]
        read_only_fields = ["id", "dealer", "created_at"]


class VanTeamMemberSerializer(serializers.ModelSerializer):
    agent_details = UserSerializer(source="agent", read_only=True)

    class Meta:
        model = VanTeamMember
        fields = ["id", "agent", "agent_details", "joined_at"]
        read_only_fields = ["id", "joined_at"]


class VanTeamSerializer(serializers.ModelSerializer):
    leader_details = UserSerializer(source="leader", read_only=True)
    members = VanTeamMemberSerializer(many=True, read_only=True)

    class Meta:
        model = VanTeam
        fields = [
            "id", "branch", "name", "leader", "leader_details",
            "members", "is_active", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class MobiGoSerializer(serializers.ModelSerializer):
    assigned_ba_details = serializers.SerializerMethodField()
    assigned_ba = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        allow_null=True,
        required=False,
    )

    class Meta:
        model = MobiGo
        fields = [
            "id", "dealer",
            "imis", "mobigo_sim_number", "sim_serial_number",
            "ba_msisdn", "agent_msisdn",
            "device_type",
            "assigned_ba", "assigned_ba_details",
            "is_active", "notes", "created_at",
        ]
        read_only_fields = ["id", "dealer", "created_at"]

    def get_assigned_ba_details(self, obj):
        if obj.assigned_ba:
            user = obj.assigned_ba
            full_name = (
                getattr(user, 'full_name', None)
                or f"{getattr(user, 'first_name', '')} {getattr(user, 'last_name', '')}".strip()
                or user.email
            )
            return {
                "id":        user.id,
                "full_name": full_name,
                "phone":     getattr(user, "phone", ""),
            }
        return None

    def validate_assigned_ba(self, user):
        """One MobiGo per BA — reject if they already have one (excluding self on update)."""
        if user is None:
            return user
        qs = MobiGo.objects.filter(assigned_ba=user)
        # On update, exclude current instance
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(
                "This Brand Ambassador already has a MobiGo assigned."
            )
        return user
