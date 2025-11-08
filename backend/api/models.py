from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager
import uuid

class UserManager(BaseUserManager):
    def _create_user(self, email, password, **extra_fields):
        if not email:
            raise ValueError('The Email must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', False)
        extra_fields.setdefault('is_superuser', False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        extra_fields.setdefault('first_name', 'Admin')
        extra_fields.setdefault('last_name', 'User')

        return self._create_user(email, password, **extra_fields)



class User(AbstractUser):
    username = None
    email = models.EmailField(unique=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name'] 

    # Custom fields
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    bio = models.TextField(null=True, blank=True)
    avatar_url = models.CharField(max_length=255, null=True, blank=True)
    banner_url = models.CharField(max_length=255, null=True, blank=True)
    timebank_balance = models.DecimalField(max_digits=10, decimal_places=2, default=1.00)
    karma_score = models.IntegerField(default=0)
    
    ROLE_CHOICES = (
        ('member', 'Member'),
        ('admin', 'Admin'),
    )
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='member')

    objects = UserManager()

    def __str__(self):
        return self.email

class Tag(models.Model):
    id = models.CharField(max_length=255, primary_key=True) # Wikidata ID (e.g., "Q8476")
    name = models.CharField(max_length=255, unique=True)    # Human-readable name (e.g., "Cooking")

    def __str__(self):
        return self.name

class Service(models.Model):
    TYPE_CHOICES = (
        ('Offer', 'Offer'),
        ('Need', 'Need'),
    )
    LOCATION_CHOICES = (
        ('In-Person', 'In-Person'),
        ('Online', 'Online'),
    )
    STATUS_CHOICES = (
        ('Active', 'Active'),
        ('Completed', 'Completed'),
        ('Cancelled', 'Cancelled'),
    )
    SCHEDULE_CHOICES = (
        ('One-Time', 'One-Time'),
        ('Recurrent', 'Recurrent'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='services')
    title = models.CharField(max_length=255)
    description = models.TextField()
    type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    duration = models.DecimalField(max_digits=5, decimal_places=2)
    location_type = models.CharField(max_length=10, choices=LOCATION_CHOICES)
    location_area = models.CharField(max_length=100, null=True, blank=True, help_text='General area for in-person services (e.g., Besiktas, Kadikoy)')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='Active')
    max_participants = models.IntegerField(default=1)
    schedule_type = models.CharField(max_length=10, choices=SCHEDULE_CHOICES)
    schedule_details = models.CharField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    # The Many-to-Many link to Tags
    tags = models.ManyToManyField(Tag, related_name='services', blank=True)

    def __str__(self):
        return self.title

class Handshake(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('denied', 'Denied'),
        ('cancelled', 'Cancelled'),
        ('completed', 'Completed'),
        ('reported', 'Reported'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    service = models.ForeignKey(Service, on_delete=models.CASCADE, related_name='handshakes')
    requester = models.ForeignKey(User, on_delete=models.CASCADE, related_name='requested_handshakes')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    provisioned_hours = models.DecimalField(max_digits=5, decimal_places=2)
    provider_confirmed_complete = models.BooleanField(default=False)
    receiver_confirmed_complete = models.BooleanField(default=False)
    exact_location = models.CharField(max_length=255, null=True, blank=True, help_text='Exact location agreed upon by both parties')
    exact_duration = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, help_text='Exact duration agreed upon by both parties')
    scheduled_time = models.DateTimeField(null=True, blank=True, help_text='Scheduled time for the service')
    provider_initiated = models.BooleanField(default=False, help_text='Whether provider has initiated the handshake')
    requester_initiated = models.BooleanField(default=False, help_text='Whether requester has initiated the handshake')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.requester.email} -> {self.service.title} ({self.status})"

    class Meta:
        indexes = [
            models.Index(fields=['service', 'status']),
            models.Index(fields=['requester', 'status']),
            models.Index(fields=['status', 'scheduled_time']),
        ]

class ChatMessage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    handshake = models.ForeignKey(Handshake, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.sender.email}: {self.body[:50]}"

    class Meta:
        indexes = [
            models.Index(fields=['handshake', 'created_at']),
        ]

# 6. The Notification Model
class Notification(models.Model):
    TYPE_CHOICES = (
        ('handshake_request', 'Handshake Request'),
        ('handshake_accepted', 'Handshake Accepted'),
        ('handshake_denied', 'Handshake Denied'),
        ('handshake_cancelled', 'Handshake Cancelled'),
        ('chat_message', 'Chat Message'),
        ('service_confirmation', 'Service Confirmation'),
        ('positive_rep', 'Positive Rep'),
        ('admin_warning', 'Admin Warning'),
        ('service_reminder', 'Service Reminder'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    title = models.CharField(max_length=255)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    related_handshake = models.ForeignKey(Handshake, on_delete=models.CASCADE, null=True, blank=True, related_name='notifications')
    related_service = models.ForeignKey(Service, on_delete=models.CASCADE, null=True, blank=True, related_name='notifications')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.email}: {self.title}"

    class Meta:
        indexes = [
            models.Index(fields=['user', 'is_read', 'created_at']),
        ]

class ReputationRep(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    handshake = models.ForeignKey(Handshake, on_delete=models.CASCADE, related_name='reputation_reps')
    giver = models.ForeignKey(User, on_delete=models.CASCADE, related_name='given_reps')
    receiver = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_reps')
    is_punctual = models.BooleanField(default=False)
    is_helpful = models.BooleanField(default=False)
    is_kind = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.giver.email} -> {self.receiver.email}"

class Badge(models.Model):
    id = models.CharField(max_length=50, primary_key=True)  # e.g., "FIRST_SERVICE"
    name = models.CharField(max_length=255)
    description = models.TextField()
    icon_url = models.CharField(max_length=255)

    def __str__(self):
        return self.name

class UserBadge(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='badges')
    badge = models.ForeignKey(Badge, on_delete=models.CASCADE, related_name='users')
    earned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'badge')

    def __str__(self):
        return f"{self.user.email} - {self.badge.name}"

class Report(models.Model):
    TYPE_CHOICES = (
        ('no_show', 'No-Show Dispute'),
        ('inappropriate_content', 'Inappropriate Content'),
        ('service_issue', 'Service Issue'),
        ('spam', 'Spam'),
    )

    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('resolved', 'Resolved'),
        ('dismissed', 'Dismissed'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reporter = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reports_made')
    reported_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reports_received', null=True, blank=True)
    reported_service = models.ForeignKey(Service, on_delete=models.CASCADE, related_name='reports', null=True, blank=True)
    related_handshake = models.ForeignKey(Handshake, on_delete=models.CASCADE, related_name='reports', null=True, blank=True)
    type = models.CharField(max_length=25, choices=TYPE_CHOICES)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    description = models.TextField()
    admin_notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='resolved_reports')

    def __str__(self):
        return f"{self.type} - {self.status}"