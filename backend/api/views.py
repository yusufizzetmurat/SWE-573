from rest_framework import generics, viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.parsers import JSONParser, FormParser, MultiPartParser
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle, ScopedRateThrottle
from rest_framework.pagination import PageNumberPagination
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from django.db import transaction
from decimal import Decimal
import bleach

from .models import (
    User, Service, Tag, Handshake, ChatMessage,
    Notification, ReputationRep, Badge, Report, UserBadge, TransactionHistory
)
from .serializers import (
    UserRegistrationSerializer, 
    UserProfileSerializer, 
    ServiceSerializer,
    TagSerializer,
    HandshakeSerializer,
    ChatMessageSerializer,
    NotificationSerializer,
    ReputationRepSerializer,
    ReportSerializer,
    TransactionHistorySerializer
)
from .utils import (
    can_user_post_offer, provision_timebank, complete_timebank_transfer,
    cancel_timebank_transfer, create_notification
)
from .badge_utils import check_and_assign_badges
from .performance import track_performance
from django.db.models import Count, Q, Prefetch


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

class RegistrationThrottle(AnonRateThrottle):
    """Lenient throttle for registration - 20 requests per hour per IP"""
    rate = '20/hour'

class CustomTokenRefreshView(TokenRefreshView):
    """Custom token refresh view that handles deleted users gracefully"""
    
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        
        try:
            serializer.is_valid(raise_exception=True)
        except (TokenError, InvalidToken) as e:
            # Token is invalid - return 401
            return Response(
                {'detail': 'Invalid refresh token.', 'code': 'token_not_valid'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        except Exception as e:
            # Check if it's a DoesNotExist error (user was deleted)
            # This happens when the token references a user that no longer exists
            error_str = str(e)
            error_type = type(e).__name__
            
            if ('DoesNotExist' in error_type or 
                'matching query does not exist' in error_str or
                'User matching query does not exist' in error_str):
                return Response(
                    {'detail': 'User account no longer exists.', 'code': 'user_not_found'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            # Re-raise other exceptions to see what they are
            import traceback
            print(f"Unexpected error in token refresh: {error_type}: {error_str}")
            print(traceback.format_exc())
            raise
        
        # If we get here, token is valid
        return Response(serializer.validated_data, status=status.HTTP_200_OK)

class UserRegistrationView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [RegistrationThrottle]  # Use custom throttle instead of default

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'user_id': str(user.id),
            'name': f"{user.first_name} {user.last_name}".strip() or user.email,
            'balance': float(user.timebank_balance),
            'token': str(refresh.access_token),
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserProfileSerializer(user).data
        }, status=201)

class UserProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        badge_prefetch = Prefetch(
            'badges',
            queryset=UserBadge.objects.select_related('badge')
        )

        return (
            User.objects
            .prefetch_related('services', 'services__tags', badge_prefetch)
            .annotate(
                punctual_count=Count('received_reps', filter=Q(received_reps__is_punctual=True)),
                helpful_count=Count('received_reps', filter=Q(received_reps__is_helpful=True)),
                kind_count=Count('received_reps', filter=Q(received_reps__is_kind=True)),
            )
        )
    
    def get_object(self):
        user_id = self.kwargs.get('id')
        if user_id:
            return self.get_queryset().get(id=user_id)
        return self.get_queryset().get(id=self.request.user.id)
    
    def get_serializer_class(self):
        user_id = self.kwargs.get('id')
        if user_id and user_id != str(self.request.user.id):
            from .serializers import PublicUserProfileSerializer
            return PublicUserProfileSerializer
        return UserProfileSerializer

class ServiceViewSet(viewsets.ModelViewSet):
    queryset = Service.objects.filter(status='Active')
    serializer_class = ServiceSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    pagination_class = StandardResultsSetPagination

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        paginator = self.pagination_class()
        if request.query_params.get(paginator.page_query_param) or request.query_params.get(paginator.page_size_query_param):
            page = paginator.paginate_queryset(queryset, request)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return paginator.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @track_performance
    def get_queryset(self):
        return (
            Service.objects.filter(status='Active')
            .select_related('user')
            .prefetch_related('tags', 'user__badges__badge')
            .order_by('-created_at')
        )

    def get_serializer_context(self):
        return {'request': self.request}

    def create(self, request, *args, **kwargs):
        # REQ-TB-003: Check if user can post offer (balance > 10 hours blocks new offers)
        from .utils import can_user_post_offer
        
        if request.data.get('type') == 'Offer':
            if not can_user_post_offer(request.user):
                return Response(
                    {'error': 'Cannot post new offers: TimeBank balance exceeds 10 hours. Please receive services to reduce your balance.'},
                    status=400
                )
        
        return super().create(request, *args, **kwargs)

class TagViewSet(viewsets.ModelViewSet):
    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    
    def get_queryset(self):
        queryset = Tag.objects.all()
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(name__icontains=search)
        return queryset

class ExpressInterestView(APIView):
    """Standalone view for expressing interest in a service"""
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [UserRateThrottle]
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    @track_performance
    def post(self, request, service_id):
        try:
            service = Service.objects.get(id=service_id, status='Active')
        except Service.DoesNotExist:
            return Response({'error': 'Service not found'}, status=status.HTTP_404_NOT_FOUND)

        if service.user == request.user:
            return Response({'error': 'Cannot express interest in your own service'}, status=status.HTTP_400_BAD_REQUEST)

        existing = Handshake.objects.filter(
            service=service,
            requester=request.user,
            status__in=['pending', 'accepted']
        ).first()

        if existing:
            return Response({'error': 'You have already expressed interest'}, status=status.HTTP_400_BAD_REQUEST)

        if request.user.timebank_balance < service.duration:
            return Response(
                {'error': f'Insufficient TimeBank balance. Need {service.duration} hours, have {request.user.timebank_balance}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        handshake = Handshake.objects.create(
            service=service,
            requester=request.user,
            provisioned_hours=service.duration,
            status='pending'
        )

        create_notification(
            user=service.user,
            notification_type='handshake_request',
            title='New Interest in Your Service',
            message=f"{request.user.first_name} expressed interest in '{service.title}'",
            handshake=handshake,
            service=service
        )

        ChatMessage.objects.create(
            handshake=handshake,
            sender=request.user,
            body=f"Hi! I'm interested in your service: {service.title}"
        )

        serializer = HandshakeSerializer(handshake)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class HandshakeViewSet(viewsets.ModelViewSet):
    serializer_class = HandshakeSerializer
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [UserRateThrottle]
    pagination_class = StandardResultsSetPagination

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        paginator = self.pagination_class()
        if request.query_params.get(paginator.page_query_param) or request.query_params.get(paginator.page_size_query_param):
            page = paginator.paginate_queryset(queryset, request)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return paginator.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def get_queryset(self):
        user = self.request.user
        return Handshake.objects.filter(
            Q(requester=user) | Q(service__user=user)
        ).select_related('service', 'requester', 'service__user')

    @action(detail=False, methods=['post'], url_path=r'services/(?P<service_id>[^/.]+)/interest', permission_classes=[permissions.IsAuthenticated])
    @track_performance
    def express_interest(self, request, service_id=None):
        try:
            service = Service.objects.get(id=service_id, status='Active')
        except Service.DoesNotExist:
            return Response({'error': 'Service not found'}, status=404)

        if service.user == request.user:
            return Response({'error': 'Cannot express interest in your own service'}, status=400)

        existing = Handshake.objects.filter(
            service=service,
            requester=request.user,
            status__in=['pending', 'accepted']
        ).first()

        if existing:
            return Response({'error': 'You have already expressed interest'}, status=400)

        if request.user.timebank_balance < service.duration:
            return Response(
                {'error': f'Insufficient TimeBank balance. Need {service.duration} hours, have {request.user.timebank_balance}'},
                status=400
            )

        handshake = Handshake.objects.create(
            service=service,
            requester=request.user,
            provisioned_hours=service.duration,
            status='pending'
        )

        create_notification(
            user=service.user,
            notification_type='handshake_request',
            title='New Interest in Your Service',
            message=f"{request.user.first_name} expressed interest in '{service.title}'",
            handshake=handshake,
            service=service
        )

        ChatMessage.objects.create(
            handshake=handshake,
            sender=request.user,
            body=f"Hi! I'm interested in your service: {service.title}"
        )

        serializer = self.get_serializer(handshake)
        return Response(serializer.data, status=201)

    @action(detail=True, methods=['post'], url_path='initiate')
    def initiate_handshake(self, request, pk=None):
        """
        Provider initiates handshake with details (location, duration, scheduled_time).
        Only the service provider can initiate. After initiation, requester can approve.
        """
        handshake = self.get_object()
        user = request.user
        
        # Only provider can initiate
        if handshake.service.user != user:
            return Response({'error': 'Only the service provider can initiate the handshake'}, status=403)

        if handshake.status != 'pending':
            return Response({'error': 'Handshake is not pending'}, status=400)

        # Provider has already initiated
        if handshake.provider_initiated:
            return Response({'error': 'You have already initiated this handshake'}, status=400)

        # Require all details from provider
        exact_location = request.data.get('exact_location', '').strip()
        exact_duration = request.data.get('exact_duration')
        scheduled_time = request.data.get('scheduled_time')

        if not exact_location:
            return Response({'error': 'Exact location is required'}, status=400)
        
        if not exact_duration:
            return Response({'error': 'Exact duration is required'}, status=400)
        
        if not scheduled_time:
            return Response({'error': 'Scheduled time is required'}, status=400)

        # Parse and validate scheduled time
        from django.utils.dateparse import parse_datetime
        from django.utils import timezone
        from django.utils.timezone import get_current_timezone, make_aware
        
        parsed_time = parse_datetime(scheduled_time)
        
        if not parsed_time:
            return Response({'error': 'Invalid scheduled time format'}, status=400)
        
        # Make timezone-aware if naive (frontend sends naive datetime without timezone)
        # Django's timezone.now() returns timezone-aware datetime, so we need to make parsed_time aware too
        if timezone.is_naive(parsed_time):
            # Use the current timezone (from settings.TIME_ZONE, which is UTC)
            current_tz = get_current_timezone()
            parsed_time = make_aware(parsed_time, current_tz)
        
        if parsed_time <= timezone.now():
            return Response({'error': 'Scheduled time must be in the future'}, status=400)

        # Validate duration
        try:
            exact_duration_decimal = Decimal(str(exact_duration))
            if exact_duration_decimal <= 0:
                return Response({'error': 'Duration must be greater than 0'}, status=400)
        except (ValueError, TypeError):
            return Response({'error': 'Invalid duration format'}, status=400)

        # Check for schedule conflicts
        from .schedule_utils import check_schedule_conflict
        duration_hours = float(exact_duration_decimal)
        conflicts = check_schedule_conflict(user, parsed_time, duration_hours, exclude_handshake=handshake)
        
        if conflicts:
            conflict_info = conflicts[0]
            other_user_name = f"{conflict_info['other_user'].first_name} {conflict_info['other_user'].last_name}".strip()
            conflict_time = conflict_info['scheduled_time'].strftime('%Y-%m-%d %H:%M')
            return Response({
                'error': 'Schedule conflict detected',
                'conflict': True,
                'conflict_details': {
                    'service_title': conflict_info['service_title'],
                    'scheduled_time': conflict_time,
                    'other_user': other_user_name
                }
            }, status=400)

        # Set handshake details
        handshake.provider_initiated = True
        handshake.exact_location = exact_location
        handshake.exact_duration = exact_duration_decimal
        handshake.scheduled_time = parsed_time
        handshake.save()

        # Notify requester that provider has initiated
        create_notification(
            user=handshake.requester,
            notification_type='handshake_request',
            title='Service Details Provided',
            message=f"{user.first_name} has provided service details for '{handshake.service.title}'. Please review and approve.",
            handshake=handshake,
            service=handshake.service
        )

        serializer = self.get_serializer(handshake)
        return Response(serializer.data, status=200)

    @action(detail=True, methods=['post'], url_path='approve')
    def approve_handshake(self, request, pk=None):
        """
        Requester approves the handshake after provider has initiated with details.
        Once approved, handshake is accepted and TimeBank is provisioned.
        """
        handshake = self.get_object()
        user = request.user
        
        # Only requester can approve
        if handshake.requester != user:
            return Response({'error': 'Only the requester can approve the handshake'}, status=403)

        if handshake.status != 'pending':
            return Response({'error': 'Handshake is not pending'}, status=400)

        # Provider must have initiated first
        if not handshake.provider_initiated:
            return Response({'error': 'Provider must initiate the handshake first'}, status=400)

        # Require all details to be set
        if not handshake.exact_location or not handshake.exact_duration or not handshake.scheduled_time:
            return Response({
                'error': 'Provider must provide exact location, duration, and scheduled time before approval',
                'requires_details': True
            }, status=400)

        # Provision TimeBank and accept handshake
        try:
            provision_timebank(handshake)
        except ValueError as e:
            return Response({'error': str(e)}, status=400)
        
        handshake.status = 'accepted'
        handshake.requester_initiated = True  # Mark requester as having approved
        handshake.save()

        # Notify provider that handshake was approved
        create_notification(
            user=handshake.service.user,
            notification_type='handshake_accepted',
            title='Handshake Approved',
            message=f"{user.first_name} has approved the handshake for '{handshake.service.title}'. The handshake is now accepted.",
            handshake=handshake,
            service=handshake.service
        )
        
        # Schedule reminders
        from django.utils import timezone
        from datetime import timedelta
        
        service_time = handshake.scheduled_time
        duration_hours = float(handshake.exact_duration)
        completion_time = service_time + timedelta(hours=duration_hours)
        
        if service_time > timezone.now():
            create_notification(
                user=handshake.service.user,
                notification_type='service_reminder',
                title='Service Reminder',
                message=f"Your service '{handshake.service.title}' is scheduled for {service_time.strftime('%Y-%m-%d %H:%M')}",
                handshake=handshake,
                service=handshake.service
            )
            create_notification(
                user=handshake.requester,
                notification_type='service_reminder',
                title='Service Reminder',
                message=f"Your service '{handshake.service.title}' is scheduled for {service_time.strftime('%Y-%m-%d %H:%M')}",
                handshake=handshake,
                service=handshake.service
            )
        
        if completion_time > timezone.now():
            create_notification(
                user=handshake.service.user,
                notification_type='service_confirmation',
                title='Service Completion Reminder',
                message=f"Please confirm completion of '{handshake.service.title}' after {completion_time.strftime('%Y-%m-%d %H:%M')}",
                handshake=handshake,
                service=handshake.service
            )
            create_notification(
                user=handshake.requester,
                notification_type='service_confirmation',
                title='Service Completion Reminder',
                message=f"Please confirm completion of '{handshake.service.title}' after {completion_time.strftime('%Y-%m-%d %H:%M')}",
                handshake=handshake,
                service=handshake.service
            )
        
        serializer = self.get_serializer(handshake)
        return Response(serializer.data, status=200)

    @action(detail=True, methods=['post'], url_path='accept')
    @track_performance
    def accept_handshake(self, request, pk=None):
        handshake = self.get_object()
        
        if handshake.service.user != request.user:
            return Response({'error': 'Only the service provider can accept'}, status=403)

        if handshake.status != 'pending':
            return Response({'error': 'Handshake is not pending'}, status=400)

        try:
            provision_timebank(handshake)
        except ValueError as e:
            return Response({'error': str(e)}, status=400)

        handshake.status = 'accepted'
        handshake.save()

        create_notification(
            user=handshake.requester,
            notification_type='handshake_accepted',
            title='Handshake Accepted',
            message=f"Your interest in '{handshake.service.title}' has been accepted!",
            handshake=handshake,
            service=handshake.service
        )

        serializer = self.get_serializer(handshake)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='deny')
    def deny_handshake(self, request, pk=None):
        handshake = self.get_object()
        
        if handshake.service.user != request.user:
            return Response({'error': 'Only the service provider can deny'}, status=403)

        if handshake.status != 'pending':
            return Response({'error': 'Handshake is not pending'}, status=400)

        handshake.status = 'denied'
        handshake.save()

        create_notification(
            user=handshake.requester,
            notification_type='handshake_denied',
            title='Handshake Denied',
            message=f"Your interest in '{handshake.service.title}' was not accepted.",
            handshake=handshake,
            service=handshake.service
        )

        serializer = self.get_serializer(handshake)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='cancel')
    def cancel_handshake(self, request, pk=None):
        handshake = self.get_object()
        
        if handshake.service.user != request.user:
            return Response({'error': 'Only the service provider can cancel'}, status=403)

        if handshake.status != 'accepted':
            return Response({'error': 'Can only cancel accepted handshakes'}, status=400)

        cancel_timebank_transfer(handshake)

        create_notification(
            user=handshake.requester,
            notification_type='handshake_cancelled',
            title='Service Cancelled',
            message=f"The service '{handshake.service.title}' has been cancelled.",
            handshake=handshake,
            service=handshake.service
        )

        serializer = self.get_serializer(handshake)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='confirm')
    @track_performance
    def confirm_completion(self, request, pk=None):
        handshake = self.get_object()
        user = request.user

        is_provider = handshake.service.user == user
        is_receiver = handshake.requester == user

        if not (is_provider or is_receiver):
            return Response({'error': 'Not authorized'}, status=403)

        if handshake.status != 'accepted':
            return Response({'error': 'Handshake must be accepted'}, status=400)

        hours = request.data.get('hours')
        if hours is not None:
            try:
                hours_decimal = Decimal(str(hours))
                if hours_decimal <= 0:
                    return Response({'error': 'Hours must be greater than 0'}, status=400)
                if hours_decimal > 24:
                    return Response({'error': 'Hours cannot exceed 24'}, status=400)
                
                # If hours changed and handshake was already accepted (provisioned), 
                # we need to adjust the provisioned amount
                old_hours = handshake.provisioned_hours
                if handshake.status == 'accepted' and hours_decimal != old_hours:
                    # Adjust the escrowed amount
                    difference = hours_decimal - old_hours
                    receiver = handshake.requester
                    with transaction.atomic():
                        receiver_locked = User.objects.select_for_update().get(id=receiver.id)
                        if difference > 0:
                            # Need more hours - check balance and deduct
                            if receiver_locked.timebank_balance < difference:
                                return Response({'error': f'Insufficient balance. Need {difference} more hours'}, status=400)
                            receiver_locked.timebank_balance -= difference
                            receiver_locked.save(update_fields=["timebank_balance"])
                            receiver_locked.refresh_from_db(fields=["timebank_balance"])
                            
                            # Record adjustment transaction
                            TransactionHistory.objects.create(
                                user=receiver_locked,
                                transaction_type='provision',
                                amount=-difference,
                                balance_after=receiver_locked.timebank_balance,
                                handshake=handshake,
                                description=f"Additional hours escrowed for '{handshake.service.title}' (adjusted from {old_hours} to {hours_decimal} hours)"
                            )
                        else:
                            # Refund excess hours
                            receiver_locked.timebank_balance += abs(difference)
                            receiver_locked.save(update_fields=["timebank_balance"])
                            receiver_locked.refresh_from_db(fields=["timebank_balance"])
                            
                            # Record refund transaction
                            TransactionHistory.objects.create(
                                user=receiver_locked,
                                transaction_type='refund',
                                amount=abs(difference),
                                balance_after=receiver_locked.timebank_balance,
                                handshake=handshake,
                                description=f"Hours adjusted for '{handshake.service.title}' (refunded {abs(difference)} hours, changed from {old_hours} to {hours_decimal} hours)"
                            )
                
                handshake.provisioned_hours = hours_decimal
            except (ValueError, TypeError):
                return Response({'error': 'Invalid hours value'}, status=400)

        if is_provider:
            handshake.provider_confirmed_complete = True
        else:
            handshake.receiver_confirmed_complete = True

        handshake.save()

        if handshake.provider_confirmed_complete and handshake.receiver_confirmed_complete:
            complete_timebank_transfer(handshake)
            create_notification(
                user=handshake.service.user,
                notification_type='positive_rep',
                title='Leave Feedback',
                message=f"Service completed! Would you like to leave positive feedback for {handshake.requester.first_name}?",
                handshake=handshake
            )
            create_notification(
                user=handshake.requester,
                notification_type='positive_rep',
                title='Leave Feedback',
                message=f"Service completed! Would you like to leave positive feedback for {handshake.service.user.first_name}?",
                handshake=handshake
            )

        serializer = self.get_serializer(handshake)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='report')
    def report_issue(self, request, pk=None):
        handshake = self.get_object()
        user = request.user
        issue_type = request.data.get('issue_type', 'no_show')

        is_provider = handshake.service.user == user
        is_receiver = handshake.requester == user

        if not (is_provider or is_receiver):
            return Response({'error': 'Not authorized'}, status=403)

        reported_user = handshake.requester if is_provider else handshake.service.user
        
        report = Report.objects.create(
            reporter=user,
            reported_user=reported_user,
            related_handshake=handshake,
            reported_service=handshake.service,
            type='no_show' if issue_type == 'no_show' else 'service_issue',
            description=request.data.get('description', 'No-show reported')
        )

        handshake.status = 'reported'
        handshake.save()

        admins = User.objects.filter(role='admin')
        for admin in admins:
            create_notification(
                user=admin,
                notification_type='admin_warning',
                title='New Report Requires Review',
                message=f"New {report.get_type_display()} report for service '{handshake.service.title}'",
                related_handshake=handshake
            )

        return Response({'status': 'success', 'report_id': str(report.id)}, status=201)

class ChatViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [UserRateThrottle]
    pagination_class = StandardResultsSetPagination

    @track_performance
    def list(self, request):
        """Get all conversations for the user"""
        from django.db.models import Q
        user = request.user
        handshakes = Handshake.objects.filter(
            Q(requester=user) | Q(service__user=user)
        ).select_related('service', 'requester', 'service__user').order_by('-updated_at')

        conversations = []
        for handshake in handshakes:
            last_message = ChatMessage.objects.filter(handshake=handshake).order_by('-created_at').first()
            other_user = handshake.requester if handshake.service.user == user else handshake.service.user
            is_provider = handshake.service.user == user
            
            conversations.append({
                'handshake_id': str(handshake.id),
                'service_title': handshake.service.title,
                'other_user': {
                    'id': str(other_user.id),
                    'name': f"{other_user.first_name} {other_user.last_name}".strip(),
                    'avatar_url': other_user.avatar_url
                },
                'last_message': ChatMessageSerializer(last_message).data if last_message else None,
                'status': handshake.status,
                'provider_confirmed_complete': handshake.provider_confirmed_complete,
                'receiver_confirmed_complete': handshake.receiver_confirmed_complete,
                'is_provider': is_provider,
                'provider_initiated': handshake.provider_initiated,
                'requester_initiated': handshake.requester_initiated,
                'exact_location': handshake.exact_location,
                'exact_duration': float(handshake.exact_duration) if handshake.exact_duration else None,
                'scheduled_time': handshake.scheduled_time.isoformat() if handshake.scheduled_time else None,
                'provisioned_hours': float(handshake.provisioned_hours) if handshake.provisioned_hours else None,
            })

        paginator = self.pagination_class()
        if request.query_params.get(paginator.page_query_param) or request.query_params.get(paginator.page_size_query_param):
            page = paginator.paginate_queryset(conversations, request)
            if page is not None:
                return paginator.get_paginated_response(page)
        return Response(conversations)

    @track_performance
    def retrieve(self, request, pk=None):
        """Get messages for a specific handshake"""
        try:
            handshake = Handshake.objects.get(id=pk)
        except Handshake.DoesNotExist:
            return Response({'error': 'Handshake not found'}, status=404)

        user = request.user
        if handshake.requester != user and handshake.service.user != user:
            return Response({'error': 'Not authorized'}, status=403)

        messages = ChatMessage.objects.filter(handshake=handshake).order_by('created_at')
        paginator = self.pagination_class()
        if request.query_params.get(paginator.page_query_param) or request.query_params.get(paginator.page_size_query_param):
            page = paginator.paginate_queryset(messages, request)
            if page is not None:
                serializer = ChatMessageSerializer(page, many=True)
                return paginator.get_paginated_response(serializer.data)
        serializer = ChatMessageSerializer(messages, many=True)
        return Response(serializer.data)

    @track_performance
    def create(self, request):
        """Send a message"""
        handshake_id = request.data.get('handshake_id')
        body = request.data.get('body')

        if not handshake_id or not body:
            return Response({'error': 'handshake_id and body required'}, status=400)

        # Sanitize HTML - strip all tags
        body = bleach.clean(body, tags=[], strip=True)
        
        # Validate and truncate body length (max 5000 chars)
        if len(body) > 5000:
            return Response({'error': 'Message body cannot exceed 5000 characters'}, status=400)
        body = body[:5000] if body else ''

        try:
            handshake = Handshake.objects.get(id=handshake_id)
        except Handshake.DoesNotExist:
            return Response({'error': 'Handshake not found'}, status=404)

        user = request.user
        if handshake.requester != user and handshake.service.user != user:
            return Response({'error': 'Not authorized'}, status=403)

        message = ChatMessage.objects.create(
            handshake=handshake,
            sender=user,
            body=body
        )

        # Notify other user
        other_user = handshake.requester if handshake.service.user == user else handshake.service.user
        create_notification(
            user=other_user,
            notification_type='chat_message',
            title='New Message',
            message=f"New message from {user.first_name}",
            handshake=handshake
        )

        # Send message via WebSocket
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        channel_layer = get_channel_layer()
        if channel_layer:
            serializer = ChatMessageSerializer(message)
            async_to_sync(channel_layer.group_send)(
                f'chat_{handshake.id}',
                {
                    'type': 'chat_message',
                    'message': serializer.data
                }
            )

        serializer = ChatMessageSerializer(message)
        return Response(serializer.data, status=201)

class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user).order_by('-created_at')

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        paginator = self.pagination_class()
        if request.query_params.get(paginator.page_query_param) or request.query_params.get(paginator.page_size_query_param):
            page = paginator.paginate_queryset(queryset, request)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return paginator.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='read')
    def mark_all_read(self, request):
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({'status': 'success'})

class ReputationViewSet(viewsets.ModelViewSet):
    serializer_class = ReputationRepSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ReputationRep.objects.filter(giver=self.request.user)

    def create(self, request):
        """Submit positive reputation"""
        handshake_id = request.data.get('handshake_id')
        
        try:
            handshake = Handshake.objects.get(id=handshake_id, status='completed')
        except Handshake.DoesNotExist:
            return Response({'error': 'Handshake not found or not completed'}, status=404)

        user = request.user
        # Determine who the receiver is
        if handshake.service.user == user:
            receiver = handshake.requester
        elif handshake.requester == user:
            receiver = handshake.service.user
        else:
            return Response({'error': 'Not authorized'}, status=403)

        # Check if rep already given
        existing = ReputationRep.objects.filter(handshake=handshake, giver=user).first()
        if existing:
            return Response({'error': 'Reputation already submitted'}, status=400)

        rep = ReputationRep.objects.create(
            handshake=handshake,
            giver=user,
            receiver=receiver,
            is_punctual=request.data.get('punctual', False),
            is_helpful=request.data.get('helpful', False),
            is_kind=request.data.get('kindness', False)
        )

        # Check and assign badges for receiver
        receiver_badges = check_and_assign_badges(receiver)
        if receiver_badges:
            badge_names = [Badge.objects.get(id=bid).name for bid in receiver_badges]
            create_notification(
                user=receiver,
                notification_type='positive_rep',
                title='New Badge Earned!',
                message=f"Congratulations! You earned: {', '.join(badge_names)}",
                handshake=handshake,
                service=handshake.service
            )
        
        # Update karma (REQ-REP-006)
        karma_gain = 0
        if rep.is_punctual:
            karma_gain += 1
        if rep.is_helpful:
            karma_gain += 1
        if rep.is_kind:
            karma_gain += 1
        
        receiver.karma_score += karma_gain
        receiver.save()

        serializer = self.get_serializer(rep)
        return Response(serializer.data, status=201)

class AdminReportViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ReportSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Only admins can access
        if self.request.user.role != 'admin':
            return Report.objects.none()
        return Report.objects.filter(status='pending').order_by('-created_at')

    @action(detail=True, methods=['post'], url_path='resolve')
    def resolve_report(self, request, pk=None):
        """REQ-ADM-007: Resolve a report"""
        if request.user.role != 'admin':
            return Response({'error': 'Admin access required'}, status=403)

        report = self.get_object()
        action_type = request.data.get('action')  # 'confirm_no_show', 'dismiss', etc.

        if action_type == 'confirm_no_show':
            # REQ-ADM-008: Apply karma penalty
            if report.reported_user:
                report.reported_user.karma_score -= 20
                report.reported_user.save()

            # Cancel TimeBank transfer
            if report.related_handshake:
                cancel_timebank_transfer(report.related_handshake)

            report.status = 'resolved'
            report.resolved_by = request.user
            report.admin_notes = request.data.get('admin_notes', 'No-show confirmed')
            report.save()

        elif action_type == 'dismiss':
            # Complete transfer as normal
            if report.related_handshake:
                complete_timebank_transfer(report.related_handshake)

            report.status = 'dismissed'
            report.resolved_by = request.user
            report.admin_notes = request.data.get('admin_notes', 'Report dismissed')
            report.save()

        serializer = self.get_serializer(report)
        return Response(serializer.data)

class AdminUserViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def check_admin(self, request):
        if request.user.role != 'admin':
            return Response({'error': 'Admin access required'}, status=403)
        return None

    @action(detail=True, methods=['post'], url_path='warn')
    def warn_user(self, request, pk=None):
        """REQ-ADM-003: Issue warning to user"""
        admin_check = self.check_admin(request)
        if admin_check:
            return admin_check

        try:
            user = User.objects.get(id=pk)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=404)

        create_notification(
            user=user,
            notification_type='admin_warning',
            title='Administrative Warning',
            message=request.data.get('message', 'You have received a formal warning from an administrator.'),
        )

        return Response({'status': 'success', 'message': 'Warning issued'})

    @action(detail=True, methods=['post'], url_path='ban')
    def ban_user(self, request, pk=None):
        """REQ-ADM-005: Ban user"""
        admin_check = self.check_admin(request)
        if admin_check:
            return admin_check

        try:
            user = User.objects.get(id=pk)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=404)

        user.is_active = False
        user.save()

        return Response({'status': 'success', 'message': 'User banned'})

    @action(detail=True, methods=['post'], url_path='adjust-karma')
    def adjust_karma(self, request, pk=None):
        """REQ-ADM-008: Manually adjust karma"""
        admin_check = self.check_admin(request)
        if admin_check:
            return admin_check

        try:
            user = User.objects.get(id=pk)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=404)

        adjustment = request.data.get('adjustment', 0)
        user.karma_score += adjustment
        user.save()

        return Response({
            'status': 'success',
            'new_karma': user.karma_score,
            'message': f'Karma adjusted by {adjustment}'
        })

class TransactionHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    """View transaction history for the current user"""
    serializer_class = TransactionHistorySerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        return TransactionHistory.objects.filter(user=self.request.user).order_by('-created_at')