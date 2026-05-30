from django.urls import path
from . import views

urlpatterns = [
    path('dns-check/',                       views.DmarcSpfDkimView.as_view(),    name='deliv-dns-check'),
    path('mx-check/',                        views.MXHealthView.as_view(),         name='deliv-mx-check'),
    path('blacklist/',                       views.BlacklistCheckView.as_view(),   name='deliv-blacklist'),
    path('analyze-headers/',                 views.HeaderAnalyzerView.as_view(),   name='deliv-analyze-headers'),
    path('inbox-placement/',                 views.InboxPlacementView.as_view(),   name='deliv-inbox-placement'),
    path('inbox-placement/<uuid:pk>/',       views.InboxPlacementView.as_view(),   name='deliv-inbox-placement-detail'),
]
