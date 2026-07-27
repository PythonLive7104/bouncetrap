import io
import os
import csv
import zipfile
import mimetypes
from datetime import timedelta
from django.db.models import Count, Sum, Q
from django.db.models.functions import TruncDate
from django.http import HttpResponse, StreamingHttpResponse
from django.utils import timezone
from django.conf import settings
from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser

from .models import BulkJob, VerificationResult
from .serializers import (
    SingleVerifySerializer,
    VerificationResultSerializer,
    BulkJobSerializer,
    BulkUploadSerializer,
)
from .services.verifier import verify_email
from .tasks import process_bulk_job, refund_unused_credits, _read_emails_from_file
from apps.billing.credits import deduct_credits, InsufficientCredits, SubscriptionExpired
from apps.billing.models import CreditLedger


FREE_PLAN_DAILY_LIMIT = 20  # verifications per day for free plan users

# Credits-only model: free trial capped at 20 rows/job; paid limited by credits.
PLAN_ROW_LIMITS = {'free': 20, 'paid': 1_000_000}


def _free_plan_daily_used(user) -> int:
    """Return credits used today by a free-plan user (counts ledger 'used' entries for today)."""
    result = CreditLedger.objects.filter(
        user=user,
        operation=CreditLedger.OP_USED,
        created_at__date=timezone.now().date(),
    ).aggregate(total=Sum('amount'))['total']
    return abs(result or 0)


class SingleVerifyView(APIView):
    """
    POST /api/v1/verify/single/
    FR-SINGLE-01 — Synchronous single email verification. Costs 1 credit.
    Requires Starter+ plan for API key access; dashboard users on free can use the UI.
    """

    def post(self, request):
        serializer = SingleVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email'].lower()

        # Block unverified users — prevents fake-email signups burning free credits
        if not request.user.email_verified:
            return Response(
                {
                    'detail': 'Please verify your email address before using credits. '
                              'Check your inbox for the verification link.',
                    'email_verified': False,
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # Free plan: enforce daily verification limit
        if request.user.plan == 'free':
            used_today = _free_plan_daily_used(request.user)
            if used_today >= FREE_PLAN_DAILY_LIMIT:
                return Response(
                    {
                        'detail': (
                            f'You have reached your free plan limit of {FREE_PLAN_DAILY_LIMIT} '
                            f'verifications per day. Upgrade to Starter to unlock 5,000 '
                            f'verifications per month, bulk upload, and full API access.'
                        ),
                        'daily_limit':  FREE_PLAN_DAILY_LIMIT,
                        'daily_used':   used_today,
                        'upgrade_url':  '/dashboard/billing',
                    },
                    status=status.HTTP_429_TOO_MANY_REQUESTS,
                )

        # Deduct 1 credit
        try:
            credits_remaining = deduct_credits(request.user.pk, 1, operation='used', reference=f'single:{email}')
        except SubscriptionExpired:
            return Response(
                {'detail': 'Your subscription has expired. Renew your plan to unlock your credits.'},
                status=status.HTTP_402_PAYMENT_REQUIRED,
            )
        except InsufficientCredits:
            return Response(
                {'detail': 'Insufficient credits. Please purchase more or upgrade your plan.'},
                status=status.HTTP_402_PAYMENT_REQUIRED,
            )

        result = verify_email(email, plan=request.user.plan)

        # Persist result
        VerificationResult.objects.create(
            user            = request.user,
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
        )

        data = result.to_dict()
        data['credits_remaining'] = credits_remaining
        if request.user.plan == 'free':
            data['daily_used']  = _free_plan_daily_used(request.user)
            data['daily_limit'] = FREE_PLAN_DAILY_LIMIT
        return Response(data, status=status.HTTP_200_OK)


class BulkUploadView(APIView):
    """
    POST /api/v1/verify/bulk/
    FR-BULK-01 — Upload file, deduplicate, enqueue Celery job.
    """
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        # Block unverified users
        if not request.user.email_verified:
            return Response(
                {
                    'detail': 'Please verify your email address before uploading jobs. '
                              'Check your inbox for the verification link.',
                    'email_verified': False,
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # Free plan: enforce the same 20 credits/day limit as single verify
        if request.user.plan == 'free':
            used_today = _free_plan_daily_used(request.user)
            if used_today >= FREE_PLAN_DAILY_LIMIT:
                return Response(
                    {
                        'detail': (
                            f'You have reached your free plan limit of {FREE_PLAN_DAILY_LIMIT} '
                            f'verifications per day. Upgrade to Starter for 5,000 per month, '
                            f'or try again tomorrow.'
                        ),
                        'daily_limit': FREE_PLAN_DAILY_LIMIT,
                        'daily_used':  used_today,
                        'upgrade_url': '/dashboard/billing',
                    },
                    status=status.HTTP_429_TOO_MANY_REQUESTS,
                )

        serializer = BulkUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        upload       = serializer.validated_data['file']
        email_column = serializer.validated_data.get('email_column', '')

        # Save uploaded file
        upload_dir = os.path.join(settings.MEDIA_ROOT, 'uploads')
        os.makedirs(upload_dir, exist_ok=True)
        safe_name = f'{request.user.pk}_{timezone.now().strftime("%Y%m%d%H%M%S")}_{upload.name}'
        file_path = os.path.join(upload_dir, safe_name)
        with open(file_path, 'wb') as fh:
            for chunk in upload.chunks():
                fh.write(chunk)

        # Check the balance covers the whole list *before* creating the job, so
        # an under-funded upload is rejected at the door instead of dying
        # part-way through. The worker re-checks and reserves the credits
        # atomically — this is the fast, friendly rejection.
        emails = _read_emails_from_file(file_path, email_column)
        row_limit = PLAN_ROW_LIMITS.get(request.user.plan, PLAN_ROW_LIMITS['paid'])
        needed = min(len(emails), row_limit)

        if needed == 0:
            os.remove(file_path)
            return Response(
                {'detail': 'No email addresses found in that file. Check the file '
                           'has one email per line, or pick the right column for a CSV.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if request.user.credits < needed:
            os.remove(file_path)
            return Response(
                {
                    'detail': (
                        f'This list has {needed:,} email{"s" if needed != 1 else ""} but you '
                        f'only have {request.user.credits:,} credit'
                        f'{"s" if request.user.credits != 1 else ""}. '
                        f'Add {needed - request.user.credits:,} more credits and upload again — '
                        f'nothing was charged and no job was started.'
                    ),
                    'credits_required':  needed,
                    'credits_available': request.user.credits,
                    'credits_short':     needed - request.user.credits,
                    'upgrade_url':       '/dashboard/billing',
                },
                status=status.HTTP_402_PAYMENT_REQUIRED,
            )

        # Create job record
        job = BulkJob.objects.create(
            user         = request.user,
            filename     = upload.name,
            file_path    = file_path,
            email_column = email_column,
            total_count  = needed,
        )

        # Enqueue Celery task
        task = process_bulk_job.apply_async(args=[str(job.pk)], queue='verification')
        job.celery_task_id = task.id
        job.save(update_fields=['celery_task_id'])

        return Response(BulkJobSerializer(job).data, status=status.HTTP_202_ACCEPTED)


class VerificationResultListView(generics.ListAPIView):
    """GET /api/v1/verify/results/ — last 50 single verifications for the user."""
    serializer_class = VerificationResultSerializer
    pagination_class = None

    def get_queryset(self):
        return VerificationResult.objects.filter(user=self.request.user).order_by('-created_at')[:50]


class BulkJobListView(generics.ListAPIView):
    """GET /api/v1/verify/jobs/ — FR-BULK (list all jobs, newest first)."""
    serializer_class = BulkJobSerializer

    def get_queryset(self):
        return BulkJob.objects.filter(user=self.request.user)


class BulkJobDetailView(generics.RetrieveAPIView):
    """GET /api/v1/verify/jobs/{id}/ — FR-BULK-05 progress polling."""
    serializer_class = BulkJobSerializer

    def get_queryset(self):
        return BulkJob.objects.filter(user=self.request.user)


# Columns shared by the flat CSV export and the split ZIP export.
_RESULT_FIELDS = [
    'email', 'status', 'sub_status', 'score',
    'is_disposable', 'is_role_based', 'is_catch_all', 'is_free_email',
    'mx_found', 'smtp_valid', 'mx_record', 'domain',
]


def _no_results_response(job):
    """
    Guard for the download endpoints. Results are downloadable as soon as any
    row has been verified — a job that stopped early (failed / cancelled /
    paused) still spent the user's credits on the rows it did finish, so those
    must never be locked away. Returns a Response to send, or None to proceed.
    """
    if job.has_results:
        return None
    if job.status in (BulkJob.STATUS_QUEUED, BulkJob.STATUS_PROCESSING):
        return Response(
            {'detail': 'This job is still running — no results to download yet.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    return Response(
        {'detail': 'This job produced no results.'},
        status=status.HTTP_400_BAD_REQUEST,
    )


def _stream_results_csv(queryset, filename):
    """Stream a result queryset as CSV without buffering it all in memory."""
    def row_iter():
        buf = io.StringIO()
        writer = csv.DictWriter(buf, fieldnames=_RESULT_FIELDS)
        writer.writeheader()
        yield buf.getvalue()
        for row in queryset.iterator(chunk_size=500):
            buf.seek(0); buf.truncate(0)
            writer.writerow(row)
            yield buf.getvalue()

    response = StreamingHttpResponse(row_iter(), content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response


class BulkJobDownloadView(APIView):
    """
    GET /api/v1/verify/jobs/{id}/download/
    FR-BULK-07 — Stream result CSV. SR-08: signed URL or direct stream.
    """

    def get(self, request, pk):
        try:
            job = BulkJob.objects.get(pk=pk, user=request.user)
        except BulkJob.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        blocked = _no_results_response(job)
        if blocked:
            return blocked

        filename = f'bouncetrap_results_{job.pk}.csv'

        # Prebuilt CSV is only written when a job finishes. If it is missing
        # (job stopped early, or the file was cleaned up) build the export
        # straight from the stored rows rather than 404-ing on paid-for results.
        if job.result_file_path and os.path.exists(job.result_file_path):
            def file_iterator(path, chunk_size=8192):
                with open(path, 'rb') as fh:
                    while chunk := fh.read(chunk_size):
                        yield chunk

            response = StreamingHttpResponse(file_iterator(job.result_file_path), content_type='text/csv')
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            return response

        return _stream_results_csv(job.results.values(*_RESULT_FIELDS), filename)


class BulkJobDownloadZipView(APIView):
    """
    GET /api/v1/verify/jobs/{id}/download-zip/
    Return a ZIP of the results split into separate CSV files — one per status
    (valid/invalid/risky/unknown) plus flag-based lists (disposable/role_based/
    catch_all). Empty categories are omitted.
    """

    def get(self, request, pk):
        try:
            job = BulkJob.objects.get(pk=pk, user=request.user)
        except BulkJob.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        blocked = _no_results_response(job)
        if blocked:
            return blocked

        # Status-based buckets, then flag-based buckets (a row can appear in more than one).
        status_files = {'valid': [], 'invalid': [], 'risky': [], 'unknown': []}
        flag_files = {'disposable': [], 'role_based': [], 'catch_all': []}

        for r in job.results.values(*_RESULT_FIELDS).iterator(chunk_size=500):
            status_files.setdefault(r['status'], []).append(r)
            if r['is_disposable']:
                flag_files['disposable'].append(r)
            if r['is_role_based']:
                flag_files['role_based'].append(r)
            if r['is_catch_all']:
                flag_files['catch_all'].append(r)

        def write_csv(rows):
            buf = io.StringIO()
            writer = csv.DictWriter(buf, fieldnames=_RESULT_FIELDS)
            writer.writeheader()
            for row in rows:
                writer.writerow(row)
            return buf.getvalue().encode('utf-8')

        # Build the whole archive in memory and return it with an explicit
        # Content-Length. Streaming a chunked zip through gunicorn/nginx can be
        # truncated mid-transfer, and an unzip tool then recovers only the first
        # entry — so we hand back the complete bytes in one HttpResponse.
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as zf:
            for name, rows in {**status_files, **flag_files}.items():
                if rows:
                    zf.writestr(f'{name}.csv', write_csv(rows))
        data = buf.getvalue()

        filename = f'bouncetrap_results_{job.pk}.zip'
        response = HttpResponse(data, content_type='application/zip')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        response['Content-Length'] = str(len(data))
        return response


class BulkJobDownloadCategoryView(APIView):
    """
    GET /api/v1/verify/jobs/{id}/download/{category}/
    Stream a single category as CSV so users can grab just the valid (or any
    other) addresses directly, without downloading the whole split ZIP.
    Categories are the status buckets (valid/invalid/risky/unknown) plus the
    flag-based lists (disposable/role_based/catch_all).
    """

    STATUS_CATEGORIES = {'valid', 'invalid', 'risky', 'unknown'}
    FLAG_CATEGORIES = {
        'disposable': 'is_disposable',
        'role_based': 'is_role_based',
        'catch_all':  'is_catch_all',
    }

    def get(self, request, pk, category):
        try:
            job = BulkJob.objects.get(pk=pk, user=request.user)
        except BulkJob.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        blocked = _no_results_response(job)
        if blocked:
            return blocked

        qs = job.results.values(*_RESULT_FIELDS)
        if category in self.STATUS_CATEGORIES:
            qs = qs.filter(status=category)
        elif category in self.FLAG_CATEGORIES:
            qs = qs.filter(**{self.FLAG_CATEGORIES[category]: True})
        else:
            return Response({'detail': 'Unknown category.'}, status=status.HTTP_400_BAD_REQUEST)

        return _stream_results_csv(qs, f'bouncetrap_{category}_{job.pk}.csv')


class BulkJobCancelView(APIView):
    """POST /api/v1/verify/jobs/{id}/cancel/ — Cancel a queued or processing job."""

    def post(self, request, pk):
        try:
            job = BulkJob.objects.get(pk=pk, user=request.user)
        except BulkJob.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        if job.status not in (BulkJob.STATUS_QUEUED, BulkJob.STATUS_PROCESSING, BulkJob.STATUS_PAUSED):
            return Response({'detail': 'Job cannot be cancelled.'}, status=status.HTTP_400_BAD_REQUEST)

        job.status = BulkJob.STATUS_CANCELLED
        job.completed_at = timezone.now()
        job.save(update_fields=['status', 'completed_at'])

        if job.celery_task_id:
            from config.celery import app as celery_app
            celery_app.control.revoke(job.celery_task_id, terminate=True)

        # Credits were reserved for the whole list up front — hand back the
        # ones for rows that will now never be verified.
        refunded = refund_unused_credits(str(job.pk))

        return Response({
            'detail': 'Job cancelled.',
            'credits_refunded': refunded,
        })


class BulkJobPauseView(APIView):
    """POST /api/v1/verify/jobs/{id}/pause/ — Pause a processing or queued job."""

    def post(self, request, pk):
        try:
            job = BulkJob.objects.get(pk=pk, user=request.user)
        except BulkJob.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        if job.status not in (BulkJob.STATUS_QUEUED, BulkJob.STATUS_PROCESSING):
            return Response({'detail': 'Job cannot be paused.'}, status=status.HTTP_400_BAD_REQUEST)

        job.status = BulkJob.STATUS_PAUSED
        job.save(update_fields=['status'])

        if job.celery_task_id:
            from config.celery import app as celery_app
            celery_app.control.revoke(job.celery_task_id, terminate=True)

        return Response({'detail': 'Job paused.'})


class BulkJobResumeView(APIView):
    """POST /api/v1/verify/jobs/{id}/resume/ — Resume a paused job."""

    def post(self, request, pk):
        try:
            job = BulkJob.objects.get(pk=pk, user=request.user)
        except BulkJob.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        if job.status != BulkJob.STATUS_PAUSED:
            return Response({'detail': 'Only paused jobs can be resumed.'}, status=status.HTTP_400_BAD_REQUEST)

        from .tasks import process_bulk_job
        task = process_bulk_job.delay(str(job.pk), start_index=job.processed_count)
        job.status = BulkJob.STATUS_PROCESSING
        job.celery_task_id = task.id
        job.save(update_fields=['status', 'celery_task_id'])

        return Response({'detail': 'Job resumed.'})


class VerificationStatsView(APIView):
    """GET /api/v1/verify/stats/ — Aggregated stats for dashboard overview."""

    def get(self, request):
        user = request.user
        now  = timezone.now()
        since_30d = now - timedelta(days=30)

        # Daily verification counts for chart (last 30 days)
        daily_qs = (
            VerificationResult.objects
            .filter(user=user, created_at__gte=since_30d)
            .annotate(day=TruncDate('created_at'))
            .values('day')
            .annotate(count=Count('id'))
            .order_by('day')
        )
        daily = [{'day': str(d['day']), 'verifications': d['count']} for d in daily_qs]

        # All-time status breakdown for donut chart
        status_qs = (
            VerificationResult.objects
            .filter(user=user)
            .values('status')
            .annotate(count=Count('id'))
        )
        status_breakdown = {s['status']: s['count'] for s in status_qs}

        # Totals
        total        = sum(status_breakdown.values())
        deep_checks  = VerificationResult.objects.filter(user=user, deep_check_used=True).count()
        local_resolved = total - deep_checks

        # Bulk job summary
        jobs_qs = BulkJob.objects.filter(user=user)
        jobs_done       = jobs_qs.filter(status=BulkJob.STATUS_DONE).count()
        jobs_processing = jobs_qs.filter(status__in=[BulkJob.STATUS_QUEUED, BulkJob.STATUS_PROCESSING]).count()

        return Response({
            'daily':             daily,
            'status_breakdown':  status_breakdown,
            'total':             total,
            'deep_checks':       deep_checks,
            'local_resolved':    local_resolved,
            'jobs_done':         jobs_done,
            'jobs_processing':   jobs_processing,
        })


class DashboardSummaryView(APIView):
    """
    GET /api/v1/verify/dashboard/
    Single endpoint that returns everything the overview page needs.
    Replaces 4 separate round-trips (stats + billing + jobs + credit history)
    with one request and one batch of DB queries.
    """

    def get(self, request):
        user      = request.user
        now       = timezone.now()
        since_30d = now - timedelta(days=30)

        # ── Verification stats ──────────────────────────────────────────
        daily_qs = (
            VerificationResult.objects
            .filter(user=user, created_at__gte=since_30d)
            .annotate(day=TruncDate('created_at'))
            .values('day')
            .annotate(count=Count('id'))
            .order_by('day')
        )
        daily = [{'day': str(d['day']), 'verifications': d['count']} for d in daily_qs]

        # Status breakdown + totals in a single query
        status_qs = (
            VerificationResult.objects
            .filter(user=user)
            .values('status')
            .annotate(count=Count('id'))
        )
        status_breakdown = {s['status']: s['count'] for s in status_qs}
        total            = sum(status_breakdown.values())

        # deep_check_used count (one query, no Python loop)
        deep_checks    = VerificationResult.objects.filter(user=user, deep_check_used=True).count()
        local_resolved = total - deep_checks

        # Bulk job counts — single query with conditional aggregation
        jobs_agg = BulkJob.objects.filter(user=user).aggregate(
            done=Count('id', filter=Q(status=BulkJob.STATUS_DONE)),
            active=Count('id', filter=Q(status__in=[BulkJob.STATUS_QUEUED, BulkJob.STATUS_PROCESSING])),
        )

        # Recent bulk jobs (last 5)
        recent_jobs = BulkJobSerializer(
            BulkJob.objects.filter(user=user).order_by('-created_at')[:5],
            many=True,
        ).data

        # ── Billing ─────────────────────────────────────────────────────
        from apps.billing.models import CreditLedger
        from apps.billing.serializers import CreditLedgerSerializer

        plan_total      = getattr(settings, 'PLAN_CREDITS', {}).get(user.plan, 0)
        used_this_month = abs(
            CreditLedger.objects
            .filter(user=user, operation='used',
                    created_at__year=now.year, created_at__month=now.month)
            .aggregate(total=Sum('amount'))['total'] or 0
        )

        # Credit history (last 8)
        ledger = CreditLedgerSerializer(
            CreditLedger.objects.filter(user=user).order_by('-created_at')[:8],
            many=True,
        ).data

        sub_expires = user.subscription_expires_at.isoformat() if user.subscription_expires_at else None

        return Response({
            # stats
            'daily':            daily,
            'status_breakdown': status_breakdown,
            'total':            total,
            'deep_checks':      deep_checks,
            'local_resolved':   local_resolved,
            'jobs_done':        jobs_agg['done'],
            'jobs_processing':  jobs_agg['active'],
            # billing
            'credits':              user.credits,
            'plan':                 user.plan,
            'plan_total':           plan_total,
            'used_this_month':      used_this_month,
            'subscription_active':  user.subscription_active,
            'subscription_expires_at': sub_expires,
            # tables
            'recent_jobs':      recent_jobs,
            'credit_history':   ledger,
        })


# ── Email Finder ──────────────────────────────────────────────────────────

EMAIL_FINDER_COST = 5  # credits per lookup

def _generate_email_patterns(first: str, last: str, domain: str) -> list[str]:
    """Return candidate email addresses for a person at a domain."""
    f = first[0] if first else ''
    l = last[0]  if last  else ''
    candidates = [
        f'{first}.{last}',
        f'{first}{last}',
        f'{f}{last}',
        f'{first}',
        f'{first}.{l}',
        f'{f}.{last}',
        f'{last}.{first}',
        f'{last}{first}',
        f'{last}',
        f'{first}_{last}',
    ]
    seen = set()
    result = []
    for c in candidates:
        addr = f'{c}@{domain}'.lower()
        if addr not in seen:
            seen.add(addr)
            result.append(addr)
    return result


class EmailFinderView(APIView):
    """
    POST /api/v1/verify/find-email/
    Generate email patterns for a person + domain and verify each.
    Costs EMAIL_FINDER_COST credits per search.
    """

    def post(self, request):
        first  = request.data.get('first_name', '').strip().lower()
        last   = request.data.get('last_name',  '').strip().lower()
        domain = request.data.get('domain',     '').strip().lower().lstrip('https://').lstrip('http://').split('/')[0]

        if not last or not domain:
            return Response(
                {'detail': 'last_name and domain are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Deduct 5 credits upfront
        try:
            credits_remaining = deduct_credits(
                request.user.pk, EMAIL_FINDER_COST,
                operation='used', reference=f'finder:{first}.{last}@{domain}',
            )
        except SubscriptionExpired:
            return Response(
                {'detail': 'Your subscription has expired. Renew your plan to unlock your credits.'},
                status=status.HTTP_402_PAYMENT_REQUIRED,
            )
        except InsufficientCredits:
            return Response(
                {'detail': f'Insufficient credits. Email Finder costs {EMAIL_FINDER_COST} credits.'},
                status=status.HTTP_402_PAYMENT_REQUIRED,
            )

        patterns = _generate_email_patterns(first, last, domain)
        results  = []
        found    = None

        for email_addr in patterns:
            result = verify_email(email_addr)
            entry = {
                'email':        result.email,
                'status':       result.status,
                'score':        result.score,
                'mx_found':     result.mx_found,
                'smtp_valid':   result.smtp_valid,
                'is_catch_all': result.is_catch_all,
            }
            results.append(entry)
            # First valid non-catch-all hit wins
            if result.status == 'valid' and not result.is_catch_all and not found:
                found = entry

        return Response({
            'first_name':        first or None,
            'last_name':         last,
            'domain':            domain,
            'found':             found,
            'candidates':        results,
            'credits_used':      EMAIL_FINDER_COST,
            'credits_remaining': credits_remaining,
        })


# ── PDF Report ────────────────────────────────────────────────────────────

REPORT_PLAN_REQUIRED = ('growth', 'pro', 'enterprise')

GRADE_COLOR = {
    'A': (0.13, 0.77, 0.37),   # green
    'B': (0.20, 0.72, 0.90),   # cyan
    'C': (1.00, 0.76, 0.03),   # amber
    'D': (1.00, 0.55, 0.10),   # orange
    'F': (0.93, 0.27, 0.27),   # red
}


def _build_report_pdf(job, user) -> bytes:
    """Generate a branded PDF report for a completed BulkJob."""
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.units import cm
        from reportlab.lib import colors
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
        from reportlab.lib.enums import TA_CENTER, TA_LEFT
    except ImportError:
        return None

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=2*cm, rightMargin=2*cm,
        topMargin=2*cm, bottomMargin=2*cm,
        title=f'BounceTrap Report — {job.filename or str(job.pk)}',
    )

    W, H = A4
    styles = getSampleStyleSheet()
    brand  = colors.HexColor('#6366f1')
    dark   = colors.HexColor('#0a0a14')
    light  = colors.HexColor('#f1f5f9')
    muted  = colors.HexColor('#94a3b8')

    h1  = ParagraphStyle('h1',  fontSize=22, textColor=colors.white, spaceAfter=4, fontName='Helvetica-Bold')
    h2  = ParagraphStyle('h2',  fontSize=13, textColor=colors.white, spaceAfter=6, fontName='Helvetica-Bold')
    sub = ParagraphStyle('sub', fontSize=10, textColor=muted,        spaceAfter=0)
    body= ParagraphStyle('body',fontSize=10, textColor=light,        spaceAfter=4, leading=15)

    # Percentages are over what was actually verified — a job that stopped early
    # would otherwise report against rows it never checked.
    total   = (job.processed_count if job.is_partial else job.total_count) or 1
    valid   = job.valid_count
    invalid = job.invalid_count
    risky   = job.risky_count
    unknown = job.unknown_count
    grade   = job.health_grade or '—'
    advice  = job.health_advice or []

    grade_rgb = GRADE_COLOR.get(grade, (0.58, 0.63, 0.69))
    grade_col = colors.Color(*grade_rgb)

    def pct(n): return f'{n/total*100:.1f}%'

    story = []

    # ── Header ───────────────────────────────────────────────────────────
    header_data = [[
        Paragraph('<font color="#6366f1"><b>Bounce</b></font><font color="white"><b>Trap</b></font>', ParagraphStyle('brand', fontSize=18, fontName='Helvetica-Bold')),
        Paragraph(f'<font color="#94a3b8">List Health Report</font>', ParagraphStyle('rt', fontSize=10, alignment=2)),
    ]]
    header_tbl = Table(header_data, colWidths=[9*cm, 8*cm])
    header_tbl.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), dark),
        ('VALIGN',     (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 12),
        ('BOTTOMPADDING', (0,0), (-1,-1), 12),
        ('LEFTPADDING',  (0,0), (0,-1), 0),
        ('RIGHTPADDING', (-1,0), (-1,-1), 0),
    ]))
    story.append(header_tbl)
    story.append(HRFlowable(width='100%', thickness=1, color=brand, spaceAfter=16))

    # ── Meta ─────────────────────────────────────────────────────────────
    completed = job.completed_at.strftime('%Y-%m-%d %H:%M UTC') if job.completed_at else '—'
    meta_rows = [
        ['File', job.filename or str(job.pk)],
        ['Generated', completed],
        ['Account',   user.email],
    ]
    meta_tbl = Table(meta_rows, colWidths=[3.5*cm, 13.5*cm])
    meta_tbl.setStyle(TableStyle([
        ('FONTNAME',    (0,0), (-1,-1), 'Helvetica'),
        ('FONTSIZE',    (0,0), (-1,-1), 9),
        ('TEXTCOLOR',   (0,0), (0,-1), muted),
        ('TEXTCOLOR',   (1,0), (1,-1), light),
        ('TOPPADDING',  (0,0), (-1,-1), 3),
        ('BOTTOMPADDING',(0,0),(-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(meta_tbl)
    story.append(Spacer(1, 0.5*cm))

    # ── Health grade hero ─────────────────────────────────────────────────
    grade_data = [[
        Paragraph(f'<font color="{grade_col.hexval()}" size="48"><b>{grade}</b></font>',
                  ParagraphStyle('grd', fontSize=48, fontName='Helvetica-Bold', alignment=TA_CENTER)),
        [
            Paragraph(f'<b>List Health Score</b>', ParagraphStyle('gh', fontSize=14, textColor=colors.white, fontName='Helvetica-Bold', spaceAfter=4)),
            Paragraph(f'{total:,} emails analysed · {valid:,} valid ({pct(valid)})',
                      ParagraphStyle('gs', fontSize=10, textColor=muted)),
        ],
    ]]
    grade_tbl = Table(grade_data, colWidths=[4*cm, 13*cm])
    grade_tbl.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#13132a')),
        ('VALIGN',     (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 16),
        ('BOTTOMPADDING',(0,0),(-1,-1),16),
        ('LEFTPADDING', (0,0), (-1,-1), 16),
        ('ROUNDEDCORNERS', [8]),
    ]))
    story.append(grade_tbl)
    story.append(Spacer(1, 0.5*cm))

    # ── Stats breakdown ───────────────────────────────────────────────────
    story.append(Paragraph('Result Breakdown', h2))
    stat_rows = [
        ['Status',   'Count',          'Percentage'],
        ['Valid',    f'{valid:,}',      pct(valid)],
        ['Invalid',  f'{invalid:,}',   pct(invalid)],
        ['Risky',    f'{risky:,}',     pct(risky)],
        ['Unknown',  f'{unknown:,}',   pct(unknown)],
        ['Total',    f'{total:,}',     '100.0%'],
    ]
    stat_tbl = Table(stat_rows, colWidths=[6*cm, 5*cm, 6*cm])
    stat_tbl.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), brand),
        ('TEXTCOLOR',  (0,0), (-1,0), colors.white),
        ('FONTNAME',   (0,0), (-1,0), 'Helvetica-Bold'),
        ('BACKGROUND', (0,-1), (-1,-1), colors.HexColor('#1e1e3a')),
        ('FONTNAME',   (0,-1), (-1,-1), 'Helvetica-Bold'),
        ('TEXTCOLOR',  (0,1),  (-1,-1), light),
        ('FONTSIZE',   (0,0),  (-1,-1), 10),
        ('ROWBACKGROUNDS', (0,1), (-1,-2), [colors.HexColor('#0d0d22'), colors.HexColor('#13132a')]),
        ('ALIGN',      (1,0),  (-1,-1), 'RIGHT'),
        ('TOPPADDING', (0,0),  (-1,-1), 7),
        ('BOTTOMPADDING',(0,0),(-1,-1), 7),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('GRID',       (0,0),  (-1,-1), 0.5, colors.HexColor('#2a2a4a')),
    ]))
    story.append(stat_tbl)
    story.append(Spacer(1, 0.5*cm))

    # ── Recommendations ───────────────────────────────────────────────────
    if advice:
        story.append(Paragraph('Recommendations', h2))
        for item in advice:
            story.append(Paragraph(f'• {item}', body))
        story.append(Spacer(1, 0.3*cm))

    # ── Footer ────────────────────────────────────────────────────────────
    story.append(HRFlowable(width='100%', thickness=0.5, color=colors.HexColor('#2a2a4a'), spaceBefore=12, spaceAfter=8))
    story.append(Paragraph(
        'Generated by BounceTrap · bouncetrap.io',
        ParagraphStyle('footer', fontSize=8, textColor=muted, alignment=TA_CENTER),
    ))

    doc.build(story)
    return buf.getvalue()


class BulkJobReportView(APIView):
    """GET /api/v1/verify/jobs/{id}/report/ — Download PDF health report (Growth+ only)."""

    def get(self, request, pk):
        if request.user.plan == 'free':
            return Response(
                {'detail': 'PDF reports require credits. Purchase credits to unlock.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        try:
            job = BulkJob.objects.get(pk=pk, user=request.user)
        except BulkJob.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        blocked = _no_results_response(job)
        if blocked:
            return blocked

        pdf_bytes = _build_report_pdf(job, request.user)
        if pdf_bytes is None:
            return Response({'detail': 'PDF generation unavailable. Install reportlab.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        filename = f'bouncetrap_report_{job.pk}.pdf'
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response
