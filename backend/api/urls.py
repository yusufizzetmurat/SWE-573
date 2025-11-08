# api/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework import views
from rest_framework.response import Response
from rest_framework import permissions
from django.http import JsonResponse
from .views import (
    UserRegistrationView,
    UserProfileView,
    ServiceViewSet,
    TagViewSet,
    HandshakeViewSet,
    ChatViewSet,
    NotificationViewSet,
    ReputationViewSet,
    AdminReportViewSet,
    AdminUserViewSet
)
from rest_framework_simplejwt.views import TokenObtainPairView
from .views import CustomTokenRefreshView
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

router = DefaultRouter()
router.register(r'services', ServiceViewSet, basename='service')
router.register(r'tags', TagViewSet, basename='tag')
router.register(r'handshakes', HandshakeViewSet, basename='handshake')
router.register(r'chats', ChatViewSet, basename='chat')
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'reputation', ReputationViewSet, basename='reputation')
router.register(r'admin/reports', AdminReportViewSet, basename='admin-report')
router.register(r'admin/users', AdminUserViewSet, basename='admin-user')

def health_check(request):
    return JsonResponse({'status': 'healthy', 'service': 'the-hive-api'})

urlpatterns = [
    path('health/', health_check, name='health_check'),
    path('auth/register/', UserRegistrationView.as_view(), name='register'),
    path('auth/login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', CustomTokenRefreshView.as_view(), name='token_refresh'),
    path('users/me/', UserProfileView.as_view(), name='user-profile'),
    path('users/<uuid:id>/', UserProfileView.as_view(), name='user-detail'),
    path('services/<uuid:service_id>/interest/', 
         HandshakeViewSet.as_view({'post': 'express_interest'}),
         name='express-interest'),
    path('schema/', SpectacularAPIView.as_view(), name='schema'),
    path('docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    path('', include(router.urls)),
]