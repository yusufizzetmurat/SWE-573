import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import UntypedToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from jwt import decode as jwt_decode
from django.conf import settings
import bleach
from .models import Handshake, ChatMessage
from .serializers import ChatMessageSerializer
from .utils import create_notification

User = get_user_model()


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.handshake_id = self.scope['url_route']['kwargs']['handshake_id']
        self.room_group_name = f'chat_{self.handshake_id}'
        
        # Get token from query string
        query_string = self.scope.get('query_string', b'').decode()
        token = None
        if 'token=' in query_string:
            token = query_string.split('token=')[-1].split('&')[0]
        
        if not token:
            await self.close(code=4001)
            return
        
        # Authenticate user
        try:
            user = await self.authenticate_user(token)
            if not user:
                await self.close(code=4003)
                return
            
            # Verify user has access to this handshake
            has_access = await self.verify_handshake_access(user, self.handshake_id)
            if not has_access:
                await self.close(code=4003)
                return
            
            self.user = user
        except Exception as e:
            await self.close(code=4003)
            return
        
        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
    
    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
    
    async def receive(self, text_data):
        try:
            text_data_json = json.loads(text_data)
            message_type = text_data_json.get('type')
            
            if message_type == 'chat_message':
                body = text_data_json.get('body', '')
                if body:
                    # Save message to database
                    message = await self.save_message(self.handshake_id, self.user.id, body)
                    
                    # Create notification for other user
                    await self.create_notification_for_message(self.handshake_id, self.user.id)
                    
                    # Send message to room group
                    await self.channel_layer.group_send(
                        self.room_group_name,
                        {
                            'type': 'chat_message',
                            'message': await self.serialize_message(message)
                        }
                    )
        except Exception as e:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': str(e)
            }))
    
    async def chat_message(self, event):
        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'chat_message',
            'message': event['message']
        }))
    
    @database_sync_to_async
    def authenticate_user(self, token):
        try:
            # Use proper JWT verification with AccessToken
            from rest_framework_simplejwt.tokens import AccessToken
            access_token = AccessToken(token)
            user_id = access_token['user_id']
            
            # Verify user exists and is active
            user = User.objects.get(id=user_id, is_active=True)
            return user
        except (InvalidToken, TokenError, User.DoesNotExist):
            return None
    
    @database_sync_to_async
    def verify_handshake_access(self, user, handshake_id):
        try:
            handshake = Handshake.objects.get(id=handshake_id)
            return handshake.requester == user or handshake.service.user == user
        except Handshake.DoesNotExist:
            return False
    
    @database_sync_to_async
    def save_message(self, handshake_id, user_id, body):
        # Sanitize HTML - strip all tags
        cleaned_body = bleach.clean(
            body,
            tags=[],  # No HTML tags allowed
            strip=True
        )
        
        # Truncate to max length (5000 chars)
        cleaned_body = cleaned_body[:5000] if cleaned_body else ''
        
        handshake = Handshake.objects.get(id=handshake_id)
        user = User.objects.get(id=user_id)
        message = ChatMessage.objects.create(
            handshake=handshake,
            sender=user,
            body=cleaned_body
        )
        return message
    
    @database_sync_to_async
    def serialize_message(self, message):
        serializer = ChatMessageSerializer(message)
        return serializer.data
    
    @database_sync_to_async
    def create_notification_for_message(self, handshake_id, sender_id):
        try:
            handshake = Handshake.objects.get(id=handshake_id)
            sender = User.objects.get(id=sender_id)
            other_user = handshake.requester if handshake.service.user == sender else handshake.service.user
            create_notification(
                user=other_user,
                notification_type='chat_message',
                title='New Message',
                message=f"New message from {sender.first_name}",
                handshake=handshake
            )
        except Exception:
            pass

