from django.db.models.signals import post_save, post_delete, pre_delete
from django.dispatch import receiver
from .models import Service, User, Tag, ChatRoom
from .cache_utils import (
    invalidate_on_service_change,
    invalidate_on_user_change,
    invalidate_on_tag_change
)


@receiver(post_save, sender=Service)
def create_service_chat_room(sender, instance, created, **kwargs):
    """Automatically create a public ChatRoom when a Service is created."""
    if created:
        ChatRoom.objects.create(
            name=f"Discussion: {instance.title}",
            type='public',
            related_service=instance
        )


@receiver([post_save, post_delete], sender=Service)
def invalidate_service_cache(sender, instance, **kwargs):
    invalidate_on_service_change(instance)


@receiver([post_save], sender=User)
def invalidate_user_cache(sender, instance, **kwargs):
    invalidate_on_user_change(instance)


@receiver([post_save, post_delete], sender=Tag)
def invalidate_tag_cache(sender, instance, **kwargs):
    invalidate_on_tag_change()
