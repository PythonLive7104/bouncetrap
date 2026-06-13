"""
Kickbox email verification client — used for free plan users (Step 9).
Paid plans use the deep verification service instead.
"""
import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)


class KickboxCreditsExhausted(Exception):
    """Raised when Kickbox rejects a request due to insufficient balance/credits."""


_RESULT_MAP = {
    'deliverable':   ('valid',   'ok'),
    'undeliverable': ('invalid', 'mailbox_not_found'),
    'risky':         ('risky',   'catch_all'),
    'unknown':       ('unknown', 'deep_check_inconclusive'),
}

# Substrings Kickbox uses when the account is out of credits.
_CREDIT_ERROR_HINTS = ('insufficient', 'balance', 'credit')


def _is_credit_error(message: str) -> bool:
    msg = (message or '').lower()
    return any(hint in msg for hint in _CREDIT_ERROR_HINTS)


def kickbox_verify(email: str) -> dict | None:
    """
    Verify a single email via Kickbox API v2.
    Returns dict with keys: status, sub_status, elv_code — or None on error/no key.
    Raises KickboxCreditsExhausted when the account has run out of credits, so
    callers can fall back to another verification provider.
    """
    api_key = getattr(settings, 'KICKBOX_API_KEY', '')
    if not api_key:
        return None

    try:
        resp = requests.get(
            'https://api.kickbox.com/v2/verify',
            params={'email': email, 'apikey': api_key},
            timeout=15,
        )
    except Exception as e:
        logger.warning('Kickbox verification failed for %s: %s', email, e)
        return None

    # Try to parse a body even on error responses to read the message.
    try:
        data = resp.json()
    except ValueError:
        data = {}

    message = data.get('message', '')

    # HTTP 402 Payment Required, or an "insufficient balance" message, means
    # credits are exhausted — signal the caller to fall back to another provider.
    if resp.status_code == 402 or _is_credit_error(message):
        logger.warning('Kickbox credits exhausted for %s: %s', email, message)
        raise KickboxCreditsExhausted(message or 'Insufficient Kickbox balance')

    try:
        resp.raise_for_status()
    except Exception as e:
        logger.warning('Kickbox verification failed for %s: %s', email, e)
        return None

    if not data.get('success'):
        logger.warning('Kickbox returned success=false for %s: %s', email, message)
        return None

    result = data.get('result', 'unknown')
    status, sub_status = _RESULT_MAP.get(result, ('unknown', 'deep_check_inconclusive'))

    # Narrow sub_status using Kickbox flags
    if result == 'undeliverable' and data.get('disposable'):
        sub_status = 'disposable'
    elif result == 'risky' and data.get('role'):
        sub_status = 'role_based'
    elif result == 'risky' and data.get('accept_all'):
        sub_status = 'catch_all'

    return {'status': status, 'sub_status': sub_status, 'elv_code': result}
