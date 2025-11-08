"""
Automated badge assignment utilities
"""
from collections import defaultdict
from typing import Dict, List

from django.db.models import Count, Q

from .models import Badge, Handshake, ReputationRep, Service, User, UserBadge

BADGE_DEFAULTS: Dict[str, Dict[str, str]] = {
    "first-service": {
        "name": "First Service",
        "description": "Completed the first timebank exchange.",
        "icon_url": "",
    },
    "10-offers": {
        "name": "10+ Offers",
        "description": "Shared at least ten offers with the community.",
        "icon_url": "",
    },
    "kindness-hero": {
        "name": "Kindness Hero",
        "description": "Received consistent kindness feedback from neighbours.",
        "icon_url": "",
    },
    "super-helper": {
        "name": "Super Helper",
        "description": "Recognised for above-and-beyond support.",
        "icon_url": "",
    },
    "punctual-pro": {
        "name": "Punctual Pro",
        "description": "Always on time for confirmed handshakes.",
        "icon_url": "",
    },
}


def check_and_assign_badges(user: User) -> List[str]:
    """Assign new badges to the user based on cached aggregate stats."""
    existing_badges = set(
        UserBadge.objects.filter(user=user).values_list('badge_id', flat=True)
    )

    stats = get_user_stats(user)
    badge_requirements: Dict[str, int] = {
        'first-service': 1,
        '10-offers': 10,
        'kindness-hero': 20,
        'super-helper': 15,
        'punctual-pro': 15,
    }

    badge_sources: Dict[str, str] = {
        'first-service': 'completed_services',
        '10-offers': 'offer_count',
        'kindness-hero': 'kindness_count',
        'super-helper': 'helpful_count',
        'punctual-pro': 'punctual_count',
    }

    newly_assigned: List[str] = []
    for badge_id, requirement in badge_requirements.items():
        source_key = badge_sources[badge_id]
        if stats.get(source_key, 0) >= requirement and badge_id not in existing_badges:
            assign_badge(user, badge_id)
            newly_assigned.append(badge_id)

    return newly_assigned


def get_user_stats(user: User) -> Dict[str, int]:
    """Return service and reputation stats with batched queries."""
    stats: Dict[str, int] = defaultdict(int)

    stats['completed_services'] = (
        Handshake.objects.filter(
            Q(requester=user) | Q(service__user=user),
            status='completed'
        ).count()
    )

    stats['offer_count'] = (
        Service.objects.filter(user=user, type='Offer', status__in=['Active', 'Completed']).count()
    )

    rep_counts = ReputationRep.objects.filter(receiver=user).aggregate(
        helpful=Count('id', filter=Q(is_helpful=True)),
        kind=Count('id', filter=Q(is_kind=True)),
        punctual=Count('id', filter=Q(is_punctual=True)),
    )

    stats['helpful_count'] = rep_counts['helpful'] or 0
    stats['kindness_count'] = rep_counts['kind'] or 0
    stats['punctual_count'] = rep_counts['punctual'] or 0

    return stats


def assign_badge(user: User, badge_id: str) -> None:
    defaults = BADGE_DEFAULTS.get(
        badge_id,
        {
            "name": badge_id.replace("-", " ").replace("_", " ").title(),
            "description": "",
            "icon_url": "",
        },
    )
    badge, _ = Badge.objects.get_or_create(id=badge_id, defaults=defaults)
    UserBadge.objects.get_or_create(user=user, badge=badge)

