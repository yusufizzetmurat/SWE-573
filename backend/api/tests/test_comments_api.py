"""API tests for Comment endpoints"""
from decimal import Decimal
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status

from api.models import User, Service, Comment


class CommentAPITest(TestCase):
    """Test Comment API endpoints"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )
        self.other_user = User.objects.create_user(
            email='other@example.com',
            password='testpass123',
            first_name='Other',
            last_name='User'
        )
        self.service = Service.objects.create(
            user=self.other_user,
            title='Test Service',
            description='A test service',
            type='Offer',
            duration=Decimal('2.00'),
            location_type='Online',
            schedule_type='One-Time'
        )
    
    def test_list_comments_unauthenticated(self):
        Comment.objects.create(
            service=self.service,
            user=self.user,
            body='Test comment'
        )
        
        url = reverse('service-comments', kwargs={'service_id': self.service.id})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_create_comment_authenticated(self):
        self.client.force_authenticate(user=self.user)
        
        url = reverse('service-comments', kwargs={'service_id': self.service.id})
        data = {'body': 'Great service!'}
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Comment.objects.count(), 1)
    
    def test_create_comment_unauthenticated(self):
        url = reverse('service-comments', kwargs={'service_id': self.service.id})
        data = {'body': 'Test comment'}
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_create_reply(self):
        self.client.force_authenticate(user=self.user)
        
        parent = Comment.objects.create(
            service=self.service,
            user=self.other_user,
            body='Original comment'
        )
        
        url = reverse('service-comments', kwargs={'service_id': self.service.id})
        data = {'body': 'Reply!', 'parent_id': str(parent.id)}
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Comment.objects.count(), 2)
    
    def test_cannot_reply_to_reply(self):
        self.client.force_authenticate(user=self.user)
        
        parent = Comment.objects.create(
            service=self.service,
            user=self.other_user,
            body='Original comment'
        )
        reply = Comment.objects.create(
            service=self.service,
            user=self.user,
            parent=parent,
            body='Reply'
        )
        
        url = reverse('service-comments', kwargs={'service_id': self.service.id})
        data = {'body': 'Reply to reply!', 'parent_id': str(reply.id)}
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_edit_own_comment(self):
        self.client.force_authenticate(user=self.user)
        
        comment = Comment.objects.create(
            service=self.service,
            user=self.user,
            body='Original text'
        )
        
        url = reverse('service-comment-detail', kwargs={
            'service_id': self.service.id,
            'pk': comment.id
        })
        data = {'body': 'Updated text'}
        response = self.client.patch(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        comment.refresh_from_db()
        self.assertEqual(comment.body, 'Updated text')
    
    def test_cannot_edit_others_comment(self):
        self.client.force_authenticate(user=self.user)
        
        comment = Comment.objects.create(
            service=self.service,
            user=self.other_user,
            body='Other user comment'
        )
        
        url = reverse('service-comment-detail', kwargs={
            'service_id': self.service.id,
            'pk': comment.id
        })
        data = {'body': 'Hacked!'}
        response = self.client.patch(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_delete_own_comment(self):
        self.client.force_authenticate(user=self.user)
        
        comment = Comment.objects.create(
            service=self.service,
            user=self.user,
            body='To be deleted'
        )
        
        url = reverse('service-comment-detail', kwargs={
            'service_id': self.service.id,
            'pk': comment.id
        })
        response = self.client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        comment.refresh_from_db()
        self.assertTrue(comment.is_deleted)
    
    def test_service_owner_can_delete_any_comment(self):
        self.client.force_authenticate(user=self.other_user)
        
        comment = Comment.objects.create(
            service=self.service,
            user=self.user,
            body='Comment on my service'
        )
        
        url = reverse('service-comment-detail', kwargs={
            'service_id': self.service.id,
            'pk': comment.id
        })
        response = self.client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
