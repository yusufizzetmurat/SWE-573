from django.db import models
from django.contrib.gis.db import models as gis_models
from django.contrib.gis.geos import Point
from django.contrib.auth.models import AbstractUser, UserManager
from decimal import Decimal
import uuid

class CustomUserManager(UserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        return self.create_user(email, password, **extra_fields)

class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    username = None
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    bio = models.TextField(blank=True, null=True)
    avatar_url = models.TextField(blank=True, null=True)  # Support data URLs and regular URLs
    banner_url = models.TextField(blank=True, null=True)  # Support data URLs and regular URLs
    timebank_balance = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    karma_score = models.IntegerField(default=0)
    role = models.CharField(max_length=20, choices=[('member', 'Member'), ('admin', 'Admin')], default='member')
    date_joined = models.DateTimeField(auto_now_add=True)

    objects = CustomUserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    def __str__(self):
        return self.email

    class Meta:
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['timebank_balance']),
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(timebank_balance__gte=-10.00),
                name='timebank_balance_minimum',
            ),
        ]

class Tag(models.Model):
    id = models.CharField(primary_key=True, max_length=200)
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name

    class Meta:
        indexes = [
            models.Index(fields=['name']),
        ]

class Badge(models.Model):
    id = models.CharField(primary_key=True, max_length=200)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    icon_url = models.URLField(blank=True, null=True)

    def __str__(self):
        return self.name

class UserBadge(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='badges')
    badge = models.ForeignKey(Badge, on_delete=models.CASCADE)
    earned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['user', 'badge']
        indexes = [
            models.Index(fields=['user', 'badge']),
        ]

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
    title = models.CharField(max_length=200)
    description = models.TextField()
    type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    duration = models.DecimalField(max_digits=5, decimal_places=2)
    location_type = models.CharField(max_length=10, choices=LOCATION_CHOICES)
    location_area = models.CharField(max_length=100, null=True, blank=True, help_text='General area for in-person services (e.g., Besiktas, Kadikoy)')
    location_lat = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True, help_text='Latitude for approximate location')
    location_lng = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True, help_text='Longitude for approximate location')
    location = gis_models.PointField(null=True, blank=True, geography=True, srid=4326, help_text='PostGIS point for geospatial queries')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='Active')
    max_participants = models.IntegerField(default=1)
    schedule_type = models.CharField(max_length=10, choices=SCHEDULE_CHOICES)
    schedule_details = models.TextField(blank=True, null=True)
    tags = models.ManyToManyField(Tag, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        """Auto-populate PointField from lat/lng for geospatial queries"""
        if self.location_lat is not None and self.location_lng is not None:
            self.location = Point(float(self.location_lng), float(self.location_lat), srid=4326)
        else:
            self.location = None
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title

    class Meta:
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['type', 'status']),
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['status', 'type', 'created_at']),
            models.Index(fields=['location_type', 'location_area']),
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(duration__gt=0),
                name='service_duration_positive',
            ),
            models.CheckConstraint(
                check=models.Q(max_participants__gt=0),
                name='service_max_participants_positive',
            ),
        ]

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
        constraints = [
            models.CheckConstraint(
                check=models.Q(provisioned_hours__gt=0),
                name='handshake_provisioned_hours_positive',
            ),
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
            models.Index(fields=['sender']),
        ]

class Notification(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    type = models.CharField(max_length=50)
    title = models.CharField(max_length=200)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    related_handshake = models.ForeignKey(Handshake, on_delete=models.CASCADE, null=True, blank=True, related_name='notifications')
    related_service = models.ForeignKey(Service, on_delete=models.CASCADE, null=True, blank=True, related_name='notifications')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['user', 'is_read', 'created_at']),
            models.Index(fields=['related_handshake']),
            models.Index(fields=['related_service']),
        ]
        ordering = ['-created_at']

class ReputationRep(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    handshake = models.ForeignKey(Handshake, on_delete=models.CASCADE, related_name='reps')
    giver = models.ForeignKey(User, on_delete=models.CASCADE, related_name='given_reps')
    receiver = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_reps')
    is_punctual = models.BooleanField(default=False)
    is_helpful = models.BooleanField(default=False)
    is_kind = models.BooleanField(default=False)
    comment = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['receiver', 'created_at']),
            models.Index(fields=['giver', 'created_at']),
            models.Index(fields=['handshake']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['handshake', 'giver'],
                name='unique_reputation_per_handshake_giver',
            ),
        ]

class TransactionHistory(models.Model):
    """Track all TimeBank transactions for audit and user visibility"""
    TRANSACTION_TYPES = (
        ('provision', 'Provision'),  # Hours escrowed when handshake accepted
        ('transfer', 'Transfer'),    # Hours transferred when service completed
        ('refund', 'Refund'),        # Hours refunded when handshake cancelled
        ('adjustment', 'Adjustment'), # Manual adjustment (admin only)
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='transactions')
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPES)
    amount = models.DecimalField(max_digits=10, decimal_places=2, help_text='Positive for credits, negative for debits')
    balance_after = models.DecimalField(max_digits=10, decimal_places=2, help_text='User balance after this transaction')
    handshake = models.ForeignKey(Handshake, on_delete=models.SET_NULL, null=True, blank=True, related_name='transactions')
    description = models.TextField(help_text='Human-readable description of the transaction')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['transaction_type', 'created_at']),
            models.Index(fields=['user', 'transaction_type', 'created_at']),
            models.Index(fields=['handshake']),
        ]
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.email} - {self.transaction_type} - {self.amount} hours"

class Report(models.Model):
    """Reports for issues with services or users"""
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
    reported_user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name='reports_received')
    reported_service = models.ForeignKey(Service, on_delete=models.CASCADE, null=True, blank=True, related_name='reports')
    related_handshake = models.ForeignKey(Handshake, on_delete=models.CASCADE, null=True, blank=True, related_name='reports')
    type = models.CharField(max_length=25, choices=TYPE_CHOICES)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    description = models.TextField()
    admin_notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='resolved_reports')

    def __str__(self):
        return f"{self.type} - {self.status}"

    class Meta:
        indexes = [
            models.Index(fields=['reporter']),
            models.Index(fields=['reported_user']),
            models.Index(fields=['reported_service']),
            models.Index(fields=['related_handshake']),
            models.Index(fields=['resolved_by']),
            models.Index(fields=['status', 'created_at']),
        ]
