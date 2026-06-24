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
    path('dodo/create-checkout/',         views.CreateDodoCheckoutView.as_view(),       name='billing-dodo-create'),
    path('dodo/buy-pack/',                views.CreateCreditPackCheckoutView.as_view(), name='billing-dodo-buy-pack'),
    path('dodo/webhook/',                 views.DodoWebhookView.as_view(),              name='billing-dodo-webhook'),
]
