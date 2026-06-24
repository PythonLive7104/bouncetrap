from django.contrib import admin
from django.utils import timezone
from django.utils.html import format_html
from .models import CreditLedger, CreditPack, CryptoDeposit


@admin.register(CreditLedger)
class CreditLedgerAdmin(admin.ModelAdmin):
    list_display    = ('user', 'amount_display', 'operation', 'balance_after', 'notes', 'created_at')
    list_filter     = ('operation',)
    search_fields   = ('user__email', 'reference', 'notes')
    readonly_fields = ('id', 'user', 'amount', 'operation', 'reference', 'balance_after', 'created_at')
    list_per_page   = 100

    @admin.display(description='Amount')
    def amount_display(self, obj):
        colour = '#22c55e' if obj.amount >= 0 else '#ef4444'
        sign   = '+' if obj.amount >= 0 else ''
        return format_html('<span style="color:{};font-weight:600">{}{:,}</span>', colour, sign, obj.amount)


@admin.register(CreditPack)
class CreditPackAdmin(admin.ModelAdmin):
    list_display = ('name', 'credits', 'price_usd', 'is_active')
    list_filter  = ('is_active',)


@admin.register(CryptoDeposit)
class CryptoDepositAdmin(admin.ModelAdmin):
    list_display    = ('user', 'plan', 'invoice_type', 'network', 'amount_usd', 'credits_to_add', 'status_badge', 'tx_link', 'created_at')
    list_filter     = ('status', 'network', 'invoice_type', 'plan')
    search_fields   = ('user__email', 'tx_hash', 'wallet_address', 'id')
    readonly_fields = ('id', 'user', 'network', 'wallet_address', 'invoice_type', 'plan', 'billing_period', 'amount_usd', 'credits_to_add', 'created_at', 'resolved_at')
    list_per_page   = 50
    actions         = ('approve_deposits', 'reject_deposits')

    @admin.display(description='Status')
    def status_badge(self, obj):
        colours = {
            'pending':   '#94a3b8',
            'submitted': '#f59e0b',
            'confirmed': '#22c55e',
            'rejected':  '#ef4444',
        }
        colour = colours.get(obj.status, '#94a3b8')
        return format_html('<span style="color:{};font-weight:600">{}</span>', colour, obj.get_status_display())

    @admin.display(description='Tx hash')
    def tx_link(self, obj):
        if not obj.tx_hash:
            return '—'
        explorers = {
            'erc20': 'https://etherscan.io/tx/',
            'bep20': 'https://bscscan.com/tx/',
            'trc20': 'https://tronscan.org/#/transaction/',
        }
        base = explorers.get(obj.network)
        short = f'{obj.tx_hash[:10]}…{obj.tx_hash[-6:]}' if len(obj.tx_hash) > 18 else obj.tx_hash
        if base:
            return format_html('<a href="{}{}" target="_blank" rel="noreferrer">{}</a>', base, obj.tx_hash, short)
        return short

    @admin.action(description='✓ Approve & credit selected deposits')
    def approve_deposits(self, request, queryset):
        credited = 0
        for deposit in queryset:
            if deposit.confirm():
                credited += 1
        self.message_user(request, f'Confirmed and credited {credited} deposit(s).')

    @admin.action(description='✕ Reject selected deposits')
    def reject_deposits(self, request, queryset):
        updated = queryset.exclude(status=CryptoDeposit.STATUS_CONFIRMED).update(
            status=CryptoDeposit.STATUS_REJECTED,
            resolved_at=timezone.now(),
        )
        self.message_user(request, f'Rejected {updated} deposit(s).')
