"""Unit tests for badge system"""
from decimal import Decimal
from django.test import TestCase

from api.models import User, Service, Handshake, Comment, UserBadge
from api.badge_utils import check_and_assign_badges, get_user_stats, get_badge_progress


class BadgeSystemTest(TestCase):
    """Test extended badge system"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User',
            timebank_balance=Decimal('10.00')
        )
        self.other_user = User.objects.create_user(
            email='other@example.com',
            password='testpass123',
            first_name='Other',
            last_name='User',
            timebank_balance=Decimal('10.00')
        )
    
    def test_get_user_stats(self):
        stats = get_user_stats(self.user)
        
        self.assertIn('completed_services', stats)
        self.assertIn('offer_count', stats)
        self.assertIn('helpful_count', stats)
        self.assertIn('kindness_count', stats)
        self.assertIn('punctual_count', stats)
        self.assertIn('comments_posted', stats)
        self.assertIn('comments_on_services', stats)
        self.assertIn('hours_given', stats)
        self.assertIn('negative_rep_count', stats)
    
    def test_community_voice_badge(self):
        service = Service.objects.create(
            user=self.other_user,
            title='Test Service',
            description='Test',
            type='Offer',
            duration=Decimal('1.00'),
            location_type='Online',
            schedule_type='One-Time'
        )
        
        for i in range(10):
            Comment.objects.create(
                service=service,
                user=self.user,
                body=f'Comment {i}'
            )
        
        new_badges = check_and_assign_badges(self.user)
        
        self.assertIn('community-voice', new_badges)
        self.assertTrue(
            UserBadge.objects.filter(user=self.user, badge_id='community-voice').exists()
        )
    
    def test_first_service_badge(self):
        service = Service.objects.create(
            user=self.user,
            title='Test Service',
            description='Test',
            type='Offer',
            duration=Decimal('1.00'),
            location_type='Online',
            schedule_type='One-Time'
        )
        
        Handshake.objects.create(
            service=service,
            requester=self.other_user,
            status='completed',
            provisioned_hours=Decimal('1.00')
        )
        
        new_badges = check_and_assign_badges(self.user)
        
        self.assertIn('first-service', new_badges)
    
    def test_badge_not_duplicated(self):
        service = Service.objects.create(
            user=self.user,
            title='Test Service',
            description='Test',
            type='Offer',
            duration=Decimal('1.00'),
            location_type='Online',
            schedule_type='One-Time'
        )
        
        Handshake.objects.create(
            service=service,
            requester=self.other_user,
            status='completed',
            provisioned_hours=Decimal('1.00')
        )
        
        new_badges1 = check_and_assign_badges(self.user)
        new_badges2 = check_and_assign_badges(self.user)
        
        self.assertIn('first-service', new_badges1)
        self.assertNotIn('first-service', new_badges2)
        
        self.assertEqual(
            UserBadge.objects.filter(user=self.user, badge_id='first-service').count(),
            1
        )
    
    def test_get_badge_progress(self):
        progress = get_badge_progress(self.user)
        
        self.assertIn('first-service', progress)
        self.assertIn('community-voice', progress)
        self.assertIn('time-giver-bronze', progress)
        
        first_service = progress['first-service']
        self.assertIn('earned', first_service)
        self.assertIn('current', first_service)
        self.assertIn('threshold', first_service)
        self.assertIn('progress_percent', first_service)
