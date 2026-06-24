from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from .models import User, APIKey


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display    = ('email', 'full_name', 'plan_badge', 'credits_display', 'is_active', 'email_verified', 'date_joined')
    list_filter     = ('plan', 'is_active', 'email_verified', 'is_staff', 'is_superuser')
    search_fields   = ('email', 'full_name', 'referral_code')
    ordering        = ('-date_joined',)
    readonly_fields = ('date_joined', 'last_login', 'referral_code', 'referral_credits_earned')
    list_per_page   = 50

    fieldsets = (
        (None,              {'fields': ('email', 'password')}),
        ('Personal',        {'fields': ('full_name', 'timezone')}),
        ('Plan & Credits',  {'fields': ('plan', 'credits', 'subscription_expires_at', 'stripe_customer_id')}),
        ('Webhook',         {'fields': ('webhook_url', 'webhook_secret')}),
        ('Referral',        {'fields': ('referral_code', 'referred_by', 'referral_credits_earned')}),
        ('Notifications',   {'fields': ('notify_low_credits', 'notify_job_complete', 'notify_blacklist')}),
        ('Permissions',     {'fields': ('is_active', 'is_staff', 'is_superuser', 'email_verified', 'groups', 'user_permissions')}),
        ('Dates',           {'fields': ('date_joined', 'last_login')}),
    )
    add_fieldsets = (
        (None, {'classes': ('wide',), 'fields': ('email', 'full_name', 'password1', 'password2', 'plan', 'credits')}),
    )

    @admin.display(description='Plan')
    def plan_badge(self, obj):
        colours = {'free': '#94a3b8', 'paid': '#22c55e'}
        colour = colours.get(obj.plan, '#94a3b8')
        return format_html('<span style="color:{};font-weight:600">{}</span>', colour, obj.plan.title())

    @admin.display(description='Credits')
    def credits_display(self, obj):
        return f'{obj.credits:,}'

    actions = ['grant_paid_plan', 'add_100k_credits', 'deactivate_users']

    @admin.action(description='Grant Paid plan + 100,000 credits')
    def grant_paid_plan(self, request, queryset):
        queryset.update(plan='paid', credits=100_000)
        self.message_user(request, f'Updated {queryset.count()} user(s) to Paid plan.')

    @admin.action(description='Add 100,000 credits')
    def add_100k_credits(self, request, queryset):
        for u in queryset:
            u.credits += 100_000
            u.save(update_fields=['credits'])
        self.message_user(request, f'Added 100k credits to {queryset.count()} user(s).')

    @admin.action(description='Deactivate selected users')
    def deactivate_users(self, request, queryset):
        queryset.update(is_active=False)
        self.message_user(request, f'Deactivated {queryset.count()} user(s).')


@admin.register(APIKey)
class APIKeyAdmin(admin.ModelAdmin):
    list_display    = ('user', 'name', 'prefix', 'is_active', 'requests_count', 'last_used_at', 'created_at')
    list_filter     = ('is_active',)
    search_fields   = ('user__email', 'name', 'prefix')
    readonly_fields = ('key_hash', 'prefix', 'created_at', 'last_used_at', 'requests_count')
    list_per_page   = 50


# ── Declutter the admin index ──────────────────────────────────────────────
# Third-party apps auto-register models we never touch from the admin (JWT
# token blacklist, allauth email/social accounts, Sites, auth Groups, Celery
# task results). This app's admin loads after them, so we can unregister here.
# Each is guarded individually so a missing/disabled app never breaks startup.
def _hide_unwanted_admin_models():
    targets = [
        ('django.contrib.auth.models',                         'Group'),
        ('django.contrib.sites.models',                        'Site'),
        ('rest_framework_simplejwt.token_blacklist.models',    'OutstandingToken'),
        ('rest_framework_simplejwt.token_blacklist.models',    'BlacklistedToken'),
        ('allauth.account.models',                             'EmailAddress'),
        ('allauth.socialaccount.models',                       'SocialAccount'),
        ('allauth.socialaccount.models',                       'SocialApp'),
        ('allauth.socialaccount.models',                       'SocialToken'),
        ('django_celery_results.models',                       'TaskResult'),
        ('django_celery_results.models',                       'GroupResult'),
    ]
    from importlib import import_module
    for module_path, model_name in targets:
        try:
            model = getattr(import_module(module_path), model_name)
            admin.site.unregister(model)
        except Exception:
            pass  # app not installed, or model never registered — nothing to hide


_hide_unwanted_admin_models()
