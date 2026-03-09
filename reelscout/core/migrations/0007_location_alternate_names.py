from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0006_scrapedreel_selected_frame_timestamps"),
    ]

    operations = [
        migrations.AddField(
            model_name="location",
            name="alternate_names",
            field=models.JSONField(
                blank=True,
                default=list,
                help_text="Known alternate names/aliases for this location",
            ),
        ),
    ]
