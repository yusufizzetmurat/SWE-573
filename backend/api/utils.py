from __future__ import annotations

# Utility functions for TimeBank and business logic

from decimal import Decimal
from django.db import transaction
from django.db.models import F

from .models import Handshake, Notification, Service, User, TransactionHistory


def can_user_post_offer(user: User) -> bool:
    """Allow posting until the user owes more than 10 hours."""
    return user.timebank_balance <= Decimal("10.00")


def provision_timebank(handshake: Handshake) -> bool:
    """Escrow hours from the requester when a handshake is accepted."""
    with transaction.atomic():
        receiver = User.objects.select_for_update().get(id=handshake.requester_id)
        hours = handshake.provisioned_hours

        if receiver.timebank_balance < hours:
            raise ValueError("Insufficient TimeBank balance")

        old_balance = receiver.timebank_balance
        receiver.timebank_balance = F("timebank_balance") - hours
        receiver.save(update_fields=["timebank_balance"])
        receiver.refresh_from_db(fields=["timebank_balance"])
        
        # Record transaction history
        TransactionHistory.objects.create(
            user=receiver,
            transaction_type='provision',
            amount=-hours,  # Negative for debit
            balance_after=receiver.timebank_balance,
            handshake=handshake,
            description=f"Hours escrowed for service '{handshake.service.title}' (provisioned {hours} hours)"
        )
        
        return True

def complete_timebank_transfer(handshake: Handshake) -> bool:
    """Credit the provider once both parties confirm completion."""
    with transaction.atomic():
        provider = User.objects.select_for_update().get(id=handshake.service.user_id)
        hours = handshake.provisioned_hours
        old_balance = provider.timebank_balance
        provider.timebank_balance += hours
        provider.save(update_fields=["timebank_balance"])
        provider.refresh_from_db(fields=["timebank_balance"])
        
        # Record transaction history
        TransactionHistory.objects.create(
            user=provider,
            transaction_type='transfer',
            amount=hours,  # Positive for credit
            balance_after=provider.timebank_balance,
            handshake=handshake,
            description=f"Service completed: '{handshake.service.title}' ({hours} hours transferred)"
        )
        
        handshake.status = "completed"
        handshake.save(update_fields=["status"])
        return True


def cancel_timebank_transfer(handshake: Handshake) -> bool:
    """Refund escrowed hours when a handshake is cancelled."""
    with transaction.atomic():
        if handshake.status == "accepted":
            receiver = User.objects.select_for_update().get(id=handshake.requester_id)
            hours = handshake.provisioned_hours
            old_balance = receiver.timebank_balance
            receiver.timebank_balance += hours
            receiver.save(update_fields=["timebank_balance"])
            receiver.refresh_from_db(fields=["timebank_balance"])
            
            # Record transaction history
            TransactionHistory.objects.create(
                user=receiver,
                transaction_type='refund',
                amount=hours,  # Positive for refund
                balance_after=receiver.timebank_balance,
                handshake=handshake,
                description=f"Refund for cancelled service '{handshake.service.title}' ({hours} hours refunded)"
            )

        handshake.status = "cancelled"
        handshake.save(update_fields=["status"])
        return True


def create_notification(
    user: User,
    notification_type: str,
    title: str,
    message: str,
    handshake: Handshake | None = None,
    service: Service | None = None,
) -> Notification:
    """Persist a notification and return the instance."""
    return Notification.objects.create(
        user=user,
        type=notification_type,
        title=title,
        message=message,
        related_handshake=handshake,
        related_service=service
    )

