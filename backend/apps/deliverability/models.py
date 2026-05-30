import uuid
from django.db import models
from django.conf import settings


class InboxPlacementTest(models.Model):
    STATUS_PENDING    = 'pending'
    STATUS_SENT       = 'sent'
    STATUS_CHECKING   = 'checking'
    STATUS_DONE       = 'done'
    STATUS_FAILED     = 'failed'

    STATUS_CHOICES = [
        (STATUS_PENDING,  'Pending'),
        (STATUS_SENT,     'Sent'),
        (STATUS_CHECKING, 'Checking'),
        (STATUS_DONE,     'Done'),
        (STATUS_FAILED,   'Failed'),
    ]

    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user         = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='inbox_tests')
    subject_line = models.CharField(max_length=255)
    body_text    = models.TextField(blank=True)
    test_token   = models.CharField(max_length=64, unique=True, db_index=True)
    status       = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    celery_task_id = models.CharField(max_length=255, blank=True)
    error_message  = models.TextField(blank=True)
    created_at   = models.DateTimeField(auto_now_add=True)
    sent_at      = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'deliverability_inbox_test'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.user.email} — {self.subject_line[:40]} ({self.status})'


class InboxPlacementResult(models.Model):
    PLACEMENT_INBOX   = 'inbox'
    PLACEMENT_SPAM    = 'spam'
    PLACEMENT_MISSING = 'missing'

    PLACEMENT_CHOICES = [
        (PLACEMENT_INBOX,   'Inbox'),
        (PLACEMENT_SPAM,    'Spam/Junk'),
        (PLACEMENT_MISSING, 'Not found'),
    ]

    id        = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    test      = models.ForeignKey(InboxPlacementTest, on_delete=models.CASCADE, related_name='results')
    provider  = models.CharField(max_length=50)      # gmail, outlook, yahoo
    seed_email = models.CharField(max_length=255)
    placement = models.CharField(max_length=20, choices=PLACEMENT_CHOICES, default=PLACEMENT_MISSING)
    checked_at = models.DateTimeField(null=True, blank=True)
    raw_headers = models.TextField(blank=True)

    class Meta:
        db_table = 'deliverability_inbox_result'
        unique_together = [('test', 'seed_email')]

    def __str__(self):
        return f'{self.provider} → {self.placement}'
