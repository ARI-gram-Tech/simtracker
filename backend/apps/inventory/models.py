from django.db import models
from apps.accounts.models import User
from apps.dealers.models import Branch, VanTeam


class SIMBatch(models.Model):
    batch_number = models.CharField(max_length=100, unique=True)
    quantity = models.PositiveIntegerField()
    received_by = models.ForeignKey(
        User, on_delete=models.PROTECT, related_name="received_batches")
    branch = models.ForeignKey(
        Branch, on_delete=models.PROTECT, related_name="sim_batches")
    received_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)

    def __str__(self):
        return f"Batch {self.batch_number} — {self.quantity} SIMs"


class SIM(models.Model):
    class Status(models.TextChoices):
        IN_STOCK = "in_stock",      "In Stock"
        ISSUED = "issued",        "Issued"
        REGISTERED = "registered",    "Registered"
        ACTIVATED = "activated",     "Activated"
        RETURNED = "returned",      "Returned"
        FRAUD_FLAGGED = "fraud_flagged", "Fraud Flagged"
        LOST = "lost",         "Lost"
        FAULTY = "faulty",       "Faulty"
        REPLACED = "replaced",      "Replaced"

    serial_number = models.CharField(max_length=50, unique=True)
    batch = models.ForeignKey(
        SIMBatch, on_delete=models.PROTECT, related_name="sims")
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.IN_STOCK)
    current_holder = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="held_sims")
    branch = models.ForeignKey(
        Branch, on_delete=models.SET_NULL, null=True, blank=True, related_name="sims")
    van_team = models.ForeignKey(
        VanTeam, on_delete=models.SET_NULL, null=True, blank=True, related_name="sims")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.serial_number} [{self.status}]"


class SIMMovement(models.Model):
    class MovementType(models.TextChoices):
        RECEIVE = "receive",  "Received from Safaricom"
        ISSUE = "issue",    "Issued"
        RETURN = "return",   "Returned"
        TRANSFER = "transfer", "Transferred"
        FLAG = "flag",     "Fraud Flagged"
        REPLACE = "replace",  "Replaced"
        REGISTER = "register", "Registered"
        LOST = "lost",     "Lost / Missing"
        FAULTY = "faulty",   "Faulty SIM Reported"

    sim = models.ForeignKey(
        SIM, on_delete=models.CASCADE, related_name="movements")
    movement_type = models.CharField(
        max_length=20, choices=MovementType.choices)
    from_user = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="movements_out")
    to_user = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="movements_in")
    from_branch = models.ForeignKey(
        Branch, on_delete=models.SET_NULL, null=True, blank=True, related_name="movements_out")
    to_branch = models.ForeignKey(
        Branch, on_delete=models.SET_NULL, null=True, blank=True, related_name="movements_in")
    van_team = models.ForeignKey(
        VanTeam, on_delete=models.SET_NULL, null=True, blank=True, related_name="movements")
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="movements_created")

    def __str__(self):
        return f"{self.sim.serial_number} — {self.movement_type} @ {self.created_at:%Y-%m-%d %H:%M}"
