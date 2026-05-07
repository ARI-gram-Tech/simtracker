from django.db import models
from apps.accounts.models import User
from apps.dealers.models import Dealer, Branch


class DailyPerformanceSnapshot(models.Model):
    date = models.DateField()
    dealer = models.ForeignKey(
        Dealer, on_delete=models.CASCADE, related_name="daily_snapshots")
    branch = models.ForeignKey(Branch, on_delete=models.SET_NULL,
                               null=True, blank=True, related_name="daily_snapshots")
    agent = models.ForeignKey(User, on_delete=models.SET_NULL,
                              null=True, blank=True, related_name="daily_snapshots")
    sims_issued = models.PositiveIntegerField(default=0)
    sims_returned = models.PositiveIntegerField(default=0)
    sims_registered = models.PositiveIntegerField(default=0)
    sims_fraud = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("date", "dealer", "branch", "agent")

    def __str__(self):
        return f"{self.date} — {self.branch} — {self.agent}"
