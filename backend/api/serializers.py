# api/serializers.py

from rest_framework import serializers
from .models import (
    User, Service, Tag, Handshake, ChatMessage, 
    Notification, ReputationRep, Badge, UserBadge, Report
)
from django.contrib.auth.hashers import make_password
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
import bleach

class TagSerializer(serializers.ModelSerializer):
    wikidata_info = serializers.SerializerMethodField()
    
    class Meta:
        model = Tag
        fields = ['id', 'name', 'wikidata_info']
    
    def get_wikidata_info(self, obj):
        """Fetch Wikidata information for the tag if it has a Wikidata ID"""
        if obj.id and obj.id.startswith('Q'):
            try:
                from .wikidata import fetch_wikidata_item
                return fetch_wikidata_item(obj.id)
            except Exception:
                return None
        return None

class ServiceSerializer(serializers.ModelSerializer):
    tags = TagSerializer(many=True, required=False, read_only=True)
    tag_ids = serializers.ListField(
        child=serializers.CharField(),
        write_only=True,
        required=False
    )
    tag_names = serializers.ListField(
        child=serializers.CharField(),
        write_only=True,
        required=False
    )
    
    user = serializers.SerializerMethodField()
    description = serializers.CharField(max_length=5000)
    title = serializers.CharField(max_length=200)

    class Meta:
        model = Service
        fields = [
            'id', 'user', 'title', 'description', 'type', 'duration',
            'location_type', 'location_area', 'location_lat', 'location_lng', 'status', 'max_participants', 'schedule_type',
            'schedule_details', 'created_at', 'tags', 'tag_ids', 'tag_names'
        ]
        read_only_fields = ['user']

    def get_user(self, obj):
        """Return user details without nested services to avoid circular reference"""
        user = obj.user
        badges = [user_badge.badge.id for user_badge in user.badges.all()]
        return {
            'id': str(user.id),
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'bio': user.bio,
            'avatar_url': user.avatar_url,
            'banner_url': user.banner_url,
            'timebank_balance': float(user.timebank_balance),
            'karma_score': user.karma_score,
            'date_joined': user.date_joined.isoformat() if hasattr(user, 'date_joined') and user.date_joined else None,
            'badges': badges,
            'featured_badge': badges[0] if badges else None,
        }

    def create(self, validated_data):
        # Sanitize description
        if 'description' in validated_data:
            validated_data['description'] = bleach.clean(
                validated_data['description'],
                tags=[],  # No HTML tags allowed
                strip=True
            )
        
        # Extract tag_ids and tag_names if provided
        tag_ids = validated_data.pop('tag_ids', [])
        tag_names = validated_data.pop('tag_names', [])
        
        # Handle location coordinates if provided (convert from string to Decimal)
        if 'location_lat' in validated_data and validated_data['location_lat']:
            if isinstance(validated_data['location_lat'], str):
                from decimal import Decimal
                try:
                    validated_data['location_lat'] = Decimal(validated_data['location_lat'])
                except (ValueError, TypeError):
                    validated_data.pop('location_lat', None)
        
        if 'location_lng' in validated_data and validated_data['location_lng']:
            if isinstance(validated_data['location_lng'], str):
                from decimal import Decimal
                try:
                    validated_data['location_lng'] = Decimal(validated_data['location_lng'])
                except (ValueError, TypeError):
                    validated_data.pop('location_lng', None)
        
        # The user will be passed in from the View
        validated_data['user'] = self.context['request'].user
        service = super().create(validated_data)
        
        # Collect all tags to add
        tags_to_add = []
        
        # Add tags by ID
        if tag_ids:
            tags_by_id = Tag.objects.filter(id__in=tag_ids)
            tags_to_add.extend(tags_by_id)
        
        # Create or get tags by name
        if tag_names:
            for tag_name in tag_names:
                if tag_name and tag_name.strip():
                    tag_name_clean = tag_name.strip()
                    # Try to get existing tag (case-insensitive search)
                    try:
                        tag = Tag.objects.get(name__iexact=tag_name_clean)
                    except Tag.DoesNotExist:
                        # Create new tag - generate a unique ID from the name
                        import uuid
                        tag_id = tag_name_clean.lower().replace(' ', '_').replace('-', '_')[:200]
                        if Tag.objects.filter(id=tag_id).exists():
                            tag_id = f"{tag_id}_{str(uuid.uuid4())[:8]}"
                        tag = Tag.objects.create(
                            id=tag_id,
                            name=tag_name_clean
                        )
                    if tag not in tags_to_add:
                        tags_to_add.append(tag)
        
        # Set all tags
        if tags_to_add:
            service.tags.set(tags_to_add)
        
        return service
    
    def update(self, instance, validated_data):
        # Sanitize description if being updated
        if 'description' in validated_data:
            validated_data['description'] = bleach.clean(
                validated_data['description'],
                tags=[],  # No HTML tags allowed
                strip=True
            )
        return super().update(instance, validated_data)

class UserRegistrationSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['email', 'password', 'first_name', 'last_name']
        extra_kwargs = {'password': {'write_only': True}}

    def validate_password(self, value):
        try:
            validate_password(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages))
        return value

    def create(self, validated_data):
        validated_data['password'] = make_password(validated_data['password'])
        return super().create(validated_data)

class UserProfileSerializer(serializers.ModelSerializer):
    services = ServiceSerializer(many=True, read_only=True)
    
    punctual_count = serializers.IntegerField(read_only=True)
    helpful_count = serializers.IntegerField(read_only=True)
    kind_count = serializers.IntegerField(read_only=True)
    badges = serializers.SerializerMethodField()
    bio = serializers.CharField(max_length=1000, allow_blank=True, required=False)

    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'bio', 'avatar_url',
            'banner_url', 'timebank_balance', 'karma_score', 'services',
            'punctual_count', 'helpful_count', 'kind_count', 'badges', 'date_joined'
        ]
        read_only_fields = [
            'id', 'email', 'timebank_balance', 'karma_score', 'services',
            'punctual_count', 'helpful_count', 'kind_count', 'badges', 'date_joined'
        ]

    def get_badges(self, obj):
        return [ub.badge.id for ub in obj.badges.all()]

class PublicUserProfileSerializer(serializers.ModelSerializer):
    services = ServiceSerializer(many=True, read_only=True)
    punctual_count = serializers.IntegerField(read_only=True)
    helpful_count = serializers.IntegerField(read_only=True)
    kind_count = serializers.IntegerField(read_only=True)
    badges = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'first_name', 'last_name', 'bio', 'avatar_url',
            'banner_url', 'karma_score', 'services',
            'punctual_count', 'helpful_count', 'kind_count', 'badges', 'date_joined'
        ]
        read_only_fields = [
            'id', 'karma_score', 'services',
            'punctual_count', 'helpful_count', 'kind_count', 'badges', 'date_joined'
        ]

    def get_badges(self, obj):
        return [ub.badge.id for ub in obj.badges.all()]

# Handshake Serializers
class HandshakeSerializer(serializers.ModelSerializer):
    service_title = serializers.CharField(source='service.title', read_only=True)
    requester_name = serializers.SerializerMethodField()
    provider_name = serializers.CharField(source='service.user.first_name', read_only=True)

    class Meta:
        model = Handshake
        fields = [
            'id', 'service', 'service_title', 'requester', 'requester_name',
            'provider_name', 'status', 'provisioned_hours',
            'provider_confirmed_complete', 'receiver_confirmed_complete',
            'exact_location', 'exact_duration', 'scheduled_time',
            'provider_initiated', 'requester_initiated',
            'created_at', 'updated_at'
        ]

    def get_requester_name(self, obj):
        return f"{obj.requester.first_name} {obj.requester.last_name}".strip()

# Chat Message Serializers
class ChatMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()
    sender_avatar_url = serializers.SerializerMethodField()
    sender_id = serializers.UUIDField(source='sender.id', read_only=True)
    body = serializers.CharField(max_length=5000)

    class Meta:
        model = ChatMessage
        fields = ['id', 'handshake', 'sender', 'sender_id', 'sender_name', 'sender_avatar_url', 'body', 'created_at']

    def get_sender_name(self, obj):
        return f"{obj.sender.first_name} {obj.sender.last_name}".strip()
    
    def get_sender_avatar_url(self, obj):
        return obj.sender.avatar_url

# Notification Serializer
class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            'id', 'type', 'title', 'message', 'is_read',
            'related_handshake', 'related_service', 'created_at'
        ]

# Reputation Serializer
class ReputationRepSerializer(serializers.ModelSerializer):
    giver_name = serializers.SerializerMethodField()
    receiver_name = serializers.SerializerMethodField()

    class Meta:
        model = ReputationRep
        fields = [
            'id', 'handshake', 'giver', 'giver_name', 'receiver', 'receiver_name',
            'is_punctual', 'is_helpful', 'is_kind', 'created_at'
        ]

    def get_giver_name(self, obj):
        return f"{obj.giver.first_name} {obj.giver.last_name}".strip()

    def get_receiver_name(self, obj):
        return f"{obj.receiver.first_name} {obj.receiver.last_name}".strip()

# Badge Serializers
class BadgeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Badge
        fields = ['id', 'name', 'description', 'icon_url']

# Report Serializer
class ReportSerializer(serializers.ModelSerializer):
    reporter_name = serializers.SerializerMethodField()
    reported_user_name = serializers.SerializerMethodField()

    class Meta:
        model = Report
        fields = [
            'id', 'reporter', 'reporter_name', 'reported_user', 'reported_user_name',
            'reported_service', 'related_handshake', 'type', 'status',
            'description', 'admin_notes', 'created_at', 'resolved_at', 'resolved_by'
        ]

    def get_reporter_name(self, obj):
        return f"{obj.reporter.first_name} {obj.reporter.last_name}".strip()

    def get_reported_user_name(self, obj):
        if obj.reported_user:
            return f"{obj.reported_user.first_name} {obj.reported_user.last_name}".strip()
        return None