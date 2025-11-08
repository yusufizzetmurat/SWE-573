#!/usr/bin/env python
"""
Demo setup script for The Hive
Cleans up existing demo data and creates fresh demo users, services, and interactions
Run: docker compose run --rm backend python manage.py shell < backend/setup_demo.py
"""

from api.models import (
    Badge, ChatMessage, Handshake, Notification, ReputationRep, Service, Tag, User, UserBadge
)
from api.badge_utils import assign_badge, check_and_assign_badges
from django.contrib.auth.hashers import make_password
from django.db.models import Q
from django.utils import timezone
from decimal import Decimal
from datetime import timedelta

print("=" * 60)
print("The Hive - Demo Data Setup")
print("=" * 60)

# ============================================================================
# STEP 1: CLEANUP
# ============================================================================
print("\n[1/4] Cleaning up existing demo data...")

demo_emails = [
    'elif@demo.com', 'cem@demo.com', 'sarah@demo.com',
    'marcus@demo.com', 'alex@demo.com', 'ayse@demo.com'
]

demo_users = User.objects.filter(email__in=demo_emails)
if demo_users.exists():
    print(f"  Removing data for {demo_users.count()} demo users...")
    user_ids = list(demo_users.values_list('id', flat=True))
    Service.objects.filter(user_id__in=user_ids).delete()
    Handshake.objects.filter(Q(requester_id__in=user_ids) | Q(service__user_id__in=user_ids)).delete()
    Notification.objects.filter(user_id__in=user_ids).delete()
    ReputationRep.objects.filter(Q(giver_id__in=user_ids) | Q(receiver_id__in=user_ids)).delete()
    UserBadge.objects.filter(user_id__in=user_ids).delete()
    demo_users.delete()

orphaned_handshakes = Handshake.objects.filter(service__isnull=True)
if orphaned_handshakes.exists():
    print(f"  Removing {orphaned_handshakes.count()} orphaned handshakes...")
    orphaned_handshakes.delete()

orphaned_messages = ChatMessage.objects.filter(handshake__isnull=True)
if orphaned_messages.exists():
    print(f"  Removing {orphaned_messages.count()} orphaned chat messages...")
    orphaned_messages.delete()

orphaned_notifications = Notification.objects.filter(
    related_service__isnull=True,
    related_handshake__isnull=True
).exclude(type__in=['system', 'welcome'])
if orphaned_notifications.exists():
    print(f"  Removing {orphaned_notifications.count()} orphaned notifications...")
    orphaned_notifications.delete()

print("  ✅ Cleanup complete")

# ============================================================================
# STEP 2: CREATE TAGS
# ============================================================================
print("\n[2/4] Creating tags...")

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
]

created_count = 0
for tag_data in tags_data:
    try:
        tag = Tag.objects.get(name=tag_data['name'])
    except Tag.DoesNotExist:
        try:
            tag = Tag.objects.get(id=tag_data['id'])
        except Tag.DoesNotExist:
            tag = Tag.objects.create(id=tag_data['id'], name=tag_data['name'])
            created_count += 1

print(f"  ✅ Processed {len(tags_data)} tags ({created_count} created)")

# ============================================================================
# STEP 3: CREATE DEMO USERS
# ============================================================================
print("\n[3/4] Creating demo users...")

elif_user, created = User.objects.get_or_create(
    email='elif@demo.com',
    defaults={
        'password': make_password('demo123'),
        'first_name': 'Elif',
        'last_name': 'Yılmaz',
        'bio': 'Freelance designer and cooking enthusiast. Love sharing traditional Turkish recipes and learning new skills from neighbors!',
        'timebank_balance': Decimal('5.00'),
        'karma_score': 20,
        'role': 'member',
    }
)
if not created:
    elif_user.timebank_balance = Decimal('5.00')
    elif_user.karma_score = 20
    elif_user.set_password('demo123')
    elif_user.save()
print(f"  ✅ {'Created' if created else 'Updated'}: {elif_user.email} (Balance: {elif_user.timebank_balance}h)")

cem, created = User.objects.get_or_create(
    email='cem@demo.com',
    defaults={
        'password': make_password('demo123'),
        'first_name': 'Cem',
        'last_name': 'Demir',
        'bio': 'University student passionate about chess and genealogy. Always happy to teach beginners!',
        'timebank_balance': Decimal('2.00'),
        'karma_score': 8,
        'role': 'member',
    }
)
if not created:
    cem.timebank_balance = Decimal('2.00')
    cem.karma_score = 8
    cem.set_password('demo123')
    cem.save()
print(f"  ✅ {'Created' if created else 'Updated'}: {cem.email} (Balance: {cem.timebank_balance}h)")

sarah, created = User.objects.get_or_create(
    email='sarah@demo.com',
    defaults={
        'password': make_password('demo123'),
        'first_name': 'Sarah',
        'last_name': 'Chen',
        'bio': 'Food enthusiast exploring Turkish cuisine. Excited to learn and share cooking skills!',
        'timebank_balance': Decimal('1.00'),
        'karma_score': 5,
        'role': 'member',
    }
)
if not created:
    sarah.timebank_balance = Decimal('1.00')
    sarah.karma_score = 5
    sarah.set_password('demo123')
    sarah.save()
print(f"  ✅ {'Created' if created else 'Updated'}: {sarah.email} (Balance: {sarah.timebank_balance}h)")

marcus, created = User.objects.get_or_create(
    email='marcus@demo.com',
    defaults={
        'password': make_password('demo123'),
        'first_name': 'Marcus',
        'last_name': 'Weber',
        'bio': 'Tech professional and language learner. Enjoy helping others with technology and learning Turkish.',
        'timebank_balance': Decimal('3.00'),
        'karma_score': 12,
        'role': 'member',
    }
)
if not created:
    marcus.timebank_balance = Decimal('3.00')
    marcus.karma_score = 12
    marcus.set_password('demo123')
    marcus.save()
print(f"  ✅ {'Created' if created else 'Updated'}: {marcus.email} (Balance: {marcus.timebank_balance}h)")

alex, created = User.objects.get_or_create(
    email='alex@demo.com',
    defaults={
        'password': make_password('demo123'),
        'first_name': 'Alex',
        'last_name': 'Johnson',
        'bio': 'Chess player and genealogy researcher. Love connecting with people through shared interests!',
        'timebank_balance': Decimal('1.00'),
        'karma_score': 6,
        'role': 'member',
    }
)
if not created:
    alex.timebank_balance = Decimal('1.00')
    alex.karma_score = 6
    alex.set_password('demo123')
    alex.save()
print(f"  ✅ {'Created' if created else 'Updated'}: {alex.email} (Balance: {alex.timebank_balance}h)")

ayse, created = User.objects.get_or_create(
    email='ayse@demo.com',
    defaults={
        'password': make_password('demo123'),
        'first_name': 'Ayşe',
        'last_name': 'Kaya',
        'bio': 'Gardening enthusiast and community organizer. Passionate about sustainable living and sharing knowledge.',
        'timebank_balance': Decimal('4.00'),
        'karma_score': 15,
        'role': 'member',
    }
)
if not created:
    ayse.timebank_balance = Decimal('4.00')
    ayse.karma_score = 15
    ayse.set_password('demo123')
    ayse.save()
print(f"  ✅ {'Created' if created else 'Updated'}: {ayse.email} (Balance: {ayse.timebank_balance}h)")

# ============================================================================
# STEP 4: CREATE SERVICES, HANDSHAKES, AND INTERACTIONS
# ============================================================================
print("\n[4/4] Creating services and interactions...")

def get_tag_by_id_or_name(tag_id, tag_name):
    try:
        return Tag.objects.get(id=tag_id)
    except Tag.DoesNotExist:
        return Tag.objects.get(name=tag_name)

cooking_tag = get_tag_by_id_or_name('Q8476', 'Cooking')
music_tag = get_tag_by_id_or_name('Q11424', 'Music')
chess_tag = get_tag_by_id_or_name('Q7186', 'Chess')
education_tag = get_tag_by_id_or_name('Q11465', 'Education')
technology_tag = get_tag_by_id_or_name('Q11466', 'Technology')
gardening_tag = get_tag_by_id_or_name('Q11467', 'Gardening')
language_tag = get_tag_by_id_or_name('Q2013', 'Language')

# Elif's Manti Cooking Offer
elif_manti = Service.objects.create(
    user=elif_user,
    title='Manti Cooking Lesson',
    description='Learn to make traditional Turkish manti from scratch. We\'ll cover dough preparation, filling, folding techniques, and cooking methods. Perfect for beginners!',
    type='Offer',
    duration=Decimal('3.00'),
    location_type='In-Person',
    location_area='Beşiktaş',
    max_participants=2,
    schedule_type='Recurrent',
    schedule_details='Every Tuesday at 19:00',
    status='Active',
)
elif_manti.tags.set([cooking_tag])
print(f"  ✅ Created: {elif_manti.title} by {elif_user.first_name}")

# Elif's 3D Printing Need
elif_3d = Service.objects.create(
    user=elif_user,
    title='Help with 3D Printer Setup',
    description='I just got a 3D printer but struggling with initial setup and calibration. Looking for someone with experience to help me get started.',
    type='Need',
    duration=Decimal('2.00'),
    location_type='In-Person',
    location_area='Beşiktaş',
    max_participants=1,
    schedule_type='One-Time',
    schedule_details='This Saturday at 14:00',
    status='Active',
)
elif_3d.tags.set([technology_tag])
print(f"  ✅ Created: {elif_3d.title} by {elif_user.first_name}")

# Cem's Chess Need
cem_chess = Service.objects.create(
    user=cem,
    title='Looking for a Casual Chess Partner',
    description='Looking for someone to play casual chess with. I\'m still learning, so this would be relaxed and friendly. Maybe we can meet at a cafe or park.',
    type='Need',
    duration=Decimal('1.00'),
    location_type='In-Person',
    location_area='Kadıköy',
    max_participants=1,
    schedule_type='Recurrent',
    schedule_details='Every Sunday at 15:00',
    status='Active',
)
cem_chess.tags.set([chess_tag])
print(f"  ✅ Created: {cem_chess.title} by {cem.first_name}")

# Cem's Genealogy Offer
cem_genealogy = Service.objects.create(
    user=cem,
    title='Introduction to Genealogical Research',
    description='I can help you get started with genealogical research. I\'ll show you how to use online databases, organize your findings, and trace your family tree. Perfect for beginners!',
    type='Offer',
    duration=Decimal('1.50'),
    location_type='Online',
    max_participants=1,
    schedule_type='One-Time',
    schedule_details='Flexible scheduling',
    status='Active',
)
cem_genealogy.tags.set([education_tag])
print(f"  ✅ Created: {cem_genealogy.title} by {cem.first_name}")

# Ayşe's Gardening Offer
ayse_gardening = Service.objects.create(
    user=ayse,
    title='Urban Gardening Workshop',
    description='Learn how to grow vegetables and herbs in small spaces. We\'ll cover container gardening, soil preparation, and basic plant care. Great for apartment dwellers!',
    type='Offer',
    duration=Decimal('2.00'),
    location_type='In-Person',
    location_area='Üsküdar',
    max_participants=3,
    schedule_type='One-Time',
    schedule_details='Next Saturday at 10:00',
    status='Active',
)
ayse_gardening.tags.set([gardening_tag])
print(f"  ✅ Created: {ayse_gardening.title} by {ayse.first_name}")

# Marcus's Turkish Language Need
marcus_turkish = Service.objects.create(
    user=marcus,
    title='Turkish Conversation Practice',
    description='Looking for a patient Turkish speaker to practice conversation with. I\'m at intermediate level and want to improve my speaking skills.',
    type='Need',
    duration=Decimal('1.00'),
    location_type='Online',
    max_participants=1,
    schedule_type='Recurrent',
    schedule_details='Every Wednesday at 20:00',
    status='Active',
)
marcus_turkish.tags.set([language_tag])
print(f"  ✅ Created: {marcus_turkish.title} by {marcus.first_name}")

# Create handshakes
print("\n  Creating handshakes...")

# Sarah expresses interest in Manti (pending)
handshake1 = Handshake.objects.create(
    service=elif_manti,
    requester=sarah,
    status='pending',
    provisioned_hours=Decimal('0.00'),
    provider_confirmed_complete=False,
    receiver_confirmed_complete=False,
)
print(f"  ✅ {sarah.first_name} → {elif_manti.title} (pending)")

# Marcus completes Manti service (completed)
handshake2 = Handshake.objects.create(
    service=elif_manti,
    requester=marcus,
    status='completed',
    provisioned_hours=Decimal('3.00'),
    provider_confirmed_complete=True,
    receiver_confirmed_complete=True,
    scheduled_time=timezone.now() - timedelta(days=5),
)
print(f"  ✅ {marcus.first_name} → {elif_manti.title} (completed)")

# Alex completes Chess service (completed)
handshake3 = Handshake.objects.create(
    service=cem_chess,
    requester=alex,
    status='completed',
    provisioned_hours=Decimal('1.00'),
    provider_confirmed_complete=True,
    receiver_confirmed_complete=True,
    scheduled_time=timezone.now() - timedelta(days=7),
)
print(f"  ✅ {alex.first_name} → {cem_chess.title} (completed)")

# Alex completes Genealogy service (completed)
handshake4 = Handshake.objects.create(
    service=cem_genealogy,
    requester=alex,
    status='completed',
    provisioned_hours=Decimal('1.50'),
    provider_confirmed_complete=True,
    receiver_confirmed_complete=True,
    scheduled_time=timezone.now() - timedelta(days=10),
)
print(f"  ✅ {alex.first_name} → {cem_genealogy.title} (completed)")

# Create chat messages
print("\n  Creating chat messages...")

ChatMessage.objects.create(
    handshake=handshake2,
    sender=marcus,
    body='Hi Elif! I\'d love to learn how to make manti. Your offer sounds perfect!',
    created_at=timezone.now() - timedelta(days=6),
)
ChatMessage.objects.create(
    handshake=handshake2,
    sender=elif_user,
    body='Hi Marcus! Great to hear you\'re interested. Tuesday at 7 PM works for you?',
    created_at=timezone.now() - timedelta(days=6, hours=2),
)
ChatMessage.objects.create(
    handshake=handshake2,
    sender=marcus,
    body='Perfect! Looking forward to it!',
    created_at=timezone.now() - timedelta(days=5),
)

ChatMessage.objects.create(
    handshake=handshake3,
    sender=alex,
    body='Hi Cem! I saw your post about chess. I\'d be happy to play with you!',
    created_at=timezone.now() - timedelta(days=8),
)
ChatMessage.objects.create(
    handshake=handshake3,
    sender=cem,
    body='That would be great! I\'m still learning, so I hope that\'s okay.',
    created_at=timezone.now() - timedelta(days=8, hours=1),
)

print(f"  ✅ Created chat messages")

# Create reputation data
print("\n  Creating reputation data...")

ReputationRep.objects.create(
    handshake=handshake2,
    giver=marcus,
    receiver=elif_user,
    is_punctual=True,
    is_helpful=True,
    is_kind=True,
)

ReputationRep.objects.create(
    handshake=handshake3,
    giver=alex,
    receiver=cem,
    is_punctual=True,
    is_helpful=True,
    is_kind=False,
)

ReputationRep.objects.create(
    handshake=handshake4,
    giver=alex,
    receiver=cem,
    is_punctual=True,
    is_helpful=True,
    is_kind=True,
)

print(f"  ✅ Created reputation records")

# Assign badges based on stats
print("\n  Assigning badges...")
check_and_assign_badges(elif_user)
check_and_assign_badges(cem)
check_and_assign_badges(marcus)
print(f"  ✅ Badges assigned")

# Create notifications
print("\n  Creating notifications...")

Notification.objects.create(
    user=elif_user,
    type='handshake_request',
    title='New Interest in Your Offer',
    message=f'{sarah.first_name} {sarah.last_name} expressed interest in "Manti Cooking Lesson"',
    related_handshake=handshake1,
    related_service=elif_manti,
    is_read=False,
)

Notification.objects.create(
    user=cem,
    type='handshake_accepted',
    title='Handshake Accepted',
    message=f'{alex.first_name} {alex.last_name} accepted your chess partner request',
    related_handshake=handshake3,
    related_service=cem_chess,
    is_read=True,
)

print(f"  ✅ Created notifications")

# ============================================================================
# SUMMARY
# ============================================================================
print("\n" + "=" * 60)
print("✅ Demo setup complete!")
print("=" * 60)
print(f"\n📊 Summary:")
print(f"  Users: {User.objects.filter(email__in=demo_emails).count()}")
print(f"  Services: {Service.objects.filter(user__email__in=demo_emails).count()}")
print(f"  Handshakes: {Handshake.objects.filter(Q(requester__email__in=demo_emails) | Q(service__user__email__in=demo_emails)).count()}")
print(f"\n🔑 Demo Accounts (password: demo123):")
print(f"  • Elif: elif@demo.com (Balance: {elif_user.timebank_balance}h)")
print(f"  • Cem: cem@demo.com (Balance: {cem.timebank_balance}h)")
print(f"  • Sarah: sarah@demo.com (Balance: {sarah.timebank_balance}h)")
print(f"  • Marcus: marcus@demo.com (Balance: {marcus.timebank_balance}h)")
print(f"  • Alex: alex@demo.com (Balance: {alex.timebank_balance}h)")
print(f"  • Ayşe: ayse@demo.com (Balance: {ayse.timebank_balance}h)")
print("\n" + "=" * 60)

