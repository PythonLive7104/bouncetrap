from django.urls import path
from . import views

urlpatterns = [
    # Stats (FR-DASH)
    path('stats/',                       views.VerificationStatsView.as_view(),    name='verify-stats'),
    path('dashboard/',                   views.DashboardSummaryView.as_view(),     name='verify-dashboard'),

    # Single verify (FR-SINGLE-01)
    path('single/',                      views.SingleVerifyView.as_view(),     name='verify-single'),
    path('results/',                     views.VerificationResultListView.as_view(), name='verify-results'),

    # Email Finder
    path('find-email/',                    views.EmailFinderView.as_view(),      name='verify-find-email'),

    # Bulk (FR-BULK-*)
    path('bulk/',                        views.BulkUploadView.as_view(),       name='verify-bulk-upload'),
    path('jobs/',                        views.BulkJobListView.as_view(),      name='verify-jobs-list'),
    path('jobs/<uuid:pk>/',              views.BulkJobDetailView.as_view(),    name='verify-jobs-detail'),
    path('jobs/<uuid:pk>/download/',     views.BulkJobDownloadView.as_view(),  name='verify-jobs-download'),
    path('jobs/<uuid:pk>/download-zip/', views.BulkJobDownloadZipView.as_view(), name='verify-jobs-download-zip'),
    path('jobs/<uuid:pk>/report/',       views.BulkJobReportView.as_view(),    name='verify-jobs-report'),
    path('jobs/<uuid:pk>/cancel/',       views.BulkJobCancelView.as_view(),    name='verify-jobs-cancel'),
    path('jobs/<uuid:pk>/pause/',        views.BulkJobPauseView.as_view(),     name='verify-jobs-pause'),
    path('jobs/<uuid:pk>/resume/',       views.BulkJobResumeView.as_view(),    name='verify-jobs-resume'),
]
