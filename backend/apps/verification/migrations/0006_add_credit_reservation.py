from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('verification', '0005_add_paused_status'),
    ]

    operations = [
        migrations.AddField(
            model_name='bulkjob',
            name='credits_reserved',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='bulkjob',
            name='credits_refunded',
            field=models.IntegerField(default=0),
        ),
    ]
