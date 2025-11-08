#!/usr/bin/env python
"""
Database cleanup script
Removes duplicate services and ensures data integrity
"""
from api.models import Service, Handshake, ChatMessage, Notification, ReputationRep, UserBadge, User
from django.db.models import Count
from collections import defaultdict

print("Starting database cleanup...")

# Find duplicate services (same user, title, and schedule_type)
print("\n1. Checking for duplicate services...")
duplicates = defaultdict(list)
services = Service.objects.all().order_by('created_at')

for service in services:
    key = (service.user_id, service.title, service.schedule_type)
    duplicates[key].append(service)

duplicate_count = 0
for key, service_list in duplicates.items():
    if len(service_list) > 1:
        duplicate_count += len(service_list) - 1
        print(f"  Found {len(service_list)} duplicates for: {service_list[0].title} by {service_list[0].user.email}")
        # Keep the oldest one, delete the rest
        for service in service_list[1:]:
            # Check if service has active handshakes
            active_handshakes = Handshake.objects.filter(
                service=service,
                status__in=['pending', 'accepted']
            ).count()
            
            if active_handshakes > 0:
                print(f"    Skipping {service.id} - has {active_handshakes} active handshake(s)")
            else:
                print(f"    Deleting duplicate: {service.id} (created: {service.created_at})")
                service.delete()

print(f"\n  Removed {duplicate_count} duplicate services")

# Clean up orphaned data
print("\n2. Cleaning up orphaned data...")

# Remove handshakes for deleted services
orphaned_handshakes = Handshake.objects.filter(service__isnull=True)
if orphaned_handshakes.exists():
    count = orphaned_handshakes.count()
    orphaned_handshakes.delete()
    print(f"  Removed {count} orphaned handshakes")

# Remove chat messages for deleted handshakes
orphaned_messages = ChatMessage.objects.filter(handshake__isnull=True)
if orphaned_messages.exists():
    count = orphaned_messages.count()
    orphaned_messages.delete()
    print(f"  Removed {count} orphaned chat messages")

# Remove notifications for deleted services/handshakes
orphaned_notifications = Notification.objects.filter(
    related_service__isnull=True,
    related_handshake__isnull=True
).exclude(type__in=['system', 'welcome'])
if orphaned_notifications.exists():
    count = orphaned_notifications.count()
    orphaned_notifications.delete()
    print(f"  Removed {count} orphaned notifications")

# Remove reputation reps for deleted handshakes
orphaned_reps = ReputationRep.objects.filter(handshake__isnull=True)
if orphaned_reps.exists():
    count = orphaned_reps.count()
    orphaned_reps.delete()
    print(f"  Removed {count} orphaned reputation reps")

# Ensure unique constraint on services (user + title + schedule_type for recurrent)
print("\n3. Ensuring data integrity...")

# Mark duplicate recurrent services as completed if they have the same details
recurrent_services = Service.objects.filter(schedule_type='Recurrent', status='Active')
recurrent_groups = defaultdict(list)

for service in recurrent_services:
    key = (service.user_id, service.title, service.schedule_details)
    recurrent_groups[key].append(service)

fixed_count = 0
for key, service_list in recurrent_groups.items():
    if len(service_list) > 1:
        print(f"  Found {len(service_list)} recurrent services with same details: {service_list[0].title}")
        # Keep the first one active, mark others as completed
        for service in service_list[1:]:
            if service.status == 'Active':
                service.status = 'Completed'
                service.save()
                fixed_count += 1
                print(f"    Marked {service.id} as Completed")

print(f"\n  Fixed {fixed_count} duplicate recurrent services")

# Summary
print("\n" + "="*60)
print("✅ Database cleanup completed!")
print("="*60)
print(f"\nActive services: {Service.objects.filter(status='Active').count()}")
print(f"Total services: {Service.objects.count()}")
print(f"Active handshakes: {Handshake.objects.filter(status__in=['pending', 'accepted']).count()}")
print(f"Total users: {User.objects.count()}")

