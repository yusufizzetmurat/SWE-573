#!/usr/bin/env python
"""
Demo data script for The Hive
Creates demo users, services, handshakes, and chat messages for testing

Run: docker-compose run backend python manage.py shell < backend/create_demo_data.py
"""

from api.models import User, Tag, Service, Handshake, ChatMessage, Notification, ReputationRep, Badge, UserBadge
from django.contrib.auth.hashers import make_password
from decimal import Decimal
from django.utils import timezone
from datetime import timedelta

# Clear existing demo data
print("Clearing existing demo users...")
User.objects.filter(email__in=['elif@demo.com', 'cem@demo.com', 'sarah@demo.com', 'marcus@demo.com', 'alex@demo.com']).delete()

# Create sample tags
tags_data = [
    {'id': 'Q8476', 'name': 'Cooking'},
    {'id': 'Q11424', 'name': 'Music'},
    {'id': 'Q11461', 'name': 'Sports'},
    {'id': 'Q11019', 'name': 'Art'},
    {'id': 'Q2013', 'name': 'Language'},
    {'id': 'Q11467', 'name': 'Gardening'},
    {'id': 'Q11466', 'name': 'Technology'},
    {'id': 'Q11465', 'name': 'Education'},
    {'id': 'Q7186', 'name': 'Chess'},
    {'id': 'Q2013', 'name': 'Genealogy'},
]

print("\nCreating tags...")
for tag_data in tags_data:
    tag, created = Tag.objects.get_or_create(
        id=tag_data['id'],
        defaults={'name': tag_data['name']}
    )
    if created:
        print(f"  Created tag: {tag.name}")

print("Creating demo users...")

elif_user, created = User.objects.get_or_create(
    email='elif@demo.com',
    defaults={
        'password': make_password('demo123'),
        'first_name': 'Elif',
        'last_name': 'Yilmaz',
        'bio': 'Freelance designer, manti expert, and 3D printing novice. I love teaching creative skills and learning new things from my amazing neighbors!',
        'timebank_balance': Decimal('4.00'),  # After completing Manti service (1 starting + 3 earned = 4)
        'karma_score': 15,
        'role': 'member',
    }
)
if created:
    print(f"  Created user: {elif_user.email}")

cem, created = User.objects.get_or_create(
    email='cem@demo.com',
    defaults={
        'password': make_password('demo123'),
        'first_name': 'Cem',
        'last_name': 'Demir',
        'bio': 'University student interested in chess and genealogy. Still learning but happy to share what I know!',
        'timebank_balance': Decimal('1.00'),
        'karma_score': 5,
        'role': 'member',
    }
)
if created:
    print(f"  Created user: {cem.email}")

sarah, created = User.objects.get_or_create(
    email='sarah@demo.com',
    defaults={
        'password': make_password('demo123'),
        'first_name': 'Sarah',
        'last_name': 'Chen',
        'bio': 'Food enthusiast and cooking learner',
        'timebank_balance': Decimal('2.00'),
        'karma_score': 8,
        'role': 'member',
    }
)
if created:
    print(f"  Created user: {sarah.email}")

marcus, created = User.objects.get_or_create(
    email='marcus@demo.com',
    defaults={
        'password': make_password('demo123'),
        'first_name': 'Marcus',
        'last_name': 'Weber',
        'bio': 'Love learning new cuisines',
        'timebank_balance': Decimal('3.00'),
        'karma_score': 12,
        'role': 'member',
    }
)
if created:
    print(f"  Created user: {marcus.email}")

alex, created = User.objects.get_or_create(
    email='alex@demo.com',
    defaults={
        'password': make_password('demo123'),
        'first_name': 'Alex',
        'last_name': 'Johnson',
        'bio': 'Chess player and genealogy researcher',
        'timebank_balance': Decimal('0.00'),
        'karma_score': 10,
        'role': 'member',
    }
)
if created:
    print(f"  Created user: {alex.email}")

print("Creating badges...")
badges_data = [
    {
        'id': 'FIRST_SERVICE',
        'name': 'First Service',
        'description': 'Completed your first service exchange',
        'icon_url': '/badges/first-service.svg',
    },
    {
        'id': '10_OFFERS',
        'name': '10 Offers',
        'description': 'Posted 10 service offers',
        'icon_url': '/badges/10-offers.svg',
    },
    {
        'id': 'KINDNESS_HERO',
        'name': 'Kindness Hero',
        'description': 'Received 20+ Kindness reputation points',
        'icon_url': '/badges/kindness-hero.svg',
    },
]

for badge_data in badges_data:
    badge, created = Badge.objects.get_or_create(
        id=badge_data['id'],
        defaults=badge_data
    )
    if created:
        print(f"  Created badge: {badge.name}")

first_service_badge = Badge.objects.get(id='FIRST_SERVICE')
UserBadge.objects.get_or_create(user=elif_user, badge=first_service_badge)

print("Creating services...")
cooking_tag = Tag.objects.get(id='Q8476')
technology_tag = Tag.objects.get(id='Q11466')
chess_tag = Tag.objects.get(id='Q7186')
education_tag = Tag.objects.get(id='Q11465')

elif_manti_offer, created = Service.objects.get_or_create(
    user=elif_user,
    title='Manti Cooking Lesson',
    defaults={
        'description': 'Learn to make traditional Turkish manti from scratch. We\'ll cover dough preparation, filling, folding techniques, and cooking methods. Perfect for beginners!',
        'type': 'Offer',
        'duration': Decimal('3.00'),
        'location_type': 'In-Person',
        'location_area': 'North London',
        'max_participants': 2,
        'schedule_type': 'One-Time',
        'schedule_details': 'Every Tuesday at 19:00',
        'status': 'Active',
    }
)
if created:
    elif_manti_offer.tags.set([cooking_tag])
    print(f"  Created Offer: {elif_manti_offer.title}")

elif_3d_want, created = Service.objects.get_or_create(
    user=elif_user,
    title='Help with 3D printer setup',
    defaults={
        'description': 'I just got a 3D printer but I\'m struggling with the initial setup and calibration. Looking for someone with experience to help me get started.',
        'type': 'Need',
        'duration': Decimal('1.00'),
        'location_type': 'In-Person',
        'location_area': 'North London',
        'max_participants': 1,
        'schedule_type': 'One-Time',
        'schedule_details': 'Flexible, weekends preferred',
        'status': 'Active',
    }
)
if created:
    elif_3d_want.tags.set([technology_tag])
    print(f"  Created Want: {elif_3d_want.title}")

cem_chess_want, created = Service.objects.get_or_create(
    user=cem,
    title='Looking for a casual chess partner',
    defaults={
        'description': 'Looking for someone to play casual chess with. I\'m still learning, so this would be a relaxed, friendly game. Maybe we can meet at a cafe or park.',
        'type': 'Need',
        'duration': Decimal('1.00'),
        'location_type': 'In-Person',
        'location_area': 'East London',
        'max_participants': 1,
        'schedule_type': 'Recurrent',
        'schedule_details': 'Weekends, flexible times',
        'status': 'Active',
    }
)
if created:
    cem_chess_want.tags.set([chess_tag])
    print(f"  Created Want: {cem_chess_want.title}")

cem_genealogy_offer, created = Service.objects.get_or_create(
    user=cem,
    title='Introduction to genealogical research',
    defaults={
        'description': 'I can help you get started with genealogical research. I\'ll show you how to use online databases, organize your findings, and trace your family tree. Perfect for beginners!',
        'type': 'Offer',
        'duration': Decimal('1.00'),
        'location_type': 'Online',
        'max_participants': 1,
        'schedule_type': 'One-Time',
        'schedule_details': 'Flexible scheduling',
        'status': 'Active',
    }
)
if created:
    cem_genealogy_offer.tags.set([education_tag])
    print(f"  Created Offer: {cem_genealogy_offer.title}")

print("Creating handshakes...")

handshake1, created = Handshake.objects.get_or_create(
    service=elif_manti_offer,
    requester=sarah,
    defaults={
        'status': 'pending',  # Pending for demo - Elif can accept
        'provisioned_hours': Decimal('0.00'),
        'provider_confirmed_complete': False,
        'receiver_confirmed_complete': False,
    }
)
if created:
    print(f"  Created handshake: Sarah -> Manti offer (pending)")

handshake2, created = Handshake.objects.get_or_create(
    service=elif_manti_offer,
    requester=marcus,
    defaults={
        'status': 'accepted',
        'provisioned_hours': Decimal('3.00'),
        'provider_confirmed_complete': True,  # Already completed for demo
        'receiver_confirmed_complete': True,
    }
)
if created:
    print(f"  Created handshake: Marcus -> Manti offer (accepted)")

chess_handshake, created = Handshake.objects.get_or_create(
    service=cem_chess_want,
    requester=alex,
    defaults={
        'status': 'completed',
        'provisioned_hours': Decimal('1.00'),
        'provider_confirmed_complete': True,
        'receiver_confirmed_complete': True,
    }
)
if created:
    print(f"  Created handshake: Alex -> chess want (completed)")

genealogy_handshake, created = Handshake.objects.get_or_create(
    service=cem_genealogy_offer,
    requester=alex,
    defaults={
        'status': 'completed',
        'provisioned_hours': Decimal('1.00'),
        'provider_confirmed_complete': True,
        'receiver_confirmed_complete': True,
    }
)
if created:
    print(f"  Created handshake: Alex -> genealogy offer (completed)")

print("Creating chat messages...")

ChatMessage.objects.filter(handshake=handshake2).delete()
manti_messages = [
    {
        'sender': marcus,
        'body': 'Hi Elif! I\'d love to learn how to make manti. Your offer sounds perfect!',
        'created_at': timezone.now() - timedelta(days=3),
    },
    {
        'sender': elif_user,
        'body': 'Hi Marcus! Great to hear you\'re interested. Tuesday at 7 PM works for you?',
        'created_at': timezone.now() - timedelta(days=3, hours=2),
    },
    {
        'sender': marcus,
        'body': 'Perfect! Looking forward to it!',
        'created_at': timezone.now() - timedelta(days=2),
    },
]

for msg_data in manti_messages:
    ChatMessage.objects.create(
        handshake=handshake2,
        sender=msg_data['sender'],
        body=msg_data['body'],
        created_at=msg_data['created_at'],
    )

ChatMessage.objects.filter(handshake=chess_handshake).delete()
chess_messages = [
    {
        'sender': alex,
        'body': 'Hi Cem! I saw your post about chess. I\'d be happy to play with you!',
        'created_at': timezone.now() - timedelta(days=5),
    },
    {
        'sender': cem,
        'body': 'That would be great! I\'m still learning, so I hope that\'s okay.',
        'created_at': timezone.now() - timedelta(days=5, hours=1),
    },
    {
        'sender': alex,
        'body': 'No problem at all! We can meet this weekend if that works for you.',
        'created_at': timezone.now() - timedelta(days=4),
    },
]

for msg_data in chess_messages:
    ChatMessage.objects.create(
        handshake=chess_handshake,
        sender=msg_data['sender'],
        body=msg_data['body'],
        created_at=msg_data['created_at'],
    )

print("  Created chat messages")

print("Creating notifications...")
Notification.objects.filter(user__in=[elif_user, cem, sarah, marcus, alex]).delete()

notifications = [
    {
        'user': elif_user,
        'type': 'handshake_request',
        'title': 'New Interest in Your Offer',
        'message': f'{sarah.first_name} {sarah.last_name} expressed interest in "Manti Cooking Lesson"',
        'related_handshake': handshake1,
        'related_service': elif_manti_offer,
        'is_read': False,
    },
    {
        'user': elif_user,
        'type': 'handshake_request',
        'title': 'New Interest in Your Offer',
        'message': f'{marcus.first_name} {marcus.last_name} expressed interest in "Manti Cooking Lesson"',
        'related_handshake': handshake2,
        'related_service': elif_manti_offer,
        'is_read': False,
    },
    {
        'user': cem,
        'type': 'handshake_request',
        'title': 'New Interest in Your Want',
        'message': f'{alex.first_name} {alex.last_name} expressed interest in "Looking for a casual chess partner"',
        'related_handshake': chess_handshake,
        'related_service': cem_chess_want,
        'is_read': True,
    },
]

for notif_data in notifications:
    Notification.objects.create(**notif_data)
print(f"  Created {len(notifications)} notifications")

print("Creating reputation data...")

ReputationRep.objects.filter(receiver=elif_user).delete()
reps_for_elif = [
    {'is_punctual': True, 'is_helpful': True, 'is_kind': True},
]

for rep_data in reps_for_elif:
    ReputationRep.objects.create(
        handshake=handshake2,
        giver=marcus,
        receiver=elif_user,
        **rep_data
    )

elif_user.karma_score = 15
elif_user.save()

print("Demo data created successfully!")
print(f"\nDemo Accounts:")
print(f"  Elif: elif@demo.com / demo123")
print(f"  Cem:  cem@demo.com / demo123")
print(f"  Sarah, Marcus, Alex: sarah@demo.com, marcus@demo.com, alex@demo.com / demo123")
