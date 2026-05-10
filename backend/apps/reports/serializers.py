# reports/serializers.py
from rest_framework import serializers
from .models import DailyPerformanceSnapshot


class DailyPerformanceSnapshotSerializer(serializers.ModelSerializer):
    agent_name = serializers.CharField(
        source="agent.full_name",  read_only=True)
    branch_name = serializers.CharField(
        source="branch.name",      read_only=True)
    dealer_name = serializers.CharField(
        source="dealer.name",      read_only=True)

    class Meta:
        model = DailyPerformanceSnapshot
        fields = [
            "id", "date", "dealer", "dealer_name",
            "branch", "branch_name", "agent", "agent_name",
            "sims_issued", "sims_returned", "sims_registered",
            "sims_fraud", "created_at",
        ]
        read_only_fields = ["id", "created_at"]
