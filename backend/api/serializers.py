# api/serializers.py

from rest_framework import serializers
from .models import (
    User, Service, Tag, Handshake, ChatMessage, 
    Notification, ReputationRep, Badge, UserBadge, Report, TransactionHistory,
    ChatRoom, PublicChatMessage, Comment, NegativeRep
)
from django.contrib.auth.hashers import make_password
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from decimal import Decimal
import bleach
import re
import logging
from drf_spectacular.utils import extend_schema_field, extend_schema_serializer, OpenApiExample
from drf_spectacular.types import OpenApiTypes

logger = logging.getLogger(__name__)


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
    comment_count = serializers.SerializerMethodField()
    hot_score = serializers.FloatField(read_only=True)

    class Meta:
        model = Service
        fields = [
            'id', 'user', 'title', 'description', 'type', 'duration',
            'location_type', 'location_area', 'location_lat', 'location_lng', 'status', 'max_participants', 'schedule_type',
            'schedule_details', 'created_at', 'tags', 'tag_ids', 'tag_names', 'comment_count', 'hot_score', 'is_visible'
        ]
        read_only_fields = ['user', 'hot_score', 'is_visible']
    
    @extend_schema_field(OpenApiTypes.INT)
    def get_comment_count(self, obj):
        """Return the count of non-deleted comments on this service"""
        # Use prefetched data if available to avoid N+1 queries
        if hasattr(obj, '_prefetched_objects_cache') and 'comments' in obj._prefetched_objects_cache:
            return len([c for c in obj.comments.all() if not c.is_deleted])
        return obj.comments.filter(is_deleted=False).count()
    
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
        
        # Add tags by ID (including auto-creation for Wikidata QIDs)
        if tag_ids:
            # First, get all existing tags
            existing_tags = {tag.id: tag for tag in Tag.objects.filter(id__in=tag_ids)}
            tags_to_add.extend(existing_tags.values())
            
            # Find Wikidata QIDs that don't exist in database
            wikidata_qid_pattern = re.compile(r'^Q\d+$', re.IGNORECASE)
            missing_qids = [
                tid for tid in tag_ids 
                if tid not in existing_tags and wikidata_qid_pattern.match(tid)
            ]
            
            # Auto-create tags for missing Wikidata QIDs
            if missing_qids:
                from .wikidata import fetch_wikidata_item
                
                for qid in missing_qids:
                    # Normalize QID to uppercase (e.g., q28865 -> Q28865)
                    normalized_qid = qid.upper()
                    
                    # Check if normalized version exists (in case of case mismatch)
                    if normalized_qid in existing_tags:
                        continue
                    
                    # Fetch label from Wikidata
                    wikidata_info = fetch_wikidata_item(normalized_qid)
                    
                    if wikidata_info and wikidata_info.get('label'):
                        tag_name = wikidata_info['label']
                    else:
                        # Fallback: use the QID as name if Wikidata fetch fails
                        tag_name = normalized_qid
                        logger.warning(f"Could not fetch Wikidata info for {normalized_qid}, using QID as name")
                    
                    # Create the tag (use get_or_create to handle race conditions)
                    tag, created = Tag.objects.get_or_create(
                        id=normalized_qid,
                        defaults={'name': tag_name}
                    )
                    if tag not in tags_to_add:
                        tags_to_add.append(tag)
                    
                    if created:
                        logger.info(f"Auto-created Wikidata tag: {normalized_qid} ({tag_name})")
        
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
    video_intro_url = serializers.CharField(allow_blank=True, required=False, allow_null=True)
    portfolio_images = serializers.JSONField(required=False, default=list)
    show_history = serializers.BooleanField(required=False, default=True)
    video_intro_file_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'bio', 'avatar_url',
            'banner_url', 'timebank_balance', 'karma_score', 'services',
            'punctual_count', 'helpful_count', 'kind_count', 'badges', 'date_joined',
            'video_intro_url', 'video_intro_file', 'video_intro_file_url',
            'portfolio_images', 'show_history'
        ]
        read_only_fields = [
            'id', 'email', 'timebank_balance', 'karma_score', 'services',
            'punctual_count', 'helpful_count', 'kind_count', 'badges', 'date_joined',
            'video_intro_file_url'
        ]
        extra_kwargs = {
            'video_intro_file': {'write_only': True, 'required': False}
        }
    
    @extend_schema_field(OpenApiTypes.STR)
    def get_video_intro_file_url(self, obj):
        """Return full URL for uploaded video intro file"""
        if obj.video_intro_file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.video_intro_file.url)
            return obj.video_intro_file.url
        return None
    
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
    
    def validate_video_intro_url(self, value):
        """Validate video intro URL - must be YouTube, Vimeo, or valid URL with safe scheme"""
        if value:
            # First, ensure URL starts with safe scheme to prevent XSS (e.g., javascript:)
            if not value.startswith(('http://', 'https://')):
                raise serializers.ValidationError(
                    'Video URL must start with http:// or https://'
                )
            # Then check if it's a recognized video platform or direct URL
            youtube_pattern = r'(youtube\.com|youtu\.be)'
            vimeo_pattern = r'vimeo\.com'
            if not (re.search(youtube_pattern, value) or re.search(vimeo_pattern, value)):
                # Allow any https URL as a direct video link
                pass  # URL scheme already validated above
        return value
    
    def validate_portfolio_images(self, value):
        """Validate portfolio images array - max 5 items with safe URL schemes"""
        if value:
            if len(value) > 5:
                raise serializers.ValidationError('Maximum 5 portfolio images allowed')
<<<<<<< HEAD
            # Validate each URL has a safe scheme (http/https/data only - no relative paths)
            for idx, url in enumerate(value):
                if url and not url.startswith(('http://', 'https://', 'data:')):
                    raise serializers.ValidationError(
                        f'Portfolio image {idx + 1} must be a valid URL (http://, https://, or data:)'
=======
            # Validate each URL has a safe scheme (consistent with avatar/banner validation)
            for idx, url in enumerate(value):
                if url and not url.startswith(('http://', 'https://', 'data:', '/')):
                    raise serializers.ValidationError(
                        f'Portfolio image {idx + 1} must be a valid URL (http://, https://, data:, or /)'
>>>>>>> origin/main
                    )
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
    video_intro_file_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'first_name', 'last_name', 'bio', 'avatar_url',
            'banner_url', 'karma_score', 'services',
            'punctual_count', 'helpful_count', 'kind_count', 'badges', 'date_joined',
            'video_intro_url', 'video_intro_file_url', 'portfolio_images', 'show_history'
        ]
        read_only_fields = fields

    @extend_schema_field(OpenApiTypes.STR)
    def get_video_intro_file_url(self, obj):
        """Return full URL for uploaded video intro file"""
        if obj.video_intro_file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.video_intro_file.url)
            return obj.video_intro_file.url
        return None

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
    reported_service_title = serializers.SerializerMethodField()
    handshake_hours = serializers.SerializerMethodField()
    handshake_scheduled_time = serializers.SerializerMethodField()
    handshake_status = serializers.SerializerMethodField()

    class Meta:
        model = Report
        fields = [
            'id', 'reporter', 'reporter_name', 'reported_user', 'reported_user_name',
            'reported_service', 'reported_service_title', 'related_handshake',
            'handshake_hours', 'handshake_scheduled_time', 'handshake_status',
            'type', 'status', 'description', 'admin_notes', 
            'created_at', 'resolved_at', 'resolved_by'
        ]

    @extend_schema_field(OpenApiTypes.STR)
    def get_reporter_name(self, obj):
        return f"{obj.reporter.first_name} {obj.reporter.last_name}".strip()

    @extend_schema_field(OpenApiTypes.STR)
    def get_reported_user_name(self, obj):
        if obj.reported_user:
            return f"{obj.reported_user.first_name} {obj.reported_user.last_name}".strip()
        return None

    @extend_schema_field(OpenApiTypes.STR)
    def get_reported_service_title(self, obj):
        if obj.reported_service:
            return obj.reported_service.title
        return None

    @extend_schema_field(OpenApiTypes.DECIMAL)
    def get_handshake_hours(self, obj):
        if obj.related_handshake:
            return float(obj.related_handshake.provisioned_hours)
        return None

    @extend_schema_field(OpenApiTypes.DATETIME)
    def get_handshake_scheduled_time(self, obj):
        if obj.related_handshake and obj.related_handshake.scheduled_time:
            return obj.related_handshake.scheduled_time
        return None

    @extend_schema_field(OpenApiTypes.STR)
    def get_handshake_status(self, obj):
        if obj.related_handshake:
            return obj.related_handshake.status
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


# Public Chat Serializers
@extend_schema_serializer(
    examples=[
        OpenApiExample(
            'Chat Room Example',
            value={
                'id': '123e4567-e89b-12d3-a456-426614174009',
                'name': 'Discussion: Web Development Help',
                'type': 'public',
                'related_service': '123e4567-e89b-12d3-a456-426614174001',
                'created_at': '2024-01-01T12:00:00Z'
            },
            response_only=True
        )
    ]
)
class ChatRoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatRoom
        fields = ['id', 'name', 'type', 'related_service', 'created_at']
        read_only_fields = ['id', 'created_at']


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            'Public Chat Message Example',
            value={
                'id': '123e4567-e89b-12d3-a456-426614174010',
                'room': '123e4567-e89b-12d3-a456-426614174009',
                'sender_id': '123e4567-e89b-12d3-a456-426614174000',
                'sender_name': 'John Doe',
                'sender_avatar_url': 'https://example.com/avatars/john.jpg',
                'body': 'Has anyone tried this service before?',
                'created_at': '2024-01-01T12:00:00Z'
            },
            response_only=True
        ),
        OpenApiExample(
            'Send Public Chat Message Request',
            value={
                'body': 'Has anyone tried this service before?'
            },
            request_only=True
        )
    ]
)
class PublicChatMessageSerializer(serializers.ModelSerializer):
    sender_id = serializers.UUIDField(source='sender.id', read_only=True)
    sender_name = serializers.SerializerMethodField()
    sender_avatar_url = serializers.SerializerMethodField()
    body = serializers.CharField(max_length=5000)

    class Meta:
        model = PublicChatMessage
        fields = ['id', 'room', 'sender_id', 'sender_name', 'sender_avatar_url', 'body', 'created_at']
        read_only_fields = ['id', 'room', 'sender_id', 'created_at']

    @extend_schema_field(OpenApiTypes.STR)
    def get_sender_name(self, obj):
        return f"{obj.sender.first_name} {obj.sender.last_name}".strip()

    @extend_schema_field(OpenApiTypes.STR)
    def get_sender_avatar_url(self, obj):
        return obj.sender.avatar_url


# Comment Serializers
@extend_schema_serializer(
    examples=[
        OpenApiExample(
            'Comment Example',
            value={
                'id': '123e4567-e89b-12d3-a456-426614174011',
                'service': '123e4567-e89b-12d3-a456-426614174001',
                'user_id': '123e4567-e89b-12d3-a456-426614174000',
                'user_name': 'John Doe',
                'user_avatar_url': 'https://example.com/avatars/john.jpg',
                'parent': None,
                'body': 'Great service! Would recommend.',
                'is_deleted': False,
                'reply_count': 2,
                'created_at': '2024-01-01T12:00:00Z',
                'updated_at': '2024-01-01T12:00:00Z'
            },
            response_only=True
        ),
        OpenApiExample(
            'Create Comment Request',
            value={
                'body': 'Great service! Would recommend.',
                'parent_id': None
            },
            request_only=True
        )
    ]
)
class CommentSerializer(serializers.ModelSerializer):
    user_id = serializers.UUIDField(source='user.id', read_only=True)
    user_name = serializers.SerializerMethodField()
    user_avatar_url = serializers.SerializerMethodField()
    reply_count = serializers.SerializerMethodField()
    parent_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    body = serializers.CharField(max_length=2000)
    replies = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = [
            'id', 'service', 'user_id', 'user_name', 'user_avatar_url',
            'parent', 'parent_id', 'body', 'is_deleted', 'reply_count',
            'replies', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'service', 'user_id', 'parent', 'is_deleted', 'created_at', 'updated_at']

    @extend_schema_field(OpenApiTypes.STR)
    def get_user_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}".strip()

    @extend_schema_field(OpenApiTypes.STR)
    def get_user_avatar_url(self, obj):
        return obj.user.avatar_url

    @extend_schema_field(OpenApiTypes.INT)
    def get_reply_count(self, obj):
        """Return count of non-deleted replies"""
        # Check for prefetched active_replies (already filtered for is_deleted=False)
        if hasattr(obj, 'active_replies'):
            return len(obj.active_replies)
        return obj.replies.filter(is_deleted=False).count()

    @extend_schema_field(OpenApiTypes.OBJECT)
    def get_replies(self, obj):
        """Return replies for top-level comments only"""
        # Only include replies for top-level comments (no nesting beyond 1 level)
        if obj.parent is not None:
            return []
        
        # Use prefetched active_replies if available (already filtered for is_deleted=False)
        if hasattr(obj, 'active_replies'):
            replies = obj.active_replies
        else:
            replies = obj.replies.filter(is_deleted=False).select_related('user')
        
        # Serialize replies without nested replies (prevent recursion)
        return CommentReplySerializer(replies, many=True).data

    def validate_parent_id(self, value):
        """Validate that parent exists and enforce single-level threading"""
        if value is None:
            return value
        
        try:
            parent = Comment.objects.get(id=value)
        except Comment.DoesNotExist:
            raise serializers.ValidationError('Parent comment not found')
        
        # Enforce single-level threading: replies cannot have replies
        if parent.parent is not None:
            raise serializers.ValidationError('Cannot reply to a reply. Only top-level comments can have replies.')
        
        return value


class CommentReplySerializer(serializers.ModelSerializer):
    """Simplified serializer for comment replies (no nested replies)"""
    user_id = serializers.UUIDField(source='user.id', read_only=True)
    user_name = serializers.SerializerMethodField()
    user_avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = [
            'id', 'user_id', 'user_name', 'user_avatar_url',
            'body', 'is_deleted', 'created_at', 'updated_at'
        ]
        read_only_fields = fields

    @extend_schema_field(OpenApiTypes.STR)
    def get_user_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}".strip()

    @extend_schema_field(OpenApiTypes.STR)
    def get_user_avatar_url(self, obj):
        return obj.user.avatar_url


# Negative Reputation Serializers
@extend_schema_serializer(
    examples=[
        OpenApiExample(
            'Negative Reputation Example',
            value={
                'id': '123e4567-e89b-12d3-a456-426614174012',
                'handshake': '123e4567-e89b-12d3-a456-426614174002',
                'giver': '123e4567-e89b-12d3-a456-426614174000',
                'giver_name': 'John Doe',
                'receiver': '123e4567-e89b-12d3-a456-426614174003',
                'receiver_name': 'Jane Smith',
                'is_late': True,
                'is_unhelpful': False,
                'is_rude': False,
                'comment': 'Was 30 minutes late',
                'created_at': '2024-01-01T12:00:00Z'
            },
            response_only=True
        ),
        OpenApiExample(
            'Submit Negative Reputation Request',
            value={
                'handshake_id': '123e4567-e89b-12d3-a456-426614174002',
                'is_late': True,
                'is_unhelpful': False,
                'is_rude': False,
                'comment': 'Was 30 minutes late'
            },
            request_only=True
        )
    ]
)
class NegativeRepSerializer(serializers.ModelSerializer):
    giver_name = serializers.SerializerMethodField()
    receiver_name = serializers.SerializerMethodField()
    handshake_id = serializers.UUIDField(write_only=True, required=False)

    class Meta:
        model = NegativeRep
        fields = [
            'id', 'handshake', 'handshake_id', 'giver', 'giver_name',
            'receiver', 'receiver_name', 'is_late', 'is_unhelpful',
            'is_rude', 'comment', 'created_at'
        ]
        read_only_fields = ['id', 'handshake', 'giver', 'receiver', 'created_at']

    @extend_schema_field(OpenApiTypes.STR)
    def get_giver_name(self, obj):
        return f"{obj.giver.first_name} {obj.giver.last_name}".strip()

    @extend_schema_field(OpenApiTypes.STR)
    def get_receiver_name(self, obj):
        return f"{obj.receiver.first_name} {obj.receiver.last_name}".strip()

    def validate(self, data):
        """Validate that at least one negative trait is selected"""
        is_late = data.get('is_late', False)
        is_unhelpful = data.get('is_unhelpful', False)
        is_rude = data.get('is_rude', False)
        
        if not any([is_late, is_unhelpful, is_rude]):
            raise serializers.ValidationError(
                'At least one negative trait must be selected (is_late, is_unhelpful, or is_rude)'
            )
        
        return data


# User History Serializer
@extend_schema_serializer(
    examples=[
        OpenApiExample(
            'User History Item Example',
            value={
                'service_title': 'Web Development Help',
                'service_type': 'Offer',
                'duration': 2.5,
                'partner_name': 'Jane Smith',
                'partner_id': '123e4567-e89b-12d3-a456-426614174003',
                'partner_avatar_url': 'https://example.com/avatars/jane.jpg',
                'completed_date': '2024-01-01T12:00:00Z',
                'was_provider': True
            },
            response_only=True
        )
    ]
)
class UserHistorySerializer(serializers.Serializer):
    """Serializer for user's completed transaction history"""
    service_title = serializers.CharField()
    service_type = serializers.CharField()
    duration = serializers.DecimalField(max_digits=5, decimal_places=2)
    partner_name = serializers.CharField()
    partner_id = serializers.UUIDField()
    partner_avatar_url = serializers.CharField(allow_null=True)
    completed_date = serializers.DateTimeField()
    was_provider = serializers.BooleanField()
