"""Atomic credit operations. SR-10: select_for_update() prevents race conditions."""
from django.db import transaction
from django.contrib.auth import get_user_model
from .models import CreditLedger

User = get_user_model()


class InsufficientCredits(Exception):
    pass


class SubscriptionExpired(Exception):
    pass


@transaction.atomic
def deduct_credits(user_id: int | str, amount: int, operation: str = 'used', reference: str = '') -> int:
    """
    Atomically deduct `amount` credits from user.
    Credits-only model — no subscription expiry, credits never lock.
    Raises InsufficientCredits if balance is too low.
    Returns the new balance.
    """
    user = User.objects.select_for_update().get(pk=user_id)

    if user.credits < amount:
        raise InsufficientCredits(
            f'Insufficient credits: need {amount}, have {user.credits}.'
        )

    user.credits -= amount
    user.save(update_fields=['credits'])

    CreditLedger.objects.create(
        user          = user,
        amount        = -amount,
        operation     = operation,
        reference     = reference,
        balance_after = user.credits,
    )
    return user.credits


@transaction.atomic
def add_credits(user_id: int | str, amount: int, operation: str, reference: str = '', notes: str = '') -> int:
    """Atomically add `amount` credits to user. Returns new balance."""
    user = User.objects.select_for_update().get(pk=user_id)
    user.credits += amount
    user.save(update_fields=['credits'])

    CreditLedger.objects.create(
        user          = user,
        amount        = amount,
        operation     = operation,
        reference     = reference,
        balance_after = user.credits,
        notes         = notes,
    )
    return user.credits


def check_low_credit_threshold(user) -> bool:
    """FR-DASH-06 — True if user has used ≥ 80% of plan credits."""
    from django.conf import settings
    plan_total = settings.PLAN_CREDITS.get(user.plan, 0)
    if plan_total == 0:
        return False
    used_pct = (plan_total - user.credits) / plan_total * 100
    return used_pct >= 80
