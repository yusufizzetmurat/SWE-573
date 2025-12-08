"""Unit tests for hot score ranking algorithm"""
from decimal import Decimal
from datetime import timedelta
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from api.models import User, Service, Comment
from api.ranking import calculate_hot_score, calculate_hot_scores_batch


class RankingAlgorithmTest(TestCase):
    """Test hot score ranking algorithm"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )
        self.service = Service.objects.create(
            user=self.user,
            title='Test Service',
            description='A test service',
            type='Offer',
            duration=Decimal('2.00'),
            location_type='Online',
            schedule_type='One-Time'
        )
    
    def test_calculate_hot_score_new_service(self):
        score = calculate_hot_score(self.service)
        self.assertGreaterEqual(score, 0)
    
    def test_hot_score_increases_with_comments(self):
        initial_score = calculate_hot_score(self.service)
        
        for i in range(5):
            Comment.objects.create(
                service=self.service,
                user=self.user,
                body=f'Comment {i}'
            )
        
        new_score = calculate_hot_score(self.service)
        self.assertGreater(new_score, initial_score)
    
    def test_hot_score_decreases_with_time(self):
        Comment.objects.create(
            service=self.service,
            user=self.user,
            body='Test comment'
        )
        
        score1 = calculate_hot_score(self.service)
        
        old_service = Service.objects.create(
            user=self.user,
            title='Old Service',
            description='An old service',
            type='Offer',
            duration=Decimal('2.00'),
            location_type='Online',
            schedule_type='One-Time'
        )
        old_service.created_at = timezone.now() - timedelta(days=7)
        old_service.save(update_fields=['created_at'])
        
        Comment.objects.create(
            service=old_service,
            user=self.user,
            body='Test comment'
        )
        
        score2 = calculate_hot_score(old_service)
        self.assertGreater(score1, score2)
    
    def test_batch_score_calculation(self):
        services = [self.service]
        for i in range(4):
            s = Service.objects.create(
                user=self.user,
                title=f'Service {i}',
                description='Test',
                type='Offer',
                duration=Decimal('1.00'),
                location_type='Online',
                schedule_type='One-Time'
            )
            services.append(s)
        
        scores = calculate_hot_scores_batch(services)
        
        self.assertEqual(len(scores), 5)
        for service in services:
            self.assertIn(service.id, scores)


class ServiceHotScoreSortingTest(TestCase):
    """Test service sorting by hot score"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='hotscore_test@example.com',
            password='testpass123',
            first_name='HotScore',
            last_name='Tester'
        )
        
        self.service1 = Service.objects.create(
            user=self.user,
            title='[HS] Low Score Service',
            description='Hot score test',
            type='Offer',
            duration=Decimal('1.00'),
            location_type='Online',
            schedule_type='One-Time',
            hot_score=0.5
        )
        self.service2 = Service.objects.create(
            user=self.user,
            title='[HS] High Score Service',
            description='Hot score test',
            type='Offer',
            duration=Decimal('1.00'),
            location_type='Online',
            schedule_type='One-Time',
            hot_score=10.0
        )
        self.service3 = Service.objects.create(
            user=self.user,
            title='[HS] Medium Score Service',
            description='Hot score test',
            type='Offer',
            duration=Decimal('1.00'),
            location_type='Online',
            schedule_type='One-Time',
            hot_score=5.0
        )
    
    def test_sort_by_hot_score(self):
        url = reverse('service-list') + '?sort=hot&search=[HS]'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        results = response.data.get('results', response.data)
        our_services = [s for s in results if s['title'].startswith('[HS]')]
        titles = [s['title'] for s in our_services]
        
        self.assertEqual(len(our_services), 3)
        self.assertEqual(titles[0], '[HS] High Score Service')
        self.assertEqual(titles[1], '[HS] Medium Score Service')
        self.assertEqual(titles[2], '[HS] Low Score Service')
    
    def test_default_sort_by_latest(self):
        url = reverse('service-list') + '?search=[HS]'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        results = response.data.get('results', response.data)
        our_services = [s for s in results if s['title'].startswith('[HS]')]
        
        self.assertEqual(len(our_services), 3)
        self.assertEqual(our_services[0]['title'], '[HS] Medium Score Service')
