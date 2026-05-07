from apps.inventory.models import SIM
from django.db.models import Count, Value
from django.db.models.functions import Concat
from django.db.models import CharField

results = (
    SIM.objects
    .filter(status='issued', current_holder__isnull=False, current_holder__role='brand_ambassador')
    .values('current_holder__id', 'current_holder__first_name', 'current_holder__last_name', 'current_holder__email')
    .annotate(sim_count=Count('id'))
    .order_by('-sim_count')
)

for r in results:
    name = f"{r['current_holder__first_name']} {r['current_holder__last_name']}".strip()
    print(f"{name} ({r['current_holder__email']}) — {r['sim_count']} SIMs")
