"""
Custom throttle classes for rate limiting sensitive operations
"""
from rest_framework.throttling import UserRateThrottle, AnonRateThrottle


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


class SensitiveOperationThrottle(UserRateThrottle):
    """
    Throttle for sensitive operations (password changes, account modifications).
    Limits to 10 requests per hour per user.
    """
    rate = '10/hour'
    scope = 'sensitive'


class ReputationThrottle(UserRateThrottle):
    """
    Throttle for reputation submissions.
    Limits to 5 requests per hour per user to prevent abuse.
    """
    rate = '5/hour'
    scope = 'reputation'


class ProgressiveRateThrottle(UserRateThrottle):
    """
    Progressive rate limiting based on user reputation (karma_score).
    Users with higher karma get higher rate limits.
    
    Rate tiers:
    - New users (karma < 10): 50/hour
    - Regular users (karma 10-50): 100/hour
    - Trusted users (karma 51-100): 200/hour
    - Highly trusted (karma > 100): 300/hour
    """
    scope = 'user'
    
    def get_rate(self):
        """
        Determine rate based on user's karma_score.
        Falls back to default if user is not authenticated or has no karma.
        """
        if not self.request or not self.request.user or not self.request.user.is_authenticated:
            return '20/hour'  # Default for unauthenticated
        
        karma = getattr(self.request.user, 'karma_score', 0)
        
        if karma < 10:
            return '50/hour'
        elif karma < 50:
            return '100/hour'
        elif karma < 100:
            return '200/hour'
        else:
            return '300/hour'
