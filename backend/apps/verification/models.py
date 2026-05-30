import uuid
from django.db import models
from django.conf import settings


class BulkJob(models.Model):
    STATUS_QUEUED     = 'queued'
    STATUS_PROCESSING = 'processing'
    STATUS_PAUSED     = 'paused'
    STATUS_DONE       = 'done'
    STATUS_FAILED     = 'failed'
    STATUS_CANCELLED  = 'cancelled'

    STATUS_CHOICES = [
        (STATUS_QUEUED,     'Queued'),
        (STATUS_PROCESSING, 'Processing'),
        (STATUS_PAUSED,     'Paused'),
        (STATUS_DONE,       'Done'),
        (STATUS_FAILED,     'Failed'),
        (STATUS_CANCELLED,  'Cancelled'),
    ]

    id        = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user      = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='bulk_jobs'
    )
    filename      = models.CharField(max_length=255)
    file_path     = models.CharField(max_length=1000)   # S3 key or local path
    status        = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_QUEUED)
    email_column  = models.CharField(max_length=100, blank=True)  # CSV column name

    total_count      = models.IntegerField(default=0)
    processed_count  = models.IntegerField(default=0)
    valid_count      = models.IntegerField(default=0)
    invalid_count    = models.IntegerField(default=0)
    risky_count      = models.IntegerField(default=0)
    unknown_count    = models.IntegerField(default=0)
    duplicate_count  = models.IntegerField(default=0)
    credits_used     = models.IntegerField(default=0)
    deep_checks_made = models.IntegerField(default=0)   # internal; not exposed in API as vendor name

    health_grade  = models.CharField(max_length=1, blank=True, default='')
    health_advice = models.JSONField(default=list)

    result_file_path = models.CharField(max_length=1000, blank=True)
    error_message    = models.TextField(blank=True)
    celery_task_id   = models.CharField(max_length=255, blank=True)

    created_at   = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'verification_bulk_job'
        ordering = ['-created_at']
        indexes  = [models.Index(fields=['user', '-created_at'])]

    def __str__(self):
        return f'{self.user.email} — {self.filename} [{self.status}]'

    @property
    def progress_pct(self) -> int:
        if self.total_count == 0:
            return 0
        return int(self.processed_count / self.total_count * 100)

    @property
    def local_engine_pct(self) -> int:
        """% of results resolved without deep verification."""
        if self.total_count == 0:
            return 0
        local = self.total_count - self.deep_checks_made
        return int(local / self.total_count * 100)


class VerificationResult(models.Model):
    STATUS_VALID   = 'valid'
    STATUS_INVALID = 'invalid'
    STATUS_RISKY   = 'risky'
    STATUS_UNKNOWN = 'unknown'

    STATUS_CHOICES = [
        (STATUS_VALID,   'Valid'),
        (STATUS_INVALID, 'Invalid'),
        (STATUS_RISKY,   'Risky'),
        (STATUS_UNKNOWN, 'Unknown'),
    ]

    id   = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    job  = models.ForeignKey(
        BulkJob, null=True, blank=True, on_delete=models.CASCADE, related_name='results'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='verification_results'
    )

    email      = models.CharField(max_length=320, db_index=True)
    domain     = models.CharField(max_length=255, blank=True, db_index=True)
    status     = models.CharField(max_length=20, choices=STATUS_CHOICES)
    sub_status = models.CharField(max_length=50, blank=True)
    score      = models.SmallIntegerField(default=0)

    is_disposable = models.BooleanField(default=False)
    is_role_based = models.BooleanField(default=False)
    is_catch_all  = models.BooleanField(default=False)
    is_free_email = models.BooleanField(default=False)
    mx_found      = models.BooleanField(default=False)
    smtp_valid    = models.BooleanField(null=True)
    mx_record     = models.CharField(max_length=255, blank=True, default='')

    deep_check_used = models.BooleanField(default=False)
    esp             = models.CharField(max_length=80, blank=True, default='')
    elv_code        = models.CharField(max_length=50, blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'verification_result'
        ordering = ['-created_at']
        indexes  = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['job', 'status']),
        ]

    def __str__(self):
        return f'{self.email} → {self.status} ({self.score})'
