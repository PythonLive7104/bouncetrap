from django.urls import path
from . import views

urlpatterns = [
    path('chat/',    views.ChatView.as_view(),    name='support-chat'),
    path('contact/', views.ContactView.as_view(), name='support-contact'),
]
