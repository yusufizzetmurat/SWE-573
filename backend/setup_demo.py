#!/usr/bin/env python
"""
Demo setup script for The Hive
Creates demo users, services, forum content, and sample interactions
"""
import os
import sys
import django

if __name__ == "__main__":
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hive_project.settings')
    django.setup()

from api.models import (
    Badge, ChatMessage, Handshake, Notification, ReputationRep, 
    Service, Tag, User, UserBadge, Comment,
    ForumCategory, ForumTopic, ForumPost
)
from api.badge_utils import check_and_assign_badges
from django.contrib.auth.hashers import make_password
from django.db.models import Q
from django.utils import timezone
from decimal import Decimal
from datetime import timedelta

print("=" * 60)
print("The Hive - Demo Data Setup")
print("=" * 60)

print("\n[1/6] Cleaning up existing demo data...")

demo_emails = [
    'elif@demo.com', 'cem@demo.com', 'sarah@demo.com',
    'marcus@demo.com', 'alex@demo.com', 'ayse@demo.com'
]

demo_users = User.objects.filter(email__in=demo_emails)
if demo_users.exists():
    print(f"  Removing data for {demo_users.count()} demo users...")
    user_ids = list(demo_users.values_list('id', flat=True))
    Comment.objects.filter(user_id__in=user_ids).delete()
    ForumPost.objects.filter(author_id__in=user_ids).delete()
    ForumTopic.objects.filter(author_id__in=user_ids).delete()
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

print("\n[2/6] Creating tags...")

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

print("\n[3/6] Creating demo users...")

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

print("\n[4/6] Creating services...")

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

print("\n[5/6] Creating service comments...")

Comment.objects.create(
    service=elif_manti,
    user=sarah,
    body='This sounds amazing! I\'ve always wanted to learn how to make manti. Is this suitable for complete beginners?'
)
Comment.objects.create(
    service=elif_manti,
    user=elif_user,
    body='Yes, absolutely! I\'ll guide you through every step. We start from scratch with the dough.',
    parent=Comment.objects.filter(service=elif_manti, user=sarah).first()
)
Comment.objects.create(
    service=elif_manti,
    user=marcus,
    body='I attended one of Elif\'s sessions last month. Highly recommended - the manti was delicious!'
)

Comment.objects.create(
    service=ayse_gardening,
    user=cem,
    body='Do I need to bring any tools or supplies for the workshop?'
)
Comment.objects.create(
    service=ayse_gardening,
    user=ayse,
    body='I\'ll provide everything you need! Just bring yourself and enthusiasm for learning.',
    parent=Comment.objects.filter(service=ayse_gardening, user=cem).first()
)

Comment.objects.create(
    service=cem_genealogy,
    user=alex,
    body='This is exactly what I\'ve been looking for! I\'ve hit a wall with my family research.'
)

Comment.objects.create(
    service=marcus_turkish,
    user=elif_user,
    body='I\'d be happy to help with Turkish practice! I\'m a native speaker.'
)

print("  Created 7 comments on services")

print("\n[6/6] Creating forum content...")

try:
    general_cat = ForumCategory.objects.get(slug='general-discussion')
    collab_cat = ForumCategory.objects.get(slug='project-collaboration')
    stories_cat = ForumCategory.objects.get(slug='storytelling-circle')
    skills_cat = ForumCategory.objects.get(slug='skills-learning')

    welcome_topic = ForumTopic.objects.create(
        category=general_cat,
        author=ayse,
        title='Welcome to The Hive Community!',
        body='Hello everyone! Welcome to The Hive, our community timebank platform. This is a place where we share skills, help each other, and build meaningful connections. Feel free to introduce yourself and let us know what skills you can offer or what you\'d like to learn!',
        is_pinned=True
    )
    ForumPost.objects.create(
        topic=welcome_topic,
        author=elif_user,
        body='Thanks for the warm welcome! I\'m Elif, and I love teaching traditional Turkish cooking. Looking forward to meeting everyone!'
    )
    ForumPost.objects.create(
        topic=welcome_topic,
        author=marcus,
        body='Great to be here! I\'m Marcus, a tech professional looking to learn Turkish while helping others with technology.'
    )

    garden_topic = ForumTopic.objects.create(
        category=collab_cat,
        author=ayse,
        title='Community Garden Project - Looking for Partners',
        body='I\'m thinking of starting a small community garden in Uskudar. Would anyone be interested in collaborating? We could share knowledge, seeds, and the harvest! Looking for 3-4 people to get started.'
    )
    ForumPost.objects.create(
        topic=garden_topic,
        author=sarah,
        body='This sounds wonderful! I\'d love to be part of this. I don\'t have much experience but I\'m eager to learn.'
    )

    story_topic = ForumTopic.objects.create(
        category=stories_cat,
        author=cem,
        title='My First TimeBank Exchange - A Great Experience!',
        body='Just wanted to share my first timebank experience. I helped Alex with some genealogical research last week, and it was so rewarding! Not only did I earn hours, but I also made a new friend who shares my passion for history. This platform is amazing!'
    )
    ForumPost.objects.create(
        topic=story_topic,
        author=alex,
        body='Cem was incredibly helpful! He showed me databases I didn\'t even know existed. Can\'t wait for our next session!'
    )

    tips_topic = ForumTopic.objects.create(
        category=skills_cat,
        author=marcus,
        title='Tips for Getting Started with TimeBank',
        body='Here are some tips I\'ve learned:\n\n1. Start by offering what you\'re comfortable with\n2. Be clear about your availability\n3. Don\'t be afraid to reach out to others\n4. Communication is key - be responsive\n\nWhat tips would you add?'
    )
    ForumPost.objects.create(
        topic=tips_topic,
        author=elif_user,
        body='Great tips! I\'d add: take photos of your work to build trust, and always follow through on your commitments.'
    )
    ForumPost.objects.create(
        topic=tips_topic,
        author=ayse,
        body='I agree! Also, don\'t underestimate "simple" skills - everyone has something valuable to offer.'
    )

    print("  Created 4 forum topics with 7 replies")

except ForumCategory.DoesNotExist:
    print("  Warning: Forum categories not found. Run 'python manage.py seed_forum_categories' first.")

print("\n  Assigning badges...")
for user in [elif_user, cem, marcus, sarah, alex, ayse]:
    check_and_assign_badges(user)
print("  Done")

print("\n" + "=" * 60)
print("Demo setup complete!")
print("=" * 60)
print(f"\nSummary:")
print(f"  Users: {User.objects.filter(email__in=demo_emails).count()}")
print(f"  Services: {Service.objects.filter(user__email__in=demo_emails).count()}")
print(f"  Comments: {Comment.objects.filter(user__email__in=demo_emails).count()}")
print(f"  Forum Topics: {ForumTopic.objects.filter(author__email__in=demo_emails).count()}")
print(f"\nDemo Accounts (password: demo123):")
for user in [elif_user, cem, sarah, marcus, alex, ayse]:
    print(f"  {user.first_name}: {user.email} (Balance: {user.timebank_balance}h)")
print("\n" + "=" * 60)
