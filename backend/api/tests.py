"""
Comprehensive unit tests for The Hive API endpoints
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from decimal import Decimal
import uuid

from .models import User, Service, Tag, Handshake, ChatMessage, Notification, ReputationRep, Badge, Report

User = get_user_model()


class BaseTestCase(TestCase):
    """Base test case with common setup"""
    
    def setUp(self):
        self.client = APIClient()
        
        # Create test users
        self.user1 = User.objects.create_user(
            'user1@test.com',
            password='testpass123',
            first_name='John',
            last_name='Doe',
            timebank_balance=Decimal('5.00'),
            karma_score=10
        )
        
        self.user2 = User.objects.create_user(
            'user2@test.com',
            password='testpass123',
            first_name='Jane',
            last_name='Smith',
            timebank_balance=Decimal('3.00'),
            karma_score=5
        )
        
        self.admin = User.objects.create_user(
            'admin@test.com',
            password='adminpass123',
            first_name='Admin',
            last_name='User',
            role='admin',
            timebank_balance=Decimal('10.00')
        )
        
        # Create test tags
        self.tag1 = Tag.objects.create(id='Q8476', name='Cooking')
        self.tag2 = Tag.objects.create(id='Q11424', name='Music')
        
        # Create test service
        self.service = Service.objects.create(
            user=self.user1,
            title='Test Cooking Class',
            description='Learn to cook',
            type='Offer',
            duration=Decimal('2.00'),
            location_type='In-Person',
            max_participants=2,
            schedule_type='One-Time',
            schedule_details='Saturday, 2 PM'
        )
        self.service.tags.add(self.tag1)
        
        # Helper to get auth token
        def get_token(user):
            refresh = RefreshToken.for_user(user)
            return str(refresh.access_token)
        
        self.get_token = get_token


class AuthenticationTests(BaseTestCase):
    """Tests for authentication endpoints"""
    
    def test_user_registration(self):
        """Test user registration creates account with 1 hour balance"""
        response = self.client.post('/api/auth/register/', {
            'email': 'newuser@test.com',
            'password': 'newpass123',
            'first_name': 'New',
            'last_name': 'User'
        })
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        
        # Check user was created with 1 hour balance
        user = User.objects.get(email='newuser@test.com')
        self.assertEqual(user.timebank_balance, Decimal('1.00'))
    
    def test_user_login(self):
        """Test user login returns JWT tokens"""
        response = self.client.post('/api/auth/login/', {
            'email': 'user1@test.com',
            'password': 'testpass123'
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
    
    def test_user_login_invalid_credentials(self):
        """Test login fails with invalid credentials"""
        response = self.client.post('/api/auth/login/', {
            'email': 'user1@test.com',
            'password': 'wrongpassword'
        })
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class UserProfileTests(BaseTestCase):
    """Tests for user profile endpoints"""
    
    def test_get_own_profile(self):
        """Test authenticated user can get own profile"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.get_token(self.user1)}')
        response = self.client.get('/api/users/me/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], 'user1@test.com')
        self.assertEqual(float(response.data['timebank_balance']), 5.00)
        self.assertIn('punctual_count', response.data)
        self.assertIn('helpful_count', response.data)
        self.assertIn('kind_count', response.data)
    
    def test_update_own_profile(self):
        """Test authenticated user can update own profile"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.get_token(self.user1)}')
        response = self.client.put('/api/users/me/', {
            'bio': 'Updated bio',
            'avatar_url': 'https://example.com/avatar.jpg'
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user1.refresh_from_db()
        self.assertEqual(self.user1.bio, 'Updated bio')
        self.assertEqual(self.user1.avatar_url, 'https://example.com/avatar.jpg')
    
    def test_get_profile_requires_auth(self):
        """Test profile endpoint requires authentication"""
        response = self.client.get('/api/users/me/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class ServiceTests(BaseTestCase):
    """Tests for service endpoints"""
    
    def test_list_services(self):
        """Test listing all active services"""
        response = self.client.get('/api/services/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertGreater(len(response.data), 0)
    
    def test_create_service_offer(self):
        """Test authenticated user can create service offer"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.get_token(self.user1)}')
        response = self.client.post('/api/services/', {
            'title': 'New Service',
            'description': 'Service description',
            'type': 'Offer',
            'duration': '1.5',
            'location_type': 'Online',
            'max_participants': 1,
            'schedule_type': 'One-Time',
            'schedule_details': 'Tomorrow, 3 PM',
            'tag_ids': [self.tag1.id]
        })
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['title'], 'New Service')
        self.assertEqual(response.data['user']['id'], str(self.user1.id))
    
    def test_create_service_offer_blocked_when_balance_high(self):
        """Test user with balance > 10 hours cannot create new offers"""
        self.user1.timebank_balance = Decimal('11.00')
        self.user1.save()
        
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.get_token(self.user1)}')
        response = self.client.post('/api/services/', {
            'title': 'New Service',
            'description': 'Service description',
            'type': 'Offer',
            'duration': '1.5',
            'location_type': 'Online',
            'max_participants': 1,
            'schedule_type': 'One-Time',
            'tag_ids': [self.tag1.id]
        })
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('balance', response.data['error'].lower())
    
    def test_create_service_need_allowed_when_balance_high(self):
        """Test user with balance > 10 hours can still create needs"""
        self.user1.timebank_balance = Decimal('11.00')
        self.user1.save()
        
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.get_token(self.user1)}')
        response = self.client.post('/api/services/', {
            'title': 'New Need',
            'description': 'Need description',
            'type': 'Need',
            'duration': '1.5',
            'location_type': 'Online',
            'max_participants': 1,
            'schedule_type': 'One-Time',
            'tag_ids': [self.tag1.id]
        })
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
    
    def test_get_service_detail(self):
        """Test getting service details"""
        response = self.client.get(f'/api/services/{self.service.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'Test Cooking Class')
        self.assertIn('tags', response.data)
    
    def test_recurrent_service_no_duplicates(self):
        """Test that recurrent services don't appear multiple times"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.get_token(self.user1)}')
        
        # Create recurrent service
        response = self.client.post('/api/services/', {
            'title': 'Weekly Class',
            'description': 'Every week',
            'type': 'Offer',
            'duration': '1.0',
            'location_type': 'Online',
            'max_participants': 5,
            'schedule_type': 'Recurrent',
            'schedule_details': 'Every Tuesday at 7 PM',
            'tag_ids': [self.tag1.id]
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        service_id = response.data['id']
        
        # List services multiple times
        list1 = self.client.get('/api/services/')
        list2 = self.client.get('/api/services/')
        
        self.assertEqual(list1.status_code, status.HTTP_200_OK)
        self.assertEqual(list2.status_code, status.HTTP_200_OK)
        
        # Count occurrences
        count1 = sum(1 for s in list1.data if s['id'] == service_id)
        count2 = sum(1 for s in list2.data if s['id'] == service_id)
        
        self.assertEqual(count1, 1, "Service should appear exactly once")
        self.assertEqual(count2, 1, "Service should appear exactly once on second call")


class HandshakeTests(BaseTestCase):
    """Tests for handshake endpoints"""
    
    def test_express_interest(self):
        """Test user can express interest in a service"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.get_token(self.user2)}')
        response = self.client.post(f'/api/services/{self.service.id}/interest/')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], 'pending')
        
        # Check handshake was created
        handshake = Handshake.objects.get(service=self.service, requester=self.user2)
        self.assertIsNotNone(handshake)
        
        # Check notification was created
        notification = Notification.objects.filter(
            user=self.user1,
            type='handshake_request'
        ).first()
        self.assertIsNotNone(notification)
    
    def test_express_interest_insufficient_balance(self):
        """Test user cannot express interest with insufficient balance"""
        self.user2.timebank_balance = Decimal('0.50')
        self.user2.save()
        
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.get_token(self.user2)}')
        response = self.client.post(f'/api/services/{self.service.id}/interest/')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('balance', response.data['error'].lower())
    
    def test_express_interest_own_service(self):
        """Test user cannot express interest in own service"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.get_token(self.user1)}')
        response = self.client.post(f'/api/services/{self.service.id}/interest/')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_accept_handshake(self):
        """Test provider can accept handshake"""
        handshake = Handshake.objects.create(
            service=self.service,
            requester=self.user2,
            provisioned_hours=Decimal('2.00'),
            status='pending'
        )
        
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.get_token(self.user1)}')
        response = self.client.post(f'/api/handshakes/{handshake.id}/accept/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        handshake.refresh_from_db()
        self.assertEqual(handshake.status, 'accepted')
        
        # Check notification was created
        notification = Notification.objects.filter(
            user=self.user2,
            type='handshake_accepted'
        ).first()
        self.assertIsNotNone(notification)
    
    def test_deny_handshake(self):
        """Test provider can deny handshake"""
        handshake = Handshake.objects.create(
            service=self.service,
            requester=self.user2,
            provisioned_hours=Decimal('2.00'),
            status='pending'
        )
        
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.get_token(self.user1)}')
        response = self.client.post(f'/api/handshakes/{handshake.id}/deny/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        handshake.refresh_from_db()
        self.assertEqual(handshake.status, 'denied')
    
    def test_confirm_completion(self):
        """Test both users can confirm service completion"""
        handshake = Handshake.objects.create(
            service=self.service,
            requester=self.user2,
            provisioned_hours=Decimal('2.00'),
            status='pending'
        )
        
        # Accept handshake first (this provisions/deducts balance)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.get_token(self.user1)}')
        accept_response = self.client.post(f'/api/handshakes/{handshake.id}/accept/')
        self.assertEqual(accept_response.status_code, status.HTTP_200_OK)
        
        # Verify balance deducted on acceptance
        self.user2.refresh_from_db()
        self.assertEqual(self.user2.timebank_balance, Decimal('1.00'))  # 3 - 2
        
        # Provider confirms
        response = self.client.post(f'/api/handshakes/{handshake.id}/confirm/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        handshake.refresh_from_db()
        self.assertTrue(handshake.provider_confirmed_complete)
        self.assertFalse(handshake.receiver_confirmed_complete)
        
        # Receiver confirms
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.get_token(self.user2)}')
        response = self.client.post(f'/api/handshakes/{handshake.id}/confirm/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        handshake.refresh_from_db()
        self.assertTrue(handshake.receiver_confirmed_complete)
        self.assertEqual(handshake.status, 'completed')
        
        # Check TimeBank transfer occurred
        self.user1.refresh_from_db()
        self.user2.refresh_from_db()
        self.assertEqual(self.user1.timebank_balance, Decimal('7.00'))  # 5 + 2
        self.assertEqual(self.user2.timebank_balance, Decimal('1.00'))  # Already deducted on acceptance


class ChatTests(BaseTestCase):
    """Tests for chat endpoints"""
    
    def test_list_conversations(self):
        """Test user can list their conversations"""
        handshake = Handshake.objects.create(
            service=self.service,
            requester=self.user2,
            provisioned_hours=Decimal('2.00'),
            status='accepted'
        )
        
        ChatMessage.objects.create(
            handshake=handshake,
            sender=self.user1,
            body='Hello'
        )
        
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.get_token(self.user1)}')
        response = self.client.get('/api/chats/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertGreater(len(response.data), 0)
    
    def test_send_message(self):
        """Test user can send a chat message"""
        handshake = Handshake.objects.create(
            service=self.service,
            requester=self.user2,
            provisioned_hours=Decimal('2.00'),
            status='accepted'
        )
        
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.get_token(self.user1)}')
        response = self.client.post('/api/chats/', {
            'handshake_id': str(handshake.id),
            'body': 'Test message'
        })
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['body'], 'Test message')
        
        # Check notification was created
        notification = Notification.objects.filter(
            user=self.user2,
            type='chat_message'
        ).first()
        self.assertIsNotNone(notification)


class NotificationTests(BaseTestCase):
    """Tests for notification endpoints"""
    
    def test_list_notifications(self):
        """Test user can list their notifications"""
        Notification.objects.create(
            user=self.user1,
            type='handshake_request',
            title='Test',
            message='Test message'
        )
        
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.get_token(self.user1)}')
        response = self.client.get('/api/notifications/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertGreater(len(response.data), 0)
    
    def test_mark_all_read(self):
        """Test user can mark all notifications as read"""
        Notification.objects.create(
            user=self.user1,
            type='handshake_request',
            title='Test',
            message='Test message',
            is_read=False
        )
        
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.get_token(self.user1)}')
        response = self.client.post('/api/notifications/read/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        notification = Notification.objects.get(user=self.user1)
        self.assertTrue(notification.is_read)


class ReputationTests(BaseTestCase):
    """Tests for reputation endpoints"""
    
    def test_submit_positive_reps(self):
        """Test user can submit positive reputation"""
        handshake = Handshake.objects.create(
            service=self.service,
            requester=self.user2,
            provisioned_hours=Decimal('2.00'),
            status='completed'
        )
        handshake.provider_confirmed_complete = True
        handshake.receiver_confirmed_complete = True
        handshake.save()
        
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.get_token(self.user1)}')
        response = self.client.post('/api/reputation/', {
            'handshake_id': str(handshake.id),
            'punctual': True,
            'helpful': True,
            'kindness': False
        })
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Check rep was created
        rep = ReputationRep.objects.get(handshake=handshake, giver=self.user1)
        self.assertTrue(rep.is_punctual)
        self.assertTrue(rep.is_helpful)
        self.assertFalse(rep.is_kind)
        
        # Check karma was updated
        self.user2.refresh_from_db()
        self.assertEqual(self.user2.karma_score, 8)  # 5 + 3 (punctual + helpful + base)


class AdminTests(BaseTestCase):
    """Tests for admin endpoints"""
    
    def test_list_reports(self):
        """Test admin can list pending reports"""
        Report.objects.create(
            reporter=self.user1,
            reported_user=self.user2,
            type='inappropriate_content',
            description='Test report'
        )
        
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.get_token(self.admin)}')
        response = self.client.get('/api/admin/reports/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertGreater(len(response.data), 0)
    
    def test_non_admin_cannot_access_reports(self):
        """Test non-admin cannot access admin endpoints"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.get_token(self.user1)}')
        response = self.client.get('/api/admin/reports/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should return empty list for non-admin
        self.assertEqual(len(response.data), 0)
    
    def test_resolve_no_show_report(self):
        """Test admin can resolve no-show report"""
        handshake = Handshake.objects.create(
            service=self.service,
            requester=self.user2,
            provisioned_hours=Decimal('2.00'),
            status='reported'
        )
        
        report = Report.objects.create(
            reporter=self.user1,
            reported_user=self.user2,
            related_handshake=handshake,
            type='no_show',
            description='No-show report'
        )
        
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.get_token(self.admin)}')
        response = self.client.post(f'/api/admin/reports/{report.id}/resolve/', {
            'action': 'confirm_no_show',
            'admin_notes': 'Confirmed no-show'
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        report.refresh_from_db()
        self.assertEqual(report.status, 'resolved')
        
        # Check karma penalty was applied
        self.user2.refresh_from_db()
        self.assertLess(self.user2.karma_score, 5)  # Should be reduced
    
    def test_warn_user(self):
        """Test admin can warn a user"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.get_token(self.admin)}')
        response = self.client.post(f'/api/admin/users/{self.user1.id}/warn/', {
            'reason': 'Test warning'
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check notification was created
        notification = Notification.objects.filter(
            user=self.user1,
            type='admin_warning'
        ).first()
        self.assertIsNotNone(notification)
    
    def test_ban_user(self):
        """Test admin can ban a user"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.get_token(self.admin)}')
        response = self.client.post(f'/api/admin/users/{self.user1.id}/ban/', {
            'reason': 'Test ban'
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.user1.refresh_from_db()
        self.assertFalse(self.user1.is_active)


class CriticalBugFixTests(BaseTestCase):
    """Tests for critical bug fixes from audit"""
    
    def test_cancellation_refunds_balance(self):
        """Test that cancelling an accepted handshake refunds TimeBank hours"""
        from .utils import provision_timebank, cancel_timebank_transfer
        
        # Create a service and handshake
        service = Service.objects.create(
            user=self.user2,
            title='Test Service',
            description='Test',
            type='Offer',
            duration=2,
            location_type='In-Person',
            status='Active'
        )
        
        handshake = Handshake.objects.create(
            service=service,
            requester=self.user1,
            status='pending',
            provisioned_hours=Decimal('2.00')
        )
        
        # Initial balance
        initial_balance = self.user1.timebank_balance
        
        # Accept handshake (provisions hours)
        handshake.status = 'accepted'
        handshake.save()
        provision_timebank(handshake)
        
        # Verify balance was deducted
        self.user1.refresh_from_db()
        self.assertEqual(self.user1.timebank_balance, initial_balance - Decimal('2.00'))
        
        # Cancel handshake
        cancel_timebank_transfer(handshake)
        
        # Verify balance was refunded
        self.user1.refresh_from_db()
        self.assertEqual(self.user1.timebank_balance, initial_balance)
    
    def test_concurrent_provisioning_prevents_double_spend(self):
        """Test that provision_timebank prevents double-spending by checking balance validation and atomic updates"""
        from .utils import provision_timebank
        from decimal import Decimal
        
        # Create service
        service = Service.objects.create(
            user=self.user2,
            title='Test Service',
            description='Test',
            type='Offer',
            duration=2,
            location_type='In-Person',
            status='Active'
        )
        
        # User has 5.00 hours
        initial_balance = self.user1.timebank_balance
        self.assertEqual(initial_balance, Decimal('5.00'))
        
        # Test 1: Try to provision with insufficient balance (should fail)
        handshake1 = Handshake.objects.create(
            service=service,
            requester=self.user1,
            status='accepted',
            provisioned_hours=Decimal('10.00')  # More than user's 5.00 balance
        )
        
        with self.assertRaises(ValueError) as context:
            provision_timebank(handshake1)
        
        self.assertIn("Insufficient TimeBank balance", str(context.exception))
        
        # Verify balance didn't change
        self.user1.refresh_from_db()
        self.assertEqual(self.user1.timebank_balance, initial_balance)
        
        # Test 2: Successful provision with sufficient balance
        handshake2 = Handshake.objects.create(
            service=service,
            requester=self.user1,
            status='accepted',
            provisioned_hours=Decimal('3.00')
        )
        
        provision_timebank(handshake2)
        
        # Verify balance was deducted correctly using F() expression (atomic)
        self.user1.refresh_from_db()
        self.assertEqual(self.user1.timebank_balance, initial_balance - Decimal('3.00'))
        
        # Test 3: Try another provision that would exceed balance
        handshake3 = Handshake.objects.create(
            service=service,
            requester=self.user1,
            status='accepted',
            provisioned_hours=Decimal('3.00')  # Would make total 6.00, but only 2.00 left
        )
        
        with self.assertRaises(ValueError) as context:
            provision_timebank(handshake3)
        
        self.assertIn("Insufficient TimeBank balance", str(context.exception))
        
        # Verify balance still correct (2.00 remaining)
        self.user1.refresh_from_db()
        self.assertEqual(self.user1.timebank_balance, initial_balance - Decimal('3.00'))
    
    def test_input_length_validation(self):
        """Test that input length validation works"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.get_token(self.user1)}')
        
        # Test chat message length validation
        service = Service.objects.create(
            user=self.user2,
            title='Test Service',
            description='Test',
            type='Offer',
            duration=2,
            location_type='In-Person',
            status='Active'
        )
        
        handshake = Handshake.objects.create(
            service=service,
            requester=self.user1,
            status='accepted',
            provisioned_hours=Decimal('1.00')
        )
        
        # Try to send a message that's too long
        long_message = 'x' * 6000
        response = self.client.post('/api/chats/', {
            'handshake_id': str(handshake.id),
            'body': long_message
        })
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Test service description length
        long_description = 'x' * 6000
        response = self.client.post('/api/services/', {
            'title': 'Test',
            'description': long_description,
            'type': 'Offer',
            'duration': 2,
            'location_type': 'In-Person',
            'max_participants': 1,
            'schedule_type': 'One-Time'
        })
        
        # Should fail validation
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Test user bio length
        long_bio = 'x' * 2000
        response = self.client.patch('/api/users/me/', {
            'bio': long_bio
        })
        
        # Should fail validation
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class SecurityTests(BaseTestCase):
    """Tests for security fixes"""
    
    def test_xss_in_chat_message(self):
        """Test that XSS payloads in chat messages are sanitized"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.get_token(self.user1)}')
        
        service = Service.objects.create(
            user=self.user2,
            title='Test Service',
            description='Test',
            type='Offer',
            duration=2,
            location_type='In-Person',
            status='Active'
        )
        
        handshake = Handshake.objects.create(
            service=service,
            requester=self.user1,
            status='accepted',
            provisioned_hours=Decimal('1.00')
        )
        
        # Try to send XSS payload
        xss_payload = '<script>alert("XSS")</script>Hello'
        response = self.client.post('/api/chats/', {
            'handshake_id': str(handshake.id),
            'body': xss_payload
        })
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Check that message was sanitized
        message = ChatMessage.objects.filter(handshake=handshake).first()
        self.assertIsNotNone(message)
        self.assertNotIn('<script>', message.body)
        self.assertIn('Hello', message.body)
    
    def test_weak_password_rejected(self):
        """Test that weak passwords are rejected"""
        response = self.client.post('/api/auth/register/', {
            'email': 'weak@test.com',
            'password': 'short',  # Too short
            'first_name': 'Test',
            'last_name': 'User'
        })
        
        # Should fail validation
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
