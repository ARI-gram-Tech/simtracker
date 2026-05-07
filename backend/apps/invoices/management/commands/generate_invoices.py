from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from apps.dealers.models import Dealer
from apps.invoices.models import Invoice, PlanSetting


class Command(BaseCommand):
    help = "Generate subscription invoices for dealers based on their activation anniversary"

    def handle(self, *args, **options):
        self.stdout.write("Checking for invoices to generate...")

        today = timezone.now().date()
        invoices_created = 0

        # Get all active dealers (not suspended)
        active_dealers = Dealer.objects.filter(
            subscription_status="active",
            is_active=True
        )

        for dealer in active_dealers:
            # Check if it's time to generate invoice
            if self.should_generate_invoice(dealer, today):
                try:
                    self.create_invoice(dealer, today)
                    invoices_created += 1
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"✓ Invoice created for {dealer.name}")
                    )
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(
                            f"✗ Failed for {dealer.name}: {str(e)}")
                    )

        self.stdout.write(
            self.style.SUCCESS(f"\n✅ Generated {invoices_created} invoices")
        )

    def should_generate_invoice(self, dealer, today):
        """Check if dealer's anniversary has passed since last invoice"""

        # Get last subscription invoice
        last_invoice = dealer.invoices.filter(
            invoice_type="subscription",
            status__in=["paid", "pending"]
        ).order_by("-issued_date").first()

        # First invoice ever
        if not last_invoice:
            # If trial ended, generate invoice
            if dealer.trial_ends_at and dealer.trial_ends_at.date() <= today:
                return True
            # No trial, generate immediately
            if not dealer.trial_ends_at:
                return True
            return False

        # Check if 30 days have passed since last invoice
        next_billing_date = last_invoice.issued_date + timedelta(days=30)
        return today >= next_billing_date

    def create_invoice(self, dealer, today):
        """Create a subscription invoice for the dealer"""

        # Get plan price
        plan_setting = PlanSetting.objects.get(plan=dealer.subscription_plan)

        # Calculate due date (10 days from now)
        due_date = today + timedelta(days=10)

        # Create invoice
        Invoice.objects.create(
            dealer=dealer,
            invoice_type="subscription",
            period="monthly",
            amount=plan_setting.monthly_price,
            status="pending",
            issued_date=today,
            due_date=due_date,
            notes=f"Auto-generated: {dealer.subscription_plan} plan subscription"
        )
