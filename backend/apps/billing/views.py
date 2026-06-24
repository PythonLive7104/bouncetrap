import base64
import hashlib
import hmac
import json
import logging

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db.models import Sum
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import CreditLedger, CreditPack, DodoPayment
from .serializers import (
    CreditLedgerSerializer,
    CreditBalanceSerializer,
    PlanSerializer,
    CreditPackSerializer,
    SubscribeSerializer,
    DodoPaymentSerializer,
)

logger = logging.getLogger(__name__)
User = get_user_model()

# Loyalty reward card — every completed purchase (any plan or pack) earns one
# stamp. Collect 10 stamps and the next reward grants free credits automatically.
LOYALTY_STAMPS_REQUIRED = 10
LOYALTY_REWARD_CREDITS  = 25_000


CREDIT_PACKS = [
    {'id': 'pack_25k',  'credits': 25_000,  'price_usd': '20.00',  'label': '25,000 credits'},
    {'id': 'pack_50k',  'credits': 50_000,  'price_usd': '40.00',  'label': '50,000 credits'},
    {'id': 'pack_100k', 'credits': 100_000, 'price_usd': '70.00',  'label': '100,000 credits'},
    {'id': 'pack_200k', 'credits': 200_000, 'price_usd': '140.00', 'label': '200,000 credits'},
    {'id': 'pack_400k', 'credits': 400_000, 'price_usd': '230.00', 'label': '400,000 credits'},
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


class LoyaltyView(APIView):
    """GET /api/v1/billing/loyalty/ — User's reward-card progress."""

    def get(self, request):
        user = request.user
        return Response({
            'stamps':          user.loyalty_stamps,
            'stamps_required': LOYALTY_STAMPS_REQUIRED,
            'reward_credits':  LOYALTY_REWARD_CREDITS,
            'rewards_earned':  user.loyalty_rewards_earned,
            'stamps_to_go':    max(LOYALTY_STAMPS_REQUIRED - user.loyalty_stamps, 0),
        })


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
    """GET /api/v1/billing/invoices/ — list the user's Dodo payments."""
    serializer_class = DodoPaymentSerializer

    def get_queryset(self):
        return DodoPayment.objects.filter(user=self.request.user)


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


DODO_CHECKOUT_PATH = '/checkouts'


def _create_dodo_checkout(*, request, order_id, amount_usd, description, metadata):
    """Create a Dodo Payments checkout session and return its JSON response.

    Uses a single "Pay What You Want" product (DODO_PRODUCT_ID); the exact price
    is passed per checkout via the cart `amount` (in cents). Raises on failure so
    the caller can return a 502.
    """
    import requests as req

    frontend = settings.FRONTEND_URL.rstrip('/')
    # Dodo appends its own ?status=&payment_id=… params to the return URL on
    # redirect, so we leave it query-free here (the frontend keys off those).
    payload = {
        'product_cart': [{
            'product_id': settings.DODO_PRODUCT_ID,
            'quantity':   1,
            'amount':     int(round(float(amount_usd) * 100)),   # lowest denomination (cents)
        }],
        'customer': {
            'email': request.user.email,
            'name':  request.user.full_name or request.user.email,
        },
        'return_url': f'{frontend}/dashboard/billing',
        'metadata':   {k: str(v) for k, v in {**metadata, 'order_id': order_id}.items()},
    }
    resp = req.post(
        f'{settings.DODO_API_BASE}{DODO_CHECKOUT_PATH}',
        json=payload,
        headers={
            'Authorization': f'Bearer {settings.DODO_API_KEY}',
            'Content-Type':  'application/json',
        },
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json()


class CreateDodoCheckoutView(APIView):
    """POST /api/v1/billing/dodo/create-checkout/ — buy a plan via Dodo (card)."""

    def post(self, request):
        import uuid as uuid_mod

        plan           = request.data.get('plan', '').lower()
        billing_period = request.data.get('billing_period', 'monthly').lower()

        if plan not in ('starter', 'growth', 'pro'):
            return Response({'detail': 'Invalid plan.'}, status=status.HTTP_400_BAD_REQUEST)
        if billing_period not in ('monthly', 'yearly'):
            return Response({'detail': 'Invalid billing_period.'}, status=status.HTTP_400_BAD_REQUEST)

        if not settings.DODO_API_KEY or not settings.DODO_PRODUCT_ID:
            return Response({'detail': 'Payments are not configured.'}, status=status.HTTP_501_NOT_IMPLEMENTED)

        key      = (plan, billing_period)
        amount   = PLAN_PRICES_MAP[key]
        credits  = PLAN_CREDITS_MAP[key]
        order_id = str(uuid_mod.uuid4())

        try:
            data = _create_dodo_checkout(
                request     = request,
                order_id    = order_id,
                amount_usd  = amount,
                description = f'BounceTrap {plan.title()} ({billing_period}) — {credits:,} credits',
                metadata    = {'plan': plan, 'billing_period': billing_period, 'type': 'plan'},
            )
        except Exception as exc:
            logger.error('Dodo checkout creation failed: %s', exc)
            return Response({'detail': 'Could not create payment. Try again.'}, status=status.HTTP_502_BAD_GATEWAY)

        DodoPayment.objects.create(
            user           = request.user,
            session_id     = str(data['session_id']),
            checkout_url   = data['checkout_url'],
            order_id       = order_id,
            plan           = plan,
            billing_period = billing_period,
            amount_usd     = amount,
            credits_to_add = credits,
        )
        return Response({
            'session_id':   str(data['session_id']),
            'checkout_url': data['checkout_url'],
        }, status=status.HTTP_201_CREATED)


class CreditPackListAPIView(APIView):
    """GET /api/v1/billing/packs/ — available credit packs."""

    def get(self, request):
        return Response(CREDIT_PACKS)


class CreateCreditPackCheckoutView(APIView):
    """POST /api/v1/billing/dodo/buy-pack/ — buy a credit pack via Dodo (card)."""

    def post(self, request):
        import uuid as uuid_mod

        pack_id = request.data.get('pack_id', '').strip()
        pack = next((p for p in CREDIT_PACKS if p['id'] == pack_id), None)
        if not pack:
            return Response({'detail': 'Invalid pack_id.'}, status=status.HTTP_400_BAD_REQUEST)

        if not settings.DODO_API_KEY or not settings.DODO_PRODUCT_ID:
            return Response({'detail': 'Payments are not configured.'}, status=status.HTTP_501_NOT_IMPLEMENTED)

        order_id = str(uuid_mod.uuid4())
        try:
            data = _create_dodo_checkout(
                request     = request,
                order_id    = order_id,
                amount_usd  = pack['price_usd'],
                description = f'BounceTrap {pack["label"]} credit top-up',
                metadata    = {'pack_id': pack_id, 'type': 'pack'},
            )
        except Exception as exc:
            logger.error('Dodo pack checkout creation failed: %s', exc)
            return Response({'detail': 'Could not create payment. Try again.'}, status=status.HTTP_502_BAD_GATEWAY)

        DodoPayment.objects.create(
            user           = request.user,
            session_id     = str(data['session_id']),
            checkout_url   = data['checkout_url'],
            order_id       = order_id,
            invoice_type   = DodoPayment.TYPE_PACK,
            plan           = pack_id,
            billing_period = '',
            amount_usd     = pack['price_usd'],
            credits_to_add = pack['credits'],
        )
        return Response({
            'session_id':   str(data['session_id']),
            'checkout_url': data['checkout_url'],
        }, status=status.HTTP_201_CREATED)


@method_decorator(csrf_exempt, name='dispatch')
class DodoWebhookView(APIView):
    """POST /api/v1/billing/dodo/webhook/ — Dodo Payments webhook handler.

    Verifies the Standard Webhooks signature, then credits the user on
    `payment.succeeded`.
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        raw_body = request.body

        if not self._verify_signature(request, raw_body):
            logger.warning('Dodo webhook: invalid signature')
            return Response({'detail': 'Invalid signature.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            payload = json.loads(raw_body)
        except json.JSONDecodeError:
            return Response({'detail': 'Bad JSON.'}, status=status.HTTP_400_BAD_REQUEST)

        event_type = payload.get('type', '')
        data       = payload.get('data', {}) or {}
        metadata   = data.get('metadata', {}) or {}
        order_id   = metadata.get('order_id', '')
        payment_id = str(data.get('payment_id', '') or '')

        logger.info('Dodo webhook: type=%s order=%s payment=%s', event_type, order_id, payment_id)

        if event_type == 'payment.succeeded':
            self._confirm_payment(order_id, payment_id)
        elif event_type == 'payment.failed':
            DodoPayment.objects.filter(order_id=order_id).update(
                status=DodoPayment.STATUS_FAILED,
                payment_id=payment_id or '',
                resolved_at=timezone.now(),
            )

        return Response(status=status.HTTP_200_OK)

    def _verify_signature(self, request, raw_body):
        """Verify the Standard Webhooks signature Dodo sends.

        signature = base64(HMAC-SHA256(secret, f"{id}.{timestamp}.{body}")).
        The configured secret is base64-encoded and prefixed with `whsec_`.
        The `webhook-signature` header is a space-separated list of `v1,<sig>`.
        """
        secret = settings.DODO_WEBHOOK_SECRET
        if not secret:
            logger.warning('Dodo webhook: DODO_WEBHOOK_SECRET not set — skipping signature check')
            return True

        webhook_id   = request.META.get('HTTP_WEBHOOK_ID', '')
        timestamp    = request.META.get('HTTP_WEBHOOK_TIMESTAMP', '')
        sig_header   = request.META.get('HTTP_WEBHOOK_SIGNATURE', '')
        if not (webhook_id and timestamp and sig_header):
            return False

        if secret.startswith('whsec_'):
            secret = secret[len('whsec_'):]
        try:
            secret_bytes = base64.b64decode(secret)
        except Exception:
            secret_bytes = secret.encode()

        signed = f'{webhook_id}.{timestamp}.{raw_body.decode()}'.encode()
        expected = base64.b64encode(
            hmac.new(secret_bytes, signed, hashlib.sha256).digest()
        ).decode()

        # Header may carry multiple space-separated `v1,<sig>` versions.
        for part in sig_header.split():
            sig = part.split(',', 1)[1] if ',' in part else part
            if hmac.compare_digest(sig, expected):
                return True
        return False

    def _confirm_payment(self, order_id, payment_id):
        from django.db import transaction

        with transaction.atomic():
            try:
                payment = DodoPayment.objects.select_for_update().get(
                    order_id=order_id,
                    status=DodoPayment.STATUS_PENDING,
                )
            except DodoPayment.DoesNotExist:
                # Duplicate webhook for an already-credited order — ignore safely.
                logger.info('Dodo webhook: order=%s already processed or unknown', order_id)
                return

            payment.status      = DodoPayment.STATUS_SUCCEEDED
            payment.payment_id  = payment_id or payment.payment_id
            payment.resolved_at = timezone.now()
            payment.save()

            user          = payment.user
            user.credits += payment.credits_to_add

            # Credits-only model: every purchase just tops up credits and unlocks
            # full feature access (plan='paid'). Nothing ever expires.
            if user.plan == 'free':
                user.plan = User.PLAN_PAID
            if payment.invoice_type == DodoPayment.TYPE_PACK:
                notes = f'Credit pack {payment.plan} via card'
            else:
                notes = f'{payment.credits_to_add:,} credits via card'

            # ── Loyalty reward card — every purchase earns one stamp ──────
            user.loyalty_stamps += 1
            reward_won = False
            if user.loyalty_stamps >= LOYALTY_STAMPS_REQUIRED:
                user.loyalty_stamps    -= LOYALTY_STAMPS_REQUIRED
                user.loyalty_rewards_earned += 1
                user.credits           += LOYALTY_REWARD_CREDITS
                reward_won = True

            user.save(update_fields=['plan', 'credits', 'loyalty_stamps', 'loyalty_rewards_earned'])

            CreditLedger.objects.create(
                user          = user,
                amount        = payment.credits_to_add,
                operation     = CreditLedger.OP_PURCHASE,
                reference     = f'dodo:{payment.payment_id or payment.session_id}',
                balance_after = user.credits - (LOYALTY_REWARD_CREDITS if reward_won else 0),
                notes         = notes,
            )

            if reward_won:
                CreditLedger.objects.create(
                    user          = user,
                    amount        = LOYALTY_REWARD_CREDITS,
                    operation     = CreditLedger.OP_BONUS,
                    reference     = f'loyalty:reward:{user.loyalty_rewards_earned}',
                    balance_after = user.credits,
                    notes         = f'Loyalty reward — {LOYALTY_STAMPS_REQUIRED} purchases completed 🎉',
                )
                logger.info('Loyalty reward: %d credits granted to %s', LOYALTY_REWARD_CREDITS, user.email)
            logger.info(
                'Dodo webhook: credited %d to user %s (order=%s)',
                payment.credits_to_add, user.email, order_id,
            )
