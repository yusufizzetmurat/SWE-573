#!/usr/bin/env python
"""
Demo setup script for The Hive
Creates demo users, services, and sample interactions
"""
import os
import django

if __name__ == "__main__":
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hive_project.settings')
    django.setup()

from api.models import (
    ChatMessage, Handshake, Notification, ReputationRep,
    Service, Tag, User, UserBadge
)
from api.badge_utils import check_and_assign_badges
from django.contrib.auth.hashers import make_password
from django.db.models import Q
from decimal import Decimal

print("=" * 60)
print("The Hive - Demo Data Setup")
print("=" * 60)

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
    orphaned_handshakes.delete()

orphaned_messages = ChatMessage.objects.filter(handshake__isnull=True)
if orphaned_messages.exists():
    orphaned_messages.delete()

print("  Done")

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
        Tag.objects.get(name=tag_data['name'])
    except Tag.DoesNotExist:
        try:
            Tag.objects.get(id=tag_data['id'])
        except Tag.DoesNotExist:
            Tag.objects.create(id=tag_data['id'], name=tag_data['name'])
            created_count += 1

print(f"  Processed {len(tags_data)} tags ({created_count} created)")

print("\n[3/4] Creating demo users...")

def create_or_update_user(email, first_name, last_name, bio, balance, karma):
    user, created = User.objects.get_or_create(
        email=email,
        defaults={
            'password': make_password('demo123'),
            'first_name': first_name,
            'last_name': last_name,
            'bio': bio,
            'timebank_balance': balance,
            'karma_score': karma,
            'role': 'member',
        }
    )
    if not created:
        user.timebank_balance = balance
        user.karma_score = karma
        user.set_password('demo123')
        user.save()
    print(f"  {'Created' if created else 'Updated'}: {email} (Balance: {balance}h)")
    return user

elif_user = create_or_update_user(
    'elif@demo.com', 'Elif', 'Yilmaz',
    'Freelance designer and cooking enthusiast. Love sharing traditional Turkish recipes!',
    Decimal('5.00'), 20
)

cem = create_or_update_user(
    'cem@demo.com', 'Cem', 'Demir',
    'University student passionate about chess and genealogy. Always happy to teach beginners!',
    Decimal('2.00'), 8
)

sarah = create_or_update_user(
    'sarah@demo.com', 'Sarah', 'Chen',
    'Food enthusiast exploring Turkish cuisine. Excited to learn and share cooking skills!',
    Decimal('1.00'), 5
)

marcus = create_or_update_user(
    'marcus@demo.com', 'Marcus', 'Weber',
    'Tech professional and language learner. Enjoy helping others with technology.',
    Decimal('3.00'), 12
)

alex = create_or_update_user(
    'alex@demo.com', 'Alex', 'Johnson',
    'Chess player and genealogy researcher. Love connecting with people through shared interests!',
    Decimal('1.00'), 6
)

ayse = create_or_update_user(
    'ayse@demo.com', 'Ayse', 'Kaya',
    'Gardening enthusiast and community organizer. Passionate about sustainable living.',
    Decimal('4.00'), 15
)

print("\n[4/4] Creating services...")

def get_tag(tag_id, tag_name):
    try:
        return Tag.objects.get(id=tag_id)
    except Tag.DoesNotExist:
        return Tag.objects.get(name=tag_name)

cooking_tag = get_tag('Q8476', 'Cooking')
chess_tag = get_tag('Q7186', 'Chess')
education_tag = get_tag('Q11465', 'Education')
technology_tag = get_tag('Q11466', 'Technology')
gardening_tag = get_tag('Q11467', 'Gardening')
language_tag = get_tag('Q2013', 'Language')

elif_manti = Service.objects.create(
    user=elif_user,
    title='Manti Cooking Lesson',
    description='Learn to make traditional Turkish manti from scratch. We\'ll cover dough preparation, filling, folding techniques, and cooking methods.',
    type='Offer',
    duration=Decimal('3.00'),
    location_type='In-Person',
    location_area='Besiktas',
    location_lat=Decimal('41.0422'),
    location_lng=Decimal('29.0089'),
    max_participants=2,
    schedule_type='Recurrent',
    schedule_details='Every Tuesday at 19:00',
    status='Active',
)
elif_manti.tags.set([cooking_tag])
print(f"  Created: {elif_manti.title}")

elif_3d = Service.objects.create(
    user=elif_user,
    title='Help with 3D Printer Setup',
    description='I just got a 3D printer but struggling with initial setup. Looking for someone with experience to help me get started.',
    type='Need',
    duration=Decimal('2.00'),
    location_type='In-Person',
    location_area='Besiktas',
    location_lat=Decimal('41.0422'),
    location_lng=Decimal('29.0089'),
    max_participants=1,
    schedule_type='One-Time',
    schedule_details='This Saturday at 14:00',
    status='Active',
)
elif_3d.tags.set([technology_tag])
print(f"  Created: {elif_3d.title}")

cem_chess = Service.objects.create(
    user=cem,
    title='Looking for a Casual Chess Partner',
    description='Looking for someone to play casual chess with. I\'m still learning, so this would be relaxed and friendly.',
    type='Need',
    duration=Decimal('1.00'),
    location_type='In-Person',
    location_area='Kadikoy',
    location_lat=Decimal('40.9819'),
    location_lng=Decimal('29.0244'),
    max_participants=1,
    schedule_type='Recurrent',
    schedule_details='Every Sunday at 15:00',
    status='Active',
)
cem_chess.tags.set([chess_tag])
print(f"  Created: {cem_chess.title}")

cem_genealogy = Service.objects.create(
    user=cem,
    title='Introduction to Genealogical Research',
    description='I can help you get started with genealogical research. I\'ll show you how to use online databases and trace your family tree.',
    type='Offer',
    duration=Decimal('1.50'),
    location_type='Online',
    max_participants=1,
    schedule_type='One-Time',
    schedule_details='Flexible scheduling',
    status='Active',
)
cem_genealogy.tags.set([education_tag])
print(f"  Created: {cem_genealogy.title}")

ayse_gardening = Service.objects.create(
    user=ayse,
    title='Urban Gardening Workshop',
    description='Learn how to grow vegetables and herbs in small spaces. We\'ll cover container gardening, soil preparation, and basic plant care.',
    type='Offer',
    duration=Decimal('2.00'),
    location_type='In-Person',
    location_area='Uskudar',
    location_lat=Decimal('41.0214'),
    location_lng=Decimal('29.0125'),
    max_participants=3,
    schedule_type='One-Time',
    schedule_details='Next Saturday at 10:00',
    status='Active',
)
ayse_gardening.tags.set([gardening_tag])
print(f"  Created: {ayse_gardening.title}")

marcus_turkish = Service.objects.create(
    user=marcus,
    title='Turkish Conversation Practice',
    description='Looking for a patient Turkish speaker to practice conversation with. I\'m at intermediate level.',
    type='Need',
    duration=Decimal('1.00'),
    location_type='Online',
    max_participants=1,
    schedule_type='Recurrent',
    schedule_details='Every Wednesday at 20:00',
    status='Active',
)
marcus_turkish.tags.set([language_tag])
print(f"  Created: {marcus_turkish.title}")

print("\n  Assigning badges...")
for user in [elif_user, cem, marcus, sarah, alex, ayse]:
    check_and_assign_badges(user)
print("  Done")

print("\n[5/5] Creating admin account...")
admin_email = 'moderator@demo.com'
admin_password = 'demo123'

# Delete existing admin if exists
existing_admin = User.objects.filter(email=admin_email).first()
if existing_admin:
    existing_admin.delete()
    print(f"  Removed existing admin account")

# Create new admin account
admin_user = User.objects.create_superuser(
    email=admin_email,
    password=admin_password,
    first_name='Moderator',
    last_name='Admin',
    bio='Platform moderator and administrator',
    timebank_balance=Decimal('10.00'),
    karma_score=100,
    role='admin',
    is_staff=True,
    is_superuser=True
)
print(f"  Created: {admin_email} (Admin account)")
print("  Done")

print("\n" + "=" * 60)
print("Demo setup complete!")
print("=" * 60)
print(f"\nSummary:")
print(f"  Users: {User.objects.filter(email__in=demo_emails).count()}")
print(f"  Services: {Service.objects.filter(user__email__in=demo_emails).count()}")
print(f"\nDemo Accounts (password: demo123):")
print(f"  Admin:   {admin_email} / {admin_password}")
for user in [elif_user, cem, sarah, marcus, alex, ayse]:
    print(f"  {user.first_name}: {user.email} (Balance: {user.timebank_balance}h)")
print("\n" + "=" * 60)
