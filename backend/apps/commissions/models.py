from django.db import models
from apps.accounts.models import User
from apps.dealers.models import Dealer, Branch
from apps.reconciliation.models import SafaricomReport


class CommissionRule(models.Model):
    dealer = models.ForeignKey(
        Dealer, on_delete=models.CASCADE, related_name="commission_rules")
    rate_per_active = models.DecimalField(
        max_digits=10, decimal_places=2, help_text="KES per active SIM")
    minimum_topup = models.DecimalField(
        max_digits=10, decimal_places=2, default=50, help_text="Minimum topup to qualify")
    effective_from = models.DateField()
    effective_to = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.dealer.name} — KES {self.rate_per_active}/SIM"


class CommissionCycle(models.Model):
    class Status(models.TextChoices):
        OPEN = "open",     "Open"
        CLOSED = "closed",   "Closed"
        APPROVED = "approved", "Approved"
        PAID = "paid",     "Paid"

    dealer = models.ForeignKey(
        Dealer, on_delete=models.CASCADE, related_name="commission_cycles")
    name = models.CharField(max_length=100, help_text="e.g. March 2026")
    start_date = models.DateField()
    end_date = models.DateField()
    report = models.ForeignKey(SafaricomReport, on_delete=models.SET_NULL,
                               null=True, blank=True, related_name="commission_cycles")
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.OPEN)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.dealer.name} — {self.name} [{self.status}]"


class CommissionRecord(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending",  "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        PAID = "paid",     "Paid"

    cycle = models.ForeignKey(
        CommissionCycle, on_delete=models.CASCADE, related_name="records")
    agent = models.ForeignKey(
        User, on_delete=models.PROTECT, related_name="commission_records")
    branch = models.ForeignKey(Branch, on_delete=models.SET_NULL,
                               null=True, blank=True, related_name="commission_records")
    # Claimed by BA (status=registered, current_holder=BA)
    claimed_sims = models.PositiveIntegerField(default=0)
    # Confirmed by Safaricom (result=payable)
    active_sims = models.PositiveIntegerField(default=0)
    # Breakdown of non-payable
    not_in_report_sims = models.PositiveIntegerField(default=0)
    not_in_inventory_sims = models.PositiveIntegerField(default=0)
    fraud_sims = models.PositiveIntegerField(default=0)
    rejected_sims = models.PositiveIntegerField(default=0)
    disputed_sims = models.PositiveIntegerField(default=0)

    rate_per_sim = models.DecimalField(max_digits=10, decimal_places=2)
    gross_amount = models.DecimalField(
        max_digits=12, decimal_places=2, default=0)
    deductions = models.DecimalField(
        max_digits=12, decimal_places=2, default=0)
    net_amount = models.DecimalField(
        max_digits=12, decimal_places=2, default=0)
    target_sims = models.PositiveIntegerField(default=0)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING)
    approved_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="approved_commissions")
    approved_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.agent.full_name} — {self.cycle.name} — KES {self.net_amount}"


class PayoutRecord(models.Model):
    class Method(models.TextChoices):
        MPESA = "mpesa",       "M-Pesa"
        BANK = "bank",        "Bank Transfer"
        CASH = "cash",        "Cash"

    commission_record = models.OneToOneField(
        CommissionRecord, on_delete=models.PROTECT, related_name="payout")
    method = models.CharField(max_length=20, choices=Method.choices)
    transaction_ref = models.CharField(max_length=100, blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    paid_by = models.ForeignKey(
        User, on_delete=models.PROTECT, related_name="payouts_made")
    paid_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)

    def __str__(self):
        return f"Payout — {self.commission_record.agent.full_name} — KES {self.amount}"


class DeductionRule(models.Model):
    class ViolationType(models.TextChoices):
        STALE_SIM = "stale_sim",  "SIM Held Too Long"
        DAMAGED = "damaged",    "Damaged / Defective"
        FRAUD = "fraud",      "Fraud Flagged SIM"
        LOST = "lost",       "Lost / Unaccounted SIM"
        MANUAL = "manual",     "Manual Deduction"

    class SettlementMode(models.TextChoices):
        COMMISSION = "commission_deduction", "Deduct from Commission"
        STANDALONE = "standalone",           "Standalone Repayment"

    dealer = models.ForeignKey(Dealer, on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    violation_type = models.CharField(
        max_length=20, choices=ViolationType.choices)
    amount_per_unit = models.DecimalField(max_digits=10, decimal_places=2)
    is_per_day = models.BooleanField(default=False)   # stale_sim only
    threshold_days = models.PositiveIntegerField(
        null=True, blank=True)  # stale_sim only
    settlement_mode = models.CharField(max_length=25, choices=SettlementMode.choices,
                                       default=SettlementMode.COMMISSION)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)


class DeductionRecord(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending_approval", "Pending Approval"
        APPROVED = "approved",         "Approved"
        DISMISSED = "dismissed",        "Dismissed"
        SETTLED = "settled",          "Settled"

    agent = models.ForeignKey(User, on_delete=models.CASCADE,
                              related_name="deduction_records")
    rule = models.ForeignKey(DeductionRule, on_delete=models.SET_NULL,
                             null=True, blank=True)
    violation_type = models.CharField(max_length=20)
    sim = models.ForeignKey("inventory.SIM", on_delete=models.SET_NULL,
                            null=True, blank=True)
    sims_count = models.PositiveIntegerField(default=1)
    days_held = models.PositiveIntegerField(null=True, blank=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    reason = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices,
                              default=Status.PENDING)
    settlement_mode = models.CharField(max_length=25,
                                       default=DeductionRule.SettlementMode.COMMISSION)
    settlement_cycle = models.ForeignKey("CommissionCycle", on_delete=models.SET_NULL,
                                         null=True, blank=True)
    raised_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True,
                                  related_name="deductions_raised")
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True,
                                    blank=True, related_name="deductions_approved")
    approved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
