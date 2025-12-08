"""
Management command to seed default forum categories.

Usage:
    python manage.py seed_forum_categories
"""
from django.core.management.base import BaseCommand
from api.models import ForumCategory


DEFAULT_CATEGORIES = [
    {
        'name': 'General Discussion',
        'slug': 'general-discussion',
        'description': 'General community chat, introductions, and announcements',
        'icon': 'message-square',
        'color': 'blue',
        'display_order': 1,
    },
    {
        'name': 'Project Collaboration',
        'slug': 'project-collaboration',
        'description': 'Find partners for larger projects and collaborative initiatives',
        'icon': 'users',
        'color': 'green',
        'display_order': 2,
    },
    {
        'name': 'Storytelling Circle',
        'slug': 'storytelling-circle',
        'description': 'Share experiences, success stories, and lessons learned',
        'icon': 'book-open',
        'color': 'purple',
        'display_order': 3,
    },
    {
        'name': 'Skills & Learning',
        'slug': 'skills-learning',
        'description': 'Ask questions, share knowledge, and discuss learning opportunities',
        'icon': 'lightbulb',
        'color': 'amber',
        'display_order': 4,
    },
    {
        'name': 'Community Events',
        'slug': 'community-events',
        'description': 'Organize meetups, workshops, and community gatherings',
        'icon': 'calendar',
        'color': 'orange',
        'display_order': 5,
    },
    {
        'name': 'Feedback & Suggestions',
        'slug': 'feedback-suggestions',
        'description': 'Help improve The Hive with your ideas and feedback',
        'icon': 'message-circle',
        'color': 'pink',
        'display_order': 6,
    },
]


class Command(BaseCommand):
    help = 'Seeds the database with default forum categories'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force creation even if categories already exist',
        )

    def handle(self, *args, **options):
        force = options['force']
        created_count = 0
        updated_count = 0
        
        for category_data in DEFAULT_CATEGORIES:
            category, created = ForumCategory.objects.update_or_create(
                slug=category_data['slug'],
                defaults=category_data
            )
            
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'Created category: {category.name}')
                )
            else:
                if force:
                    updated_count += 1
                    self.stdout.write(
                        self.style.WARNING(f'Updated category: {category.name}')
                    )
                else:
                    self.stdout.write(
                        self.style.NOTICE(f'Category exists: {category.name}')
                    )

        self.stdout.write(
            self.style.SUCCESS(
                f'\nDone! Created: {created_count}, Updated: {updated_count}'
            )
        )
