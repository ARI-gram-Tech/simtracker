from django.db import models
from apps.accounts.models import User
from apps.dealers.models import Branch
from apps.inventory.models import SIM

DEFAULT_COLUMN_MAPPING = {
    "serial_number": "F",
    "ba_msisdn":     "J",
    "agent_msisdn":  "I",
    "topup_amount":  "H",
    "topup_date":    "G",
    "fraud_flag":    "P",
}


class SafaricomReport(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending",    "Pending"
        PROCESSING = "processing", "Processing"
        DONE = "done",       "Done"
        FAILED = "failed",     "Failed"

    file = models.FileField(upload_to="safaricom_reports/%Y/%m/")
    filename = models.CharField(max_length=255, blank=True)  # original name
    uploaded_by = models.ForeignKey(
        User, on_delete=models.PROTECT, related_name="uploaded_reports")
    branch = models.ForeignKey(
        Branch, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="safaricom_reports")
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING)

    # Period this report covers
    period_start = models.DateField(null=True, blank=True)
    period_end = models.DateField(null=True, blank=True)

    # Column mapping — flexible so format changes don't break processing
    column_mapping = models.JSONField(default=dict)

    # Processing stats
    total_records = models.PositiveIntegerField(default=0)
    matched = models.PositiveIntegerField(default=0)
    unmatched = models.PositiveIntegerField(default=0)
    fraud_flagged = models.PositiveIntegerField(default=0)

    uploaded_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)

    def __str__(self):
        return f"Report {self.id} — {self.filename or self.id} [{self.status}]"

    def get_column_mapping(self):
        """Returns mapping with defaults filled in for any missing keys."""
        mapping = DEFAULT_COLUMN_MAPPING.copy()
        mapping.update(self.column_mapping or {})
        return mapping


class ReconciliationRecord(models.Model):
    class SimStatus(models.TextChoices):
        ACTIVE = "active",        "Active"
        INACTIVE = "inactive",      "Inactive"
        FRAUD_FLAGGED = "fraud_flagged", "Fraud Flagged"

    class Result(models.TextChoices):
        PAYABLE = "payable",   "Payable"
        REJECTED = "rejected",  "Rejected"
        FRAUD = "fraud",     "Fraud"
        DISPUTE = "dispute",   "Dispute"
        UNMATCHED = "unmatched", "Unmatched"
        REVIEW = "review",    "Manual Review"
        GHOST_SIM = "ghost_sim",  "Ghost SIM"

    report = models.ForeignKey(
        SafaricomReport, on_delete=models.CASCADE, related_name="records")
    sim = models.ForeignKey(
        SIM, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="reconciliation_records")
    serial_number = models.CharField(max_length=50)

    # Raw from Safaricom report
    ba_msisdn = models.CharField(max_length=20, blank=True)
    agent_msisdn = models.CharField(max_length=20, blank=True)
    topup_amount = models.DecimalField(
        max_digits=10, decimal_places=2, default=0)
    topup_date = models.DateField(null=True, blank=True)
    territory = models.CharField(max_length=100, blank=True)
    cluster = models.CharField(max_length=100, blank=True)
    sim_status = models.CharField(
        max_length=20, choices=SimStatus.choices, default=SimStatus.ACTIVE)
    fraud_flag = models.BooleanField(default=False)  # direct from Safaricom

    # Resolved from ba_msisdn via MobiGo
    identified_ba = models.ForeignKey(
        User, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="reconciliation_records")
    registered_by = models.ForeignKey(
        User, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="reconciliation_registered")

    # Match results
    matched = models.BooleanField(default=False)
    result = models.CharField(
        max_length=20, choices=Result.choices,
        default=Result.UNMATCHED, blank=True)
    rejection_reason = models.CharField(max_length=255, blank=True)
    commission_amount = models.DecimalField(
        max_digits=10, decimal_places=2, default=0)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.serial_number} — {self.result}"
