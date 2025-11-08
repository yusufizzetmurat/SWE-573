"""
End-to-end user flow tests
Tests complete user journeys from registration to service completion
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from decimal import Decimal
from datetime import timedelta
from django.utils import timezone

from .models import User, Service, Tag, Handshake, ChatMessage, Notification, ReputationRep

User = get_user_model()


class CompleteUserFlowTests(TestCase):
    """Test complete user flows end-to-end"""
    
    def setUp(self):
        self.client = APIClient()
        
        self.provider = User.objects.create_user(
            'provider@test.com',
            password='testpass123',
            first_name='Provider',
            last_name='User',
            timebank_balance=Decimal('5.00'),
            karma_score=10
        )
        
        self.requester = User.objects.create_user(
            'requester@test.com',
            password='testpass123',
            first_name='Requester',
            last_name='User',
            timebank_balance=Decimal('3.00'),
            karma_score=5
        )
        
        self.tag = Tag.objects.create(id='Q123', name='Cooking')
        
    def get_token(self, user):
        refresh = RefreshToken.for_user(user)
        return str(refresh.access_token)
    
    def test_complete_flow_offer_to_completion(self):
        """Test complete flow: post offer -> express interest -> accept -> chat -> complete -> reputation"""
        
        # Step 1: Provider posts an offer
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.get_token(self.provider)}')
        offer_response = self.client.post('/api/services/', {
            'title': 'Cooking Class',
            'description': 'Learn to cook',
            'type': 'Offer',
            'duration': '2.0',
            'location_type': 'Online',
            'max_participants': 1,
            'schedule_type': 'One-Time',
            'schedule_details': 'Tomorrow, 3 PM',
            'tag_ids': [self.tag.id]
        })
        self.assertEqual(offer_response.status_code, status.HTTP_201_CREATED)
        service_id = offer_response.data['id']
        
        # Verify provider balance unchanged (offers don't deduct)
        self.provider.refresh_from_db()
        self.assertEqual(self.provider.timebank_balance, Decimal('5.00'))
        
        # Step 2: Requester expresses interest
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.get_token(self.requester)}')
        interest_response = self.client.post(f'/api/services/{service_id}/interest/')
        self.assertEqual(interest_response.status_code, status.HTTP_201_CREATED)
        handshake_id = interest_response.data['id']
        
        # Verify requester balance unchanged (provision happens on acceptance)
        self.requester.refresh_from_db()
        self.assertEqual(self.requester.timebank_balance, Decimal('3.00'))
        
        # Verify notification created
        notification = Notification.objects.filter(
            user=self.provider,
            type='handshake_request'
        ).first()
        self.assertIsNotNone(notification)
        
        # Step 3: Provider accepts handshake
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.get_token(self.provider)}')
        accept_response = self.client.post(f'/api/handshakes/{handshake_id}/accept/')
        self.assertEqual(accept_response.status_code, status.HTTP_200_OK)
        self.assertEqual(accept_response.data['status'], 'accepted')
        
        # Verify balance provisionally deducted on acceptance
        self.requester.refresh_from_db()
        self.assertEqual(self.requester.timebank_balance, Decimal('1.00'))
        
        # Verify notification created
        accept_notification = Notification.objects.filter(
            user=self.requester,
            type='handshake_accepted'
        ).first()
        self.assertIsNotNone(accept_notification)
        
        # Step 4: Requester sends a chat message
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.get_token(self.requester)}')
        # Chat messages endpoint uses POST to /api/chats/ with handshake_id in body
        message_response = self.client.post('/api/chats/', {
            'handshake_id': handshake_id,
            'body': 'Looking forward to the class!'
        })
        self.assertEqual(message_response.status_code, status.HTTP_201_CREATED)
        
        # Step 5: Provider confirms service completion
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.get_token(self.provider)}')
        confirm_response = self.client.post(f'/api/handshakes/{handshake_id}/confirm/', {
            'hours': '2.0'
        })
        self.assertEqual(confirm_response.status_code, status.HTTP_200_OK)
        self.assertTrue(confirm_response.data['provider_confirmed_complete'])
        
        # Step 6: Requester confirms service completion
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.get_token(self.requester)}')
        confirm_response = self.client.post(f'/api/handshakes/{handshake_id}/confirm/')
        self.assertEqual(confirm_response.status_code, status.HTTP_200_OK)
        
        # Verify TimeBank transfer completed
        self.provider.refresh_from_db()
        self.requester.refresh_from_db()
        self.assertEqual(self.provider.timebank_balance, Decimal('7.00'))
        self.assertEqual(self.requester.timebank_balance, Decimal('1.00'))
        
        # Verify notifications for reputation
        rep_notifications = Notification.objects.filter(
            type='positive_rep'
        )
        self.assertEqual(rep_notifications.count(), 2)
        
        # Step 7: Provider submits positive reputation
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.get_token(self.provider)}')
        rep_response = self.client.post('/api/reputation/', {
            'handshake_id': handshake_id,
            'punctual': True,
            'helpful': True,
            'kindness': True
        })
        self.assertEqual(rep_response.status_code, status.HTTP_201_CREATED)
        
        # Verify karma updated
        self.requester.refresh_from_db()
        self.assertGreater(self.requester.karma_score, 5)
    
    def test_complete_flow_recurrent_service(self):
        """Test flow with recurrent service (should not duplicate)"""
        
        # Provider posts recurrent service
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.get_token(self.provider)}')
        offer_response = self.client.post('/api/services/', {
            'title': 'Weekly Cooking Class',
            'description': 'Every week',
            'type': 'Offer',
            'duration': '1.0',
            'location_type': 'Online',
            'max_participants': 5,
            'schedule_type': 'Recurrent',
            'schedule_details': 'Every Tuesday at 7 PM',
            'tag_ids': [self.tag.id]
        })
        self.assertEqual(offer_response.status_code, status.HTTP_201_CREATED)
        service_id = offer_response.data['id']
        
        # List services - should only appear once
        list_response = self.client.get('/api/services/')
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        
        # Count occurrences of this service
        service_count = sum(1 for s in list_response.data if s['id'] == service_id)
        self.assertEqual(service_count, 1, "Recurrent service should appear only once")
        
        # Requester expresses interest
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.get_token(self.requester)}')
        interest_response = self.client.post(f'/api/services/{service_id}/interest/')
        self.assertEqual(interest_response.status_code, status.HTTP_201_CREATED)
        
        # List again - should still appear only once
        list_response = self.client.get('/api/services/')
        service_count = sum(1 for s in list_response.data if s['id'] == service_id)
        self.assertEqual(service_count, 1, "Recurrent service should still appear only once after interest")
    
    def test_flow_with_insufficient_balance(self):
        """Test flow when requester has insufficient balance"""
        
        # Provider posts offer
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.get_token(self.provider)}')
        offer_response = self.client.post('/api/services/', {
            'title': 'Expensive Class',
            'description': 'Costs 5 hours',
            'type': 'Offer',
            'duration': '5.0',
            'location_type': 'Online',
            'max_participants': 1,
            'schedule_type': 'One-Time',
            'tag_ids': [self.tag.id]
        })
        self.assertEqual(offer_response.status_code, status.HTTP_201_CREATED)
        service_id = offer_response.data['id']
        
        # Requester tries to express interest (has only 3 hours)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.get_token(self.requester)}')
        interest_response = self.client.post(f'/api/services/{service_id}/interest/')
        self.assertEqual(interest_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('balance', interest_response.data['error'].lower())
    
    def test_flow_with_denied_handshake(self):
        """Test flow when provider denies handshake"""
        
        # Provider posts offer
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.get_token(self.provider)}')
        offer_response = self.client.post('/api/services/', {
            'title': 'Test Class',
            'description': 'Test',
            'type': 'Offer',
            'duration': '1.0',
            'location_type': 'Online',
            'max_participants': 1,
            'schedule_type': 'One-Time',
            'tag_ids': [self.tag.id]
        })
        service_id = offer_response.data['id']
        
        # Requester expresses interest
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.get_token(self.requester)}')
        interest_response = self.client.post(f'/api/services/{service_id}/interest/')
        handshake_id = interest_response.data['id']
        
        # Verify balance provisionally deducted
        self.requester.refresh_from_db()
        initial_balance = self.requester.timebank_balance
        
        # Provider denies handshake
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.get_token(self.provider)}')
        deny_response = self.client.post(f'/api/handshakes/{handshake_id}/deny/')
        self.assertEqual(deny_response.status_code, status.HTTP_200_OK)
        
        # Verify balance restored
        self.requester.refresh_from_db()
        self.assertEqual(self.requester.timebank_balance, Decimal('3.00'))
    
    def test_flow_multiple_requests_same_service(self):
        """Test flow with multiple requesters for same service"""
        
        requester2 = User.objects.create_user(
            'requester2@test.com',
            password='testpass123',
            timebank_balance=Decimal('2.00')
        )
        
        # Provider posts offer
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.get_token(self.provider)}')
        offer_response = self.client.post('/api/services/', {
            'title': 'Group Class',
            'description': 'Multiple participants',
            'type': 'Offer',
            'duration': '1.0',
            'location_type': 'Online',
            'max_participants': 2,
            'schedule_type': 'One-Time',
            'tag_ids': [self.tag.id]
        })
        service_id = offer_response.data['id']
        
        # First requester expresses interest
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.get_token(self.requester)}')
        interest1 = self.client.post(f'/api/services/{service_id}/interest/')
        self.assertEqual(interest1.status_code, status.HTTP_201_CREATED)
        
        # Second requester expresses interest
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.get_token(requester2)}')
        interest2 = self.client.post(f'/api/services/{service_id}/interest/')
        self.assertEqual(interest2.status_code, status.HTTP_201_CREATED)
        
        # Verify both handshakes created
        handshakes = Handshake.objects.filter(service_id=service_id, status='pending')
        self.assertEqual(handshakes.count(), 2)
        
        # Verify provider got 2 notifications
        notifications = Notification.objects.filter(
            user=self.provider,
            type='handshake_request'
        )
        self.assertEqual(notifications.count(), 2)

