from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0005_location_nearby_places"),
    ]

    operations = [
        migrations.AddField(
            model_name="scrapedreel",
            name="selected_frame_timestamps",
            field=models.JSONField(blank=True, default=list),
        ),
    ]
