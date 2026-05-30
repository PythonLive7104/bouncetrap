from django.urls import path
from . import views

urlpatterns = [
    path('', views.TeamListCreateView.as_view(), name='teams-list-create'),
    path('accept-invite/', views.TeamAcceptInviteView.as_view(), name='teams-accept-invite'),
    path('<uuid:pk>/', views.TeamDetailView.as_view(), name='teams-detail'),
    path('<uuid:pk>/invite/', views.TeamInviteView.as_view(), name='teams-invite'),
    path('<uuid:pk>/members/<uuid:user_id>/', views.TeamMemberView.as_view(), name='teams-member'),
]
