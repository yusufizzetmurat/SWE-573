"""API tests for Negative Reputation endpoints"""
from decimal import Decimal
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status

from api.models import User, Service, Handshake, NegativeRep


class NegativeRepAPITest(TestCase):
    """Test Negative Reputation API endpoints"""
    
    def setUp(self):
        self.client = APIClient()
        self.provider = User.objects.create_user(
            email='provider@example.com',
            password='testpass123',
            first_name='Provider',
            last_name='User',
            timebank_balance=Decimal('10.00'),
            karma_score=50
        )
        self.receiver = User.objects.create_user(
            email='receiver@example.com',
            password='testpass123',
            first_name='Receiver',
            last_name='User',
            timebank_balance=Decimal('10.00')
        )
        self.service = Service.objects.create(
            user=self.provider,
            title='Test Service',
            description='A test service',
            type='Offer',
            duration=Decimal('2.00'),
            location_type='Online',
            schedule_type='One-Time'
        )
        self.completed_handshake = Handshake.objects.create(
            service=self.service,
            requester=self.receiver,
            status='completed',
            provisioned_hours=Decimal('2.00')
        )
    
    def test_submit_negative_rep(self):
        self.client.force_authenticate(user=self.receiver)
        
        url = reverse('negative-reputation')
        data = {
            'handshake_id': str(self.completed_handshake.id),
            'is_late': True,
            'is_unhelpful': False,
            'is_rude': False,
            'comment': 'Was 30 minutes late'
        }
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(NegativeRep.objects.count(), 1)
    
    def test_negative_rep_reduces_karma(self):
        self.client.force_authenticate(user=self.receiver)
        initial_karma = self.provider.karma_score
        
        url = reverse('negative-reputation')
        data = {
            'handshake_id': str(self.completed_handshake.id),
            'is_late': True,
            'is_unhelpful': True,
            'is_rude': False
        }
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        self.provider.refresh_from_db()
        expected_karma = initial_karma - 4
        self.assertEqual(self.provider.karma_score, expected_karma)
    
    def test_cannot_submit_without_negative_trait(self):
        self.client.force_authenticate(user=self.receiver)
        
        url = reverse('negative-reputation')
        data = {
            'handshake_id': str(self.completed_handshake.id),
            'is_late': False,
            'is_unhelpful': False,
            'is_rude': False
        }
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_cannot_submit_for_non_completed_handshake(self):
        pending_handshake = Handshake.objects.create(
            service=self.service,
            requester=self.receiver,
            status='pending',
            provisioned_hours=Decimal('2.00')
        )
        
        self.client.force_authenticate(user=self.receiver)
        
        url = reverse('negative-reputation')
        data = {
            'handshake_id': str(pending_handshake.id),
            'is_late': True
        }
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
