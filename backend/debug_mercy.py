from apps.accounts.models import User
from apps.reconciliation.models import ReconciliationRecord
from django.db.models import Count
import os
import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()


# Find Mercy
mercy = User.objects.filter(role="brand_ambassador").first()
print(f"Testing with BA: {mercy.full_name} | {mercy.email} | id={mercy.id}")

# How many recon records are linked to her?
total = ReconciliationRecord.objects.filter(identified_ba=mercy).count()
print(f"\nReconciliationRecords with identified_ba=mercy: {total}")

# Breakdown by result
breakdown = (
    ReconciliationRecord.objects
    .filter(identified_ba=mercy)
    .values("result")
    .annotate(cnt=Count("id"))
)
for row in breakdown:
    print(f"  result={row['result']} → {row['cnt']}")

# Total recon records with ANY identified_ba
total_with_ba = ReconciliationRecord.objects.filter(
    identified_ba__isnull=False).count()
total_without = ReconciliationRecord.objects.filter(
    identified_ba__isnull=True).count()
print(f"\nAll records with identified_ba set:   {total_with_ba}")
print(f"All records with identified_ba=None:  {total_without}")

# Check if identified_ba is being set based on serial match
sample = ReconciliationRecord.objects.filter(identified_ba=mercy).first()
if sample:
    print(
        f"\nSample record: serial={sample.serial_number}, result={sample.result}, identified_ba={sample.identified_ba}")
