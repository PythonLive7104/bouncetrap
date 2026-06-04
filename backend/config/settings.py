from pathlib import Path
from datetime import timedelta
from decouple import config, Csv

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = config('SECRET_KEY', default='dev-insecure-key-change-in-production')
DEBUG = config('DEBUG', default=True, cast=bool)
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost,127.0.0.1', cast=Csv())

# ── Applications ──────────────────────────────────────────────────────────
DJANGO_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.sites',
]

THIRD_PARTY_APPS = [
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'drf_spectacular',
    'anymail',
    'allauth',
    'allauth.account',
    'allauth.socialaccount',
    'allauth.socialaccount.providers.google',
    'allauth.socialaccount.providers.github',
    'django_celery_results',
    # 'djstripe',  # Phase 2 — add back when Stripe keys are configured
]

LOCAL_APPS = [
    'apps.accounts',
    'apps.verification',
    'apps.billing',
    'apps.deliverability',
    'apps.teams',
    'apps.support',
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

SITE_ID = 1

# ── Middleware ────────────────────────────────────────────────────────────
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'allauth.account.middleware.AccountMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# ── Database ──────────────────────────────────────────────────────────────
import dj_database_url
DATABASES = {
    'default': dj_database_url.config(
        default=config('DATABASE_URL', default='sqlite:///db.sqlite3')
    )
}

# ── Cache / Redis ─────────────────────────────────────────────────────────
REDIS_URL = config('REDIS_URL', default='redis://localhost:6379/0')

CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': REDIS_URL,
    }
}

# ── Auth ──────────────────────────────────────────────────────────────────
AUTH_USER_MODEL = 'accounts.User'

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

AUTHENTICATION_BACKENDS = [
    'django.contrib.auth.backends.ModelBackend',
    'allauth.account.auth_backends.AuthenticationBackend',
]

# ── Django Allauth ────────────────────────────────────────────────────────
ACCOUNT_LOGIN_METHODS = {'email'}
ACCOUNT_SIGNUP_FIELDS = ['email*', 'password1*', 'password2*']
ACCOUNT_EMAIL_VERIFICATION = 'optional'
ACCOUNT_UNIQUE_EMAIL = True

# ── DRF ───────────────────────────────────────────────────────────────────
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'apps.accounts.authentication.APIKeyAuthentication',
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_THROTTLE_CLASSES': [
        'apps.accounts.throttling.PlanRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'free':    '60/min',
        'starter': '600/min',
        'growth':  '3000/min',
        'pro':     '12000/min',
        'support_chat':    '20/min',
        'support_contact': '5/min',
        'public_tool':     '30/min',
    },
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
}

# ── JWT ───────────────────────────────────────────────────────────────────
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME':  timedelta(minutes=config('JWT_ACCESS_TOKEN_LIFETIME_MINUTES', default=60, cast=int)),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=config('JWT_REFRESH_TOKEN_LIFETIME_DAYS', default=7, cast=int)),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
}

# ── CORS ──────────────────────────────────────────────────────────────────
FRONTEND_URL = config('FRONTEND_URL', default='http://localhost:5175')
CORS_ALLOWED_ORIGINS = [
    FRONTEND_URL,
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5176',
]
CORS_ALLOW_CREDENTIALS = True

# ── CSRF ──────────────────────────────────────────────────────────────────
CSRF_TRUSTED_ORIGINS = [
    'https://bouncetrap.net',
    'https://www.bouncetrap.net',
]

# ── Celery ────────────────────────────────────────────────────────────────
CELERY_BROKER_URL = REDIS_URL
CELERY_RESULT_BACKEND = 'django-db'
CELERY_CACHE_BACKEND = 'default'
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'UTC'
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_ROUTES = {
    'apps.verification.tasks.*': {'queue': 'verification'},
}
# Redis re-queues a task whose message remains unacknowledged beyond visibility_timeout.
# Bulk jobs can take several hours (2 000 emails × ~5 s/email ≈ 2.8 h), so we set
# visibility_timeout to 12 h to prevent the broker from starting a second worker on
# the same job while the first is still running.
CELERY_BROKER_TRANSPORT_OPTIONS = {'visibility_timeout': 43200}

# ── Storage ───────────────────────────────────────────────────────────────
MEDIA_URL  = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# ── Email — Resend via Anymail ────────────────────────────────────────────
EMAIL_BACKEND      = 'anymail.backends.resend.EmailBackend'
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='noreply@bouncetrap.net')
ANYMAIL = {
    'RESEND_API_KEY': config('RESEND_API_KEY', default=''),
}

# ── NOWPayments ───────────────────────────────────────────────────────────
NOWPAYMENTS_API_KEY  = config('NOWPAYMENTS_API_KEY', default='')
NOWPAYMENTS_IPN_SECRET = config('NOWPAYMENTS_IPN_SECRET', default='')

# ── Inbox Placement seed accounts ────────────────────────────────────────
INBOX_SEED_ACCOUNTS = [
    a for a in [
        {'provider': 'gmail',   'email': config('SEED_GMAIL_EMAIL',   default=''), 'password': config('SEED_GMAIL_PASSWORD',   default=''), 'imap_host': 'imap.gmail.com',   'imap_port': 993},
        {'provider': 'outlook', 'email': config('SEED_OUTLOOK_EMAIL', default=''), 'password': config('SEED_OUTLOOK_PASSWORD', default=''), 'imap_host': 'outlook.office365.com', 'imap_port': 993},
        {'provider': 'yahoo',   'email': config('SEED_YAHOO_EMAIL',   default=''), 'password': config('SEED_YAHOO_PASSWORD',   default=''), 'imap_host': 'imap.mail.yahoo.com', 'imap_port': 993},
    ]
    if a['email'] and a['password']
]

# ── Verification engine ───────────────────────────────────────────────────
DEEP_VERIFY_API_KEY = config('DEEP_VERIFY_API_KEY', default='')
DEEP_VERIFY_API_URL = config('DEEP_VERIFY_API_URL', default='')
KICKBOX_API_KEY     = config('KICKBOX_API_KEY', default='')

# ── Social login ──────────────────────────────────────────────────────────
GOOGLE_CLIENT_ID      = config('GOOGLE_CLIENT_ID', default='')
GOOGLE_CLIENT_SECRET  = config('GOOGLE_CLIENT_SECRET', default='')
OPENAI_API_KEY        = config('OPENAI_API_KEY', default='')

# Where contact-form submissions are emailed (falls back to DEFAULT_FROM_EMAIL)
CONTACT_EMAIL         = config('CONTACT_EMAIL', default='')
GITHUB_CLIENT_ID      = config('GITHUB_CLIENT_ID', default='')
GITHUB_CLIENT_SECRET  = config('GITHUB_CLIENT_SECRET', default='')

# ── Plans & credits ───────────────────────────────────────────────────────
PLAN_CREDITS = {
    'free':    100,      # one-time signup bonus
    'starter': 25_000,
    'growth':  100_000,
    'pro':     200_000,
}

PLAN_PRICES_MONTHLY = {
    'starter': 20,
    'growth':  70,
    'pro':     110,
}

# ── drf-spectacular ───────────────────────────────────────────────────────
SPECTACULAR_SETTINGS = {
    'TITLE': 'BounceTrap API',
    'DESCRIPTION': 'Email verification & deliverability platform — v1',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'COMPONENT_SPLIT_REQUEST': True,
    'SECURITY': [{'BearerAuth': []}, {'ApiKeyAuth': []}],
}

# ── i18n ─────────────────────────────────────────────────────────────────
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
