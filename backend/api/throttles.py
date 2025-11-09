"""
Custom throttle classes for rate limiting sensitive operations
"""
from rest_framework.throttling import UserRateThrottle


class ConfirmationThrottle(UserRateThrottle):
    """
    Throttle for service confirmation operations.
    Limits to 10 requests per hour per user to prevent abuse.
    """
    rate = '10/hour'
    scope = 'confirm'


class HandshakeThrottle(UserRateThrottle):
    """
    Throttle for handshake creation and initiation operations.
    Limits to 20 requests per hour per user to prevent spam.
    """
    rate = '20/hour'
    scope = 'handshake'
