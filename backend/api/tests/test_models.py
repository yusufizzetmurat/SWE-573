"""Unit tests for Comment and NegativeRep models"""
from decimal import Decimal
from django.test import TestCase
from django.db import IntegrityError

from api.models import User, Service, Handshake, Comment, NegativeRep


class CommentModelTest(TestCase):
    """Test Comment model functionality"""
    
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
    
    def test_create_top_level_comment(self):
        comment = Comment.objects.create(
            service=self.service,
            user=self.user,
            body='Great service!'
        )
        self.assertIsNotNone(comment.id)
        self.assertIsNone(comment.parent)
        self.assertFalse(comment.is_deleted)
    
    def test_create_reply_comment(self):
        parent = Comment.objects.create(
            service=self.service,
            user=self.user,
            body='Great service!'
        )
        reply = Comment.objects.create(
            service=self.service,
            user=self.user,
            parent=parent,
            body='Thanks!'
        )
        self.assertEqual(reply.parent, parent)
        self.assertEqual(parent.replies.count(), 1)
    
    def test_soft_delete_comment(self):
        comment = Comment.objects.create(
            service=self.service,
            user=self.user,
            body='Test comment'
        )
        comment.is_deleted = True
        comment.save()
        
        self.assertTrue(Comment.objects.filter(id=comment.id).exists())
        self.assertTrue(Comment.objects.get(id=comment.id).is_deleted)


class NegativeRepModelTest(TestCase):
    """Test NegativeRep model functionality"""
    
    def setUp(self):
        self.provider = User.objects.create_user(
            email='provider@example.com',
            password='testpass123',
            first_name='Provider',
            last_name='User',
            timebank_balance=Decimal('10.00')
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
        self.handshake = Handshake.objects.create(
            service=self.service,
            requester=self.receiver,
            status='completed',
            provisioned_hours=Decimal('2.00')
        )
    
    def test_create_negative_rep(self):
        neg_rep = NegativeRep.objects.create(
            handshake=self.handshake,
            giver=self.receiver,
            receiver=self.provider,
            is_late=True,
            comment='Was 30 minutes late'
        )
        self.assertIsNotNone(neg_rep.id)
        self.assertTrue(neg_rep.is_late)
        self.assertFalse(neg_rep.is_unhelpful)
        self.assertFalse(neg_rep.is_rude)
    
    def test_unique_negative_rep_per_handshake_giver(self):
        NegativeRep.objects.create(
            handshake=self.handshake,
            giver=self.receiver,
            receiver=self.provider,
            is_late=True
        )
        with self.assertRaises(IntegrityError):
            NegativeRep.objects.create(
                handshake=self.handshake,
                giver=self.receiver,
                receiver=self.provider,
                is_rude=True
            )
