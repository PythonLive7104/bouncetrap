"""
Deep verification via external API.
Vendor identity is internal — never surfaced in API responses, logs, or field names.
Called for EVERY email to get the most accurate result.
"""
import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)

# Maps the API's actual response strings → (internal_status, sub_status)
_STATUS_MAP = {
    'ok':                  ('valid',   'ok'),
    'ok_for_all':          ('risky',   'catch_all'),
    'invalid':             ('invalid', 'mailbox_not_found'),
    'email_disabled':      ('invalid', 'mailbox_not_found'),
    'dead_server':         ('invalid', 'no_mx_records'),
    'disposable':          ('invalid', 'disposable'),
    'spamtrap':            ('invalid', 'spam_trap'),
    'abuse':               ('risky',   'abuse'),
    'do_not_mail':         ('invalid', 'do_not_mail'),
    'role_based':          ('risky',   'role_based'),
    'accept_all':          ('risky',   'catch_all'),
    'catch_all':           ('risky',   'catch_all'),
    'global_suppression':  ('invalid', 'global_suppression'),
    'antispam_system':     ('unknown', 'smtp_timeout'),
    'unknown':             ('unknown', 'deep_check_inconclusive'),
    'timeout':             ('unknown', 'smtp_timeout'),
}

# Detect ESP from domain
_DOMAIN_ESP = {
    'gmail.com':        'Google',  'googlemail.com':  'Google',
    'outlook.com':      'Microsoft', 'hotmail.com':   'Microsoft',
    'hotmail.co.uk':    'Microsoft', 'live.com':      'Microsoft',
    'msn.com':          'Microsoft', 'hotmail.fr':    'Microsoft',
    'yahoo.com':        'Yahoo',   'yahoo.co.uk':     'Yahoo',
    'yahoo.co.in':      'Yahoo',   'yahoo.fr':        'Yahoo',
    'icloud.com':       'Apple',   'me.com':          'Apple',
    'mac.com':          'Apple',
    'protonmail.com':   'Proton',  'proton.me':       'Proton',
    'zoho.com':         'Zoho',
    'yandex.com':       'Yandex',  'yandex.ru':       'Yandex',
    'mail.ru':          'Mail.ru',
    'gmx.com':          'GMX',     'gmx.net':         'GMX',
    'fastmail.com':     'Fastmail','fastmail.fm':      'Fastmail',
    'aol.com':          'AOL',
    'tutanota.com':     'Tutanota',
}

# Detect ESP from MX record hostname
_MX_ESP = {
    'google':       'Google',
    'outlook':      'Microsoft',
    'office365':    'Microsoft',
    'protection.outlook': 'Microsoft',
    'yahoo':        'Yahoo',
    'icloud':       'Apple',
    'protonmail':   'Proton',
    'zoho':         'Zoho',
    'yandex':       'Yandex',
    'amazonses':    'Amazon SES',
    'sendgrid':     'SendGrid',
    'mailgun':      'Mailgun',
    'mandrillapp':  'Mandrill',
    'mimecast':     'Mimecast',
    'pphosted':     'Proofpoint',
    'barracuda':    'Barracuda',
}


def detect_esp(domain: str, mx_record: str = '') -> str:
    """Detect the email service provider from domain or MX record."""
    esp = _DOMAIN_ESP.get(domain.lower(), '')
    if esp:
        return esp
    mx = mx_record.lower()
    for fragment, name in _MX_ESP.items():
        if fragment in mx:
            return name
    return ''


def deep_verify(email: str) -> dict | None:
    """
    Calls the verification service for a single email.
    Returns dict with keys: status, sub_status, elv_code — or None on error.
    """
    api_key = settings.DEEP_VERIFY_API_KEY
    api_url = settings.DEEP_VERIFY_API_URL or 'https://apps.emaillistverify.com/api/verifyEmail'

    if not api_key:
        return None

    try:
        resp = requests.get(
            api_url,
            params={'secret': api_key, 'email': email},
            timeout=15,
        )
        resp.raise_for_status()
        raw = resp.text.strip().lower()
        status, sub_status = _STATUS_MAP.get(raw, ('unknown', 'deep_check_inconclusive'))
        return {'status': status, 'sub_status': sub_status, 'elv_code': raw}
    except requests.RequestException as e:
        logger.warning('Deep verification request failed for %s: %s', email, e)
        return None
