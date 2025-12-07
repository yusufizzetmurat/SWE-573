from __future__ import annotations

from decimal import Decimal
from django.db import transaction

from .models import Handshake, Service, User, ChatMessage
from .utils import create_notification
from .cache_utils import invalidate_conversations


class HandshakeService:
    """Service class for handshake business logic, following Fat Utils pattern."""
    
    @staticmethod
    def can_express_interest(service: Service, user: User) -> tuple[bool, str | None]:
        """
        Validates if user can express interest in a service.
        
        Returns:
            tuple[bool, str | None]: (is_valid, error_message)
        """
        # Check if service exists and is active
        if service.status != 'Active':
            return False, 'Service is not active'
        
        # Check if user is trying to express interest in their own service
        if service.user == user:
            return False, 'Cannot express interest in your own service'
        
        # Check for existing handshake
        existing = Handshake.objects.filter(
            service=service,
            requester=user,
            status__in=['pending', 'accepted']
        ).first()
        
        if existing:
            return False, 'You have already expressed interest'
        
        # Check max_participants
        current_participants = Handshake.objects.filter(
            service=service,
            status__in=['pending', 'accepted']
        ).count()
        
        if current_participants >= service.max_participants:
            return False, f'Service has reached maximum capacity ({service.max_participants} participants)'
        
        # Determine payer and check balance
        payer = HandshakeService._determine_payer(service, user)
        if payer.timebank_balance < service.duration:
            payer_name = "You" if payer == user else f"{payer.first_name} {payer.last_name}"
            return False, f'Insufficient TimeBank balance. {payer_name} need {service.duration} hours, have {payer.timebank_balance}'
        
        return True, None
    
    @staticmethod
    def express_interest(service: Service, requester: User) -> Handshake:
        """
        Main business logic for expressing interest in a service.
        
        All validations are performed inside a transaction with row-level locking
        to prevent TOCTOU race conditions.
        
        Args:
            service: The service to express interest in
            requester: The user expressing interest
            
        Returns:
            Handshake: The created handshake instance
            
        Raises:
            ValueError: If validation fails (with descriptive error message)
        """
        # Create handshake within transaction with row-level locking
        with transaction.atomic():
            # Lock service and related users to prevent concurrent modifications
            # Use select_related to avoid extra queries, then lock all involved users
            service = Service.objects.select_related('user').select_for_update().get(pk=service.pk)
            requester = User.objects.select_for_update().get(pk=requester.pk)
            # Lock service owner separately (select_for_update doesn't lock related objects)
            service_owner = User.objects.select_for_update().get(pk=service.user.pk)
            
            # Validate service exists and is active (inside transaction)
            if service.status != 'Active':
                raise ValueError('Service is not active')
            
            # Check if user is trying to express interest in their own service
            # Use locked service_owner for comparison
            if service_owner.pk == requester.pk:
                raise ValueError('Cannot express interest in your own service')
            
            # Check for existing handshake (inside transaction with locked data)
            HandshakeService._check_existing_handshake(service, requester)
            
            # Check max_participants (inside transaction with locked data)
            HandshakeService._check_max_participants(service)
            
            # Determine payer and check balance (inside transaction with locked data)
            payer = HandshakeService._determine_payer(service, requester)
            # Use locked user objects
            if payer.pk == requester.pk:
                payer = requester
            else:
                payer = service_owner
            HandshakeService._check_balance(payer, service, requester)
            
            # Create handshake
            handshake = HandshakeService._create_handshake(service, requester)
            
            # Send notifications (use locked service_owner)
            HandshakeService._send_notifications(service, handshake, requester, service_owner)
            
            # Create initial chat message
            HandshakeService._create_initial_message(handshake, requester, service)
            
            # Invalidate caches (use locked service_owner)
            HandshakeService._invalidate_caches(requester, service_owner)
        
        return handshake
    
    @staticmethod
    def _check_own_service(service: Service, user: User) -> None:
        """Check if user is trying to express interest in their own service."""
        if service.user == user:
            raise ValueError('Cannot express interest in your own service')
    
    @staticmethod
    def _check_max_participants(service: Service) -> None:
        """Validates service hasn't reached max_participants."""
        current_participants = Handshake.objects.filter(
            service=service,
            status__in=['pending', 'accepted']
        ).count()
        
        if current_participants >= service.max_participants:
            raise ValueError(
                f'Service has reached maximum capacity ({service.max_participants} participants)'
            )
    
    @staticmethod
    def _check_existing_handshake(service: Service, user: User) -> None:
        """Checks for existing pending/accepted handshakes."""
        existing = Handshake.objects.filter(
            service=service,
            requester=user,
            status__in=['pending', 'accepted']
        ).first()
        
        if existing:
            raise ValueError('You have already expressed interest')
    
    @staticmethod
    def _determine_payer(service: Service, requester: User) -> User:
        """
        Determines who will pay based on service type.
        
        - For "Offer" posts: requester (receiver) pays
        - For "Need" posts: service owner (receiver) pays
        """
        if service.type == 'Offer':
            return requester  # Requester is the receiver
        else:  # service.type == 'Need'
            return service.user  # Service owner is the receiver
    
    @staticmethod
    def _check_balance(payer: User, service: Service, requester: User) -> None:
        """Validates payer has sufficient balance using Decimal."""
        if payer.timebank_balance < service.duration:
            payer_name = "You" if payer == requester else f"{payer.first_name} {payer.last_name}"
            raise ValueError(
                f'Insufficient TimeBank balance. {payer_name} need {service.duration} hours, have {payer.timebank_balance}'
            )
    
    @staticmethod
    def _create_handshake(service: Service, requester: User) -> Handshake:
        """Creates handshake record."""
        return Handshake.objects.create(
            service=service,
            requester=requester,
            provisioned_hours=service.duration,
            status='pending'
        )
    
    @staticmethod
    def _send_notifications(service: Service, handshake: Handshake, requester: User, service_owner: User) -> None:
        """Creates notifications."""
        create_notification(
            user=service_owner,
            notification_type='handshake_request',
            title='New Interest in Your Service',
            message=f"{requester.first_name} expressed interest in '{service.title}'",
            handshake=handshake,
            service=service
        )
    
    @staticmethod
    def _create_initial_message(handshake: Handshake, requester: User, service: Service) -> ChatMessage:
        """Creates initial chat message."""
        return ChatMessage.objects.create(
            handshake=handshake,
            sender=requester,
            body=f"Hi! I'm interested in your service: {service.title}"
        )
    
    @staticmethod
    def _invalidate_caches(requester: User, service_owner: User) -> None:
        """Invalidates conversation caches for both users."""
        invalidate_conversations(str(requester.id))
        invalidate_conversations(str(service_owner.id))

