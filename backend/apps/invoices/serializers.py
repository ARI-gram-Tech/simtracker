from rest_framework import serializers
from apps.accounts.serializers import UserSerializer
from apps.dealers.serializers import DealerSerializer
from .models import Invoice, PlanSetting


class PlanSettingSerializer(serializers.ModelSerializer):
    overage_price_per_user = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, default=0)
    overage_price_per_van = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, default=0)
    overage_price_per_branch = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, default=0)

    class Meta:
        model = PlanSetting
        fields = [
            "plan", "label",
            "monthly_price", "yearly_price",
            "max_users", "max_vans", "max_branches",
            "features", "trial_days",
            "allow_overage",
            "overage_price_per_user",
            "overage_price_per_van",
            "overage_price_per_branch",
        ]


class InvoiceSerializer(serializers.ModelSerializer):
    dealer_details = DealerSerializer(source="dealer",     read_only=True)
    paid_by_details = UserSerializer(source="paid_by",      read_only=True)
    created_by_details = UserSerializer(source="created_by",   read_only=True)

    # Computed label for the frontend badge
    source_label = serializers.SerializerMethodField()
    type_label = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = [
            "id", "dealer", "dealer_details",
            "invoice_type", "type_label",
            "source",       "source_label",
            "period",
            "amount", "status",
            "issued_date", "due_date", "paid_at",
            "paid_by", "paid_by_details",
            "is_prorated", "original_amount",
            "billing_period_start", "billing_period_end",
            "notes",
            "created_by", "created_by_details",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "paid_at", "paid_by", "source",
            "created_by", "created_at", "updated_at",
            "source_label", "type_label",
        ]

    def get_source_label(self, obj: Invoice) -> str:
        return "Auto" if obj.source == Invoice.Source.SYSTEM else "Manual"

    def get_type_label(self, obj: Invoice) -> str:
        labels = {
            Invoice.InvoiceType.SUBSCRIPTION: "Subscription (Auto)",
            Invoice.InvoiceType.OVERAGE:      "Overage (Auto)",
            Invoice.InvoiceType.PRORATION:    "Proration (Auto)",
            Invoice.InvoiceType.ONBOARDING:   "Onboarding",
            Invoice.InvoiceType.COMMISSION:   "Commission",
            Invoice.InvoiceType.ADJUSTMENT:   "Adjustment",
            Invoice.InvoiceType.MANUAL:       "Manual",
        }
        return labels.get(obj.invoice_type, obj.invoice_type.title())

    def validate_invoice_type(self, value: str) -> str:
        """
        Prevent admin UI from creating system-only invoice types.
        subscription, overage, proration are SYSTEM only.
        """
        system_only = {
            Invoice.InvoiceType.SUBSCRIPTION,
            Invoice.InvoiceType.OVERAGE,
            Invoice.InvoiceType.PRORATION,
        }
        if value in system_only:
            raise serializers.ValidationError(
                f"'{value}' invoices are system-generated automatically and cannot be created manually."
            )
        return value


class MarkPaidSerializer(serializers.Serializer):
    notes = serializers.CharField(required=False, allow_blank=True)
