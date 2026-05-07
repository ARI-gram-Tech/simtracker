"""
Run with: python manage.py shell < fix_ba_returns.py
or:       python manage.py runscript fix_ba_returns  (if django-extensions installed)
"""
from apps.inventory.models import SIM, SIMMovement
from apps.dealers.models import VanTeam

return_movements = SIMMovement.objects.filter(
    movement_type="return",
    from_user__isnull=False,
).select_related("from_user", "sim")

fixed = 0
skipped = 0

for movement in return_movements:
    sim = movement.sim
    from_user = movement.from_user

    # Only fix SIMs that are in_stock with no van_team assigned
    if sim.status != "in_stock" or sim.van_team_id is not None:
        skipped += 1
        continue

    # Look up the BA's van
    ba_van = VanTeam.objects.filter(
        members__agent=from_user
    ).select_related("branch").first()

    if not ba_van:
        skipped += 1
        continue

    sim.van_team = ba_van
    sim.branch = ba_van.branch
    sim.save()
    fixed += 1
    print(f"  Fixed: {sim.serial_number} → {ba_van.name}")

print(f"\nDone. Fixed: {fixed}, Skipped: {skipped}")
