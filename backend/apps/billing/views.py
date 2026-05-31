import hashlib
import hmac
import json
import logging

from django.conf import settings
from django.db.models import Sum
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import CreditLedger, CreditPack, NowPaymentsInvoice
from .serializers import (
    CreditLedgerSerializer,
    CreditBalanceSerializer,
    PlanSerializer,
    CreditPackSerializer,
    SubscribeSerializer,
    NowPaymentsInvoiceSerializer,
)

logger = logging.getLogger(__name__)


CREDIT_PACKS = [
    {'id': 'pack_5k',   'credits': 5_000,   'price_usd': '5.00',   'label': '5,000 credits'},
    {'id': 'pack_10k',  'credits': 10_000,  'price_usd': '10.00',  'label': '10,000 credits'},
    {'id': 'pack_25k',  'credits': 25_000,  'price_usd': '20.00',  'label': '25,000 credits'},
    {'id': 'pack_50k',  'credits': 50_000,  'price_usd': '35.00',  'label': '50,000 credits'},
    {'id': 'pack_100k', 'credits': 100_000, 'price_usd': '65.00',  'label': '100,000 credits'},
]

PLAN_FEATURES = {
    'starter': ['API access', 'Bulk up to 5k rows', 'CSV download', 'API key management'],
    'growth':  ['All Starter features', 'Bulk up to 50k rows', 'Team accounts', 'Deliverability tools'],
    'pro':     ['All Growth features', 'Credit rollover', 'White-label reports', 'Bulk up to 500k rows'],
}


class CreditBalanceView(APIView):
    """GET /api/v1/billing/credits/ — FR-BILL (all plans)."""

    def get(self, request):
        user = request.user
        plan_total = settings.PLAN_CREDITS.get(user.plan, 0)

        now = timezone.now()
        used_this_month = (
            CreditLedger.objects
            .filter(user=user, operation='used', created_at__year=now.year, created_at__month=now.month)
            .aggregate(total=Sum('amount'))['total'] or 0
        )
        used_this_month = abs(used_this_month)

        data = {
            'credits':          user.credits,
            'plan':             user.plan,
            'plan_total':       plan_total,
            'used_this_month':  used_this_month,
        }
        return Response(CreditBalanceSerializer(data).data)


class PlanListView(APIView):
    """GET /api/v1/billing/plans/ — All plans available."""

    def get(self, request):
        plans = []
        for plan_name, monthly_price in settings.PLAN_PRICES_MONTHLY.items():
            monthly_credits = settings.PLAN_CREDITS.get(plan_name, 0)
            yearly_price    = monthly_price * 10
            yearly_credits  = monthly_credits * 12
            plans.append({
                'name':            plan_name,
                'monthly_price':   monthly_price,
                'yearly_price':    yearly_price,
                'monthly_credits': monthly_credits,
                'yearly_credits':  yearly_credits,
                'features':        PLAN_FEATURES.get(plan_name, []),
            })

        # Prepend free plan
        free = {
            'name':            'free',
            'monthly_price':   0,
            'yearly_price':    0,
            'monthly_credits': 0,
            'yearly_credits':  0,
            'features':        ['100 signup credits', 'Single email verify', 'Dashboard access'],
        }
        return Response([free] + plans)


class SubscribeView(APIView):
    """POST /api/v1/billing/subscribe/ — Subscribe or upgrade plan (FR-BILL-01)."""

    def post(self, request):
        serializer = SubscribeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        plan           = serializer.validated_data['plan']
        billing_period = serializer.validated_data['billing_period']

        # Stripe integration point — wired when STRIPE_SECRET_KEY is set
        if not settings.STRIPE_SECRET_KEY:
            return Response(
                {'detail': 'Stripe is not configured. Set STRIPE_SECRET_KEY in .env.'},
                status=status.HTTP_501_NOT_IMPLEMENTED,
            )

        # TODO: create/update Stripe subscription and allocate credits via webhook
        return Response(
            {'detail': f'Subscription to {plan} ({billing_period}) initiated. Stripe webhook will activate credits.'},
            status=status.HTTP_202_ACCEPTED,
        )


class CreditPackListView(generics.ListAPIView):
    """GET /api/v1/billing/credit-packs/ — Available credit packs (FR-BILL-03)."""
    serializer_class = CreditPackSerializer
    queryset = CreditPack.objects.filter(is_active=True)


class CreditHistoryView(generics.ListAPIView):
    """GET /api/v1/billing/credits/history/ — FR-DASH-05."""
    serializer_class = CreditLedgerSerializer

    def get_queryset(self):
        return CreditLedger.objects.filter(user=self.request.user)


class InvoiceListView(generics.ListAPIView):
    """GET /api/v1/billing/invoices/ — list the user's NOWPayments invoices."""
    serializer_class = NowPaymentsInvoiceSerializer

    def get_queryset(self):
        return NowPaymentsInvoice.objects.filter(user=self.request.user)


PLAN_CREDITS_MAP = {
    ('starter', 'monthly'): 25_000,
    ('starter', 'yearly'):  300_000,
    ('growth',  'monthly'): 100_000,
    ('growth',  'yearly'):  1_200_000,
    ('pro',     'monthly'): 200_000,
    ('pro',     'yearly'):  2_400_000,
}

PLAN_PRICES_MAP = {
    ('starter', 'monthly'): '20.00',
    ('starter', 'yearly'):  '200.00',
    ('growth',  'monthly'): '70.00',
    ('growth',  'yearly'):  '700.00',
    ('pro',     'monthly'): '110.00',
    ('pro',     'yearly'):  '1100.00',
}


class CreateNowPaymentsInvoiceView(APIView):
    """POST /api/v1/billing/nowpayments/create-invoice/"""

    def post(self, request):
        import requests as req
        import uuid as uuid_mod

        plan           = request.data.get('plan', '').lower()
        billing_period = request.data.get('billing_period', 'monthly').lower()

        if plan not in ('starter', 'growth', 'pro'):
            return Response({'detail': 'Invalid plan.'}, status=status.HTTP_400_BAD_REQUEST)
        if billing_period not in ('monthly', 'yearly'):
            return Response({'detail': 'Invalid billing_period.'}, status=status.HTTP_400_BAD_REQUEST)

        api_key = settings.NOWPAYMENTS_API_KEY
        if not api_key:
            return Response({'detail': 'Crypto payments are not configured.'}, status=status.HTTP_501_NOT_IMPLEMENTED)

        key         = (plan, billing_period)
        amount      = PLAN_PRICES_MAP[key]
        credits     = PLAN_CREDITS_MAP[key]
        order_id    = str(uuid_mod.uuid4())
        frontend    = settings.FRONTEND_URL.rstrip('/')

        payload = {
            'price_amount':    float(amount),
            'price_currency':  'usd',
            'order_id':        order_id,
            'order_description': f'BounceTrap {plan.title()} ({billing_period}) — {credits:,} credits',
            'ipn_callback_url': f'{request.build_absolute_uri("/")[:-1]}/api/v1/billing/nowpayments/webhook/',
            'success_url':     f'{frontend}/dashboard/billing?payment=success',
            'cancel_url':      f'{frontend}/dashboard/billing?payment=cancelled',
        }
        try:
            resp = req.post(
                'https://api.nowpayments.io/v1/invoice',
                json=payload,
                headers={
                    'x-api-key':    api_key,
                    'Content-Type': 'application/json',
                },
                timeout=15,
            )
            resp.raise_for_status()
        except Exception as exc:
            logger.error('NOWPayments invoice creation failed: %s', exc)
            return Response({'detail': 'Could not create payment. Try again.'}, status=status.HTTP_502_BAD_GATEWAY)

        data = resp.json()
        NowPaymentsInvoice.objects.create(
            user           = request.user,
            invoice_id     = str(data['id']),
            invoice_url    = data['invoice_url'],
            order_id       = order_id,
            plan           = plan,
            billing_period = billing_period,
            amount_usd     = amount,
            credits_to_add = credits,
        )

        return Response({
            'invoice_id':  str(data['id']),
            'invoice_url': data['invoice_url'],
        }, status=status.HTTP_201_CREATED)


class CreditPackListAPIView(APIView):
    """GET /api/v1/billing/packs/ — available credit packs."""

    def get(self, request):
        return Response(CREDIT_PACKS)


class CreateCreditPackInvoiceView(APIView):
    """POST /api/v1/billing/nowpayments/buy-pack/ — buy a credit pack via crypto."""

    def post(self, request):
        import requests as req
        import uuid as uuid_mod

        pack_id = request.data.get('pack_id', '').strip()
        pack = next((p for p in CREDIT_PACKS if p['id'] == pack_id), None)
        if not pack:
            return Response({'detail': 'Invalid pack_id.'}, status=status.HTTP_400_BAD_REQUEST)

        api_key = settings.NOWPAYMENTS_API_KEY
        if not api_key:
            return Response({'detail': 'Crypto payments are not configured.'}, status=status.HTTP_501_NOT_IMPLEMENTED)

        order_id = str(uuid_mod.uuid4())
        frontend = settings.FRONTEND_URL.rstrip('/')
        payload  = {
            'price_amount':      float(pack['price_usd']),
            'price_currency':    'usd',
            'order_id':          order_id,
            'order_description': f'BounceTrap {pack["label"]} credit top-up',
            'ipn_callback_url':  f'{request.build_absolute_uri("/")[:-1]}/api/v1/billing/nowpayments/webhook/',
            'success_url':       f'{frontend}/dashboard/billing?payment=success',
            'cancel_url':        f'{frontend}/dashboard/billing?payment=cancelled',
        }
        try:
            resp = req.post(
                'https://api.nowpayments.io/v1/invoice',
                json=payload,
                headers={'x-api-key': api_key, 'Content-Type': 'application/json'},
                timeout=15,
            )
            resp.raise_for_status()
        except Exception as exc:
            logger.error('NOWPayments pack invoice creation failed: %s', exc)
            return Response({'detail': 'Could not create payment. Try again.'}, status=status.HTTP_502_BAD_GATEWAY)

        data = resp.json()
        NowPaymentsInvoice.objects.create(
            user           = request.user,
            invoice_id     = str(data['id']),
            invoice_url    = data['invoice_url'],
            order_id       = order_id,
            invoice_type   = NowPaymentsInvoice.TYPE_PACK,
            plan           = pack_id,
            billing_period = '',
            amount_usd     = pack['price_usd'],
            credits_to_add = pack['credits'],
        )
        return Response({'invoice_id': str(data['id']), 'invoice_url': data['invoice_url']}, status=status.HTTP_201_CREATED)


@method_decorator(csrf_exempt, name='dispatch')
class NowPaymentsWebhookView(APIView):
    """POST /api/v1/billing/nowpayments/webhook/ — NOWPayments IPN handler."""
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        ipn_secret = settings.NOWPAYMENTS_IPN_SECRET
        if not ipn_secret:
            return Response(status=status.HTTP_200_OK)

        sig  = request.META.get('HTTP_X_NOWPAYMENTS_SIG', '')
        body = request.body

        try:
            payload = json.loads(body)
        except json.JSONDecodeError:
            return Response({'detail': 'Bad JSON.'}, status=status.HTTP_400_BAD_REQUEST)

        # NOWPayments signature: HMAC-SHA512 of the alphabetically-sorted JSON
        sorted_body = json.dumps(payload, sort_keys=True, separators=(',', ':'))
        expected = hmac.new(
            ipn_secret.encode(),
            sorted_body.encode(),
            hashlib.sha512,
        ).hexdigest()

        if not hmac.compare_digest(sig, expected):
            return Response({'detail': 'Invalid signature.'}, status=status.HTTP_400_BAD_REQUEST)

        order_id       = payload.get('order_id', '')
        payment_status = payload.get('payment_status', '')

        if payment_status in ('confirmed', 'finished'):
            self._confirm_invoice(order_id)
        elif payment_status in ('failed', 'refunded'):
            NowPaymentsInvoice.objects.filter(order_id=order_id).update(
                status=NowPaymentsInvoice.STATUS_FAILED,
                resolved_at=timezone.now(),
            )
        elif payment_status == 'expired':
            NowPaymentsInvoice.objects.filter(order_id=order_id).update(
                status=NowPaymentsInvoice.STATUS_EXPIRED,
                resolved_at=timezone.now(),
            )

        return Response(status=status.HTTP_200_OK)

    def _confirm_invoice(self, order_id):
        from datetime import timedelta
        from django.db import transaction

        try:
            invoice = NowPaymentsInvoice.objects.select_for_update().get(
                order_id=order_id,
                status=NowPaymentsInvoice.STATUS_WAITING,
            )
        except NowPaymentsInvoice.DoesNotExist:
            return  # already processed or unknown

        with transaction.atomic():
            invoice.status      = NowPaymentsInvoice.STATUS_CONFIRMED
            invoice.resolved_at = timezone.now()
            invoice.save()

            user          = invoice.user
            user.credits += invoice.credits_to_add

            if invoice.invoice_type == NowPaymentsInvoice.TYPE_PACK:
                # Credit pack: just add credits, no plan or subscription change
                user.save(update_fields=['credits'])
                notes = f'Credit pack {invoice.plan} via crypto'
            else:
                # Plan subscription
                user.plan = invoice.plan
                now = timezone.now()
                current_expiry = user.subscription_expires_at
                if current_expiry and current_expiry > now:
                    user.subscription_expires_at = current_expiry + timedelta(days=30)
                else:
                    user.subscription_expires_at = now + timedelta(days=30)
                user.save(update_fields=['plan', 'credits', 'subscription_expires_at'])
                notes = f'{invoice.plan} {invoice.billing_period} via crypto'

            CreditLedger.objects.create(
                user          = user,
                amount        = invoice.credits_to_add,
                operation     = CreditLedger.OP_PURCHASE,
                reference     = f'nowpayments:{invoice.invoice_id}',
                balance_after = user.credits,
                notes         = notes,
            )
