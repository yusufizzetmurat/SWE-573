"""
Unit tests for HandshakeService.

Tests business logic for expressing interest in services, including
validation for max_participants, balance checks, and duplicate interest prevention.
"""
from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model

from .models import Service, Handshake
from .services import HandshakeService

User = get_user_model()


class HandshakeServiceTestCase(TestCase):
    """Test cases for HandshakeService."""
    
    def setUp(self):
        """Set up test data."""
        self.user1 = User.objects.create_user(
            email='user1@test.com',
            password='testpass123',
            first_name='User',
            last_name='One',
            timebank_balance=Decimal('10.00')
        )
        self.user2 = User.objects.create_user(
            email='user2@test.com',
            password='testpass123',
            first_name='User',
            last_name='Two',
            timebank_balance=Decimal('5.00')
        )
        self.user3 = User.objects.create_user(
            email='user3@test.com',
            password='testpass123',
            first_name='User',
            last_name='Three',
            timebank_balance=Decimal('3.00')
        )
        
        self.service_offer = Service.objects.create(
            user=self.user1,
            title='Test Offer Service',
            description='A test service',
            type='Offer',
            duration=Decimal('2.00'),
            location_type='Online',
            max_participants=2,
            schedule_type='One-Time'
        )
        
        self.service_need = Service.objects.create(
            user=self.user1,
            title='Test Need Service',
            description='A test need service',
            type='Need',
            duration=Decimal('1.50'),
            location_type='Online',
            max_participants=1,
            schedule_type='One-Time'
        )
    
    def test_can_express_interest_valid(self):
        """Test can_express_interest returns True for valid case."""
        is_valid, error = HandshakeService.can_express_interest(self.service_offer, self.user2)
        self.assertTrue(is_valid)
        self.assertIsNone(error)
    
    def test_can_express_interest_own_service(self):
        """Test cannot express interest in own service."""
        is_valid, error = HandshakeService.can_express_interest(self.service_offer, self.user1)
        self.assertFalse(is_valid)
        self.assertIn('own service', error)
    
    def test_can_express_interest_insufficient_balance_offer(self):
        """Test cannot express interest with insufficient balance for Offer service."""
        # For Offer, requester pays
        self.user2.timebank_balance = Decimal('1.00')
        self.user2.save()
        
        is_valid, error = HandshakeService.can_express_interest(self.service_offer, self.user2)
        self.assertFalse(is_valid)
        self.assertIn('Insufficient TimeBank balance', error)
    
    def test_can_express_interest_insufficient_balance_need(self):
        """Test cannot express interest with insufficient balance for Need service."""
        # For Need, service owner pays
        self.user1.timebank_balance = Decimal('1.00')
        self.user1.save()
        
        is_valid, error = HandshakeService.can_express_interest(self.service_need, self.user2)
        self.assertFalse(is_valid)
        self.assertIn('Insufficient TimeBank balance', error)
    
    def test_can_express_interest_max_participants(self):
        """Test cannot express interest when service is at max capacity."""
        # Create handshakes up to max_participants
        Handshake.objects.create(
            service=self.service_offer,
            requester=self.user2,
            provisioned_hours=Decimal('2.00'),
            status='pending'
        )
        Handshake.objects.create(
            service=self.service_offer,
            requester=self.user3,
            provisioned_hours=Decimal('2.00'),
            status='accepted'
        )
        
        # Now user3 cannot express interest (max_participants=2, already 2)
        is_valid, error = HandshakeService.can_express_interest(self.service_offer, self.user3)
        self.assertFalse(is_valid)
        self.assertIn('maximum capacity', error)
    
    def test_express_interest_success_offer(self):
        """Test successful express_interest for Offer service."""
        handshake = HandshakeService.express_interest(self.service_offer, self.user2)
        
        self.assertIsNotNone(handshake)
        self.assertEqual(handshake.service, self.service_offer)
        self.assertEqual(handshake.requester, self.user2)
        self.assertEqual(handshake.status, 'pending')
        self.assertEqual(handshake.provisioned_hours, Decimal('2.00'))
    
    def test_express_interest_success_need(self):
        """Test successful express_interest for Need service."""
        handshake = HandshakeService.express_interest(self.service_need, self.user2)
        
        self.assertIsNotNone(handshake)
        self.assertEqual(handshake.service, self.service_need)
        self.assertEqual(handshake.requester, self.user2)
        self.assertEqual(handshake.status, 'pending')
    
    def test_express_interest_duplicate(self):
        """Test cannot express interest twice."""
        HandshakeService.express_interest(self.service_offer, self.user2)
        
        # Try to express interest again
        with self.assertRaises(ValueError) as context:
            HandshakeService.express_interest(self.service_offer, self.user2)
        
        self.assertIn('already expressed interest', str(context.exception))
    
    def test_express_interest_max_participants_raises_error(self):
        """Test express_interest raises ValueError when at max capacity."""
        # Fill up the service
        Handshake.objects.create(
            service=self.service_need,
            requester=self.user2,
            provisioned_hours=Decimal('1.50'),
            status='pending'
        )
        
        # Try to express interest when at capacity
        with self.assertRaises(ValueError) as context:
            HandshakeService.express_interest(self.service_need, self.user3)
        
        self.assertIn('maximum capacity', str(context.exception))
    
    def test_express_interest_creates_chat_message(self):
        """Test that express_interest creates initial chat message."""
        from .models import ChatMessage
        
        handshake = HandshakeService.express_interest(self.service_offer, self.user2)
        
        messages = ChatMessage.objects.filter(handshake=handshake)
        self.assertEqual(messages.count(), 1)
        self.assertIn('interested in your service', messages.first().body)
    
    def test_express_interest_creates_notification(self):
        """Test that express_interest creates notification."""
        from .models import Notification
        
        handshake = HandshakeService.express_interest(self.service_offer, self.user2)
        
        notifications = Notification.objects.filter(
            user=self.user1,
            related_handshake=handshake
        )
        self.assertEqual(notifications.count(), 1)
        self.assertEqual(notifications.first().type, 'handshake_request')

