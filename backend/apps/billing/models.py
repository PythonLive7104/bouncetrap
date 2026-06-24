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


class CryptoDeposit(models.Model):
    """Tracks a manual USDT deposit so an admin can confirm it and credit the user.

    Flow: user creates a deposit (pending) → sends USDT to the network's static
    wallet and submits their transaction hash (submitted) → an admin verifies it
    on-chain and approves (confirmed) or rejects it.
    """

    STATUS_PENDING   = 'pending'      # created, waiting for the user to pay & submit a tx hash
    STATUS_SUBMITTED = 'submitted'    # tx hash provided, awaiting admin verification
    STATUS_CONFIRMED = 'confirmed'    # admin verified on-chain, credits granted
    STATUS_REJECTED  = 'rejected'     # admin could not verify the payment
    STATUS_CHOICES = [
        (STATUS_PENDING,   'Pending'),
        (STATUS_SUBMITTED, 'Submitted'),
        (STATUS_CONFIRMED, 'Confirmed'),
        (STATUS_REJECTED,  'Rejected'),
    ]

    NETWORK_ERC20 = 'erc20'
    NETWORK_BEP20 = 'bep20'
    NETWORK_TRC20 = 'trc20'
    NETWORK_CHOICES = [
        (NETWORK_ERC20, 'Ethereum (ERC20)'),
        (NETWORK_BEP20, 'BSC (BEP20)'),
        (NETWORK_TRC20, 'TRON (TRC20)'),
    ]

    TYPE_PLAN = 'plan'
    TYPE_PACK = 'pack'
    TYPE_CHOICES = [(TYPE_PLAN, 'Plan'), (TYPE_PACK, 'Credit Pack')]

    id             = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user           = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='crypto_deposits')
    network        = models.CharField(max_length=10, choices=NETWORK_CHOICES)
    wallet_address = models.CharField(max_length=120)                 # receiving address shown to the user
    tx_hash        = models.CharField(max_length=120, blank=True, db_index=True)  # submitted by the user
    invoice_type   = models.CharField(max_length=10, choices=TYPE_CHOICES, default=TYPE_PLAN)
    plan           = models.CharField(max_length=20)
    billing_period = models.CharField(max_length=10, blank=True)
    amount_usd     = models.DecimalField(max_digits=10, decimal_places=2)   # USDT amount to send (1:1 with USD)
    credits_to_add = models.PositiveIntegerField()
    status         = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    created_at     = models.DateTimeField(auto_now_add=True)
    resolved_at    = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'billing_crypto_deposit'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.user.email} → {self.plan} ({self.get_network_display()}) [{self.status}]'

    def confirm(self):
        """Mark the deposit confirmed and credit the user. Idempotent and atomic.

        Returns True if it credited the user, False if it was already confirmed.
        """
        from django.db import transaction
        from django.utils import timezone

        # Loyalty reward card — every completed purchase earns one stamp; collect
        # 10 and the next reward grants free credits automatically.
        LOYALTY_STAMPS_REQUIRED = 10
        LOYALTY_REWARD_CREDITS  = 25_000

        with transaction.atomic():
            deposit = CryptoDeposit.objects.select_for_update().get(pk=self.pk)
            if deposit.status == CryptoDeposit.STATUS_CONFIRMED:
                return False

            deposit.status      = CryptoDeposit.STATUS_CONFIRMED
            deposit.resolved_at = timezone.now()
            deposit.save(update_fields=['status', 'resolved_at'])

            user          = deposit.user
            user.credits += deposit.credits_to_add

            # Credits-only model: every purchase tops up credits and unlocks full
            # feature access (plan='paid'). Nothing ever expires.
            UserModel = user.__class__
            if user.plan == 'free':
                user.plan = UserModel.PLAN_PAID

            if deposit.invoice_type == CryptoDeposit.TYPE_PACK:
                notes = f'Credit pack {deposit.plan} via USDT ({deposit.get_network_display()})'
            else:
                notes = f'{deposit.credits_to_add:,} credits via USDT ({deposit.get_network_display()})'

            # ── Loyalty reward card — every purchase earns one stamp ──────
            user.loyalty_stamps += 1
            reward_won = False
            if user.loyalty_stamps >= LOYALTY_STAMPS_REQUIRED:
                user.loyalty_stamps         -= LOYALTY_STAMPS_REQUIRED
                user.loyalty_rewards_earned += 1
                user.credits                += LOYALTY_REWARD_CREDITS
                reward_won = True

            user.save(update_fields=['plan', 'credits', 'loyalty_stamps', 'loyalty_rewards_earned'])

            CreditLedger.objects.create(
                user          = user,
                amount        = deposit.credits_to_add,
                operation     = CreditLedger.OP_PURCHASE,
                reference     = f'usdt:{deposit.tx_hash or deposit.id}',
                balance_after = user.credits - (LOYALTY_REWARD_CREDITS if reward_won else 0),
                notes         = notes,
            )

            if reward_won:
                CreditLedger.objects.create(
                    user          = user,
                    amount        = LOYALTY_REWARD_CREDITS,
                    operation     = CreditLedger.OP_BONUS,
                    reference     = f'loyalty:reward:{user.loyalty_rewards_earned}',
                    balance_after = user.credits,
                    notes         = f'Loyalty reward — {LOYALTY_STAMPS_REQUIRED} purchases completed 🎉',
                )

        return True


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
