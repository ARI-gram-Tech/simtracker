# inventory/serializers.py
from rest_framework import serializers

from apps.accounts.serializers import UserSerializer
from apps.dealers.serializers import BranchSerializer
from .models import SIMBatch, SIM, SIMMovement
from apps.dealers.serializers import BranchSerializer, VanTeamSerializer


class SIMBatchSerializer(serializers.ModelSerializer):
    class Meta:
        model = SIMBatch
        fields = [
            "id", "batch_number", "quantity", "received_by",
            "branch", "received_at", "notes",
        ]
        read_only_fields = ["id", "received_at", "received_by"]


class SIMSerializer(serializers.ModelSerializer):
    current_holder_details = UserSerializer(
        source="current_holder", read_only=True)
    branch_details = BranchSerializer(source="branch", read_only=True)
    van_team_details = serializers.SerializerMethodField()

    class Meta:
        model = SIM
        fields = [
            "id", "serial_number", "batch", "status",
            "current_holder", "current_holder_details",
            "branch", "branch_details",
            "van_team", "van_team_details",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_van_team_details(self, obj):
        if not obj.van_team:
            return None
        return {"id": obj.van_team.id, "name": obj.van_team.name}


class SIMMovementSerializer(serializers.ModelSerializer):
    sim = serializers.SerializerMethodField()
    from_user = serializers.SerializerMethodField()
    to_user = serializers.SerializerMethodField()
    from_branch = serializers.SerializerMethodField()
    to_branch = serializers.SerializerMethodField()
    van_team = serializers.SerializerMethodField()
    created_by = serializers.SerializerMethodField()

    class Meta:
        model = SIMMovement
        fields = [
            "id", "sim", "movement_type",
            "from_user", "to_user",
            "from_branch", "to_branch",
            "van_team", "notes", "created_at", "created_by",
        ]
        read_only_fields = ["id", "created_at", "created_by"]

    def _user(self, u):
        if not u:
            return None
        return {"id": u.id, "full_name": f"{u.first_name} {u.last_name}".strip() or u.email}

    def _branch(self, b):
        if not b:
            return None
        return {"id": b.id, "name": b.name}

    def get_sim(self, obj):
        if not obj.sim:
            return None
        return {"id": obj.sim.id, "serial_number": obj.sim.serial_number}

    def get_from_user(self, obj): return self._user(obj.from_user)
    def get_to_user(self, obj): return self._user(obj.to_user)
    def get_from_branch(self, obj): return self._branch(obj.from_branch)
    def get_to_branch(self, obj): return self._branch(obj.to_branch)
    def get_created_by(self, obj): return self._user(obj.created_by)

    def get_van_team(self, obj):
        if not obj.van_team:
            return None
        return {"id": obj.van_team.id, "name": obj.van_team.name}

    def create(self, validated_data):
        validated_data["created_by"] = self.context["request"].user
        return super().create(validated_data)


class BulkIssueSerializer(serializers.Serializer):
    serial_numbers = serializers.ListField(child=serializers.CharField())
    to_user = serializers.IntegerField(required=False)
    to_branch = serializers.IntegerField(required=False)
    van_team = serializers.IntegerField(required=False)
    notes = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        if not attrs.get("to_user") and not attrs.get("to_branch"):
            raise serializers.ValidationError(
                "Either to_user or to_branch must be provided."
            )
        return attrs


class BulkReturnSerializer(serializers.Serializer):
    serial_numbers = serializers.ListField(child=serializers.CharField())
    from_user = serializers.IntegerField(required=False)
    from_branch = serializers.IntegerField(required=False)
    van_team = serializers.IntegerField(required=False)
    notes = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        if not attrs.get("from_user") and not attrs.get("from_branch") and not attrs.get("van_team"):
            raise serializers.ValidationError(
                "Either from_user, from_branch, or van_team must be provided."
            )
        return attrs
