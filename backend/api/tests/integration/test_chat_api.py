"""
Integration tests for chat API endpoints
"""
import pytest
from rest_framework import status

from api.tests.helpers.factories import (
    UserFactory, ServiceFactory, HandshakeFactory, ChatMessageFactory
)
from api.tests.helpers.test_client import AuthenticatedAPIClient
from api.models import ChatMessage, ChatRoom, PublicChatMessage


@pytest.mark.django_db
@pytest.mark.integration
class TestChatViewSet:
    """Test ChatViewSet (private handshake chat)"""
    
    def test_list_conversations(self):
        """Test listing user conversations"""
        user = UserFactory()
        service = ServiceFactory(user=user)
        requester = UserFactory()
        handshake = HandshakeFactory(service=service, requester=requester)
        
        client = AuthenticatedAPIClient()
        client.authenticate_user(user)
        
        response = client.get('/api/chat/conversations/')
        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.data, list)
    
    def test_get_conversation_messages(self):
        """Test retrieving messages for a conversation"""
        user = UserFactory()
        service = ServiceFactory(user=user)
        requester = UserFactory()
        handshake = HandshakeFactory(service=service, requester=requester)
        ChatMessageFactory.create_batch(3, handshake=handshake, sender=requester)
        
        client = AuthenticatedAPIClient()
        client.authenticate_user(user)
        
        response = client.get(f'/api/chat/conversations/{handshake.id}/messages/')
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 3
    
    def test_send_message(self):
        """Test sending a chat message"""
        user = UserFactory()
        service = ServiceFactory(user=user)
        requester = UserFactory()
        handshake = HandshakeFactory(service=service, requester=requester)
        
        client = AuthenticatedAPIClient()
        client.authenticate_user(requester)
        
        response = client.post(f'/api/chat/conversations/{handshake.id}/messages/', {
            'body': 'Hello, I am interested!'
        })
        assert response.status_code == status.HTTP_201_CREATED
        assert ChatMessage.objects.filter(
            handshake=handshake,
            body='Hello, I am interested!'
        ).exists()
    
    def test_send_message_unauthorized(self):
        """Test cannot send message to unrelated handshake"""
        user1 = UserFactory()
        user2 = UserFactory()
        service = ServiceFactory(user=user1)
        requester = UserFactory()
        handshake = HandshakeFactory(service=service, requester=requester)
        
        client = AuthenticatedAPIClient()
        client.authenticate_user(user2)
        
        response = client.post(f'/api/chat/conversations/{handshake.id}/messages/', {
            'body': 'Unauthorized message'
        })
        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
@pytest.mark.integration
class TestPublicChatViewSet:
    """Test PublicChatViewSet (public service chat)"""
    
    def test_get_public_chat_room(self):
        """Test retrieving public chat room for a service"""
        service = ServiceFactory()
        client = APIClient()
        
        response = client.get(f'/api/public-chat/{service.id}/')
        assert response.status_code == status.HTTP_200_OK
        assert 'id' in response.data
        assert 'name' in response.data
    
    def test_get_public_chat_messages(self):
        """Test retrieving public chat messages"""
        service = ServiceFactory()
        user = UserFactory()
        PublicChatMessage.objects.create(
            room=service.chat_room,
            sender=user,
            body='Public message'
        )
        
        client = APIClient()
        response = client.get(f'/api/public-chat/{service.id}/messages/')
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
    
    def test_send_public_message(self):
        """Test sending public chat message"""
        service = ServiceFactory()
        user = UserFactory()
        
        client = AuthenticatedAPIClient()
        client.authenticate_user(user)
        
        response = client.post(f'/api/public-chat/{service.id}/messages/', {
            'body': 'Public question about this service'
        })
        assert response.status_code == status.HTTP_201_CREATED
        assert PublicChatMessage.objects.filter(
            room=service.chat_room,
            body='Public question about this service'
        ).exists()
