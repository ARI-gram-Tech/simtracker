# apps/demo/management/commands/seed_demo.py
"""
Seed a fully-populated demo for Arigram Communications Ltd.

Usage:
    python manage.py seed_demo            # idempotent — skips existing data
    python manage.py seed_demo --reset    # wipe demo dealer first, then reseed

What gets created
─────────────────
Dealer      : Arigram Communications Ltd  (plan=pro, status=active)
Branches    : 5  (Westlands, Parklands, Karen, Eastleigh, Warehouse)
Van Teams   : 5  (one per branch)
Users       : 43 total
  • 1  dealer_owner
  • 1  operations_manager
  • 1  finance
  • 5  branch_manager      (one per branch)
  • 5  van_team_leader     (one per van)
  • 20 brand_ambassador    (4 per van, each with a MobiGo device)
  • 10 external_agent      (2 per branch, with ExternalAgent profiles)
SIM Batch   : BATCH-DEMO-2026-01  (300 SIMs, received at Warehouse)
SIMs issued : 10 per BA  → 200 issued, 100 in warehouse
              5 per BA marked registered (with movement records)
MobiGo      : 1 per BA  (20 devices, ba_msisdn matches report BA column)
Commission  : Rule KES 50/SIM, Cycle "May 2026" (open)
Report      : SafaricomReport (status=done) with 40 ReconciliationRecords
              covering BA1 of Branch1 (Westlands) → 5 payable SIMs shown
              rest of BAs get their own payable records too

All passwords: Demo@1234
"""

import datetime
import io
import os
import random

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

# ── colour helpers (works without colorama) ───────────────────────────────────
GREEN = "\033[92m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
BOLD = "\033[1m"
RESET = "\033[0m"

DEMO_PASSWORD = "Demo@1234"
DEALER_NAME = "Arigram Communications Ltd"
DEALER_IDENTIFIER = "owner@arigram.demo"   # used to detect existing demo

BRANCHES = [
    {"name": "Westlands Branch",  "address": "Westlands, Nairobi"},
    {"name": "Parklands Branch",  "address": "Parklands, Nairobi"},
    {"name": "Karen Branch",      "address": "Karen, Nairobi"},
    {"name": "Eastleigh Branch",  "address": "Eastleigh, Nairobi"},
    {"name": "Warehouse Branch",
        "address": "Industrial Area, Nairobi",  "is_warehouse": True},
]

EXTERNAL_AGENT_SHOPS = [
    ("Wests Kiosk",     "kiosk"),
    ("Parks Minimart",  "shop"),
    ("Karen Pharmacy",  "pharmacy"),
    ("Eastside Hardware", "hardware"),
    ("Westlands Super", "supermarket"),
    ("Park Kiosk 2",    "kiosk"),
    ("Karen Shop",      "shop"),
    ("Eastleigh Mart",  "supermarket"),
    ("Westgate Kiosk",  "kiosk"),
    ("North Park Mini", "shop"),
]

# SIM serial base — matches real report format 89254011000000XXXXX
SIM_SERIAL_PREFIX = "8925401100000"
SIM_BATCH_NUMBER = "BATCH-DEMO-2026-01"
SIM_COUNT = 300


class Command(BaseCommand):
    help = "Seed demo data for Arigram Communications Ltd"

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Delete the existing demo dealer and all related data before reseeding",
        )

    def handle(self, *args, **options):
        from apps.accounts.models import User
        from apps.dealers.models import Dealer

        if options["reset"]:
            self._wipe()
        dealer = Dealer.objects.filter(name=DEALER_NAME, is_demo=True).first()
        # Check idempotency
        if User.objects.filter(email=DEALER_IDENTIFIER).exists():
            self.stdout.write(
                f"{YELLOW}Demo already seeded. "
                f"Run with --reset to wipe and reseed.{RESET}"
            )
            return

        self.stdout.write(
            f"\n{BOLD}{CYAN}Seeding Arigram Communications Ltd demo…{RESET}\n")

        with transaction.atomic():
            dealer = self._create_dealer()
            branches = self._create_branches(dealer)
            warehouse = branches[-1]              # last branch is Warehouse
            roles = self._create_users(dealer, branches)
            van_teams = self._create_van_teams(branches, roles)
            self._create_mobigos(dealer, van_teams, roles)
            batch, sims = self._create_inventory(
                dealer, warehouse, roles, van_teams)
            self._create_commission(dealer, sims, van_teams, roles)
            self._create_report(dealer, van_teams, roles, sims)

        self._print_summary(roles, dealer)

    # ── wipe ──────────────────────────────────────────────────────────────────

    def _wipe(self):
        from apps.accounts.models import User
        from apps.dealers.models import Dealer

        owner_qs = User.objects.filter(email=DEALER_IDENTIFIER)
        if not owner_qs.exists():
            self.stdout.write(
                f"{YELLOW}No demo data found — nothing to wipe.{RESET}")
            return

        owner = owner_qs.first()
        dealer = None
        try:
            dealer = owner.dealer
        except Exception:
            if owner.dealer_org_id:
                dealer = owner.dealer_org

        if dealer:
            self.stdout.write(
                f"{YELLOW}Wiping demo dealer '{dealer.name}' ...{RESET}")
            # Cascade deletes most things; users linked via dealer_org need explicit delete
            User.objects.filter(dealer_org=dealer).delete()
            dealer.delete()
        else:
            owner.delete()

        self.stdout.write(f"{GREEN}Wipe complete.{RESET}\n")

    # ── dealer ────────────────────────────────────────────────────────────────

    def _create_dealer(self):
        from apps.accounts.models import User
        from apps.dealers.models import Dealer

        self.stdout.write("  Creating dealer owner…")
        owner = User.objects.create_user(
            email=DEALER_IDENTIFIER,
            password=DEMO_PASSWORD,
            first_name="Arjun",
            last_name="Gram",
            phone="0700000001",
            role=User.Role.DEALER_OWNER,
        )

        self.stdout.write("  Creating dealer…")
        dealer = Dealer.objects.create(
            name=DEALER_NAME,
            owner=owner,
            phone="0700000001",
            email="info@arigram.demo",
            address="Upper Hill, Nairobi",
            is_active=True,
            subscription_plan="pro",
            subscription_status="active",
            billing_cycle="monthly",
            subscription_started_at=timezone.now(),
            next_billing_date=(
                timezone.now() + datetime.timedelta(days=30)).date(),
            is_demo=True,
        )

        # Link owner back to dealer
        owner.dealer_org = dealer
        owner.save(update_fields=["dealer_org"])

        self.stdout.write(f"  {GREEN}✓ Dealer created{RESET}")
        return dealer

    # ── branches ──────────────────────────────────────────────────────────────

    def _create_branches(self, dealer):
        from apps.dealers.models import Branch

        self.stdout.write("  Creating 5 branches…")
        branches = []
        for b in BRANCHES:
            branch = Branch.objects.create(
                dealer=dealer,
                name=b["name"],
                address=b["address"],
                is_active=True,
                is_warehouse=b.get("is_warehouse", False),
            )
            branches.append(branch)
        self.stdout.write(f"  {GREEN}✓ 5 branches created{RESET}")
        return branches

    # ── users ─────────────────────────────────────────────────────────────────

    def _create_users(self, dealer, branches):
        from apps.accounts.models import User, ExternalAgent

        roles = {
            "ops":       None,
            "finance":   None,
            "managers":  [],   # 5 branch managers
            "leaders":   [],   # 5 van leaders
            "bas":       [],   # list-of-lists: bas[branch_idx][ba_idx]
            "externals": [],   # 10 external agents
        }

        # ── ops manager ───────────────────────────────────────────────────────
        self.stdout.write("  Creating staff users…")
        ops = User.objects.create_user(
            email="ops@arigram.demo", password=DEMO_PASSWORD,
            first_name="Olivia", last_name="Ops",
            phone="0700000002", role=User.Role.OPERATIONS_MANAGER,
            dealer_org=dealer,
        )
        roles["ops"] = ops

        finance = User.objects.create_user(
            email="finance@arigram.demo", password=DEMO_PASSWORD,
            first_name="Felix", last_name="Finance",
            phone="0700000003", role=User.Role.FINANCE,
            dealer_org=dealer,
        )
        roles["finance"] = finance

        # ── branch managers + van leaders + BAs ───────────────────────────────
        FIRST_NAMES = ["Alice", "Brian", "Clara", "David", "Eva",
                       "Frank", "Grace", "Henry", "Irene", "James"]
        LAST_NAMES = ["Mwangi", "Kamau", "Otieno", "Wanjiku", "Njoroge",
                      "Kariuki", "Achieng", "Mutua", "Waweru", "Kimani"]

        name_pool = [(f, l) for f in FIRST_NAMES for l in LAST_NAMES]
        random.shuffle(name_pool)
        name_iter = iter(name_pool)

        branch_codes = ["b1", "b2", "b3", "b4", "b5"]

        for i, (branch, code) in enumerate(zip(branches, branch_codes)):
            fn, ln = next(name_iter)
            mgr = User.objects.create_user(
                email=f"manager.{code}@arigram.demo", password=DEMO_PASSWORD,
                first_name=fn, last_name=ln,
                phone=f"071000{i+1:04d}", role=User.Role.BRANCH_MANAGER,
                dealer_org=dealer,
            )
            branch.manager = mgr
            branch.save(update_fields=["manager"])
            roles["managers"].append(mgr)

            fn, ln = next(name_iter)
            leader = User.objects.create_user(
                email=f"leader.{code}@arigram.demo", password=DEMO_PASSWORD,
                first_name=fn, last_name=ln,
                phone=f"072000{i+1:04d}", role=User.Role.VAN_TEAM_LEADER,
                dealer_org=dealer,
            )
            roles["leaders"].append(leader)

            branch_bas = []
            for j in range(1, 5):   # 4 BAs per branch
                fn, ln = next(name_iter)
                ba = User.objects.create_user(
                    email=f"ba{j}.{code}@arigram.demo", password=DEMO_PASSWORD,
                    first_name=fn, last_name=ln,
                    phone=f"07{i+1:02d}10{j:04d}", role=User.Role.BRAND_AMBASSADOR,
                    dealer_org=dealer,
                )
                branch_bas.append(ba)
            roles["bas"].append(branch_bas)

        # ── external agents (2 per branch) ────────────────────────────────────
        self.stdout.write("  Creating 10 external agents…")
        for idx, (shop_name, biz_type) in enumerate(EXTERNAL_AGENT_SHOPS):
            branch = branches[idx % len(branches)]
            fn, ln = next(name_iter)
            ea_user = User.objects.create_user(
                email=f"agent{idx+1}@arigram.demo", password=DEMO_PASSWORD,
                first_name=fn, last_name=ln,
                phone=f"0733{idx+1:06d}", role=User.Role.EXTERNAL_AGENT,
                dealer_org=dealer,
            )
            ExternalAgent.objects.create(
                user=ea_user, dealer=dealer,
                shop_name=shop_name, location=branch.address,
                business_type=biz_type, commission_eligible=True,
            )
            roles["externals"].append(ea_user)

        self.stdout.write(f"  {GREEN}✓ 43 users created{RESET}")
        return roles

    # ── van teams ─────────────────────────────────────────────────────────────

    def _create_van_teams(self, branches, roles):
        from apps.dealers.models import VanTeam, VanTeamMember

        self.stdout.write("  Creating van teams & memberships…")
        van_names = ["Westlands Van", "Parklands Van", "Karen Van",
                     "Eastleigh Van", "Warehouse Van"]
        van_teams = []

        for i, (branch, name) in enumerate(zip(branches, van_names)):
            leader = roles["leaders"][i]
            van = VanTeam.objects.create(
                branch=branch, name=name, leader=leader, is_active=True,
            )
            van_teams.append(van)

            # Leader as member
            VanTeamMember.objects.create(team=van, agent=leader)

            # 4 BAs as members
            for ba in roles["bas"][i]:
                VanTeamMember.objects.create(team=van, agent=ba)

        self.stdout.write(f"  {GREEN}✓ 5 van teams + members created{RESET}")
        return van_teams

    # ── mobigo devices ────────────────────────────────────────────────────────

    def _create_mobigos(self, dealer, van_teams, roles):
        from apps.dealers.models import MobiGo

        self.stdout.write("  Creating MobiGo devices…")
        device_num = 1

        for branch_idx, branch_bas in enumerate(roles["bas"]):
            for ba_idx, ba in enumerate(branch_bas):
                global_idx = branch_idx * 4 + ba_idx + 1   # 1..20
                MobiGo.objects.create(
                    dealer=dealer,
                    imis=f"35012300{global_idx:06d}",
                    mobigo_sim_number=f"0750{global_idx:06d}",
                    sim_serial_number=f"{SIM_SERIAL_PREFIX}{2000 + global_idx:07d}",
                    # BA MSISDN — this is the key the Safaricom report uses
                    ba_msisdn=f"07001{global_idx:05d}",
                    agent_msisdn=f"07201{global_idx:05d}",
                    device_type="mobigo",
                    assigned_ba=ba,
                    is_active=True,
                )
                device_num += 1

        self.stdout.write(f"  {GREEN}✓ 20 MobiGo devices created{RESET}")

    # ── inventory ─────────────────────────────────────────────────────────────

    def _create_inventory(self, dealer, warehouse, roles, van_teams):
        from apps.inventory.models import SIMBatch, SIM, SIMMovement

        self.stdout.write("  Creating SIM batch (300 SIMs)…")

        # Warehouse manager or first ops user receives the batch
        receiver = roles["managers"][-1]   # warehouse branch manager

        batch = SIMBatch.objects.create(
            batch_number=SIM_BATCH_NUMBER,
            quantity=SIM_COUNT,
            received_by=receiver,
            branch=warehouse,
            notes="Demo seed batch — Arigram Communications Ltd",
        )

        # Create all 300 SIMs in_stock first
        sims = []
        for n in range(1, SIM_COUNT + 1):
            sim = SIM.objects.create(
                serial_number=f"{SIM_SERIAL_PREFIX}{1000 + n:07d}",
                batch=batch,
                status=SIM.Status.IN_STOCK,
                branch=warehouse,
            )
            sims.append(sim)

        self.stdout.write(
            "  Issuing SIMs to BAs (10 each) and marking 5 as registered…")

        sim_cursor = 0
        issued_by = roles["ops"]

        for branch_idx, branch_bas in enumerate(roles["bas"]):
            branch = van_teams[branch_idx].branch
            van = van_teams[branch_idx]

            for ba in branch_bas:
                ba_sims = sims[sim_cursor: sim_cursor + 10]
                sim_cursor += 10

                for i, sim in enumerate(ba_sims):
                    # Issue
                    sim.status = SIM.Status.ISSUED
                    sim.current_holder = ba
                    sim.branch = branch
                    sim.van_team = van
                    sim.save()

                    SIMMovement.objects.create(
                        sim=sim,
                        movement_type=SIMMovement.MovementType.ISSUE,
                        from_branch=warehouse,
                        to_user=ba,
                        to_branch=branch,
                        van_team=van,
                        notes="Demo seed — initial issue",
                        created_by=issued_by,
                    )

                    # First 5 per BA → registered
                    if i < 5:
                        sim.status = SIM.Status.REGISTERED
                        sim.save()
                        SIMMovement.objects.create(
                            sim=sim,
                            movement_type=SIMMovement.MovementType.REGISTER,
                            from_user=ba,
                            to_branch=branch,
                            van_team=van,
                            notes="Demo seed — registered by BA",
                            created_by=ba,
                        )

        self.stdout.write(
            f"  {GREEN}✓ Inventory created — 200 issued, 100 in warehouse{RESET}")
        return batch, sims

    # ── commission ────────────────────────────────────────────────────────────

    def _create_commission(self, dealer, sims, van_teams, roles):
        from apps.commissions.models import (
            CommissionRule, CommissionCycle, CommissionRecord,
        )

        self.stdout.write("  Creating commission rule + cycle + records…")

        today = datetime.date.today()
        rule = CommissionRule.objects.create(
            dealer=dealer,
            rate_per_active=50,
            minimum_topup=50,
            effective_from=today.replace(day=1),
            is_active=True,
        )

        cycle = CommissionCycle.objects.create(
            dealer=dealer,
            name=f"{today.strftime('%B %Y')} Commission",
            start_date=today.replace(day=1),
            end_date=today.replace(day=28),
            status=CommissionCycle.Status.OPEN,
        )

        # Create a pending commission record for each BA
        # active_sims = 5 (the registered ones), rate = 50
        for branch_bas in roles["bas"]:
            for ba in branch_bas:
                gross = 5 * 50   # 5 active SIMs × KES 50
                CommissionRecord.objects.create(
                    cycle=cycle,
                    agent=ba,
                    claimed_sims=10,
                    active_sims=5,
                    not_in_report_sims=5,
                    rate_per_sim=50,
                    gross_amount=gross,
                    deductions=0,
                    net_amount=gross,
                    status=CommissionRecord.Status.PENDING,
                )

        self.stdout.write(
            f"  {GREEN}✓ Commission rule, cycle + 20 pending records created{RESET}")
        return rule, cycle

    # ── safaricom report ──────────────────────────────────────────────────────

    def _create_report(self, dealer, van_teams, roles, sims):
        """
        Create a SafaricomReport (status=done) with ReconciliationRecords.
        Each BA gets 5 payable records — one per registered SIM.
        The report file is an in-memory xlsx so no disk path needed.

        Column mapping matches the real Arigram report:
          F (idx 5) = Serial Number
          G (idx 6) = Top Up Date
          H (idx 7) = Top Up Amount
          I (idx 8) = Agent MSISDN
          J (idx 9) = BA MSISDN
          P (idx 15)= Fraud Flag
        """
        from apps.reconciliation.models import SafaricomReport, ReconciliationRecord
        from apps.dealers.models import MobiGo
        from django.core.files.base import ContentFile

        self.stdout.write(
            "  Creating Safaricom report + reconciliation records…")

        today = datetime.date.today()

        # Build xlsx in memory
        try:
            import openpyxl
            wb = openpyxl.Workbook()
            ws = wb.active
            ws.title = "Sheet1"

            # Header — matches real report exactly
            ws.append([
                "Added", "ID DATE", "ID Month", "Dealer Sh", "Dealer Name",
                "Serial Number", "Top Up Date", "Top Up Amount",
                "Agent MSSDN", "BA",
                "Region", "Teritory", "Cluster",
                "Cummulative ", "Cumulative ", "Froud Flag",
            ])

            # One row per registered SIM per BA
            row_count = 0
            for branch_idx, branch_bas in enumerate(roles["bas"]):
                for ba in branch_bas:
                    try:
                        mobigo = MobiGo.objects.get(assigned_ba=ba)
                    except MobiGo.DoesNotExist:
                        continue

                    # The 5 registered SIMs for this BA (first 5 of their 10)
                    ba_sim_offset = (branch_idx * 4 +
                                     roles["bas"][branch_idx].index(ba)) * 10
                    ba_sims = sims[ba_sim_offset: ba_sim_offset + 5]

                    for sim in ba_sims:
                        ws.append([
                            today.strftime("%Y-%m-%d"),
                            int(today.strftime("%Y%m%d")),
                            int(today.strftime("%Y%m")),
                            "D-A021",
                            dealer.name,
                            # Excel formula prefix like real report
                            f'="{sim.serial_number}"',
                            int(today.strftime("%Y%m%d")),
                            50,                           # top-up amount KES 50
                            mobigo.agent_msisdn,
                            mobigo.ba_msisdn,
                            "NAIROBI",
                            "NAIROBI",
                            None, None, None,
                            "N",                          # no fraud
                        ])
                        row_count += 1

            buf = io.BytesIO()
            wb.save(buf)
            xlsx_bytes = buf.getvalue()
        except ImportError:
            xlsx_bytes = b""  # openpyxl not available — create report without file

        report = SafaricomReport.objects.create(
            uploaded_by=roles["ops"],
            dealer=dealer,
            status=SafaricomReport.Status.DONE,
            period_start=today.replace(day=1),
            period_end=today,
            filename=f"Demo_Safaricom_{today.strftime('%b%Y')}.xlsx",
            total_records=row_count if xlsx_bytes else 0,
            matched=row_count if xlsx_bytes else 0,
            unmatched=0,
            fraud_flagged=0,
            column_mapping={
                "serial_number": "F",
                "ba_msisdn":     "J",
                "agent_msisdn":  "I",
                "topup_amount":  "H",
                "topup_date":    "G",
                "fraud_flag":    "P",
            },
        )

        if xlsx_bytes:
            report.file.save(
                f"demo_report_{today.strftime('%Y%m')}.xlsx",
                ContentFile(xlsx_bytes),
                save=True,
            )

        # Create ReconciliationRecords
        from apps.dealers.models import MobiGo
        recon_count = 0

        for branch_idx, branch_bas in enumerate(roles["bas"]):
            for ba in branch_bas:
                try:
                    mobigo = MobiGo.objects.get(assigned_ba=ba)
                except MobiGo.DoesNotExist:
                    continue

                ba_sim_offset = (branch_idx * 4 + branch_bas.index(ba)) * 10
                ba_sims = sims[ba_sim_offset: ba_sim_offset + 5]

                for sim in ba_sims:
                    ReconciliationRecord.objects.create(
                        report=report,
                        sim=sim,
                        serial_number=sim.serial_number,
                        ba_msisdn=mobigo.ba_msisdn,
                        agent_msisdn=mobigo.agent_msisdn,
                        topup_amount=50,
                        topup_date=today,
                        territory="NAIROBI",
                        cluster="NAIROBI",
                        fraud_flag=False,
                        identified_ba=ba,
                        matched=True,
                        result=ReconciliationRecord.Result.PAYABLE,
                        commission_amount=50,
                    )
                    recon_count += 1

        self.stdout.write(
            f"  {GREEN}✓ Report created with {recon_count} reconciliation records{RESET}"
        )

    # ── summary ───────────────────────────────────────────────────────────────

    def _print_summary(self, roles, dealer):
        W = 60
        line = "━" * W
        dline = "═" * W

        self.stdout.write(f"\n{BOLD}{CYAN}{dline}{RESET}")
        self.stdout.write(
            f"{BOLD}{CYAN}  ARIGRAM COMMUNICATIONS LTD — DEMO SEEDED ✓{RESET}")
        self.stdout.write(f"{BOLD}{CYAN}{dline}{RESET}")

        def row(label, email):
            self.stdout.write(
                f"  {BOLD}{label:<22}{RESET} {email:<35} {YELLOW}{DEMO_PASSWORD}{RESET}")

        self.stdout.write(
            f"\n{BOLD}  {'Role':<22} {'Email':<35} {'Password'}{RESET}")
        self.stdout.write(f"  {line}")

        row("Dealer Owner",       "owner@arigram.demo")
        row("Operations Manager", "ops@arigram.demo")
        row("Finance Admin",      "finance@arigram.demo")

        branch_codes = ["b1", "b2", "b3", "b4", "b5"]
        for code in branch_codes:
            row(f"Branch Manager ({code.upper()})",
                f"manager.{code}@arigram.demo")

        for code in branch_codes:
            row(f"Van Leader ({code.upper()})",
                f"leader.{code}@arigram.demo")

        for code in branch_codes:
            for j in range(1, 5):
                row(f"BA{j} ({code.upper()})",
                    f"ba{j}.{code}@arigram.demo")

        for idx in range(1, 11):
            row(f"External Agent {idx}",            f"agent{idx}@arigram.demo")

        self.stdout.write(f"\n{BOLD}  Infrastructure{RESET}")
        self.stdout.write(f"  {line}")
        self.stdout.write(
            f"  {'SIM Batch':<22} {SIM_BATCH_NUMBER}  (300 SIMs)")
        self.stdout.write(
            f"  {'Branches':<22} 5  (Westlands, Parklands, Karen, Eastleigh, Warehouse)")
        self.stdout.write(
            f"  {'Van Teams':<22} 5  (one per branch, 4 BAs each)")
        self.stdout.write(f"  {'MobiGo Devices':<22} 20  (one per BA)")
        self.stdout.write(
            f"  {'Commission Cycle':<22} {datetime.date.today().strftime('%B %Y')}  (open, KES 50/SIM)")
        self.stdout.write(f"  {'Report':<22} Done — 100 payable recon records")
        self.stdout.write(
            f"\n  {YELLOW}Run with --reset to wipe and reseed{RESET}")
        self.stdout.write(f"{BOLD}{CYAN}{dline}{RESET}\n")
