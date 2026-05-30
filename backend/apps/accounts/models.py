import uuid
import secrets
import hashlib
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.utils import timezone


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra):
        if not email:
            raise ValueError('Email is required')
        email = self.normalize_email(email)
        extra.setdefault('username', email)
        user = self.model(email=email, **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra):
        extra.setdefault('is_staff', True)
        extra.setdefault('is_superuser', True)
        return self.create_user(email, password, **extra)


class User(AbstractUser):
    PLAN_FREE    = 'free'
    PLAN_STARTER = 'starter'
    PLAN_GROWTH  = 'growth'
    PLAN_PRO     = 'pro'
    PLAN_ENTERPRISE = 'enterprise'

    PLAN_CHOICES = [
        (PLAN_FREE,       'Free'),
        (PLAN_STARTER,    'Starter'),
        (PLAN_GROWTH,     'Growth'),
        (PLAN_PRO,        'Pro'),
        (PLAN_ENTERPRISE, 'Enterprise'),
    ]

    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email      = models.EmailField(unique=True)
    full_name  = models.CharField(max_length=255, blank=True)
    username   = models.CharField(max_length=150, unique=True, blank=True)

    plan       = models.CharField(max_length=20, choices=PLAN_CHOICES, default=PLAN_FREE)
    credits    = models.PositiveIntegerField(default=100)  # 100 on signup (free plan)
    subscription_expires_at = models.DateTimeField(null=True, blank=True)

    timezone         = models.CharField(max_length=50, default='UTC')
    email_verified   = models.BooleanField(default=False)
    two_factor_enabled = models.BooleanField(default=False)

    # Notification preferences
    notify_low_credits  = models.BooleanField(default=True)
    notify_job_complete = models.BooleanField(default=True)
    notify_blacklist    = models.BooleanField(default=True)

    stripe_customer_id = models.CharField(max_length=100, blank=True)

    # Developer webhook
    webhook_url    = models.URLField(max_length=500, blank=True, default='')
    webhook_secret = models.CharField(max_length=64, blank=True, default='')

    # Referral program
    referral_code           = models.CharField(max_length=12, unique=True, blank=True, db_index=True)
    referred_by             = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL, related_name='referrals')
    referral_credits_earned = models.PositiveIntegerField(default=0)

    USERNAME_FIELD  = 'email'
    REQUIRED_FIELDS = []

    objects = UserManager()

    class Meta:
        db_table = 'accounts_user'

    def __str__(self):
        return self.email

    def save(self, *args, **kwargs):
        if not self.username:
            self.username = self.email
        if not self.referral_code:
            self.referral_code = secrets.token_urlsafe(8)[:8].upper()
        super().save(*args, **kwargs)

    @property
    def plan_display(self):
        return dict(self.PLAN_CHOICES).get(self.plan, self.plan)

    @property
    def subscription_active(self):
        """Free plan always active. Paid plans require a non-expired subscription_expires_at."""
        if self.plan == self.PLAN_FREE:
            return True
        return bool(self.subscription_expires_at and self.subscription_expires_at >= timezone.now())


class APIKey(models.Model):
    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user       = models.ForeignKey(User, on_delete=models.CASCADE, related_name='api_keys')
    name       = models.CharField(max_length=100, default='Default')
    key_hash   = models.CharField(max_length=64, db_index=True)  # SHA-256 hex
    prefix     = models.CharField(max_length=12)                  # first 10 chars for display
    is_active  = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_used_at = models.DateTimeField(null=True, blank=True)
    requests_count = models.PositiveBigIntegerField(default=0)

    class Meta:
        db_table = 'accounts_apikey'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.user.email} — {self.name} ({self.prefix}…)'

    @classmethod
    def generate(cls, user, name='Default'):
        """Create a new API key. Returns (instance, raw_key). raw_key shown once only."""
        raw_key  = 'bt_' + secrets.token_urlsafe(36)
        key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
        prefix   = raw_key[:10]
        instance = cls.objects.create(user=user, name=name, key_hash=key_hash, prefix=prefix)
        return instance, raw_key

    @staticmethod
    def hash_key(raw_key: str) -> str:
        return hashlib.sha256(raw_key.encode()).hexdigest()

    def touch(self):
        self.last_used_at = timezone.now()
        self.requests_count = models.F('requests_count') + 1
        self.save(update_fields=['last_used_at', 'requests_count'])
