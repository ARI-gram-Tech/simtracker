from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email is required")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    class Role(models.TextChoices):
        SUPER_ADMIN = "super_admin",        "Super Admin"
        DEALER_OWNER = "dealer_owner",        "Dealer Owner"
        OPERATIONS_MANAGER = "operations_manager",  "Operations Manager"
        BRANCH_MANAGER = "branch_manager",      "Branch Manager"
        VAN_TEAM_LEADER = "van_team_leader",     "Van Team Leader"
        BRAND_AMBASSADOR = "brand_ambassador",    "Brand Ambassador"
        EXTERNAL_AGENT = "external_agent",      "External Agent"   # ← new
        FINANCE = "finance",             "Finance Admin"

    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    phone = models.CharField(max_length=20, blank=True)
    role = models.CharField(max_length=30, choices=Role.choices)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(auto_now_add=True)

    # ── which dealer this user belongs to ────────────────────────────────
    dealer_org = models.ForeignKey(
        "dealers.Dealer",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="users",
    )

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["first_name", "last_name", "role"]

    objects = UserManager()

    def __str__(self):
        return f"{self.email} ({self.role})"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"


class ExternalAgent(models.Model):

    BUSINESS_TYPE_CHOICES = [
        ("shop",        "Shop"),
        ("kiosk",       "Kiosk"),
        ("supermarket", "Supermarket"),
        ("pharmacy",    "Pharmacy"),
        ("hardware",    "Hardware"),
        ("other",       "Other"),
    ]

    user = models.OneToOneField(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="external_agent_profile",
    )
    dealer = models.ForeignKey(
        "dealers.Dealer",
        on_delete=models.CASCADE,
        related_name="external_agents",
    )
    shop_name = models.CharField(max_length=255)
    location = models.TextField(blank=True)
    id_number = models.CharField(max_length=50, blank=True)
    business_type = models.CharField(
        max_length=20,
        choices=BUSINESS_TYPE_CHOICES,
        default="shop",
    )
    # filled when business_type = "other"
    business_type_other = models.CharField(max_length=100, blank=True)
    commission_eligible = models.BooleanField(default=False)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.full_name} — {self.shop_name}"
