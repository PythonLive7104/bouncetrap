from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

admin.site.site_header  = 'BounceTrap Admin'
admin.site.site_title   = 'BounceTrap'
admin.site.index_title  = 'Dashboard'

urlpatterns = [
    path('admin/', admin.site.urls),

    # API v1
    path('api/v1/auth/',          include('apps.accounts.urls')),
    path('api/v1/verify/',        include('apps.verification.urls')),
    path('api/v1/billing/',       include('apps.billing.urls')),
    path('api/v1/deliverability/', include('apps.deliverability.urls')),
    path('api/v1/teams/',          include('apps.teams.urls')),
    path('api/v1/support/',        include('apps.support.urls')),

    # OpenAPI docs
    path('api/schema/',        SpectacularAPIView.as_view(),                    name='schema'),
    path('api/docs/',          SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/',         SpectacularRedocView.as_view(url_name='schema'),   name='redoc'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
