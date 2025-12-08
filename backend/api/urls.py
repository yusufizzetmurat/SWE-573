# api/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework import views
from rest_framework.response import Response
from rest_framework import permissions
from django.http import JsonResponse
from django.db import connection
from django.core.cache import cache
from .views import (
    UserRegistrationView,
    UserProfileView,
    UserHistoryView,
    ServiceViewSet,
    TagViewSet,
    HandshakeViewSet,
    ChatViewSet,
    NotificationViewSet,
    ReputationViewSet,
    AdminReportViewSet,
    AdminUserViewSet,
    ExpressInterestView,
    TransactionHistoryViewSet,
    WikidataSearchView,
    PublicChatViewSet,
    CommentViewSet,
    NegativeRepViewSet
)
from rest_framework_simplejwt.views import TokenObtainPairView
from .views import CustomTokenObtainPairView
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
router.register(r'transactions', TransactionHistoryViewSet, basename='transaction')

def health_check(request):
    """
    Health check endpoint that verifies connectivity to all critical dependencies.
    Returns detailed status for database and Redis.
    """
    health_status = {
        'status': 'healthy',
        'service': 'the-hive-api',
        'dependencies': {}
    }
    
    overall_healthy = True
    
    # Check database connectivity
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        health_status['dependencies']['database'] = {
            'status': 'healthy',
            'message': 'Database connection successful'
        }
    except Exception as e:
        overall_healthy = False
        health_status['dependencies']['database'] = {
            'status': 'unhealthy',
            'message': f'Database connection failed: {str(e)}'
        }
    
    # Check Redis connectivity
    try:
        cache.set('health_check', 'ok', timeout=10)
        result = cache.get('health_check')
        if result == 'ok':
            health_status['dependencies']['redis'] = {
                'status': 'healthy',
                'message': 'Redis connection successful'
            }
        else:
            overall_healthy = False
            health_status['dependencies']['redis'] = {
                'status': 'unhealthy',
                'message': 'Redis connection failed: unable to read written value'
            }
    except Exception as e:
        overall_healthy = False
        health_status['dependencies']['redis'] = {
            'status': 'unhealthy',
            'message': f'Redis connection failed: {str(e)}'
        }
    
    # Update overall status
    if not overall_healthy:
        health_status['status'] = 'unhealthy'
    
    # Return appropriate HTTP status code
    status_code = 200 if overall_healthy else 503
    return JsonResponse(health_status, status=status_code)

# Create viewset instance for public chat
public_chat_viewset = PublicChatViewSet.as_view({
    'get': 'retrieve',
    'post': 'create'
})

# Create viewset instances for comments
comment_list_create = CommentViewSet.as_view({
    'get': 'list',
    'post': 'create'
})

comment_detail = CommentViewSet.as_view({
    'patch': 'partial_update',
    'delete': 'destroy'
})

comment_reviewable = CommentViewSet.as_view({
    'get': 'reviewable_handshakes'
})

# Create viewset instance for negative reputation
negative_rep_create = NegativeRepViewSet.as_view({
    'post': 'create'
})

urlpatterns = [
    path('health/', health_check, name='health_check'),
    path('auth/register/', UserRegistrationView.as_view(), name='register'),
    path('auth/login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', CustomTokenRefreshView.as_view(), name='token_refresh'),
    path('users/me/', UserProfileView.as_view(), name='user-profile'),
    path('users/<uuid:id>/', UserProfileView.as_view(), name='user-detail'),
    path('users/<uuid:id>/history/', UserHistoryView.as_view(), name='user-history'),
    path('services/<uuid:service_id>/interest/', 
         ExpressInterestView.as_view(),
         name='express-interest'),
    # Comment endpoints nested under services
    path('services/<uuid:service_id>/comments/', 
         comment_list_create, 
         name='service-comments'),
    path('services/<uuid:service_id>/comments/<uuid:pk>/', 
         comment_detail, 
         name='service-comment-detail'),
    path('services/<uuid:service_id>/comments/reviewable/', 
         comment_reviewable, 
         name='service-comments-reviewable'),
    path('public-chat/<uuid:pk>/', public_chat_viewset, name='public-chat'),
    # Negative reputation endpoint
    path('reputation/negative/', negative_rep_create, name='negative-reputation'),
    path('wikidata/search/', WikidataSearchView.as_view(), name='wikidata-search'),
    path('schema/', SpectacularAPIView.as_view(), name='schema'),
    path('docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    path('', include(router.urls)),
]