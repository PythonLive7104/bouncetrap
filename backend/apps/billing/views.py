import logging

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db.models import Sum
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import CreditLedger, CreditPack, CryptoDeposit
from .serializers import (
    CreditLedgerSerializer,
    CreditBalanceSerializer,
    PlanSerializer,
    CreditPackSerializer,
    SubscribeSerializer,
    CryptoDepositSerializer,
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
    """GET /api/v1/billing/invoices/ — list the user's USDT deposits."""
    serializer_class = CryptoDepositSerializer

    def get_queryset(self):
        return CryptoDeposit.objects.filter(user=self.request.user)


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


def _network_payload():
    """Build the list of available USDT networks with their receiving address."""
    wallets = settings.USDT_WALLETS
    return [
        {
            'id':            net['id'],
            'label':         net['label'],
            'address':       wallets.get(net['id'], ''),
            'confirmations': net['confirmations'],
        }
        for net in settings.USDT_NETWORKS
        if wallets.get(net['id'])
    ]


class CryptoNetworksView(APIView):
    """GET /api/v1/billing/crypto/networks/ — USDT networks + receiving addresses."""

    def get(self, request):
        return Response({'asset': 'USDT', 'networks': _network_payload()})


def _resolve_network(network):
    """Return (network_id, wallet_address) for a requested network, or (None, None)."""
    network = (network or '').lower()
    address = settings.USDT_WALLETS.get(network)
    valid   = {n['id'] for n in settings.USDT_NETWORKS}
    if network not in valid or not address:
        return None, None
    return network, address


class CreateDepositView(APIView):
    """POST /api/v1/billing/crypto/create-deposit/ — start a USDT deposit for a plan."""

    def post(self, request):
        plan           = request.data.get('plan', '').lower()
        billing_period = request.data.get('billing_period', 'monthly').lower()
        network, address = _resolve_network(request.data.get('network'))

        if plan not in ('starter', 'growth', 'pro'):
            return Response({'detail': 'Invalid plan.'}, status=status.HTTP_400_BAD_REQUEST)
        if billing_period not in ('monthly', 'yearly'):
            return Response({'detail': 'Invalid billing_period.'}, status=status.HTTP_400_BAD_REQUEST)
        if not network:
            return Response({'detail': 'Invalid or unsupported network.'}, status=status.HTTP_400_BAD_REQUEST)

        key     = (plan, billing_period)
        amount  = PLAN_PRICES_MAP[key]
        credits = PLAN_CREDITS_MAP[key]

        deposit = CryptoDeposit.objects.create(
            user           = request.user,
            network        = network,
            wallet_address = address,
            plan           = plan,
            billing_period = billing_period,
            amount_usd     = amount,
            credits_to_add = credits,
        )
        return Response(CryptoDepositSerializer(deposit).data, status=status.HTTP_201_CREATED)


class CreditPackListAPIView(APIView):
    """GET /api/v1/billing/packs/ — available credit packs."""

    def get(self, request):
        return Response(CREDIT_PACKS)


class CreatePackDepositView(APIView):
    """POST /api/v1/billing/crypto/buy-pack/ — start a USDT deposit for a credit pack."""

    def post(self, request):
        pack_id = request.data.get('pack_id', '').strip()
        pack = next((p for p in CREDIT_PACKS if p['id'] == pack_id), None)
        network, address = _resolve_network(request.data.get('network'))

        if not pack:
            return Response({'detail': 'Invalid pack_id.'}, status=status.HTTP_400_BAD_REQUEST)
        if not network:
            return Response({'detail': 'Invalid or unsupported network.'}, status=status.HTTP_400_BAD_REQUEST)

        deposit = CryptoDeposit.objects.create(
            user           = request.user,
            network        = network,
            wallet_address = address,
            invoice_type   = CryptoDeposit.TYPE_PACK,
            plan           = pack_id,
            billing_period = '',
            amount_usd     = pack['price_usd'],
            credits_to_add = pack['credits'],
        )
        return Response(CryptoDepositSerializer(deposit).data, status=status.HTTP_201_CREATED)


class SubmitDepositTxView(APIView):
    """POST /api/v1/billing/crypto/submit-tx/ — attach a tx hash to a pending deposit."""

    def post(self, request):
        deposit_id = request.data.get('deposit_id', '')
        tx_hash    = (request.data.get('tx_hash', '') or '').strip()

        if not tx_hash:
            return Response({'detail': 'Transaction hash is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            deposit = CryptoDeposit.objects.get(id=deposit_id, user=request.user)
        except (CryptoDeposit.DoesNotExist, ValueError, TypeError):
            return Response({'detail': 'Deposit not found.'}, status=status.HTTP_404_NOT_FOUND)

        if deposit.status not in (CryptoDeposit.STATUS_PENDING, CryptoDeposit.STATUS_SUBMITTED):
            return Response({'detail': 'This deposit can no longer be updated.'}, status=status.HTTP_409_CONFLICT)

        deposit.tx_hash = tx_hash
        deposit.status  = CryptoDeposit.STATUS_SUBMITTED
        deposit.save(update_fields=['tx_hash', 'status'])
        logger.info('USDT deposit %s tx submitted by %s', deposit.id, request.user.email)
        return Response(CryptoDepositSerializer(deposit).data, status=status.HTTP_200_OK)
