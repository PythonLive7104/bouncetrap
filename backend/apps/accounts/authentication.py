from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from .models import APIKey


class APIKeyAuthentication(BaseAuthentication):
    """Authenticate via X-API-Key header. Per SR-02, keys stored as SHA-256 hashes."""

    keyword = 'X-API-Key'

    def authenticate(self, request):
        raw_key = request.META.get('HTTP_X_API_KEY', '').strip()
        if not raw_key:
            return None  # fall through to next authenticator

        key_hash = APIKey.hash_key(raw_key)
        try:
            api_key = (
                APIKey.objects
                .select_related('user')
                .get(key_hash=key_hash, is_active=True)
            )
        except APIKey.DoesNotExist:
            raise AuthenticationFailed('Invalid API key.')

        if not api_key.user.is_active:
            raise AuthenticationFailed('User account is disabled.')

        api_key.touch()
        return (api_key.user, api_key)

    def authenticate_header(self, request):
        return self.keyword
