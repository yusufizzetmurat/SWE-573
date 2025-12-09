#!/usr/bin/env python
"""
Demo setup script for The Hive
Cleans up existing demo data and creates fresh demo users, services, interactions, and forum content
Run: docker compose run --rm backend python manage.py shell < backend/setup_demo.py
"""
import os
import django

if __name__ == "__main__":
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hive_project.settings')
    django.setup()

from api.models import (
    ChatMessage, Handshake, Notification, ReputationRep,
    Service, Tag, User, UserBadge, ForumCategory, ForumTopic, ForumPost
)
from api.badge_utils import check_and_assign_badges
from django.contrib.auth.hashers import make_password
from django.db.models import Q
from decimal import Decimal

print("=" * 60)
print("The Hive - Demo Data Setup")
print("=" * 60)

# ============================================================================
# STEP 1: CLEANUP
# ============================================================================
print("\n[1/5] Cleaning up existing demo data...")

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
    ForumPost.objects.filter(author_id__in=user_ids).delete()
    ForumTopic.objects.filter(author_id__in=user_ids).delete()
    demo_users.delete()

orphaned_handshakes = Handshake.objects.filter(service__isnull=True)
if orphaned_handshakes.exists():
    orphaned_handshakes.delete()

orphaned_messages = ChatMessage.objects.filter(handshake__isnull=True)
if orphaned_messages.exists():
    orphaned_messages.delete()

print("  Done")

print("  ✅ Cleanup complete")

# ============================================================================
# STEP 2: CREATE TAGS
# ============================================================================
print("\n[2/5] Creating tags...")

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

print(f"  ✅ Processed {len(tags_data)} tags ({created_count} created)")

# ============================================================================
# STEP 3: CREATE DEMO USERS
# ============================================================================
print("\n[3/5] Creating demo users...")

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
    print(f"  ✅ {'Created' if created else 'Updated'}: {email} (Balance: {balance}h)")
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

# ============================================================================
# STEP 4: CREATE SERVICES
# ============================================================================
print("\n[4/5] Creating services...")

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
print(f"  ✅ Created: {elif_manti.title}")

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
print(f"  ✅ Created: {elif_3d.title}")

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
print(f"  ✅ Created: {cem_chess.title}")

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
print(f"  ✅ Created: {cem_genealogy.title}")

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
print(f"  ✅ Created: {ayse_gardening.title}")

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
print(f"  ✅ Created: {marcus_turkish.title}")

# Multi-participant services for group chat testing
print("\n  Creating multi-participant services...")

group_cooking = Service.objects.create(
    user=elif_user,
    title='Group Turkish Cooking Class',
    description='Join a fun group cooking session! We\'ll make lahmacun and pide together. Perfect for beginners who want to learn in a social setting.',
    type='Offer',
    duration=Decimal('3.00'),
    location_type='In-Person',
    location_area='Besiktas',
    max_participants=4,
    schedule_type='One-Time',
    schedule_details='Saturday, December 14th at 15:00',
    status='Active',
)
group_cooking.tags.set([cooking_tag])
print(f"  ✅ Created: {group_cooking.title} (max 4 participants)")

community_garden = Service.objects.create(
    user=ayse,
    title='Community Garden Day',
    description='Let\'s work together on the community garden! We\'ll plant winter vegetables and share gardening tips. All skill levels welcome!',
    type='Offer',
    duration=Decimal('4.00'),
    location_type='In-Person',
    location_area='Uskudar',
    max_participants=5,
    schedule_type='One-Time',
    schedule_details='Sunday, December 15th at 10:00',
    status='Active',
)
community_garden.tags.set([gardening_tag])
print(f"  ✅ Created: {community_garden.title} (max 5 participants)")

chess_tournament = Service.objects.create(
    user=cem,
    title='Friendly Chess Mini-Tournament',
    description='Organizing a small, friendly chess tournament. All skill levels welcome - the goal is to have fun and meet fellow chess enthusiasts!',
    type='Offer',
    duration=Decimal('3.00'),
    location_type='In-Person',
    location_area='Kadikoy',
    max_participants=6,
    schedule_type='One-Time',
    schedule_details='Sunday, December 22nd at 14:00',
    status='Active',
)
chess_tournament.tags.set([chess_tag, education_tag])
print(f"  ✅ Created: {chess_tournament.title} (max 6 participants)")

print("\n  Assigning badges...")
for user in [elif_user, cem, marcus, sarah, alex, ayse]:
    check_and_assign_badges(user)
print("  ✅ Badges assigned")

# ============================================================================
# STEP 5: CREATE FORUM CONTENT
# ============================================================================
print("\n[5/5] Creating forum content...")

# Get forum categories (assumes seed_forum_categories has been run)
try:
    general_cat = ForumCategory.objects.get(slug='general-discussion')
    skills_cat = ForumCategory.objects.get(slug='skills-learning')
    
    # Create welcome topic
    welcome_topic = ForumTopic.objects.create(
        category=general_cat,
        author=ayse,
        title='Welcome to The Hive Community! 🐝',
        body='''Hello everyone and welcome to The Hive!

I'm so excited to see our community growing. This is a place where we can share skills, help each other, and build meaningful connections through the TimeBank system.

**What is TimeBank?**
TimeBank is a reciprocity-based economy where 1 hour of service equals 1 TimeBank hour, regardless of the type of service. This means everyone's time is valued equally!

**How to get started:**
1. Complete your profile with a bio and photo
2. Browse services to see what's available
3. Post your own offers or needs
4. Express interest in services that catch your eye
5. Build your reputation through successful exchanges

Feel free to introduce yourself in the Introductions forum and don't hesitate to ask questions here!

Happy exchanging! 🌟''',
        is_pinned=True
    )
    print(f"  ✅ Created topic: {welcome_topic.title}")
    
    # Add replies to welcome topic
    ForumPost.objects.create(
        topic=welcome_topic,
        author=sarah,
        body='''Thanks for the warm welcome! I just joined and I'm really excited to be part of this community.

I'm particularly interested in learning cooking from different cultures. Looking forward to connecting with everyone!'''
    )
    
    ForumPost.objects.create(
        topic=welcome_topic,
        author=marcus,
        body='''Great initiative! I've been looking for a community like this. The TimeBank concept makes so much sense - everyone has something valuable to offer.

I'm here to help with tech stuff and also hoping to improve my Turkish. 👋'''
    )
    print(f"    Added 2 replies to welcome topic")
    
    # Create introduction topic
    intro_topic = ForumTopic.objects.create(
        category=general_cat,
        author=elif_user,
        title='Hi! I\'m Elif - Your Friendly Neighborhood Cook 👩‍🍳',
        body='''Hello Hive community!

I'm Elif, a freelance designer based in Besiktas. Outside of work, my biggest passion is cooking - especially traditional Turkish cuisine.

**What I can offer:**
- Turkish cooking lessons (mantı, gözleme, pide)
- Recipe sharing and cooking tips
- Food styling advice for your Instagram-worthy dishes!

**What I'm looking for:**
- Help with technology (I just got a 3D printer and I'm clueless!)
- Language exchange partners

Looking forward to meeting you all through this amazing platform! 🌻'''
    )
    print(f"  ✅ Created topic: {intro_topic.title}")
    
    ForumPost.objects.create(
        topic=intro_topic,
        author=cem,
        body='''Welcome Elif! Your cooking offers sound amazing. I've been wanting to learn how to make proper mantı - my attempts have been... interesting 😅

I'd love to sign up for one of your lessons!'''
    )
    print(f"    Added 1 reply to introduction topic")
    
    # Create skills exchange discussion
    skills_topic = ForumTopic.objects.create(
        category=skills_cat,
        author=marcus,
        title='Tips for Successful TimeBank Exchanges',
        body='''Hey everyone!

After a few successful exchanges, I wanted to share some tips that have worked for me:

1. **Be clear about expectations** - When posting a service, be specific about what you're offering or need. Include skill level, duration, and any materials required.

2. **Communicate early** - Once someone expresses interest, respond quickly and discuss details like timing and location.

3. **Be punctual** - Everyone's time is valuable. Arrive on time and be respectful of the agreed duration.

4. **Leave feedback** - After a successful exchange, leave a verified review. It helps build trust in the community.

5. **Pay it forward** - Even if you're learning something, think about what you can offer in return!

What other tips do you have? Would love to hear from experienced members! 🤝'''
    )
    print(f"  ✅ Created topic: {skills_topic.title}")
    
    ForumPost.objects.create(
        topic=skills_topic,
        author=ayse,
        body='''These are great tips, Marcus!

I'd add: **Don't be afraid to start small.** My first exchange was just a 1-hour gardening session, and it helped me get comfortable with the process. Now I regularly do 3-4 hour workshops!

Also, taking photos during workshops (with permission) is nice for your portfolio and helps future participants know what to expect.'''
    )
    
    ForumPost.objects.create(
        topic=skills_topic,
        author=alex,
        body='''Really helpful thread! As someone new here, I appreciate the practical advice.

One question: How do you handle it if a session runs longer than expected? Do you just continue or is there a polite way to wrap up?'''
    )
    
    ForumPost.objects.create(
        topic=skills_topic,
        author=marcus,
        body='''@Alex - Great question! I usually mention at the start "We have about 2 hours today" and then give a 10-minute heads up before we need to wrap up.

If both people are having a great time and want to continue, you can always agree to extend it. Just be transparent about the time!'''
    )
    print(f"    Added 3 replies to skills topic")
    
    print("  ✅ Forum content created successfully!")
    
except ForumCategory.DoesNotExist:
    print("  Skipping forum content (run 'python manage.py seed_forum_categories' first)")

print("\n" + "=" * 60)
print("Demo setup complete!")
print("=" * 60)
print(f"\nSummary:")
print(f"  Users: {User.objects.filter(email__in=demo_emails).count()}")
print(f"  Services: {Service.objects.filter(user__email__in=demo_emails).count()}")
print(f"  Forum Topics: {ForumTopic.objects.filter(author__email__in=demo_emails).count()}")
print(f"  Forum Posts: {ForumPost.objects.filter(author__email__in=demo_emails).count()}")
print(f"\nDemo Accounts (password: demo123):")
for user in [elif_user, cem, sarah, marcus, alex, ayse]:
    print(f"  {user.first_name}: {user.email} (Balance: {user.timebank_balance}h)")
print("\n" + "=" * 60)
