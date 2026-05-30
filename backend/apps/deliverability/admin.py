from django.contrib import admin
from django.utils.html import format_html
from .models import InboxPlacementTest, InboxPlacementResult


class InboxPlacementResultInline(admin.TabularInline):
    model           = InboxPlacementResult
    extra           = 0
    fields          = ('provider', 'seed_email', 'placement', 'checked_at')
    readonly_fields = ('provider', 'seed_email', 'placement', 'checked_at')
    can_delete      = False


@admin.register(InboxPlacementTest)
class InboxPlacementTestAdmin(admin.ModelAdmin):
    list_display    = ('id_short', 'user', 'subject_line', 'status_badge', 'sent_at', 'completed_at')
    list_filter     = ('status',)
    search_fields   = ('user__email', 'subject_line', 'test_token')
    readonly_fields = ('id', 'test_token', 'celery_task_id', 'sent_at', 'completed_at')
    inlines         = [InboxPlacementResultInline]
    list_per_page   = 50

    @admin.display(description='ID')
    def id_short(self, obj):
        return str(obj.id)[:8]

    @admin.display(description='Status')
    def status_badge(self, obj):
        colours = {
            'pending':  '#f59e0b',
            'sent':     '#60a5fa',
            'checking': '#a78bfa',
            'done':     '#22c55e',
            'failed':   '#ef4444',
        }
        colour = colours.get(obj.status, '#94a3b8')
        return format_html('<span style="color:{};font-weight:600">{}</span>', colour, obj.status.title())


@admin.register(InboxPlacementResult)
class InboxPlacementResultAdmin(admin.ModelAdmin):
    list_display  = ('test', 'provider', 'seed_email', 'placement_badge', 'checked_at')
    list_filter   = ('placement', 'provider')
    search_fields = ('seed_email', 'test__user__email')
    readonly_fields = ('id', 'checked_at')

    @admin.display(description='Placement')
    def placement_badge(self, obj):
        colours = {'inbox': '#22c55e', 'spam': '#ef4444', 'missing': '#94a3b8'}
        colour = colours.get(obj.placement, '#94a3b8')
        return format_html('<span style="color:{};font-weight:600">{}</span>', colour, obj.placement.title())
