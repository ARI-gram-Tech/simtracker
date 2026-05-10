# commissions/serializers.py
from rest_framework import serializers
from .models import CommissionRule, CommissionCycle, CommissionRecord, PayoutRecord, DeductionRule, DeductionRecord


class CommissionRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommissionRule
        fields = [
            "id", "dealer", "rate_per_active", "minimum_topup",
            "effective_from", "effective_to", "is_active", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class CommissionCycleSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommissionCycle
        fields = [
            "id", "dealer", "name", "start_date", "end_date",
            "report", "status", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class CommissionRecordSerializer(serializers.ModelSerializer):
    agent_name = serializers.CharField(
        source="agent.full_name", read_only=True)

    class Meta:
        model = CommissionRecord
        fields = [
            "id", "cycle", "agent", "agent_name", "branch",
            "claimed_sims", "active_sims",
            "not_in_report_sims", "not_in_inventory_sims",
            "fraud_sims", "rejected_sims", "disputed_sims",
            "rate_per_sim", "gross_amount",
            "deductions", "net_amount", "target_sims",
            "status", "approved_by", "approved_at", "notes", "created_at",
        ]
        read_only_fields = [
            "id", "gross_amount", "net_amount",
            "approved_by", "approved_at", "created_at",
        ]


class ApproveCommissionSerializer(serializers.Serializer):
    notes = serializers.CharField(required=False, allow_blank=True)


class PayoutRecordSerializer(serializers.ModelSerializer):
    agent_name = serializers.CharField(
        source="commission_record.agent.full_name", read_only=True)

    class Meta:
        model = PayoutRecord
        fields = [
            "id", "commission_record", "agent_name", "method",
            "transaction_ref", "amount", "paid_by", "paid_at", "notes",
        ]
        read_only_fields = ["id", "paid_by", "paid_at"]


class DeductionRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeductionRule
        fields = [
            "id", "dealer", "name", "violation_type", "amount_per_unit",
            "is_per_day", "threshold_days", "settlement_mode", "is_active", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class DeductionRecordSerializer(serializers.ModelSerializer):
    agent_name = serializers.CharField(
        source="agent.full_name", read_only=True)
    rule_name = serializers.CharField(source="rule.name", read_only=True)
    raised_by_name = serializers.CharField(
        source="raised_by.full_name", read_only=True)
    approved_by_name = serializers.CharField(
        source="approved_by.full_name", read_only=True)

    class Meta:
        model = DeductionRecord
        fields = [
            "id", "agent", "agent_name", "rule", "rule_name",
            "violation_type", "sim", "sims_count", "days_held",
            "amount", "reason", "status", "settlement_mode",
            "settlement_cycle", "raised_by", "raised_by_name",
            "approved_by", "approved_by_name", "approved_at", "created_at",
        ]
        read_only_fields = ["id", "raised_by",
                            "approved_by", "approved_at", "created_at"]
