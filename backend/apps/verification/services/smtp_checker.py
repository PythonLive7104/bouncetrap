"""Steps 6 & 7 — SMTP handshake and catch-all detection."""
import smtplib
import socket
import secrets
import logging
from django.conf import settings

logger = logging.getLogger(__name__)


def _smtp_probe(mx_host: str, probe_address: str, sender: str, timeout: int) -> bool | None:
    """
    Connect to mx_host, send MAIL FROM + RCPT TO for probe_address.
    Returns True (accepted), False (rejected 5xx), or None (inconclusive / timeout).
    """
    try:
        with smtplib.SMTP(timeout=timeout) as smtp:
            smtp.connect(mx_host, 25)
            smtp.ehlo_or_helo_if_needed()
            smtp.mail(sender)
            code, _ = smtp.rcpt(probe_address)
            return code < 400
    except smtplib.SMTPRecipientsRefused:
        return False
    except smtplib.SMTPServerDisconnected:
        return None
    except (socket.timeout, socket.gaierror, ConnectionRefusedError, OSError) as e:
        logger.debug('SMTP probe error for %s: %s', mx_host, e)
        return None
    except Exception as e:
        logger.debug('Unexpected SMTP error for %s: %s', mx_host, e)
        return None


def check_smtp(email: str, mx_host: str) -> bool | None:
    """
    Step 6 — Check if the email address is accepted by the mail server.
    Returns True / False / None (inconclusive).
    """
    sender  = settings.SMTP_PROBE_FROM
    timeout = settings.SMTP_TIMEOUT
    return _smtp_probe(mx_host, email, sender, timeout)


def check_catch_all(domain: str, mx_host: str) -> bool:
    """
    Step 7 — Probe with a random address to detect catch-all servers.
    If the server accepts a clearly invalid address the domain is catch-all.
    """
    random_local = 'bt-probe-' + secrets.token_hex(8)
    random_addr  = f'{random_local}@{domain}'
    sender       = settings.SMTP_PROBE_FROM
    timeout      = settings.SMTP_TIMEOUT

    result = _smtp_probe(mx_host, random_addr, sender, timeout)
    # result=True means ANY address accepted → catch-all
    return result is True
