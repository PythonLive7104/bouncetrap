from django.contrib import admin
from django.utils.html import format_html
from .models import CreditLedger, CreditPack, DodoPayment, CoinbaseCharge


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


@admin.register(DodoPayment)
class DodoPaymentAdmin(admin.ModelAdmin):
    list_display    = ('user', 'plan', 'invoice_type', 'credits_to_add', 'status_badge', 'billing_period', 'created_at', 'resolved_at')
    list_filter     = ('status', 'invoice_type', 'plan')
    search_fields   = ('user__email', 'session_id', 'payment_id', 'order_id')
    readonly_fields = ('id', 'session_id', 'payment_id', 'order_id', 'created_at', 'resolved_at')
    list_per_page   = 50

    @admin.display(description='Status')
    def status_badge(self, obj):
        colours = {
            'pending':   '#f59e0b',
            'succeeded': '#22c55e',
            'failed':    '#ef4444',
        }
        colour = colours.get(obj.status, '#94a3b8')
        return format_html('<span style="color:{};font-weight:600">{}</span>', colour, obj.status.title())


@admin.register(CoinbaseCharge)
class CoinbaseChargeAdmin(admin.ModelAdmin):
    list_display    = ('user', 'plan', 'credits_to_add', 'status', 'charge_code', 'created_at', 'resolved_at')
    list_filter     = ('status', 'plan')
    search_fields   = ('user__email', 'charge_code', 'charge_id')
    readonly_fields = ('id', 'charge_id', 'charge_code', 'created_at', 'resolved_at')
    list_per_page   = 50
