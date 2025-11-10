# api/serializers.py

from rest_framework import serializers
from .models import (
    User, Service, Tag, Handshake, ChatMessage, 
    Notification, ReputationRep, Badge, UserBadge, Report, TransactionHistory
)
from django.contrib.auth.hashers import make_password
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from decimal import Decimal
import bleach
from drf_spectacular.utils import extend_schema_field, extend_schema_serializer, OpenApiExample
from drf_spectacular.types import OpenApiTypes


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            'User Summary Example',
            value={
                'id': '123e4567-e89b-12d3-a456-426614174000',
                'email': 'john.doe@example.com',
                'first_name': 'John',
                'last_name': 'Doe',
                'bio': 'Experienced web developer passionate about helping others',
                'avatar_url': 'https://example.com/avatars/john.jpg',
                'banner_url': 'https://example.com/banners/john.jpg',
                'timebank_balance': 8.5,
                'karma_score': 42,
                'date_joined': '2024-01-01T12:00:00Z',
                'badges': ['punctual_pro', 'helpful_hero'],
                'featured_badge': 'punctual_pro'
            },
            response_only=True
        )
    ]
)
class UserSummarySerializer(serializers.ModelSerializer):
    """
    Reusable serializer for user summary information
    Used in nested serializations to avoid circular references
    """
    badges = serializers.SerializerMethodField()
    featured_badge = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'bio',
            'avatar_url', 'banner_url', 'timebank_balance', 'karma_score',
            'date_joined', 'badges', 'featured_badge'
        ]
        read_only_fields = fields
    
    @extend_schema_field(OpenApiTypes.OBJECT)
    def get_badges(self, obj):
        """Return list of badge IDs - uses prefetched data when available"""
        try:
            if hasattr(obj, '_prefetched_objects_cache') and 'badges' in obj._prefetched_objects_cache:
                return [user_badge.badge.id for user_badge in obj._prefetched_objects_cache['badges']]
        except (AttributeError, KeyError):
            pass
        try:
            return [user_badge.badge.id for user_badge in obj.badges.all()]
        except (AttributeError, Exception):
            return []
    
    @extend_schema_field(OpenApiTypes.STR)
    def get_featured_badge(self, obj):
        """Return first badge ID as featured badge"""
        badges = self.get_badges(obj)
        return badges[0] if badges else None

@extend_schema_serializer(
    examples=[
        OpenApiExample(
            'Tag Example',
            value={
                'id': 'programming',
                'name': 'Programming',
                'wikidata_info': {
                    'label': 'Programming',
                    'description': 'Process of writing computer programs'
                }
            },
            response_only=True
        )
    ]
)
class TagSerializer(serializers.ModelSerializer):
    wikidata_info = serializers.SerializerMethodField()
    
    class Meta:
        model = Tag
        fields = ['id', 'name', 'wikidata_info']
    
    @extend_schema_field(OpenApiTypes.OBJECT)
    def get_wikidata_info(self, obj):
        """Fetch Wikidata information for the tag if it has a Wikidata ID"""
        if obj.id and obj.id.startswith('Q'):
            try:
                from .wikidata import fetch_wikidata_item
                return fetch_wikidata_item(obj.id)
            except Exception:
                return None
        return None

@extend_schema_serializer(
    examples=[
        OpenApiExample(
            'Service Offer Example',
            value={
                'id': '123e4567-e89b-12d3-a456-426614174001',
                'title': 'Web Development Help',
                'description': 'I can help with React, Django, and database design',
                'type': 'Offer',
                'duration': 2.5,
                'location_type': 'remote',
                'location_area': 'San Francisco Bay Area',
                'location_lat': None,
                'location_lng': None,
                'status': 'Active',
                'max_participants': 1,
                'schedule_type': 'flexible',
                'schedule_details': 'Weekday evenings preferred',
                'created_at': '2024-01-01T12:00:00Z',
                'user': {
                    'id': '123e4567-e89b-12d3-a456-426614174000',
                    'first_name': 'John',
                    'last_name': 'Doe',
                    'avatar_url': 'https://example.com/avatars/john.jpg',
                    'badges': ['punctual_pro']
                },
                'tags': [
                    {'id': 'programming', 'name': 'Programming'},
                    {'id': 'web_development', 'name': 'Web Development'}
                ]
            },
            response_only=True
        ),
        OpenApiExample(
            'Create Service Request',
            value={
                'title': 'Web Development Help',
                'description': 'I can help with React, Django, and database design',
                'type': 'Offer',
                'duration': 2.5,
                'location_type': 'remote',
                'location_area': 'San Francisco Bay Area',
                'max_participants': 1,
                'schedule_type': 'flexible',
                'schedule_details': 'Weekday evenings preferred',
                'tag_names': ['Programming', 'Web Development']
            },
            request_only=True
        )
    ]
)
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
    
    def validate_duration(self, value):
        """Validate that duration is positive"""
        if value <= 0:
            raise serializers.ValidationError('Duration must be greater than 0')
        return value
    
    def validate_max_participants(self, value):
        """Validate that max_participants is positive"""
        if value <= 0:
            raise serializers.ValidationError('Max participants must be greater than 0')
        return value

    @extend_schema_field(UserSummarySerializer)
    def get_user(self, obj):
        """Return user details without nested services to avoid circular reference"""
        return UserSummarySerializer(obj.user).data

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
        
        # Handle location coordinates if provided (convert from string/float to Decimal, round to 6 decimal places)
        if 'location_lat' in validated_data and validated_data['location_lat']:
            from decimal import Decimal, ROUND_HALF_UP
            try:
                lat_value = validated_data['location_lat']
                if isinstance(lat_value, str):
                    lat_decimal = Decimal(lat_value)
                elif isinstance(lat_value, (int, float)):
                    lat_decimal = Decimal(str(lat_value))
                else:
                    lat_decimal = lat_value
                
                # Round to 6 decimal places to match max_digits=9, decimal_places=6
                # This ensures no more than 9 total digits (3 before + 6 after decimal = 9 max)
                validated_data['location_lat'] = lat_decimal.quantize(Decimal('0.000001'), rounding=ROUND_HALF_UP)
            except (ValueError, TypeError, Exception):
                validated_data.pop('location_lat', None)
        
        if 'location_lng' in validated_data and validated_data['location_lng']:
            from decimal import Decimal, ROUND_HALF_UP
            try:
                lng_value = validated_data['location_lng']
                if isinstance(lng_value, str):
                    lng_decimal = Decimal(lng_value)
                elif isinstance(lng_value, (int, float)):
                    lng_decimal = Decimal(str(lng_value))
                else:
                    lng_decimal = lng_value
                
                # Round to 6 decimal places to match max_digits=9, decimal_places=6
                validated_data['location_lng'] = lng_decimal.quantize(Decimal('0.000001'), rounding=ROUND_HALF_UP)
            except (ValueError, TypeError, Exception):
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

@extend_schema_serializer(
    examples=[
        OpenApiExample(
            'Registration Request',
            value={
                'email': 'john.doe@example.com',
                'password': 'SecurePassword123!',
                'first_name': 'John',
                'last_name': 'Doe'
            },
            request_only=True
        ),
        OpenApiExample(
            'Registration Response',
            value={
                'user_id': '123e4567-e89b-12d3-a456-426614174000',
                'name': 'John Doe',
                'balance': 1.0,
                'token': 'eyJ0eXAiOiJKV1QiLCJhbGc...',
                'access': 'eyJ0eXAiOiJKV1QiLCJhbGc...',
                'refresh': 'eyJ0eXAiOiJKV1QiLCJhbGc...',
                'user': {
                    'id': '123e4567-e89b-12d3-a456-426614174000',
                    'email': 'john.doe@example.com',
                    'first_name': 'John',
                    'last_name': 'Doe',
                    'timebank_balance': 1.0,
                    'karma_score': 0
                }
            },
            response_only=True
        )
    ]
)
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
        validated_data.setdefault('timebank_balance', Decimal('1.00'))
        return super().create(validated_data)

class UserProfileSerializer(serializers.ModelSerializer):
    services = ServiceSerializer(many=True, read_only=True)
    
    punctual_count = serializers.IntegerField(read_only=True)
    helpful_count = serializers.IntegerField(read_only=True)
    kind_count = serializers.IntegerField(read_only=True)
    badges = serializers.SerializerMethodField()
    bio = serializers.CharField(max_length=1000, allow_blank=True, required=False)
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    avatar_url = serializers.CharField(allow_blank=True, required=False)
    banner_url = serializers.CharField(allow_blank=True, required=False)

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
    
    def validate_avatar_url(self, value):
        """Validate avatar URL format - allow data URLs for file uploads and regular URLs"""
        if value and not (value.startswith(('http://', 'https://', 'data:', '/'))):
            raise serializers.ValidationError('Avatar must be a valid URL or data URL (for uploaded images)')
        return value
    
    def validate_banner_url(self, value):
        """Validate banner URL format - allow data URLs for file uploads and regular URLs"""
        if value and not (value.startswith(('http://', 'https://', 'data:', '/'))):
            raise serializers.ValidationError('Banner must be a valid URL or data URL (for uploaded images)')
        return value
    
    def validate_bio(self, value):
        """Validate bio length"""
        if value and len(value) > 1000:
            raise serializers.ValidationError('Bio must be 1000 characters or less')
        return value

    @extend_schema_field(OpenApiTypes.OBJECT)
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

    @extend_schema_field(OpenApiTypes.OBJECT)
    def get_badges(self, obj):
        return [ub.badge.id for ub in obj.badges.all()]

# Handshake Serializers
@extend_schema_serializer(
    examples=[
        OpenApiExample(
            'Handshake Example',
            value={
                'id': '123e4567-e89b-12d3-a456-426614174002',
                'service': '123e4567-e89b-12d3-a456-426614174001',
                'service_title': 'Web Development Help',
                'requester': '123e4567-e89b-12d3-a456-426614174003',
                'requester_name': 'Jane Smith',
                'provider_name': 'John',
                'status': 'accepted',
                'provisioned_hours': 2.5,
                'provider_confirmed_complete': False,
                'receiver_confirmed_complete': False,
                'exact_location': '123 Main St, San Francisco, CA',
                'exact_duration': 2.5,
                'scheduled_time': '2024-12-25T14:00:00Z',
                'provider_initiated': True,
                'requester_initiated': True,
                'created_at': '2024-01-01T12:00:00Z',
                'updated_at': '2024-01-01T13:00:00Z'
            },
            response_only=True
        )
    ]
)
class HandshakeSerializer(serializers.ModelSerializer):
    service_title = serializers.CharField(source='service.title', read_only=True)
    requester_name = serializers.SerializerMethodField()
    provider_name = serializers.SerializerMethodField()

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

    @extend_schema_field(OpenApiTypes.STR)
    def get_requester_name(self, obj):
        return f"{obj.requester.first_name} {obj.requester.last_name}".strip()
    
    @extend_schema_field(OpenApiTypes.STR)
    def get_provider_name(self, obj):
        from .utils import get_provider_and_receiver
        provider, _ = get_provider_and_receiver(obj)
        return f"{provider.first_name} {provider.last_name}".strip()

# Chat Message Serializers
@extend_schema_serializer(
    examples=[
        OpenApiExample(
            'Chat Message Example',
            value={
                'id': '123e4567-e89b-12d3-a456-426614174004',
                'handshake': '123e4567-e89b-12d3-a456-426614174002',
                'sender': '123e4567-e89b-12d3-a456-426614174000',
                'sender_id': '123e4567-e89b-12d3-a456-426614174000',
                'sender_name': 'John Doe',
                'sender_avatar_url': 'https://example.com/avatars/john.jpg',
                'body': 'Hello! When would be a good time to meet?',
                'created_at': '2024-01-01T12:00:00Z'
            },
            response_only=True
        ),
        OpenApiExample(
            'Send Message Request',
            value={
                'handshake_id': '123e4567-e89b-12d3-a456-426614174002',
                'body': 'Hello! When would be a good time to meet?'
            },
            request_only=True
        )
    ]
)
class ChatMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()
    sender_avatar_url = serializers.SerializerMethodField()
    sender_id = serializers.UUIDField(source='sender.id', read_only=True)
    handshake_id = serializers.UUIDField(source='handshake.id', read_only=True)
    body = serializers.CharField(max_length=5000)
    handshake = serializers.UUIDField(read_only=True)
    sender = serializers.UUIDField(read_only=True)

    class Meta:
        model = ChatMessage
        fields = ['id', 'handshake', 'handshake_id', 'sender', 'sender_id', 'sender_name', 'sender_avatar_url', 'body', 'created_at']

    @extend_schema_field(OpenApiTypes.STR)
    def get_sender_name(self, obj):
        return f"{obj.sender.first_name} {obj.sender.last_name}".strip()
    
    @extend_schema_field(OpenApiTypes.STR)
    def get_sender_avatar_url(self, obj):
        return obj.sender.avatar_url

# Notification Serializer
@extend_schema_serializer(
    examples=[
        OpenApiExample(
            'Notification Example',
            value={
                'id': '123e4567-e89b-12d3-a456-426614174005',
                'type': 'handshake_accepted',
                'title': 'Handshake Accepted',
                'message': "Your interest in 'Web Development Help' has been accepted!",
                'is_read': False,
                'related_handshake': '123e4567-e89b-12d3-a456-426614174002',
                'related_service': '123e4567-e89b-12d3-a456-426614174001',
                'created_at': '2024-01-01T12:00:00Z'
            },
            response_only=True
        )
    ]
)
class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            'id', 'type', 'title', 'message', 'is_read',
            'related_handshake', 'related_service', 'created_at'
        ]

# Reputation Serializer
@extend_schema_serializer(
    examples=[
        OpenApiExample(
            'Reputation Example',
            value={
                'id': '123e4567-e89b-12d3-a456-426614174006',
                'handshake': '123e4567-e89b-12d3-a456-426614174002',
                'giver': '123e4567-e89b-12d3-a456-426614174000',
                'giver_name': 'John Doe',
                'receiver': '123e4567-e89b-12d3-a456-426614174003',
                'receiver_name': 'Jane Smith',
                'is_punctual': True,
                'is_helpful': True,
                'is_kind': False,
                'created_at': '2024-01-01T12:00:00Z'
            },
            response_only=True
        ),
        OpenApiExample(
            'Submit Reputation Request',
            value={
                'handshake_id': '123e4567-e89b-12d3-a456-426614174002',
                'punctual': True,
                'helpful': True,
                'kindness': False
            },
            request_only=True
        )
    ]
)
class ReputationRepSerializer(serializers.ModelSerializer):
    giver_name = serializers.SerializerMethodField()
    receiver_name = serializers.SerializerMethodField()

    class Meta:
        model = ReputationRep
        fields = [
            'id', 'handshake', 'giver', 'giver_name', 'receiver', 'receiver_name',
            'is_punctual', 'is_helpful', 'is_kind', 'created_at'
        ]

    @extend_schema_field(OpenApiTypes.STR)
    def get_giver_name(self, obj):
        return f"{obj.giver.first_name} {obj.giver.last_name}".strip()

    @extend_schema_field(OpenApiTypes.STR)
    def get_receiver_name(self, obj):
        return f"{obj.receiver.first_name} {obj.receiver.last_name}".strip()

# Badge Serializers
@extend_schema_serializer(
    examples=[
        OpenApiExample(
            'Badge Example',
            value={
                'id': 'punctual_pro',
                'name': 'Punctual Pro',
                'description': 'Earned 10+ punctual reputation points',
                'icon_url': 'https://example.com/badges/punctual_pro.png'
            },
            response_only=True
        )
    ]
)
class BadgeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Badge
        fields = ['id', 'name', 'description', 'icon_url']

# Report Serializer
@extend_schema_serializer(
    examples=[
        OpenApiExample(
            'Report Example',
            value={
                'id': '123e4567-e89b-12d3-a456-426614174007',
                'reporter': '123e4567-e89b-12d3-a456-426614174000',
                'reporter_name': 'John Doe',
                'reported_user': '123e4567-e89b-12d3-a456-426614174003',
                'reported_user_name': 'Jane Smith',
                'reported_service': '123e4567-e89b-12d3-a456-426614174001',
                'related_handshake': '123e4567-e89b-12d3-a456-426614174002',
                'type': 'no_show',
                'status': 'pending',
                'description': 'Provider did not show up at scheduled time',
                'admin_notes': None,
                'created_at': '2024-01-01T12:00:00Z',
                'resolved_at': None,
                'resolved_by': None
            },
            response_only=True
        )
    ]
)
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

    @extend_schema_field(OpenApiTypes.STR)
    def get_reporter_name(self, obj):
        return f"{obj.reporter.first_name} {obj.reporter.last_name}".strip()

    @extend_schema_field(OpenApiTypes.STR)
    def get_reported_user_name(self, obj):
        if obj.reported_user:
            return f"{obj.reported_user.first_name} {obj.reported_user.last_name}".strip()
        return None

# Transaction History Serializer
@extend_schema_serializer(
    examples=[
        OpenApiExample(
            'Transaction Example',
            value={
                'id': '123e4567-e89b-12d3-a456-426614174008',
                'transaction_type': 'provision',
                'transaction_type_display': 'Provision',
                'amount': -2.5,
                'balance_after': 7.5,
                'description': "Hours escrowed for 'Web Development Help'",
                'service_title': 'Web Development Help',
                'created_at': '2024-01-01T12:00:00Z'
            },
            response_only=True
        )
    ]
)
class TransactionHistorySerializer(serializers.ModelSerializer):
    transaction_type_display = serializers.CharField(source='get_transaction_type_display', read_only=True)
    service_title = serializers.SerializerMethodField()

    class Meta:
        model = TransactionHistory
        fields = [
            'id', 'transaction_type', 'transaction_type_display', 'amount',
            'balance_after', 'description', 'service_title', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

    @extend_schema_field(OpenApiTypes.STR)
    def get_service_title(self, obj):
        if obj.handshake and obj.handshake.service:
            return obj.handshake.service.title
        return None