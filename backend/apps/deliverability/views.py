"""
FR-DELIV-* — Deliverability tools.
Phase 1: DNS-based checks (SPF/DMARC/DKIM/MX).
Phase 2: Blacklist monitoring via DNSBL queries.
Phase 3: Inbox Placement Tester (IMAP seed accounts).
"""
import secrets
import socket
import dns.resolver
import dns.exception
from concurrent.futures import ThreadPoolExecutor, as_completed
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated


# ── FR-DELIV-02 — DMARC / SPF / DKIM Checker ─────────────────────────────

def _get_txt_records(domain: str) -> list[str]:
    try:
        answers = dns.resolver.resolve(domain, 'TXT', lifetime=10)
        return [b''.join(rdata.strings).decode('utf-8', errors='ignore') for rdata in answers]
    except Exception:
        return []


def _check_spf(domain: str) -> dict:
    records = [r for r in _get_txt_records(domain) if r.startswith('v=spf1')]
    if not records:
        return {'found': False, 'record': None, 'guidance': 'No SPF record found. Add a TXT record: "v=spf1 include:youresp.com ~all"'}
    return {'found': True, 'record': records[0], 'guidance': 'SPF record found.'}


def _check_dmarc(domain: str) -> dict:
    records = _get_txt_records(f'_dmarc.{domain}')
    dmarc   = [r for r in records if r.startswith('v=DMARC1')]
    if not dmarc:
        return {'found': False, 'record': None, 'guidance': 'No DMARC record found. Add: "_dmarc.yourdomain.com TXT v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com"'}
    record = dmarc[0]
    policy = 'none'
    for part in record.split(';'):
        if part.strip().startswith('p='):
            policy = part.strip()[2:]
    guidance = {
        'none':     'Policy is "none" (monitor only). Consider upgrading to "quarantine" or "reject".',
        'quarantine': 'Policy is "quarantine". Suspicious emails go to spam.',
        'reject':   'Policy is "reject". Strongest protection.',
    }.get(policy, 'Unknown policy.')
    return {'found': True, 'record': record, 'policy': policy, 'guidance': guidance}


def _check_dkim(domain: str, selector: str = 'default') -> dict:
    selectors = [selector, 'google', 'mail', 'smtp', 'key1', 's1', 's2', 'dkim']
    for sel in selectors:
        records = _get_txt_records(f'{sel}._domainkey.{domain}')
        dkim = [r for r in records if 'v=DKIM1' in r or 'p=' in r]
        if dkim:
            return {'found': True, 'selector': sel, 'record': dkim[0][:120] + '…', 'guidance': f'DKIM found (selector: {sel}).'}
    return {'found': False, 'selector': None, 'record': None, 'guidance': 'No DKIM record found for common selectors. Check with your email provider for the correct selector.'}


class DmarcSpfDkimView(APIView):
    """GET /api/v1/deliverability/dns-check/?domain=example.com — FR-DELIV-02."""

    def get(self, request):
        domain = request.query_params.get('domain', '').strip().lower()
        if not domain:
            return Response({'detail': 'domain parameter is required.'}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'domain': domain,
            'spf':    _check_spf(domain),
            'dmarc':  _check_dmarc(domain),
            'dkim':   _check_dkim(domain),
        })


# ── FR-DELIV-04 — Email Server / MX Health Check ─────────────────────────

class MXHealthView(APIView):
    """GET /api/v1/deliverability/mx-check/?domain=example.com — FR-DELIV-04."""

    def get(self, request):
        from apps.verification.services.dns_checker import get_mx_records
        domain = request.query_params.get('domain', '').strip().lower()
        if not domain:
            return Response({'detail': 'domain parameter is required.'}, status=status.HTTP_400_BAD_REQUEST)

        records = get_mx_records(domain)
        return Response({
            'domain':     domain,
            'mx_found':   bool(records),
            'mx_records': records,
            'count':      len(records),
            'guidance':   'MX records found.' if records else 'No MX records. This domain cannot receive email.',
        })


# ── FR-DELIV-01 — Blacklist Monitor (Phase 2) ────────────────────────────

# DNS blacklists: type='ip' reversed-IP lookup, type='domain' direct lookup
DNSBL_ZONES = [
    # IP-based
    {'name': 'Spamhaus ZEN',   'zone': 'zen.spamhaus.org',       'type': 'ip',     'category': 'Spam'},
    {'name': 'Barracuda',      'zone': 'b.barracudacentral.org',  'type': 'ip',     'category': 'Spam'},
    {'name': 'SpamCop',        'zone': 'bl.spamcop.net',          'type': 'ip',     'category': 'Spam'},
    {'name': 'SORBS Spam',     'zone': 'spam.dnsbl.sorbs.net',    'type': 'ip',     'category': 'Spam'},
    {'name': 'SORBS HTTP',     'zone': 'http.dnsbl.sorbs.net',    'type': 'ip',     'category': 'Proxy'},
    {'name': 'PSBL',           'zone': 'psbl.surriel.com',        'type': 'ip',     'category': 'Spam'},
    {'name': 'NiX Spam',       'zone': 'ix.dnsbl.manitu.net',     'type': 'ip',     'category': 'Spam'},
    # Domain-based
    {'name': 'Spamhaus DBL',   'zone': 'dbl.spamhaus.org',        'type': 'domain', 'category': 'Domain'},
    {'name': 'SURBL Multi',    'zone': 'multi.surbl.org',          'type': 'domain', 'category': 'Domain'},
    {'name': 'URIBL Multi',    'zone': 'multi.uribl.com',          'type': 'domain', 'category': 'Domain'},
]


def _resolve_domain_ips(domain: str) -> list[str]:
    """Get the A record IPs for a domain, then the first MX IP."""
    ips = set()
    # Domain A record
    try:
        for rdata in dns.resolver.resolve(domain, 'A', lifetime=8):
            ips.add(str(rdata))
    except Exception:
        pass
    # First MX's A record
    try:
        mx_records = dns.resolver.resolve(domain, 'MX', lifetime=8)
        mx_host = str(sorted(mx_records, key=lambda r: r.preference)[0].exchange).rstrip('.')
        for rdata in dns.resolver.resolve(mx_host, 'A', lifetime=8):
            ips.add(str(rdata))
    except Exception:
        pass
    return list(ips)[:4]  # cap at 4 IPs


def _check_dnsbl(target: str, zone_info: dict) -> dict:
    """Check one DNSBL zone. Returns {name, zone, listed, error}."""
    zone = zone_info['zone']
    kind = zone_info['type']
    try:
        if kind == 'ip':
            parts = target.split('.')
            if len(parts) != 4:
                return {**zone_info, 'listed': None, 'error': 'invalid_ip'}
            query = '.'.join(reversed(parts)) + '.' + zone
        else:
            query = target + '.' + zone

        dns.resolver.resolve(query, 'A', lifetime=5)
        return {**zone_info, 'listed': True, 'error': None}
    except dns.resolver.NXDOMAIN:
        return {**zone_info, 'listed': False, 'error': None}
    except Exception:
        return {**zone_info, 'listed': None, 'error': 'timeout'}


class BlacklistCheckView(APIView):
    """GET /api/v1/deliverability/blacklist/?domain=example.com — FR-DELIV-01."""

    def get(self, request):
        domain = request.query_params.get('domain', '').strip().lower()
        domain = domain.replace('https://', '').replace('http://', '').split('/')[0]
        if not domain:
            return Response({'detail': 'domain parameter is required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Resolve IPs to check against IP-based DNSBLs
        ips = _resolve_domain_ips(domain)

        # Build tasks: IP-based zones × each IP, domain-based zones × domain
        tasks = []
        for zone in DNSBL_ZONES:
            if zone['type'] == 'ip':
                for ip in ips:
                    tasks.append((ip, zone))
            else:
                tasks.append((domain, zone))

        # Run all DNSBL checks concurrently
        ip_results: dict[str, list] = {ip: [] for ip in ips}
        domain_results: list = []

        with ThreadPoolExecutor(max_workers=20) as pool:
            future_map = {pool.submit(_check_dnsbl, target, zone): (target, zone)
                          for target, zone in tasks}
            for future in as_completed(future_map):
                target, zone = future_map[future]
                try:
                    result = future.result()
                except Exception:
                    result = {**zone, 'listed': None, 'error': 'exception'}

                if zone['type'] == 'ip':
                    ip_results[target].append(result)
                else:
                    domain_results.append(result)

        # Summarise
        all_results = domain_results + [r for res in ip_results.values() for r in res]
        listed_count = sum(1 for r in all_results if r.get('listed') is True)
        clean_count  = sum(1 for r in all_results if r.get('listed') is False)

        return Response({
            'domain':         domain,
            'ips_checked':    ips,
            'listed_count':   listed_count,
            'clean_count':    clean_count,
            'total_checked':  listed_count + clean_count,
            'blacklisted':    listed_count > 0,
            'domain_results': domain_results,
            'ip_results':     ip_results,
        })


# ── FR-DELIV-05 — Email Header Analyzer ──────────────────────────────────

import re
import email
from email import policy as email_policy


def _parse_auth_results(header_value: str) -> dict:
    """Parse Authentication-Results header into SPF/DKIM/DMARC sub-results."""
    result = {'spf': None, 'dkim': None, 'dmarc': None, 'raw': header_value.strip()}
    for proto in ('spf', 'dkim', 'dmarc'):
        m = re.search(rf'\b{proto}=(\S+)', header_value, re.IGNORECASE)
        if m:
            result[proto] = m.group(1).rstrip(';').lower()
    return result


def _parse_received_chain(headers_text: str) -> list:
    """Extract Received headers in order (oldest-first = reverse of how they appear)."""
    pattern = re.compile(r'^Received:\s*(.+?)(?=^[^\s]|\Z)', re.MULTILINE | re.DOTALL | re.IGNORECASE)
    hops = []
    for m in pattern.finditer(headers_text):
        val = ' '.join(m.group(1).split())
        by_m  = re.search(r'\bby\s+(\S+)', val, re.IGNORECASE)
        from_m = re.search(r'\bfrom\s+(\S+)', val, re.IGNORECASE)
        date_m = re.search(r';\s*(.+)$', val)
        hops.append({
            'from': from_m.group(1) if from_m else None,
            'by':   by_m.group(1) if by_m else None,
            'date': date_m.group(1).strip() if date_m else None,
            'raw':  val[:200],
        })
    hops.reverse()  # oldest hop first
    return hops


def _extract_spam_score(headers_text: str) -> dict:
    """Look for X-Spam-Score / X-Spam-Status headers."""
    score_m  = re.search(r'^X-Spam-Score:\s*([^\r\n]+)', headers_text, re.MULTILINE | re.IGNORECASE)
    status_m = re.search(r'^X-Spam-Status:\s*([^\r\n]+)', headers_text, re.MULTILINE | re.IGNORECASE)
    return {
        'score':  score_m.group(1).strip() if score_m else None,
        'status': status_m.group(1).strip() if status_m else None,
    }


def _extract_simple_header(headers_text: str, name: str) -> str | None:
    m = re.search(rf'^{re.escape(name)}:\s*([^\r\n]+)', headers_text, re.MULTILINE | re.IGNORECASE)
    return m.group(1).strip() if m else None


class HeaderAnalyzerView(APIView):
    """POST /api/v1/deliverability/analyze-headers/ — FR-DELIV-05."""

    def post(self, request):
        raw = request.data.get('headers', '').strip()
        if not raw:
            return Response({'detail': 'headers field is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if len(raw) > 50_000:
            return Response({'detail': 'Header block too large (max 50 KB).'}, status=status.HTTP_400_BAD_REQUEST)

        # Auth-Results (may have multiple headers — take the first)
        auth_m = re.search(r'^Authentication-Results:\s*(.+?)(?=^[^\s]|\Z)',
                           raw, re.MULTILINE | re.DOTALL | re.IGNORECASE)
        auth_results = _parse_auth_results(auth_m.group(1)) if auth_m else {'spf': None, 'dkim': None, 'dmarc': None, 'raw': None}

        received_chain = _parse_received_chain(raw)
        spam           = _extract_spam_score(raw)

        summary = []
        issues  = []

        # Auth checks
        for proto, label in [('spf', 'SPF'), ('dkim', 'DKIM'), ('dmarc', 'DMARC')]:
            val = auth_results.get(proto)
            if val == 'pass':
                summary.append({'check': label, 'result': 'pass', 'level': 'good'})
            elif val in ('fail', 'softfail', 'none', 'neutral'):
                summary.append({'check': label, 'result': val, 'level': 'fail'})
                issues.append(f'{label} {val} — email authentication failed or not configured.')
            elif val:
                summary.append({'check': label, 'result': val, 'level': 'warn'})
            else:
                summary.append({'check': label, 'result': 'not found', 'level': 'unknown'})

        # Spam score
        if spam['status']:
            flagged = spam['status'].lower().startswith('yes')
            summary.append({'check': 'Spam flag', 'result': spam['status'], 'level': 'fail' if flagged else 'good'})
            if flagged:
                issues.append(f'Marked as spam: {spam["status"]}')

        # Basic headers
        from_h       = _extract_simple_header(raw, 'From')
        to_h         = _extract_simple_header(raw, 'To')
        subject_h    = _extract_simple_header(raw, 'Subject')
        message_id_h = _extract_simple_header(raw, 'Message-ID')
        date_h       = _extract_simple_header(raw, 'Date')
        reply_to_h   = _extract_simple_header(raw, 'Reply-To')

        # Flag Reply-To mismatch
        if from_h and reply_to_h:
            from_domain   = re.search(r'@([\w.-]+)', from_h)
            replyto_domain = re.search(r'@([\w.-]+)', reply_to_h)
            if from_domain and replyto_domain and from_domain.group(1).lower() != replyto_domain.group(1).lower():
                issues.append(f'Reply-To domain ({replyto_domain.group(1)}) differs from From domain ({from_domain.group(1)}).')

        return Response({
            'summary':        summary,
            'issues':         issues,
            'auth_results':   auth_results,
            'received_chain': received_chain,
            'spam':           spam,
            'headers': {
                'from':       from_h,
                'to':         to_h,
                'subject':    subject_h,
                'message_id': message_id_h,
                'date':       date_h,
                'reply_to':   reply_to_h,
            },
            'hop_count': len(received_chain),
        })


# ── FR-DELIV-03 — Inbox Placement Tester ─────────────────────────────────

INBOX_PLACEMENT_COST = 3  # credits per test


class InboxPlacementView(APIView):
    """
    POST /api/v1/deliverability/inbox-placement/ — FR-DELIV-03.
    Submits an inbox placement test. Costs 3 credits.
    GET  /api/v1/deliverability/inbox-placement/<uuid>/ — poll status.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from django.conf import settings as django_settings
        from apps.billing.credits import deduct_credits, InsufficientCredits, SubscriptionExpired
        from .models import InboxPlacementTest, InboxPlacementResult
        from .tasks import run_inbox_placement_test

        seed_accounts = getattr(django_settings, 'INBOX_SEED_ACCOUNTS', [])
        if not seed_accounts:
            return Response({
                'status': 'unavailable',
                'detail': 'Inbox placement is not configured. Add seed account credentials in the server .env to enable this feature.',
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        subject = request.data.get('subject', '').strip()
        body    = request.data.get('body', '').strip()
        if not subject:
            return Response({'detail': 'subject is required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Deduct credits
        try:
            credits_remaining = deduct_credits(request.user.pk, INBOX_PLACEMENT_COST, operation='used', reference='inbox_placement')
        except SubscriptionExpired:
            return Response(
                {'detail': 'Your subscription has expired. Renew your plan to unlock your credits.'},
                status=status.HTTP_402_PAYMENT_REQUIRED,
            )
        except InsufficientCredits:
            return Response(
                {'detail': f'Insufficient credits. Inbox placement test costs {INBOX_PLACEMENT_COST} credits.'},
                status=status.HTTP_402_PAYMENT_REQUIRED,
            )

        token = secrets.token_hex(16)
        test  = InboxPlacementTest.objects.create(
            user         = request.user,
            subject_line = subject,
            body_text    = body,
            test_token   = token,
        )

        # Create pending result rows for each seed account
        for acct in seed_accounts:
            InboxPlacementResult.objects.create(
                test       = test,
                provider   = acct['provider'],
                seed_email = acct['email'],
            )

        task = run_inbox_placement_test.apply_async(args=[str(test.pk)], countdown=2)
        test.celery_task_id = task.id
        test.save(update_fields=['celery_task_id'])

        result = _serialize_test(test)
        result['credits_remaining'] = credits_remaining
        return Response(result, status=status.HTTP_202_ACCEPTED)

    def get(self, request, pk=None):
        from .models import InboxPlacementTest
        if not pk:
            tests = InboxPlacementTest.objects.filter(user=request.user)[:20]
            return Response([_serialize_test(t) for t in tests])
        try:
            test = InboxPlacementTest.objects.get(pk=pk, user=request.user)
        except InboxPlacementTest.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(_serialize_test(test))


def _serialize_test(test) -> dict:
    from .models import InboxPlacementResult
    results = test.results.all()
    total   = results.count()
    inbox_c = results.filter(placement=InboxPlacementResult.PLACEMENT_INBOX).count()
    spam_c  = results.filter(placement=InboxPlacementResult.PLACEMENT_SPAM).count()
    score   = round(inbox_c / total * 100) if total else 0
    return {
        'id':          str(test.pk),
        'status':      test.status,
        'subject':     test.subject_line,
        'test_token':  test.test_token,
        'created_at':  test.created_at.isoformat(),
        'completed_at': test.completed_at.isoformat() if test.completed_at else None,
        'inbox_score': score,
        'results': [
            {
                'provider':  r.provider,
                'seed_email': r.seed_email,
                'placement': r.placement,
                'checked_at': r.checked_at.isoformat() if r.checked_at else None,
            }
            for r in results
        ],
    }
