from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0002_location_extracted_tips'),
    ]

    operations = [
        migrations.AddField(
            model_name='location',
            name='district',
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
        migrations.AddField(
            model_name='location',
            name='specific_area',
            field=models.CharField(blank=True, max_length=150, null=True),
        ),
    ]
