from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.core.mail import send_mail
from django.conf import settings

from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import APIKey
from .serializers import (
    RegisterSerializer,
    UserSerializer,
    ProfileUpdateSerializer,
    ChangePasswordSerializer,
    CustomTokenObtainPairSerializer,
    APIKeySerializer,
    CreateAPIKeySerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
)

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    """FR-AUTH-01 — Register with email + password. Returns JWT tokens."""
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        refresh = RefreshToken.for_user(user)
        return Response(
            {
                'user':    UserSerializer(user).data,
                'access':  str(refresh.access_token),
                'refresh': str(refresh),
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(TokenObtainPairView):
    """FR-AUTH-01 — Login, returns access + refresh + user data."""
    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [permissions.AllowAny]


class LogoutView(APIView):
    """Blacklist the refresh token on logout."""

    def post(self, request):
        try:
            refresh_token = request.data['refresh']
            token = RefreshToken(refresh_token)
            token.blacklist()
        except Exception:
            pass
        return Response(status=status.HTTP_205_RESET_CONTENT)


class ProfileView(generics.RetrieveUpdateAPIView):
    """FR-AUTH-07 — Get and update profile. DELETE permanently removes the account."""

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return ProfileUpdateSerializer
        return UserSerializer

    def get_object(self):
        return self.request.user

    def delete(self, request, *args, **kwargs):
        request.user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ChangePasswordView(APIView):
    """FR-AUTH-04 — Change password (authenticated)."""

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save()
        return Response({'detail': 'Password updated.'})


class PasswordResetRequestView(APIView):
    """FR-AUTH-04 — Send password reset email."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']

        try:
            user = User.objects.get(email=email)
            uid   = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            reset_url = f"{settings.FRONTEND_URL}/reset-password?uid={uid}&token={token}"
            send_mail(
                subject='Reset your BounceTrap password',
                message=f'Click the link to reset your password: {reset_url}',
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                fail_silently=True,
            )
        except User.DoesNotExist:
            pass  # don't reveal whether email exists

        # Always return 200 to prevent email enumeration
        return Response({'detail': 'If that email is registered, a reset link has been sent.'})


class PasswordResetConfirmView(APIView):
    """FR-AUTH-04 — Confirm password reset with uid + token."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            uid  = force_str(urlsafe_base64_decode(serializer.validated_data['uid']))
            user = User.objects.get(pk=uid)
        except (User.DoesNotExist, ValueError, TypeError):
            return Response({'detail': 'Invalid reset link.'}, status=status.HTTP_400_BAD_REQUEST)

        if not default_token_generator.check_token(user, serializer.validated_data['token']):
            return Response({'detail': 'Reset link has expired.'}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(serializer.validated_data['new_password'])
        user.save()
        return Response({'detail': 'Password has been reset.'})


# ── API Key management (FR-AUTH-06) ───────────────────────────────────────

class APIKeyListCreateView(generics.ListCreateAPIView):
    serializer_class = APIKeySerializer

    def get_queryset(self):
        return APIKey.objects.filter(user=self.request.user, is_active=True)

    def create(self, request, *args, **kwargs):
        # Free plan cannot use API keys per PRD section 3
        if request.user.plan == 'free':
            return Response(
                {'detail': 'API access requires Starter plan or above.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        in_ser = CreateAPIKeySerializer(data=request.data)
        in_ser.is_valid(raise_exception=True)

        instance, raw_key = APIKey.generate(
            user=request.user,
            name=in_ser.validated_data.get('name', 'Default'),
        )

        out_data = APIKeySerializer(instance).data
        out_data['raw_key'] = raw_key  # shown exactly once
        return Response(out_data, status=status.HTTP_201_CREATED)


class APIKeyRevokeView(APIView):
    """DELETE /api/v1/api-keys/{id}/ — Revoke (soft-delete) a key."""

    def delete(self, request, pk):
        try:
            api_key = APIKey.objects.get(pk=pk, user=request.user)
        except APIKey.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        api_key.is_active = False
        api_key.save(update_fields=['is_active'])
        return Response(status=status.HTTP_204_NO_CONTENT)


class ReferralView(APIView):
    """GET /api/v1/auth/referral/ — Return the user's referral code, link, and stats."""

    def get(self, request):
        user     = request.user
        frontend = getattr(settings, 'FRONTEND_URL', 'https://bouncetrap.net').rstrip('/')
        link     = f'{frontend}/register?ref={user.referral_code}'

        total_referrals = User.objects.filter(referred_by=user).count()

        return Response({
            'referral_code':    user.referral_code,
            'referral_link':    link,
            'total_referrals':  total_referrals,
            'credits_earned':   user.referral_credits_earned,
            'bonus_per_signup': 2_000,
        })


def _social_login_response(user):
    """Return JWT tokens + user data for a social-authenticated user."""
    refresh = RefreshToken.for_user(user)
    return Response({
        'user':    UserSerializer(user).data,
        'access':  str(refresh.access_token),
        'refresh': str(refresh),
    })


class GoogleSocialAuthView(APIView):
    """
    POST /api/v1/auth/social/google/
    Body: { "credential": "<Google OAuth2 access token from frontend>" }
    Calls Google userinfo endpoint to verify, finds or creates the user, returns JWT.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        import requests as http_requests

        access_token = request.data.get('credential', '')
        if not access_token:
            return Response({'detail': 'credential is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            resp = http_requests.get(
                'https://www.googleapis.com/oauth2/v2/userinfo',
                headers={'Authorization': f'Bearer {access_token}'},
                timeout=10,
            )
            if not resp.ok:
                return Response({'detail': 'Invalid Google token.'}, status=status.HTTP_400_BAD_REQUEST)
            idinfo = resp.json()
        except Exception:
            return Response({'detail': 'Could not verify Google token.'}, status=status.HTTP_502_BAD_GATEWAY)

        email     = idinfo.get('email', '').lower()
        full_name = idinfo.get('name', '')
        verified  = idinfo.get('verified_email', False)

        if not email or not verified:
            return Response({'detail': 'Google account has no verified email address.'}, status=status.HTTP_400_BAD_REQUEST)

        user, created = User.objects.get_or_create(
            email=email,
            defaults={'full_name': full_name, 'email_verified': True},
        )
        if created:
            user.set_unusable_password()
            user.save(update_fields=['password'])

        return _social_login_response(user)


class GitHubSocialAuthView(APIView):
    """
    POST /api/v1/auth/social/github/
    Body: { "code": "<GitHub OAuth code from callback>" }
    Exchanges the code for an access token, fetches user info, returns JWT.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        import requests as http_requests

        code = request.data.get('code', '')
        if not code:
            return Response({'detail': 'code is required.'}, status=status.HTTP_400_BAD_REQUEST)

        client_id     = getattr(settings, 'GITHUB_CLIENT_ID', '')
        client_secret = getattr(settings, 'GITHUB_CLIENT_SECRET', '')
        if not client_id or not client_secret:
            return Response({'detail': 'GitHub login is not configured.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        # Exchange code for access token
        try:
            token_resp = http_requests.post(
                'https://github.com/login/oauth/access_token',
                json={'client_id': client_id, 'client_secret': client_secret, 'code': code},
                headers={'Accept': 'application/json'},
                timeout=10,
            )
            token_data   = token_resp.json()
            access_token = token_data.get('access_token', '')
        except Exception:
            return Response({'detail': 'Failed to reach GitHub.'}, status=status.HTTP_502_BAD_GATEWAY)

        if not access_token:
            return Response({'detail': 'GitHub did not return an access token.'}, status=status.HTTP_400_BAD_REQUEST)

        # Fetch user info
        try:
            headers   = {'Authorization': f'Bearer {access_token}', 'Accept': 'application/json'}
            user_resp = http_requests.get('https://api.github.com/user', headers=headers, timeout=10)
            user_data = user_resp.json()

            # Primary email may be private — fetch explicitly
            email_resp = http_requests.get('https://api.github.com/user/emails', headers=headers, timeout=10)
            emails     = email_resp.json() if email_resp.ok else []
        except Exception:
            return Response({'detail': 'Failed to fetch GitHub user info.'}, status=status.HTTP_502_BAD_GATEWAY)

        email = next(
            (e['email'] for e in emails if e.get('primary') and e.get('verified')),
            user_data.get('email', ''),
        )
        if not email:
            return Response(
                {'detail': 'GitHub account has no verified email address. Please add one in GitHub settings.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        full_name = user_data.get('name') or user_data.get('login', '')

        user, created = User.objects.get_or_create(
            email=email.lower(),
            defaults={'full_name': full_name, 'email_verified': True},
        )
        if created:
            user.set_unusable_password()
            user.save(update_fields=['password'])

        return _social_login_response(user)

