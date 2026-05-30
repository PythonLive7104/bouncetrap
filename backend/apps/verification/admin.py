from django.contrib import admin
from django.utils.html import format_html
from .models import BulkJob, VerificationResult


@admin.register(BulkJob)
class BulkJobAdmin(admin.ModelAdmin):
    list_display        = ('filename', 'user', 'status_badge', 'progress_display',
                           'valid_count', 'invalid_count', 'risky_count',
                           'credits_used', 'health_grade', 'created_at')
    list_filter         = ('status', 'health_grade')
    search_fields       = ('user__email', 'filename', 'id')
    readonly_fields     = ('id', 'celery_task_id', 'created_at', 'completed_at')
    list_select_related = ('user',)
    date_hierarchy      = 'created_at'
    list_per_page       = 50
    ordering            = ('-created_at',)

    fieldsets = (
        (None,       {'fields': ('id', 'user', 'filename', 'file_path', 'email_column', 'status')}),
        ('Progress', {'fields': ('total_count', 'processed_count', 'credits_used',
                                 'deep_checks_made', 'celery_task_id')}),
        ('Results',  {'fields': ('valid_count', 'invalid_count', 'risky_count',
                                 'unknown_count', 'duplicate_count', 'health_grade', 'health_advice')}),
        ('Files',    {'fields': ('result_file_path', 'error_message')}),
        ('Dates',    {'fields': ('created_at', 'completed_at')}),
    )

    @admin.display(description='Status')
    def status_badge(self, obj):
        colours = {
            'queued':     '#94a3b8',
            'processing': '#818cf8',
            'paused':     '#f59e0b',
            'done':       '#22c55e',
            'failed':     '#ef4444',
            'cancelled':  '#64748b',
        }
        colour = colours.get(obj.status, '#94a3b8')
        return format_html('<span style="color:{};font-weight:600">{}</span>', colour, obj.status.title())

    @admin.display(description='Progress')
    def progress_display(self, obj):
        if obj.total_count == 0:
            return '—'
        pct = obj.progress_pct
        return format_html(
            '{}/{} ({}%)',
            obj.processed_count, obj.total_count, pct
        )

    actions = ['requeue_failed_jobs']

    @admin.action(description='Re-queue selected failed jobs')
    def requeue_failed_jobs(self, request, queryset):
        from .tasks import process_bulk_job
        count = 0
        for job in queryset.filter(status='failed'):
            job.status = BulkJob.STATUS_QUEUED
            job.error_message = ''
            job.processed_count = 0
            job.save(update_fields=['status', 'error_message', 'processed_count'])
            task = process_bulk_job.delay(str(job.pk))
            job.celery_task_id = task.id
            job.save(update_fields=['celery_task_id'])
            count += 1
        self.message_user(request, f'Re-queued {count} job(s).')


@admin.register(VerificationResult)
class VerificationResultAdmin(admin.ModelAdmin):
    list_display        = ('email', 'status_badge', 'score_display', 'sub_status',
                           'esp', 'is_disposable', 'is_catch_all', 'deep_check_used', 'created_at')
    list_filter         = ('status', 'is_disposable', 'is_catch_all',
                           'is_role_based', 'is_free_email', 'deep_check_used')
    search_fields       = ('email', 'domain', 'user__email')
    readonly_fields     = ('id', 'created_at')
    list_select_related = ('user', 'job')
    date_hierarchy      = 'created_at'
    list_per_page       = 100
    ordering            = ('-created_at',)

    @admin.display(description='Status')
    def status_badge(self, obj):
        colours = {'valid': '#22c55e', 'invalid': '#ef4444', 'risky': '#f59e0b', 'unknown': '#94a3b8'}
        colour = colours.get(obj.status, '#94a3b8')
        return format_html('<span style="color:{};font-weight:600">{}</span>', colour, obj.status.title())

    @admin.display(description='Score')
    def score_display(self, obj):
        colour = '#22c55e' if obj.score >= 80 else '#f59e0b' if obj.score >= 50 else '#ef4444'
        return format_html('<span style="color:{};font-weight:600">{}</span>', colour, obj.score)
