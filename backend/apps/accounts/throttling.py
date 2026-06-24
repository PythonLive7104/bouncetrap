from rest_framework.throttling import UserRateThrottle


class PlanRateThrottle(UserRateThrottle):
    """Per-plan rate limiting. Rates defined in settings.REST_FRAMEWORK."""

    scope = 'free'  # default — overridden per request in allow_request()
    DEFAULT_SCOPE = 'free'  # fallback for any plan without an explicit rate

    def allow_request(self, request, view):
        # Set scope dynamically from user's plan before DRF reads self.rate.
        # Any plan without an explicit rate (e.g. 'paid', 'enterprise') falls
        # back to the default scope so an unmapped plan can never raise
        # ImproperlyConfigured and 500 every authenticated API request.
        plan = getattr(getattr(request, 'user', None), 'plan', 'free') or 'free'
        if plan not in self.THROTTLE_RATES:
            plan = self.DEFAULT_SCOPE
        self.scope = plan
        self.rate  = self.get_rate()
        self.num_requests, self.duration = self.parse_rate(self.rate)
        return super().allow_request(request, view)

    def get_cache_key(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return None
        return self.cache_format % {
            'scope': request.user.plan,
            'ident': request.user.pk,
        }
