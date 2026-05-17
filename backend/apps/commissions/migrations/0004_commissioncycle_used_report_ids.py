from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("commissions", "0003_deductionrule_deductionrecord"),
    ]

    operations = [
        migrations.AddField(
            model_name="commissioncycle",
            name="used_report_ids",
            field=models.JSONField(
                default=list,
                blank=True,
                help_text="Audit trail: IDs of Safaricom reports included when GenerateCycleRecords was run.",
            ),
        ),
    ]
