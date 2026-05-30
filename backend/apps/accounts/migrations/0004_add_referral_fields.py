import secrets
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


def populate_referral_codes(apps, schema_editor):
    User = apps.get_model('accounts', 'User')
    for user in User.objects.all():
        while True:
            code = secrets.token_urlsafe(8)[:8].upper()
            if not User.objects.filter(referral_code=code).exists():
                user.referral_code = code
                user.save(update_fields=['referral_code'])
                break


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0003_add_webhook_fields'),
    ]

    operations = [
        # Add without any index first so we can backfill without conflicts
        migrations.AddField(
            model_name='user',
            name='referral_code',
            field=models.CharField(blank=True, max_length=12, default=''),
        ),
        migrations.AddField(
            model_name='user',
            name='referral_credits_earned',
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name='user',
            name='referred_by',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='referrals', to=settings.AUTH_USER_MODEL),
        ),
        # Backfill codes for existing users
        migrations.RunPython(populate_referral_codes, migrations.RunPython.noop),
        # Now add the unique constraint
        migrations.AlterField(
            model_name='user',
            name='referral_code',
            field=models.CharField(blank=True, db_index=True, max_length=12, unique=True),
        ),
    ]
