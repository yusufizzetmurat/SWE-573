"""
Performance and load tests
"""
from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from .models import Service, Handshake, ChatMessage
import time

User = get_user_model()


class PerformanceTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='perf@test.com',
            password='testpass123',
            first_name='Performance',
            last_name='Test'
        )
        self.token = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token.access_token}')

    def test_service_list_performance(self):
        """Test service list endpoint performance"""
        # Create multiple services
        for i in range(10):
            Service.objects.create(
                user=self.user,
                title=f'Service {i}',
                description=f'Description {i}',
                type='Offer',
                duration=1.0,
                location_type='Online',
                status='Active',
                max_participants=1,
                schedule_type='One-Time'
            )
        
        start_time = time.time()
        response = self.client.get('/api/services/')
        duration = time.time() - start_time
        
        self.assertEqual(response.status_code, 200)
        self.assertLess(duration, 1.0, "Service list should complete in under 1 second")
        self.assertGreaterEqual(len(response.data), 10)

    def test_chat_list_performance(self):
        """Test chat list endpoint performance"""
        # Create multiple handshakes
        service = Service.objects.create(
            user=self.user,
            title='Test Service',
            description='Test',
            type='Offer',
            duration=1.0,
            location_type='Online',
            status='Active',
            max_participants=1,
            schedule_type='One-Time'
        )
        
        user2 = User.objects.create_user(
            email='user2@test.com',
            password='testpass123',
            first_name='User',
            last_name='Two'
        )
        
        for i in range(5):
            handshake = Handshake.objects.create(
                service=service,
                requester=user2,
                status='pending',
                provisioned_hours=1.0
            )
            ChatMessage.objects.create(
                handshake=handshake,
                sender=self.user,
                body=f'Message {i}'
            )
        
        start_time = time.time()
        response = self.client.get('/api/chats/')
        duration = time.time() - start_time
        
        self.assertEqual(response.status_code, 200)
        self.assertLess(duration, 0.5, "Chat list should complete in under 0.5 seconds")

    def test_query_count_service_list(self):
        """Test that service list doesn't have N+1 query problem"""
        from django.db import connection
        from django.test.utils import override_settings
        from django.db import reset_queries
        
        # Create services
        for i in range(5):
            Service.objects.create(
                user=self.user,
                title=f'Service {i}',
                description=f'Description {i}',
                type='Offer',
                duration=1.0,
                location_type='Online',
                status='Active',
                max_participants=1,
                schedule_type='One-Time'
            )
        
        reset_queries()
        response = self.client.get('/api/services/')
        query_count = len(connection.queries)
        
        self.assertEqual(response.status_code, 200)
        # Should use select_related/prefetch_related to minimize queries
        self.assertLess(query_count, 10, "Service list should use efficient queries")

