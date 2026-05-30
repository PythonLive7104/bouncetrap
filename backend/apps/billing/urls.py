from django.urls import path
from . import views

urlpatterns = [
    path('credits/',                      views.CreditBalanceView.as_view(),        name='billing-credits'),
    path('credits/history/',              views.CreditHistoryView.as_view(),        name='billing-credit-history'),
    path('plans/',                        views.PlanListView.as_view(),             name='billing-plans'),
    path('subscribe/',                    views.SubscribeView.as_view(),            name='billing-subscribe'),
    path('credit-packs/',                 views.CreditPackListView.as_view(),       name='billing-credit-packs'),
    path('invoices/',                     views.InvoiceListView.as_view(),          name='billing-invoices'),
    path('packs/',                         views.CreditPackListAPIView.as_view(),        name='billing-packs'),
    path('nowpayments/create-invoice/',   views.CreateNowPaymentsInvoiceView.as_view(), name='billing-nowpayments-create'),
    path('nowpayments/buy-pack/',         views.CreateCreditPackInvoiceView.as_view(),  name='billing-nowpayments-buy-pack'),
    path('nowpayments/webhook/',          views.NowPaymentsWebhookView.as_view(),       name='billing-nowpayments-webhook'),
]
