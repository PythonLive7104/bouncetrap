"""
FR-BULK-04 — Celery async task for bulk email verification.
Processes emails in batches, updates progress counters, deducts credits atomically.
"""
import csv
import hmac
import hashlib
import io
import json
import logging
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed
from functools import partial
from django.db import transaction
from django.db.models import Count
from django.utils import timezone
from django.contrib.auth import get_user_model
from celery import shared_task

from .models import BulkJob, VerificationResult
from .services.verifier import verify_email
from apps.billing.credits import deduct_credits, add_credits, InsufficientCredits

logger = logging.getLogger(__name__)
User = get_user_model()

BATCH_SIZE    = 50   # DB bulk_create + credit deduction interval
THREAD_WORKERS = 10  # Emails verified in parallel per job


def _compute_health(total: int, valid: int, invalid: int, risky: int, unknown: int):
    """Return (grade: str, advice: list[str]) for a bulk job result set."""
    if total == 0:
        return '', []

    valid_pct   = valid   / total * 100
    invalid_pct = invalid / total * 100
    risky_pct   = risky   / total * 100
    unknown_pct = unknown / total * 100

    if valid_pct >= 90:
        grade = 'A'
    elif valid_pct >= 80:
        grade = 'B'
    elif valid_pct >= 70:
        grade = 'C'
    elif valid_pct >= 60:
        grade = 'D'
    else:
        grade = 'F'

    advice = []
    if grade == 'A':
        advice.append('Excellent list quality — safe to send campaigns.')
    elif grade == 'B':
        advice.append('Good list quality — low risk of bounces.')
    elif grade == 'C':
        advice.append('Moderate list quality — consider cleaning before high-volume sends.')
    else:
        advice.append('Poor list quality — clean this list before sending to protect sender reputation.')

    if invalid_pct >= 30:
        advice.append(f'{invalid_pct:.0f}% invalid — consider double opt-in to prevent future list decay.')
    elif invalid_pct >= 15:
        advice.append(f'{invalid_pct:.0f}% invalid addresses detected.')

    if risky_pct >= 15:
        advice.append(f'{risky_pct:.0f}% risky — high risk for cold outreach; consider removing.')

    if unknown_pct >= 20:
        advice.append(f'{unknown_pct:.0f}% unverified — these addresses couldn\'t be confirmed; send with caution.')

    return grade, advice
# Credits-only model: free trial is capped at 20 rows/job; paid accounts are
# limited only by their credit balance (cap kept very high as a safety bound).
FREE_MAX_ROWS = 20
PAID_MAX_ROWS = 1_000_000


def _plan_row_limit(plan: str) -> int:
    return FREE_MAX_ROWS if plan == 'free' else PAID_MAX_ROWS


def _read_emails_from_file(file_path: str, email_column: str = '') -> list[str]:
    """Read and return unique email addresses from a CSV or TXT file."""
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as fh:
            content = fh.read()
    except FileNotFoundError:
        return []

    # Strip NUL bytes — files encoded as UTF-16/binary often contain \x00 padding
    # which PostgreSQL rejects with "string literal cannot contain NUL characters"
    content = content.replace('\x00', '')

    emails = []
    if file_path.lower().endswith('.csv'):
        reader = csv.DictReader(io.StringIO(content))
        col = email_column or _detect_email_column(reader.fieldnames or [])
        for row in reader:
            val = row.get(col, '').strip()
            if val:
                emails.append(val.lower())
    else:
        for line in content.splitlines():
            val = line.strip()
            if val:
                emails.append(val.lower())

    # Deduplicate preserving order
    seen = set()
    unique = []
    for e in emails:
        if e not in seen:
            seen.add(e)
            unique.append(e)
    return unique


def _detect_email_column(headers: list[str]) -> str:
    """Auto-detect which CSV column contains email addresses (FR-BULK-02)."""
    for h in headers:
        if 'email' in h.lower():
            return h
    return headers[0] if headers else 'email'


@transaction.atomic
def refund_unused_credits(job_id: str) -> int:
    """
    Return reserved-but-unprocessed credits to the user.

    Credits are reserved for the whole list before verification starts, so a job
    that stops early (cancelled, paused-and-cancelled, crashed) is holding
    credits it never spent. Locks the job row so a cancel racing the worker
    cannot refund twice; `credits_refunded` records what has already gone back.
    Returns the amount refunded.
    """
    job = BulkJob.objects.select_for_update().get(pk=job_id)
    owed = job.credits_reserved - job.processed_count - job.credits_refunded
    if owed <= 0:
        return 0

    add_credits(
        job.user_id, owed,
        operation='refund',
        reference=f'bulk:{job.pk}',
        notes='Unused bulk verification credits returned',
    )
    job.credits_refunded += owed
    job.save(update_fields=['credits_refunded'])
    logger.info('BulkJob %s refunded %d unused credits', job_id, owed)
    return owed


def finalise_partial_job(job, new_status: str, error_message: str = '') -> None:
    """
    Close out a job that stopped before finishing every row.

    The rows already verified were paid for, so they must remain downloadable:
    counts are recomputed from the stored results, the result CSV is written,
    and the list is scored over what was actually processed. Unused credits are
    refunded. Safe to call on a job with zero results.
    """
    counts = {
        row['status']: row['n']
        for row in job.results.values('status').annotate(n=Count('id'))
    }
    valid   = counts.get('valid', 0)
    invalid = counts.get('invalid', 0)
    risky   = counts.get('risky', 0)
    unknown = counts.get('unknown', 0)
    processed = valid + invalid + risky + unknown

    job.valid_count   = valid
    job.invalid_count = invalid
    job.risky_count   = risky
    job.unknown_count = unknown
    job.processed_count = max(job.processed_count, processed)
    job.credits_used  = job.processed_count
    job.status        = new_status
    if error_message:
        job.error_message = error_message
    job.completed_at = job.completed_at or timezone.now()

    if processed:
        grade, advice = _compute_health(processed, valid, invalid, risky, unknown)
        job.health_grade  = grade
        job.health_advice = advice
        try:
            job.result_file_path = _write_result_csv(job)
        except Exception as exc:   # a missing CSV must not hide the DB results
            logger.warning('Could not write partial CSV for job %s: %s', job.pk, exc)

    job.save()

    try:
        refund_unused_credits(str(job.pk))
    except Exception as exc:
        logger.exception('Refund failed for job %s: %s', job.pk, exc)


def _fire_webhook(user, job) -> None:
    """POST job-complete payload to user's webhook URL with HMAC-SHA256 signature."""
    if not user.webhook_url:
        return

    payload = {
        'event':        'job.complete',
        'job_id':       str(job.pk),
        'status':       job.status,
        'total':        job.total_count,
        'valid':        job.valid_count,
        'invalid':      job.invalid_count,
        'risky':        job.risky_count,
        'unknown':      job.unknown_count,
        'credits_used': job.credits_used,
        'completed_at': job.completed_at.isoformat() if job.completed_at else None,
    }
    body = json.dumps(payload, separators=(',', ':'))

    headers = {'Content-Type': 'application/json', 'User-Agent': 'BounceTrap-Webhook/1.0'}
    if user.webhook_secret:
        sig = hmac.new(user.webhook_secret.encode(), body.encode(), hashlib.sha256).hexdigest()
        headers['X-BounceTrap-Signature'] = f'sha256={sig}'

    try:
        resp = requests.post(user.webhook_url, data=body, headers=headers, timeout=10)
        logger.info('Webhook fired for job %s → %s %d', job.pk, user.webhook_url, resp.status_code)
    except Exception as exc:
        logger.warning('Webhook delivery failed for job %s: %s', job.pk, exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def process_bulk_job(self, job_id: str, start_index: int = 0):
    """
    Main Celery task. Reads the uploaded file, verifies each email,
    stores results, and updates job progress every BATCH_SIZE rows.
    start_index is non-zero when resuming a paused job.
    """
    try:
        job = BulkJob.objects.select_related('user').get(pk=job_id)
    except BulkJob.DoesNotExist:
        logger.error('BulkJob %s not found', job_id)
        return

    if job.status in (BulkJob.STATUS_CANCELLED, BulkJob.STATUS_DONE):
        return

    job.status = BulkJob.STATUS_PROCESSING
    job.save(update_fields=['status'])

    try:
        _run_bulk_job(self, job, job_id, start_index)
    except Exception as exc:
        logger.exception('BulkJob %s failed with unexpected error: %s', job_id, exc)
        try:
            job.refresh_from_db()
            if job.status == BulkJob.STATUS_PROCESSING:
                # Keep everything verified so far downloadable and hand back the
                # credits reserved for rows that were never processed.
                finalise_partial_job(
                    job, BulkJob.STATUS_FAILED,
                    f'Stopped after {job.processed_count} of {job.total_count} emails: {exc}',
                )
        except Exception:
            logger.exception('BulkJob %s: could not finalise after failure', job_id)
        raise


def _run_bulk_job(task, job, job_id: str, start_index: int):
    """Inner implementation — separated so the outer task can catch all exceptions."""
    user     = job.user
    plan_max = _plan_row_limit(user.plan)

    all_emails = _read_emails_from_file(job.file_path, job.email_column)

    # Enforce row limits (FR-BULK-08)
    if plan_max and len(all_emails) > plan_max:
        all_emails = all_emails[:plan_max]

    total = len(all_emails)
    if not start_index:
        # First run — set total and do initial credit check
        job.total_count     = total
        job.duplicate_count = 0
        job.save(update_fields=['total_count', 'duplicate_count'])

        if total == 0:
            job.status        = BulkJob.STATUS_FAILED
            job.error_message = 'No valid emails found in uploaded file.'
            job.completed_at  = timezone.now()
            job.save(update_fields=['status', 'error_message', 'completed_at'])
            return

        # Reserve credits for the entire list before verifying anything. This is
        # a real deduction under select_for_update, not a balance read, so two
        # jobs (or a single verify) racing for the same balance can no longer
        # both pass — and a running job can never hit zero part-way through.
        # Whatever is left unprocessed is refunded when the job finishes.
        already_reserved = job.credits_reserved
        to_reserve = total - already_reserved
        if to_reserve > 0:
            try:
                deduct_credits(user.pk, to_reserve, operation='used', reference=f'bulk:{job_id}')
            except InsufficientCredits:
                balance = User.objects.filter(pk=user.pk).values_list('credits', flat=True).first() or 0
                job.status        = BulkJob.STATUS_FAILED
                job.error_message = (
                    f'Not enough credits to start this job: it needs {total} credits '
                    f'and you have {balance}. No credits were used and nothing was '
                    f'processed — top up and upload the file again.'
                )
                job.completed_at = timezone.now()
                job.save(update_fields=['status', 'error_message', 'completed_at'])
                return
            job.credits_reserved = already_reserved + to_reserve
            job.save(update_fields=['credits_reserved'])

    # Slice to unprocessed emails when resuming
    emails = all_emails[start_index:]

    # -- Process in parallel chunks --
    # Carry over counts from previous run when resuming
    valid_count      = job.valid_count
    invalid_count    = job.invalid_count
    risky_count      = job.risky_count
    unknown_count    = job.unknown_count
    deep_checks_made = job.deep_checks_made
    results_to_create = []
    verifier = partial(verify_email, plan=user.plan)

    chunk_offset = 0
    while chunk_offset < len(emails):
        chunk = emails[chunk_offset:chunk_offset + THREAD_WORKERS]

        # Verify the chunk in parallel — DNS + HTTP calls are I/O-bound so threads help
        with ThreadPoolExecutor(max_workers=len(chunk)) as executor:
            futures = {executor.submit(verifier, email): email for email in chunk}
            chunk_results = []
            for future in as_completed(futures):
                try:
                    chunk_results.append(future.result())
                except Exception as exc:
                    # Single-email failure — log and treat as unknown so the job continues
                    email = futures[future]
                    logger.warning('Verification error for %s: %s', email, exc)
                    from .services.verifier import VerificationResult as VR
                    fallback = VR(email=email, status='unknown', sub_status='verification_error')
                    chunk_results.append(fallback)

        for result in chunk_results:
            if result.status == 'valid':     valid_count   += 1
            elif result.status == 'invalid': invalid_count += 1
            elif result.status == 'risky':   risky_count   += 1
            else:                            unknown_count += 1

            if result.deep_check_used:
                deep_checks_made += 1

            results_to_create.append(VerificationResult(
                job             = job,
                user            = user,
                email           = result.email,
                domain          = result.domain,
                status          = result.status,
                sub_status      = result.sub_status,
                score           = result.score,
                is_disposable   = result.is_disposable,
                is_role_based   = result.is_role_based,
                is_catch_all    = result.is_catch_all,
                is_free_email   = result.is_free_email,
                mx_found        = result.mx_found,
                smtp_valid      = result.smtp_valid,
                mx_record       = result.mx_record or '',
                deep_check_used = result.deep_check_used,
                esp             = result.esp or '',
                elv_code        = result.elv_code or '',
            ))

        chunk_offset += len(chunk)
        processed_so_far = start_index + chunk_offset

        # Update progress after every chunk so the UI stays current
        job.processed_count = processed_so_far
        job.save(update_fields=['processed_count'])

        # Every BATCH_SIZE emails: flush results to DB and check for a pause.
        # No credit deduction here — the whole list was already paid for up
        # front, so the run cannot be interrupted by an empty balance.
        if len(results_to_create) >= BATCH_SIZE:
            VerificationResult.objects.bulk_create(results_to_create, ignore_conflicts=True)
            results_to_create = []

            job.valid_count      = valid_count
            job.invalid_count    = invalid_count
            job.risky_count      = risky_count
            job.unknown_count    = unknown_count
            job.credits_used     = processed_so_far
            job.deep_checks_made = deep_checks_made
            job.save(update_fields=[
                'valid_count', 'invalid_count', 'risky_count',
                'unknown_count', 'credits_used', 'deep_checks_made',
            ])

            # Check for pause request between batches
            current_status = BulkJob.objects.filter(pk=job_id).values_list('status', flat=True).first()
            if current_status == BulkJob.STATUS_PAUSED:
                logger.info('BulkJob %s paused at index %d', job_id, processed_so_far)
                return

    # Save any remaining results
    if results_to_create:
        VerificationResult.objects.bulk_create(results_to_create, ignore_conflicts=True)

    # -- Write result CSV (use full email list so existing + new results are included) --
    result_path = _write_result_csv(job, all_emails)

    # -- Health score --
    grade, advice = _compute_health(total, valid_count, invalid_count, risky_count, unknown_count)

    # -- Finalise job --
    job.status          = BulkJob.STATUS_DONE
    job.processed_count = total
    job.valid_count     = valid_count
    job.invalid_count   = invalid_count
    job.risky_count     = risky_count
    job.unknown_count   = unknown_count
    job.credits_used    = total
    job.deep_checks_made = deep_checks_made
    job.health_grade    = grade
    job.health_advice   = advice
    job.result_file_path = result_path
    job.completed_at    = timezone.now()
    job.save()

    # Reserved == processed for a clean run, but return anything left over
    # (e.g. the list shrank after a plan row-limit truncation).
    refund_unused_credits(job_id)

    logger.info('BulkJob %s done: %d emails, %d valid, %d invalid, %d risky, %d unknown',
                job_id, total, valid_count, invalid_count, risky_count, unknown_count)

    _fire_webhook(user, job)


def _write_result_csv(job: BulkJob, emails: list[str] | None = None) -> str:
    """
    Write verification results to a CSV file. Returns the file path.
    `emails` orders the output to match the uploaded file; pass None (partial
    jobs, where the source list isn't at hand) to write every stored result.
    """
    from django.conf import settings
    import os

    fields = [
        'email', 'status', 'sub_status', 'score',
        'is_disposable', 'is_role_based', 'is_catch_all', 'is_free_email',
        'mx_found', 'smtp_valid', 'mx_record', 'domain',
    ]

    result_dir = os.path.join(settings.MEDIA_ROOT, 'results')
    os.makedirs(result_dir, exist_ok=True)
    result_path = os.path.join(result_dir, f'job_{job.pk}.csv')

    rows = job.results.values(*fields).iterator(chunk_size=500)

    with open(result_path, 'w', newline='', encoding='utf-8') as fh:
        writer = csv.DictWriter(fh, fieldnames=fields)
        writer.writeheader()

        if emails is None:
            for row in rows:
                writer.writerow(row)
        else:
            # Build a lookup from flat values — avoids loading full ORM objects into memory
            results = {row['email']: row for row in rows}
            for email in emails:
                r = results.get(email)
                if r:
                    writer.writerow(r)

    return result_path
