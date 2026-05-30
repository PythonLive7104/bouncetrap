"""
Inbox Placement Celery task — FR-DELIV-03.
Sends a test email to each seed account and checks inbox vs spam via IMAP.
"""
import imaplib
import logging
import smtplib
import time
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from celery import shared_task
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)

IMAP_SEARCH_DELAY = 30   # seconds to wait after sending before checking
IMAP_TIMEOUT      = 15


def _send_test_email(to_address: str, subject: str, body: str, token: str) -> bool:
    """Send a test message to one seed address. Returns True on success."""
    msg = MIMEMultipart('alternative')
    msg['From']    = getattr(settings, 'DEFAULT_FROM_EMAIL', 'test@bouncetrap.io')
    msg['To']      = to_address
    msg['Subject'] = subject
    msg['X-BounceTrap-Token'] = token

    text_body = body or f'BounceTrap inbox placement test. Token: {token}'
    html_body = f'<p>{text_body}</p><p style="color:#999;font-size:11px;">Token: {token}</p>'
    msg.attach(MIMEText(text_body, 'plain'))
    msg.attach(MIMEText(html_body, 'html'))

    try:
        host = getattr(settings, 'EMAIL_HOST', 'smtp.sendgrid.net')
        port = getattr(settings, 'EMAIL_PORT', 587)
        user = getattr(settings, 'EMAIL_HOST_USER', '')
        pwd  = getattr(settings, 'EMAIL_HOST_PASSWORD', '')

        with smtplib.SMTP(host, port, timeout=20) as smtp:
            smtp.ehlo()
            smtp.starttls()
            smtp.ehlo()
            if user and pwd:
                smtp.login(user, pwd)
            smtp.sendmail(msg['From'], [to_address], msg.as_string())
        return True
    except Exception as exc:
        logger.warning('Failed to send test email to %s: %s', to_address, exc)
        return False


def _check_imap(acct: dict, token: str) -> str:
    """
    Check inbox and spam folders for the message with our token.
    Returns 'inbox', 'spam', or 'missing'.
    """
    host  = acct['imap_host']
    port  = acct.get('imap_port', 993)
    email = acct['email']
    pwd   = acct['password']

    FOLDER_MAP = {
        'gmail':   {'inbox': 'INBOX', 'spam': '[Gmail]/Spam'},
        'outlook': {'inbox': 'INBOX', 'spam': 'Junk'},
        'yahoo':   {'inbox': 'INBOX', 'spam': 'Bulk Mail'},
    }
    folders = FOLDER_MAP.get(acct['provider'], {'inbox': 'INBOX', 'spam': 'INBOX'})

    try:
        mail = imaplib.IMAP4_SSL(host, port)
        mail.login(email, pwd)

        search_crit = f'(HEADER X-BounceTrap-Token {token})'

        # Check inbox
        mail.select(folders['inbox'])
        _, data = mail.search(None, search_crit)
        if data[0]:
            mail.logout()
            return 'inbox'

        # Check spam
        mail.select(folders['spam'])
        _, data = mail.search(None, search_crit)
        if data[0]:
            mail.logout()
            return 'spam'

        mail.logout()
        return 'missing'
    except Exception as exc:
        logger.warning('IMAP check failed for %s (%s): %s', email, acct['provider'], exc)
        return 'missing'


@shared_task(bind=True, max_retries=2, default_retry_delay=60)
def run_inbox_placement_test(self, test_id: str):
    from .models import InboxPlacementTest, InboxPlacementResult

    try:
        test = InboxPlacementTest.objects.select_related('user').get(pk=test_id)
    except InboxPlacementTest.DoesNotExist:
        logger.error('InboxPlacementTest %s not found', test_id)
        return

    seed_accounts = getattr(settings, 'INBOX_SEED_ACCOUNTS', [])
    if not seed_accounts:
        test.status        = InboxPlacementTest.STATUS_FAILED
        test.error_message = 'No seed accounts configured.'
        test.completed_at  = timezone.now()
        test.save()
        return

    test.status  = InboxPlacementTest.STATUS_SENT
    test.sent_at = timezone.now()
    test.save(update_fields=['status', 'sent_at'])

    # Send to all seed accounts
    sent_to = []
    for acct in seed_accounts:
        ok = _send_test_email(acct['email'], test.subject_line, test.body_text, test.test_token)
        if ok:
            sent_to.append(acct)

    if not sent_to:
        test.status        = InboxPlacementTest.STATUS_FAILED
        test.error_message = 'Failed to send to any seed accounts.'
        test.completed_at  = timezone.now()
        test.save()
        return

    # Wait for delivery
    time.sleep(IMAP_SEARCH_DELAY)

    test.status = InboxPlacementTest.STATUS_CHECKING
    test.save(update_fields=['status'])

    # Check each account
    for acct in sent_to:
        placement = _check_imap(acct, test.test_token)
        InboxPlacementResult.objects.filter(
            test=test, seed_email=acct['email']
        ).update(
            placement=placement,
            checked_at=timezone.now(),
        )

    test.status       = InboxPlacementTest.STATUS_DONE
    test.completed_at = timezone.now()
    test.save(update_fields=['status', 'completed_at'])

    logger.info('InboxPlacementTest %s complete — checked %d accounts', test_id, len(sent_to))
