# accounts/serializers.py
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import ExternalAgent, User
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from apps.dealers.models import Branch, VanTeam, VanTeamMember


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        token["full_name"] = user.full_name
        token["email"] = user.email
        token["dealer_id"] = user.dealer_org_id

        # ── Scope IDs ──────────────────────────────────────────────────
        token["branch_id"] = None
        token["van_team_id"] = None

        if user.role == "branch_manager":
            branch = Branch.objects.filter(manager=user).first()
            token["branch_id"] = branch.id if branch else None

        elif user.role == "van_team_leader":
            van = VanTeam.objects.filter(leader=user).first()
            token["van_team_id"] = van.id if van else None
            if van:
                token["branch_id"] = van.branch_id

        return token


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    dealer_id = serializers.SerializerMethodField()
    branch_id = serializers.SerializerMethodField()
    branch_name = serializers.SerializerMethodField()
    van_team_id = serializers.SerializerMethodField()
    van_team_name = serializers.SerializerMethodField()

    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip() or obj.email

    def get_dealer_id(self, obj):
        return obj.dealer_org_id

    def get_branch_id(self, obj):
        if obj.role == "branch_manager":
            branch = Branch.objects.filter(manager=obj).first()
            return branch.id if branch else None
        if obj.role == "van_team_leader":
            team = VanTeam.objects.filter(leader=obj).first()
            return team.branch_id if team else None
        if obj.role == "brand_ambassador":
            membership = VanTeamMember.objects.filter(
                agent=obj).select_related("team__branch").first()
            return membership.team.branch_id if membership else None
        return None

    def get_branch_name(self, obj):
        if obj.role == "branch_manager":
            branch = Branch.objects.filter(manager=obj).first()
            return branch.name if branch else None
        if obj.role == "van_team_leader":
            team = VanTeam.objects.filter(leader=obj).first()
            return team.branch.name if team and team.branch else None
        if obj.role == "brand_ambassador":
            membership = VanTeamMember.objects.filter(
                agent=obj).select_related("team__branch").first()
            return membership.team.branch.name if membership and membership.team.branch else None
        return None

    def get_van_team_id(self, obj):
        if obj.role == "van_team_leader":
            team = VanTeam.objects.filter(leader=obj).first()
            return team.id if team else None
        if obj.role == "brand_ambassador":
            membership = VanTeamMember.objects.filter(
                agent=obj).select_related("team").first()
            return membership.team.id if membership else None
        return None

    def get_van_team_name(self, obj):
        if obj.role == "van_team_leader":
            team = VanTeam.objects.filter(leader=obj).first()
            return team.name if team else None
        if obj.role == "brand_ambassador":
            membership = VanTeamMember.objects.filter(
                agent=obj).select_related("team").first()
            return membership.team.name if membership else None
        return None

    class Meta:
        model = User
        fields = [
            "id", "email", "first_name", "last_name", "full_name",
            "phone", "role", "is_active", "date_joined",
            "dealer_id", "branch_id", "branch_name",
            "van_team_id", "van_team_name",
        ]
        read_only_fields = ["id", "date_joined"]


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = [
            "email", "password", "first_name",
            "last_name", "phone", "role",
        ]

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        # Don't reveal whether the email exists — just return it
        return value.lower()


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True, min_length=8)

    def validate(self, attrs):
        try:
            uid = force_str(urlsafe_base64_decode(attrs["uid"]))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            raise serializers.ValidationError({"uid": "Invalid reset link."})

        if not default_token_generator.check_token(user, attrs["token"]):
            raise serializers.ValidationError(
                {"token": "Reset link is invalid or has expired."})

        attrs["user"] = user
        return attrs


class ExternalAgentSerializer(serializers.ModelSerializer):
    user_details = UserSerializer(source="user", read_only=True)

    class Meta:
        model = ExternalAgent
        fields = [
            "id", "user", "user_details", "dealer",
            "shop_name", "location", "id_number",
            "business_type", "business_type_other",
            "commission_eligible", "notes", "created_at",
        ]
        read_only_fields = ["id", "dealer", "created_at"]

    def validate(self, attrs):
        if attrs.get("business_type") == "other" and not attrs.get("business_type_other", "").strip():
            raise serializers.ValidationError(
                {"business_type_other": "Please specify the business type."}
            )
        return attrs
