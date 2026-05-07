from rest_framework import serializers
from .models import SafaricomReport, ReconciliationRecord


class ReconciliationRecordSerializer(serializers.ModelSerializer):
    identified_ba_name = serializers.SerializerMethodField()

    def get_identified_ba_name(self, obj):
        if obj.identified_ba:
            return f"{obj.identified_ba.first_name} {obj.identified_ba.last_name}".strip()
        return None

    class Meta:
        model = ReconciliationRecord
        fields = [
            "id", "report", "sim", "serial_number",
            "ba_msisdn", "agent_msisdn",
            "topup_amount", "topup_date",
            "territory", "cluster",
            "sim_status", "fraud_flag",
            "identified_ba", "identified_ba_name",
            "registered_by",
            "matched", "result", "rejection_reason",
            "commission_amount",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class SafaricomReportSerializer(serializers.ModelSerializer):
    records = ReconciliationRecordSerializer(many=True, read_only=True)

    class Meta:
        model = SafaricomReport
        fields = [
            "id", "file", "filename", "uploaded_by", "branch",
            "status", "period_start", "period_end",
            "column_mapping",
            "total_records", "matched", "unmatched", "fraud_flagged",
            "uploaded_at", "processed_at", "notes", "records",
        ]
        read_only_fields = [
            "id", "filename", "uploaded_by", "status",
            "total_records", "matched", "unmatched", "fraud_flagged",
            "uploaded_at", "processed_at",
        ]


class SafaricomReportListSerializer(serializers.ModelSerializer):
    class Meta:
        model = SafaricomReport
        fields = [
            "id", "file", "filename", "uploaded_by", "branch",
            "status", "period_start", "period_end",
            "total_records", "matched", "unmatched", "fraud_flagged",
            "uploaded_at", "processed_at", "notes",
        ]
        read_only_fields = [
            "id", "filename", "uploaded_by", "status",
            "total_records", "matched", "unmatched", "fraud_flagged",
            "uploaded_at", "processed_at",
        ]
