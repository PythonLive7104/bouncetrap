"""
10-step hybrid verification pipeline (PRD §4.1).
Steps 1–8 run locally (no external credits).
Step 9 calls deep verification only when status is still unknown after step 8.
Step 10 calculates the deliverability score.
"""
import re
import logging
from dataclasses import dataclass, field
from typing import Optional

from .dns_checker    import check_mx
from .deep_client    import deep_verify, detect_esp
from .kickbox_client import kickbox_verify, KickboxCreditsExhausted

logger = logging.getLogger(__name__)

# ── Static data ────────────────────────────────────────────────────────────

DISPOSABLE_DOMAINS: set[str] = {
    'mailinator.com', 'guerrillamail.com', 'temp-mail.org', 'throwam.com',
    'yopmail.com', 'sharklasers.com', 'guerrillamailblock.com', 'grr.la',
    'guerrillamail.info', 'guerrillamail.biz', 'guerrillamail.de',
    'guerrillamail.net', 'guerrillamail.org', 'spam4.me', 'trashmail.com',
    'trashmail.at', 'trashmail.io', 'trashmail.me', 'dispostable.com',
    'fakeinbox.com', 'spamgourmet.com', 'mytemp.email', 'tempinbox.com',
    'tempr.email', 'discard.email', 'mailnull.com', 'spamspot.com',
    'wegwerfmail.de', 'wegwerfmail.net', 'wegwerfmail.org', 'sogetthis.com',
    'mailexpire.com', 'throwam.com', 'maildrop.cc', 'filzmail.de',
    'throwam.com', 'spamgourmet.net', 'spamgourmet.org', 'trashmail.net',
    '10minutemail.com', '10minutemail.net', 'minutemail.com',
    'tempmail.com', 'tempmail.net', 'tempmail.org', 'temp-mail.ru',
    'getairmail.com', 'notsharingmy.info', 'meltmail.com', 'incognitomail.org',
    # Load the full 50k+ list from a file in production — see DISPOSABLE_DOMAIN_FILE setting
}

ROLE_PREFIXES: set[str] = {
    'admin', 'info', 'support', 'help', 'contact', 'sales', 'marketing',
    'noreply', 'no-reply', 'bounce', 'mailer', 'webmaster', 'hostmaster',
    'postmaster', 'abuse', 'root', 'security', 'billing', 'accounts',
    'jobs', 'careers', 'press', 'media', 'newsletter', 'notifications',
    'alerts', 'team', 'office', 'mail', 'hello', 'hr', 'finance',
}

FREE_PROVIDERS: set[str] = {
    'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.uk', 'yahoo.co.in',
    'hotmail.com', 'hotmail.co.uk', 'outlook.com', 'live.com', 'msn.com',
    'aol.com', 'icloud.com', 'me.com', 'mac.com', 'protonmail.com',
    'proton.me', 'tutanota.com', 'zoho.com', 'yandex.com', 'yandex.ru',
    'mail.com', 'gmx.com', 'gmx.net', 'fastmail.com', 'fastmail.fm',
    'hushmail.com', 'inbox.com', 'rediffmail.com', 'mail.ru',
}

EMAIL_REGEX = re.compile(
    r'^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$'
)


# ── Result dataclass ───────────────────────────────────────────────────────

@dataclass
class VerificationResult:
    email:        str
    status:       str = 'unknown'           # valid | invalid | risky | unknown
    sub_status:   str = ''
    score:        int = 100
    is_disposable: bool = False
    is_role_based: bool = False
    is_catch_all:  bool = False
    is_free_email: bool = False
    mx_found:      bool = False
    smtp_valid:    Optional[bool] = None
    mx_record:     str = ''
    domain:        str = ''
    deep_check_used: bool = False
    esp:           str = ''
    elv_code:      str = ''
    flags:         dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            'email':           self.email,
            'status':          self.status,
            'sub_status':      self.sub_status,
            'score':           self.score,
            'is_disposable':   self.is_disposable,
            'is_role_based':   self.is_role_based,
            'is_catch_all':    self.is_catch_all,
            'is_free_email':   self.is_free_email,
            'mx_found':        self.mx_found,
            'smtp_valid':      self.smtp_valid,
            'mx_record':       self.mx_record,
            'domain':          self.domain,
            'deep_check_used': self.deep_check_used,
            'esp':             self.esp,
            'elv_code':        self.elv_code,
            'account':         self.email.split('@')[0] if '@' in self.email else '',
        }


# ── Score calculator (PRD §4.4) ────────────────────────────────────────────

def _calculate_score(r: VerificationResult) -> int:
    if r.status == 'invalid':
        return 0

    score = 100
    if r.smtp_valid is False:
        score -= 60
    if r.status == 'unknown' and not r.deep_check_used:
        score -= 40
    if r.is_disposable:
        score -= 30
    if r.smtp_valid is None:
        score -= 25
    if r.is_catch_all:
        score -= 20
    if r.is_role_based:
        score -= 15
    if r.is_free_email:
        score -= 5

    return max(score, 0)


# ── Pipeline ───────────────────────────────────────────────────────────────

def verify_email(email: str, plan: str = 'free') -> VerificationResult:
    """
    Run the full 10-step hybrid pipeline for a single email address.
    Step 9 uses Kickbox for free plan users and the deep verification service for paid plans.
    """
    r = VerificationResult(email=email.strip().lower())

    # ── Step 1: Syntax validation ────────────────────────────────────────
    if not EMAIL_REGEX.match(r.email):
        r.status     = 'invalid'
        r.sub_status = 'syntax_error'
        r.score      = 0
        return r

    local, domain = r.email.rsplit('@', 1)
    r.domain = domain

    # ── Step 2: Disposable detection ────────────────────────────────────
    if domain in DISPOSABLE_DOMAINS:
        r.is_disposable = True
        r.status        = 'invalid'
        r.sub_status    = 'disposable'
        r.score         = _calculate_score(r)
        return r

    # ── Step 3: Role-based detection ────────────────────────────────────
    if local.lower() in ROLE_PREFIXES:
        r.is_role_based = True

    # ── Step 4: Free email provider ─────────────────────────────────────
    r.is_free_email = domain in FREE_PROVIDERS

    # ── Step 5: MX record lookup ─────────────────────────────────────────
    mx_found, mx_record = check_mx(domain)
    r.mx_found  = mx_found
    r.mx_record = mx_record
    r.esp = detect_esp(domain, mx_record)

    if not mx_found:
        r.status     = 'invalid'
        r.sub_status = 'mx_not_found'
        r.score      = _calculate_score(r)
        return r

    # ── Steps 6–8: Deferred to external API (Step 9) ────────────────────
    # SMTP probing removed — Kickbox (free plan) and ELV (paid plans)
    # provide authoritative mailbox and catch-all results.
    r.status     = 'unknown'
    r.sub_status = 'pending_external_check'

    # ── Step 9: External verification — Kickbox for free plan, ELV for paid
    # When Kickbox credits are exhausted, fall back to EmailListVerify (ELV).
    if plan == 'free':
        try:
            deep_result = kickbox_verify(r.email)
        except KickboxCreditsExhausted:
            logger.warning(
                'Kickbox credits exhausted — falling back to EmailListVerify for %s',
                r.email,
            )
            deep_result = deep_verify(r.email)
    else:
        deep_result = deep_verify(r.email)
    if deep_result:
        r.status          = deep_result['status']
        r.sub_status      = deep_result['sub_status']
        r.elv_code        = deep_result['elv_code']
        r.deep_check_used = True
        # Sync catch-all flag from deep check
        if deep_result['elv_code'] == 'ok_for_all':
            r.is_catch_all = True

    # ── Step 10: Score calculation ───────────────────────────────────────
    r.score = _calculate_score(r)

    # Final risky resolution for role-based on valid domains
    if r.status == 'valid' and r.is_role_based:
        r.status     = 'risky'
        r.sub_status = 'role_based'
        r.score      = _calculate_score(r)

    return r
