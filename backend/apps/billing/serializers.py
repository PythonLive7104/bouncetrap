from rest_framework import serializers
from django.conf import settings
from .models import CreditLedger, CreditPack, CryptoDeposit


class CreditLedgerSerializer(serializers.ModelSerializer):
    class Meta:
        model  = CreditLedger
        fields = ('id', 'amount', 'operation', 'reference', 'balance_after', 'notes', 'created_at')


class CreditBalanceSerializer(serializers.Serializer):
    credits       = serializers.IntegerField()
    plan          = serializers.CharField()
    plan_total    = serializers.IntegerField()
    used_this_month = serializers.IntegerField()


class PlanSerializer(serializers.Serializer):
    name           = serializers.CharField()
    monthly_price  = serializers.IntegerField()
    yearly_price   = serializers.IntegerField()
    monthly_credits = serializers.IntegerField()
    yearly_credits = serializers.IntegerField()
    features       = serializers.ListField(child=serializers.CharField())


class CreditPackSerializer(serializers.ModelSerializer):
    class Meta:
        model  = CreditPack
        fields = ('id', 'name', 'credits', 'price_usd', 'stripe_price_id')


class SubscribeSerializer(serializers.Serializer):
    plan            = serializers.ChoiceField(choices=['starter', 'growth', 'pro'])
    billing_period  = serializers.ChoiceField(choices=['monthly', 'yearly'])
    payment_method_id = serializers.CharField(required=False, allow_blank=True)


class PurchaseCreditPackSerializer(serializers.Serializer):
    pack_id           = serializers.UUIDField()
    payment_method_id = serializers.CharField()


class CryptoDepositSerializer(serializers.ModelSerializer):
    description   = serializers.SerializerMethodField()
    network_label = serializers.CharField(source='get_network_display', read_only=True)

    class Meta:
        model  = CryptoDeposit
        fields = (
            'id', 'network', 'network_label', 'wallet_address', 'tx_hash',
            'invoice_type', 'description',
            'plan', 'billing_period', 'amount_usd',
            'credits_to_add', 'status', 'created_at', 'resolved_at',
        )
        read_only_fields = fields

    def get_description(self, obj):
        if obj.invoice_type == CryptoDeposit.TYPE_PACK:
            return f'Credit top-up — {obj.credits_to_add:,} credits'
        period = obj.billing_period.title() if obj.billing_period else ''
        return f'{obj.plan.title()} plan ({period})' if period else f'{obj.plan.title()} plan'
