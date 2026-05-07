from django.db import models
from django.utils import timezone
from apps.accounts.models import User


class Dealer(models.Model):

    PLAN_CHOICES = [
        ("trial",      "Trial"),
        ("basic",      "Basic"),
        ("pro",        "Pro"),
        ("enterprise", "Enterprise"),
    ]

    STATUS_CHOICES = [
        ("active",    "Active"),
        ("trial",     "Trial"),
        ("overdue",   "Overdue"),
        ("suspended", "Suspended"),
    ]

    BILLING_CYCLE_CHOICES = [
        ("monthly", "Monthly"),
        ("yearly",  "Yearly"),
    ]

    # ── Core fields ──────────────────────────────────────────────────────────
    name = models.CharField(max_length=255)
    owner = models.OneToOneField(
        User, on_delete=models.PROTECT, related_name="dealer")
    phone = models.CharField(max_length=20)
    email = models.EmailField()
    address = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    # ── Subscription fields ───────────────────────────────────────────────────
    subscription_plan = models.CharField(
        max_length=20, choices=PLAN_CHOICES,   default="trial")
    subscription_status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="trial")
    billing_cycle = models.CharField(
        max_length=10, choices=BILLING_CYCLE_CHOICES, default="monthly")

    subscription_started_at = models.DateTimeField(null=True, blank=True)
    trial_ends_at = models.DateTimeField(null=True, blank=True)
    next_billing_date = models.DateField(null=True, blank=True)

    # ── Pending downgrade (scheduled for next cycle) ──────────────────────────
    pending_plan_change = models.CharField(
        max_length=20, choices=PLAN_CHOICES, null=True, blank=True)
    pending_plan_change_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return self.name

    # ── Convenience helpers ───────────────────────────────────────────────────
    @property
    def is_on_trial(self):
        return (
            self.subscription_status == "trial"
            and self.trial_ends_at is not None
            and self.trial_ends_at > timezone.now()
        )

    @property
    def trial_expired(self):
        return (
            self.subscription_status == "trial"
            and self.trial_ends_at is not None
            and self.trial_ends_at <= timezone.now()
        )


class Branch(models.Model):
    dealer = models.ForeignKey(
        Dealer, on_delete=models.CASCADE, related_name="branches")
    name = models.CharField(max_length=255)
    manager = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                related_name="managed_branch")
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    is_warehouse = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.dealer.name} — {self.name}"


class VanTeam(models.Model):
    branch = models.ForeignKey(
        Branch, on_delete=models.CASCADE, related_name="van_teams")
    leader = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                               related_name="led_team")
    name = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.branch.name} — {self.name}"


class VanTeamMember(models.Model):
    team = models.ForeignKey(
        VanTeam, on_delete=models.CASCADE, related_name="members")
    agent = models.ForeignKey(
        User,    on_delete=models.CASCADE, related_name="team_memberships")
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("team", "agent")

    def __str__(self):
        return f"{self.agent.full_name} — {self.team.name}"


class MobiGo(models.Model):

    DEVICE_TYPE_CHOICES = [
        ("mobigo",        "MobiGo Device"),
        ("enrolled_phone", "Enrolled Phone"),
    ]

    dealer = models.ForeignKey(
        Dealer, on_delete=models.CASCADE, related_name="mobigos"
    )
    # Device identifier
    imis = models.CharField(max_length=20, blank=True)          # IMEI / iMIS
    mobigo_sim_number = models.CharField(
        max_length=20, blank=True)          # internet SIM inside device
    # KEY — used for report matching
    sim_serial_number = models.CharField(max_length=30, blank=True)

    # MSISDN numbers
    # BA's personal Safaricom number
    ba_msisdn = models.CharField(max_length=20, blank=True)
    # outlet / dealer shop number
    agent_msisdn = models.CharField(max_length=20, blank=True)

    device_type = models.CharField(
        max_length=20, choices=DEVICE_TYPE_CHOICES, default="mobigo"
    )

    # Assignment — one MobiGo per BA (enforced in serializer)
    assigned_ba = models.OneToOneField(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="mobigo_device",
    )

    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.dealer.name} — {self.imis or self.sim_serial_number}"
