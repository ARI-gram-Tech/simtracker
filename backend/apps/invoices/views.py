"""
apps/invoices/views.py (REFACTORED)

Key changes from original:
- InvoiceListCreateView.perform_create() now sets source=ADMIN automatically
- ChangeDealerPlanView fully delegates to billing_service.process_plan_change()
- Added /api/invoices/trigger-billing/ (admin manual trigger for testing)
"""

from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.utils import timezone

from .models import Invoice, PlanSetting
from .serializers import InvoiceSerializer, MarkPaidSerializer, PlanSettingSerializer
from apps.dealers.models import Dealer
from services.billing_service import process_plan_change


# ─── Invoices ─────────────────────────────────────────────────────────────────

class InvoiceListCreateView(generics.ListCreateAPIView):
    serializer_class = InvoiceSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        qs = Invoice.objects.select_related("dealer", "paid_by", "created_by")
        params = self.request.query_params

        if dealer := params.get("dealer"):
            qs = qs.filter(dealer_id=dealer)
        if status_ := params.get("status"):
            qs = qs.filter(status=status_)
        if inv_type := params.get("invoice_type"):
            qs = qs.filter(invoice_type=inv_type)
        if source := params.get("source"):
            qs = qs.filter(source=source)

        return qs.order_by("-created_at")

    def perform_create(self, serializer):
        # Admin-created invoices always get source=ADMIN
        # source=SYSTEM is reserved for the billing engine
        serializer.save(
            created_by=self.request.user,
            source=Invoice.Source.ADMIN,
        )


class InvoiceDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = InvoiceSerializer
    permission_classes = [permissions.IsAdminUser]
    queryset = Invoice.objects.select_related(
        "dealer", "paid_by", "created_by")


class MarkInvoicePaidView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, pk):
        try:
            invoice = Invoice.objects.get(pk=pk)
        except Invoice.DoesNotExist:
            return Response({"detail": "Invoice not found."}, status=status.HTTP_404_NOT_FOUND)

        if invoice.status == Invoice.Status.PAID:
            return Response({"detail": "Invoice already paid."}, status=status.HTTP_400_BAD_REQUEST)

        serializer = MarkPaidSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        invoice.status = Invoice.Status.PAID
        invoice.paid_at = timezone.now()
        invoice.paid_by = request.user
        invoice.notes = serializer.validated_data.get("notes", invoice.notes)
        invoice.save()

        # Reactivate dealer if last overdue invoice is now paid
        dealer = invoice.dealer
        was_suspended = dealer.subscription_status in ("suspended", "overdue")

        if was_suspended:
            remaining_overdue = dealer.invoices.filter(
                status=Invoice.Status.OVERDUE
            ).exclude(pk=invoice.pk).count()
            if remaining_overdue == 0:
                dealer.subscription_status = "active"
                dealer.is_active = True
                dealer.save(update_fields=["subscription_status", "is_active"])

        # ─── ADD THIS NOTIFICATION ─────────────────────────────────────────────
        from apps.notifications.models import Notification

        # Notify dealer owner
        if dealer.owner:
            status_message = ""
            if was_suspended and remaining_overdue == 0:
                status_message = (
                    "\n\n✅ Your account has been REACTIVATED as all overdue invoices are now paid."
                )

            Notification.objects.create(
                recipient=dealer.owner,
                title="✅ Invoice Paid",
                message=(
                    f"Invoice #{invoice.id} has been marked as PAID.\n\n"
                    f"Invoice Type: {invoice.get_invoice_type_display()}\n"
                    f"Amount: KES {invoice.amount}\n"
                    f"Paid by: {request.user.full_name}\n"
                    f"Payment date: {invoice.paid_at.strftime('%Y-%m-%d %H:%M')}\n"
                    f"Notes: {invoice.notes or 'No additional notes'}"
                    f"{status_message}"
                ),
                type=Notification.Type.FINANCE,
            )
        # ───────────────────────────────────────────────────────────────────────

        return Response(InvoiceSerializer(invoice).data)


class CancelInvoiceView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, pk):
        try:
            invoice = Invoice.objects.get(pk=pk)
        except Invoice.DoesNotExist:
            return Response({"detail": "Invoice not found."}, status=status.HTTP_404_NOT_FOUND)

        if invoice.status in (Invoice.Status.PAID, Invoice.Status.CANCELLED):
            return Response({"detail": "Cannot cancel this invoice."}, status=status.HTTP_400_BAD_REQUEST)

        invoice.status = Invoice.Status.CANCELLED
        invoice.save()

        # ─── ADD THIS NOTIFICATION ─────────────────────────────────────────────
        from apps.notifications.models import Notification

        # Notify dealer owner
        if invoice.dealer.owner:
            Notification.objects.create(
                recipient=invoice.dealer.owner,
                title="❌ Invoice Cancelled",
                message=(
                    f"Invoice #{invoice.id} has been CANCELLED.\n\n"
                    f"Invoice Type: {invoice.get_invoice_type_display()}\n"
                    f"Original Amount: KES {invoice.amount}\n"
                    f"Cancelled by: {request.user.full_name}\n"
                    f"Original Due Date: {invoice.due_date.strftime('%Y-%m-%d') if invoice.due_date else 'N/A'}\n\n"
                    f"No payment is required for this invoice. Please check your account balance."
                ),
                type=Notification.Type.FINANCE,
            )
        # ───────────────────────────────────────────────────────────────────────

        return Response(InvoiceSerializer(invoice).data)


# ─── Plan Change ──────────────────────────────────────────────────────────────

class ChangeDealerPlanView(APIView):
    """
    POST /api/invoices/dealers/{dealer_id}/change-plan/
    Body: { "plan": "pro" }

    Upgrade  → applies immediately + creates proration invoice
    Downgrade → scheduled for next billing cycle (checks usage compatibility)
    """
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, dealer_id):
        try:
            dealer = Dealer.objects.get(id=dealer_id)
        except Dealer.DoesNotExist:
            return Response({"error": "Dealer not found."}, status=status.HTTP_404_NOT_FOUND)

        new_plan = request.data.get("plan")
        valid_plans = ["trial", "basic", "pro", "enterprise"]

        if new_plan not in valid_plans:
            return Response(
                {"error": f"Invalid plan. Must be one of: {', '.join(valid_plans)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if dealer.subscription_plan == new_plan:
            return Response({
                "message":   "Dealer is already on this plan.",
                "dealer_id": dealer.id,
                "plan":      new_plan,
            })

        result = process_plan_change(dealer, new_plan, created_by=request.user)

        if result.get("invoice"):
            result["invoice"] = InvoiceSerializer(result["invoice"]).data

        # ─── ADD THIS NOTIFICATION ─────────────────────────────────────────────
        from apps.notifications.models import Notification

        old_plan = dealer.subscription_plan
        effective_date = result.get("effective_date", "Immediately")
        is_upgrade = result.get("is_upgrade", False)

        if is_upgrade:
            title = "📈 Plan Upgraded"
            message = (
                f"Your subscription plan has been UPGRADED from '{old_plan.upper()}' to '{new_plan.upper()}'.\n\n"
                f"Effective: {effective_date}\n"
                f"Changed by: {request.user.full_name}\n\n"
            )
            if result.get("invoice"):
                message += (
                    f"A proration invoice has been generated:\n"
                    f"Invoice #{result['invoice']['id']}: KES {result['invoice']['amount']}\n"
                )
            message += "\nYou now have access to higher limits and premium features."
        else:
            title = "📉 Plan Downgraded"
            message = (
                f"Your subscription plan has been DOWNGRADED from '{old_plan.upper()}' to '{new_plan.upper()}'.\n\n"
                f"Effective: {effective_date}\n"
                f"Changed by: {request.user.full_name}\n\n"
                f"⚠️ Please ensure your current usage does not exceed the new plan limits. "
                f"Exceeding limits will result in overage invoices."
            )

        # Notify dealer owner
        if dealer.owner:
            Notification.objects.create(
                recipient=dealer.owner,
                title=title,
                message=message,
                type=Notification.Type.FINANCE,
            )
        # ───────────────────────────────────────────────────────────────────────

        return Response(result, status=status.HTTP_200_OK)


# ─── Plan Settings ────────────────────────────────────────────────────────────

class PlanSettingsView(APIView):
    """
    GET  /api/invoices/plan-settings/
    PUT  /api/invoices/plan-settings/
    """
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        settings = PlanSetting.objects.all()
        serializer = PlanSettingSerializer(settings, many=True)
        data = {item["plan"]: item for item in serializer.data}
        return Response(data)

    def put(self, request):
        errors = {}
        for plan_key, plan_data in request.data.items():
            plan_data = {**plan_data, "plan": plan_key}
            instance = PlanSetting.objects.filter(plan=plan_key).first()
            serializer = PlanSettingSerializer(
                instance, data=plan_data, partial=False)
            if serializer.is_valid():
                serializer.save()
            else:
                errors[plan_key] = serializer.errors

        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)

        all_settings = PlanSetting.objects.all()
        data = {s.plan: PlanSettingSerializer(s).data for s in all_settings}
        return Response(data)


# ─── Manual Billing Trigger (Admin / Testing) ─────────────────────────────────

class TriggerBillingView(APIView):
    """
    POST /api/invoices/trigger-billing/
    Body: { "task": "subscription" | "overage" | "overdue" | "suspend" | "plan_changes" }

    Admin-only endpoint to manually trigger billing tasks (useful for testing
    or one-off runs without waiting for Celery beat).
    """
    permission_classes = [permissions.IsAdminUser]

    def post(self, request):
        task = request.data.get("task")

        if task == "subscription":
            from services.billing_service import generate_subscription_invoices
            result = generate_subscription_invoices()
            return Response({"generated": len(result)})

        elif task == "overage":
            from services.overage_service import generate_overage_invoices
            result = generate_overage_invoices()
            return Response({"generated": len(result)})

        elif task == "overdue":
            from services.billing_service import mark_overdue_invoices
            count = mark_overdue_invoices()
            return Response({"marked_overdue": count})

        elif task == "suspend":
            from services.billing_service import suspend_overdue_dealers
            suspended = suspend_overdue_dealers()
            return Response({"suspended_dealers": suspended})

        elif task == "plan_changes":
            from services.billing_service import apply_pending_plan_changes
            changed = apply_pending_plan_changes()
            return Response({"plan_changes_applied": changed})

        else:
            return Response(
                {"error": "Invalid task. Must be: subscription, overage, overdue, suspend, plan_changes"},
                status=status.HTTP_400_BAD_REQUEST,
            )
