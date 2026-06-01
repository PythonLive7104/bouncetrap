from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

urlpatterns = [
    # Auth
    path('register/',               views.RegisterView.as_view(),              name='auth-register'),
    path('login/',                  views.LoginView.as_view(),                 name='auth-login'),
    path('logout/',                 views.LogoutView.as_view(),                name='auth-logout'),
    path('token/refresh/',          TokenRefreshView.as_view(),                name='token-refresh'),

    # Profile
    path('profile/',                views.ProfileView.as_view(),               name='auth-profile'),
    path('change-password/',        views.ChangePasswordView.as_view(),        name='auth-change-password'),

    # Password reset
    path('password-reset/',         views.PasswordResetRequestView.as_view(),  name='auth-password-reset'),
    path('password-reset/confirm/', views.PasswordResetConfirmView.as_view(),  name='auth-password-reset-confirm'),

    # Referral
    path('referral/',               views.ReferralView.as_view(),              name='auth-referral'),

    # API keys  (FR-AUTH-06)
    path('api-keys/',               views.APIKeyListCreateView.as_view(),      name='api-keys-list'),
    path('api-keys/<uuid:pk>/',     views.APIKeyRevokeView.as_view(),          name='api-keys-revoke'),

    # Social login
    path('social/google/',          views.GoogleSocialAuthView.as_view(),      name='auth-social-google'),
    path('social/github/',          views.GitHubSocialAuthView.as_view(),      name='auth-social-github'),

    # Email verification
    path('verify-email/',           views.EmailVerifyView.as_view(),           name='auth-verify-email'),
    path('resend-verification/',    views.ResendVerificationView.as_view(),     name='auth-resend-verification'),
]
