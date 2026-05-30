import uuid
from django.db import models
from django.conf import settings


class CreditLedger(models.Model):
    """Append-only ledger. Every credit change (use, purchase, subscription, rollover) is a row."""

    OP_USED         = 'used'
    OP_PURCHASE     = 'purchase'
    OP_SUBSCRIPTION = 'subscription'
    OP_BONUS        = 'bonus'
    OP_REFUND       = 'refund'
    OP_ROLLOVER     = 'rollover'

    OPERATION_CHOICES = [
        (OP_USED,         'Used'),
        (OP_PURCHASE,     'Purchase'),
        (OP_SUBSCRIPTION, 'Subscription'),
        (OP_BONUS,        'Bonus'),
        (OP_REFUND,       'Refund'),
        (OP_ROLLOVER,     'Rollover'),
    ]

    id            = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user          = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='credit_ledger'
    )
    amount        = models.IntegerField()           # positive = added, negative = used
    operation     = models.CharField(max_length=20, choices=OPERATION_CHOICES)
    reference     = models.CharField(max_length=255, blank=True)  # e.g. "bulk:job-id" or "stripe:inv_xxx"
    balance_after = models.IntegerField()
    notes         = models.CharField(max_length=500, blank=True)
    created_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'billing_credit_ledger'
        ordering = ['-created_at']
        indexes  = [models.Index(fields=['user', '-created_at'])]

    def __str__(self):
        sign = '+' if self.amount >= 0 else ''
        return f'{self.user.email} {sign}{self.amount} [{self.operation}] → {self.balance_after}'


class CoinbaseCharge(models.Model):
    """Tracks every Coinbase Commerce charge so we can match webhooks to users."""

    STATUS_PENDING   = 'pending'
    STATUS_CONFIRMED = 'confirmed'
    STATUS_FAILED    = 'failed'
    STATUS_EXPIRED   = 'expired'
    STATUS_CHOICES = [
        (STATUS_PENDING,   'Pending'),
        (STATUS_CONFIRMED, 'Confirmed'),
        (STATUS_FAILED,    'Failed'),
        (STATUS_EXPIRED,   'Expired'),
    ]

    id             = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user           = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='coinbase_charges')
    charge_id      = models.CharField(max_length=100, unique=True)   # Coinbase charge id
    charge_code    = models.CharField(max_length=20, blank=True)     # short human-readable code
    plan           = models.CharField(max_length=20)
    billing_period = models.CharField(max_length=10)                  # monthly / yearly
    amount_usd     = models.DecimalField(max_digits=10, decimal_places=2)
    credits_to_add = models.PositiveIntegerField()
    status         = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    created_at     = models.DateTimeField(auto_now_add=True)
    resolved_at    = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'billing_coinbase_charge'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.user.email} → {self.plan} ({self.billing_period}) [{self.status}]'


class NowPaymentsInvoice(models.Model):
    """Tracks every NOWPayments invoice so we can match IPN callbacks to users."""

    STATUS_WAITING   = 'waiting'
    STATUS_CONFIRMING = 'confirming'
    STATUS_CONFIRMED = 'confirmed'
    STATUS_FINISHED  = 'finished'
    STATUS_FAILED    = 'failed'
    STATUS_EXPIRED   = 'expired'
    STATUS_CHOICES = [
        (STATUS_WAITING,    'Waiting'),
        (STATUS_CONFIRMING, 'Confirming'),
        (STATUS_CONFIRMED,  'Confirmed'),
        (STATUS_FINISHED,   'Finished'),
        (STATUS_FAILED,     'Failed'),
        (STATUS_EXPIRED,    'Expired'),
    ]

    TYPE_PLAN = 'plan'
    TYPE_PACK = 'pack'
    TYPE_CHOICES = [(TYPE_PLAN, 'Plan'), (TYPE_PACK, 'Credit Pack')]

    id             = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user           = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='nowpayments_invoices')
    invoice_id     = models.CharField(max_length=100, unique=True)
    invoice_url    = models.URLField(max_length=500)
    order_id       = models.CharField(max_length=100, unique=True)  # our internal UUID
    invoice_type   = models.CharField(max_length=10, choices=TYPE_CHOICES, default=TYPE_PLAN)
    plan           = models.CharField(max_length=20)
    billing_period = models.CharField(max_length=10, blank=True)
    amount_usd     = models.DecimalField(max_digits=10, decimal_places=2)
    credits_to_add = models.PositiveIntegerField()
    status         = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_WAITING)
    created_at     = models.DateTimeField(auto_now_add=True)
    resolved_at    = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'billing_nowpayments_invoice'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.user.email} → {self.plan} ({self.billing_period}) [{self.status}]'


class CreditPack(models.Model):
    """Pay-as-you-go credit packs (FR-BILL-03)."""
    name        = models.CharField(max_length=100)
    credits     = models.PositiveIntegerField()
    price_usd   = models.DecimalField(max_digits=8, decimal_places=2)
    stripe_price_id = models.CharField(max_length=100, blank=True)
    is_active   = models.BooleanField(default=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'billing_credit_pack'
        ordering = ['credits']

    def __str__(self):
        return f'{self.name} — {self.credits:,} credits @ ${self.price_usd}'
