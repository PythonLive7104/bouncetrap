from django.urls import path
from . import views

urlpatterns = [
    path('credits/',                      views.CreditBalanceView.as_view(),        name='billing-credits'),
    path('credits/history/',              views.CreditHistoryView.as_view(),        name='billing-credit-history'),
    path('loyalty/',                      views.LoyaltyView.as_view(),              name='billing-loyalty'),
    path('plans/',                        views.PlanListView.as_view(),             name='billing-plans'),
    path('subscribe/',                    views.SubscribeView.as_view(),            name='billing-subscribe'),
    path('credit-packs/',                 views.CreditPackListView.as_view(),       name='billing-credit-packs'),
    path('invoices/',                     views.InvoiceListView.as_view(),          name='billing-invoices'),
    path('packs/',                         views.CreditPackListAPIView.as_view(),        name='billing-packs'),
    path('crypto/networks/',              views.CryptoNetworksView.as_view(),           name='billing-crypto-networks'),
    path('crypto/create-deposit/',        views.CreateDepositView.as_view(),            name='billing-crypto-create'),
    path('crypto/buy-pack/',              views.CreatePackDepositView.as_view(),        name='billing-crypto-buy-pack'),
    path('crypto/submit-tx/',             views.SubmitDepositTxView.as_view(),          name='billing-crypto-submit-tx'),
]
