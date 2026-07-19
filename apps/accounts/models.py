from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.db.models import F
from django.utils import timezone
import uuid
import secrets
import string


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email is required')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'admin')

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True')

        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    class Role(models.TextChoices):
        STUDENT = 'student', 'Student'
        INSTRUCTOR = 'instructor', 'Instructor'
        ADMIN = 'admin', 'Administrator'

    class AccountStatus(models.TextChoices):
        ACTIVE = 'active', 'Active'
        INACTIVE = 'inactive', 'Inactive'
        SUSPENDED = 'suspended', 'Suspended'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    username = None
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.STUDENT)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True)
    phone_verified = models.BooleanField(default=False)
    date_of_birth = models.DateField(blank=True, null=True)
    email_verified = models.BooleanField(default=False)
    is_google_account = models.BooleanField(default=False)
    bio = models.TextField(blank=True)

    # Student-specific fields
    reg_number = models.CharField(max_length=50, unique=True, blank=True, null=True)
    class_level = models.CharField(max_length=100, blank=True)
    account_status = models.CharField(
        max_length=20, choices=AccountStatus.choices, default=AccountStatus.ACTIVE
    )

    # OTP tracking
    otp_last_sent = models.DateTimeField(blank=True, null=True)
    otp_failed_attempts = models.PositiveIntegerField(default=0)
    otp_locked_until = models.DateTimeField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.email

    @property
    def is_student(self):
        return self.role == self.Role.STUDENT

    @property
    def is_instructor(self):
        return self.role == self.Role.INSTRUCTOR

    @property
    def is_admin_role(self):
        return self.role == self.Role.ADMIN

    @property
    def full_name(self):
        return f'{self.first_name} {self.last_name}'.strip() or self.email.split('@')[0]

    @property
    def is_otp_locked(self):
        if self.otp_locked_until and self.otp_locked_until > timezone.now():
            return True
        return False

    def reset_otp_lock(self):
        self.otp_failed_attempts = 0
        self.otp_locked_until = None
        self.save(update_fields=['otp_failed_attempts', 'otp_locked_until'])

    def increment_otp_failed(self, max_attempts=5, lockout_minutes=30):
        User.objects.filter(id=self.id).update(otp_failed_attempts=F('otp_failed_attempts') + 1)
        self.refresh_from_db()
        if self.otp_failed_attempts >= max_attempts:
            self.otp_locked_until = timezone.now() + timezone.timedelta(minutes=lockout_minutes)
            self.save(update_fields=['otp_locked_until'])

    def generate_otp(self, delivery_method='email'):
        code = ''.join(secrets.choice(string.digits) for _ in range(6))
        now = timezone.now()
        OTPCode.objects.filter(user=self, is_used=False).update(is_used=True)
        otp = OTPCode.objects.create(
            user=self,
            code=code,
            delivery_method=delivery_method,
            expires_at=now + timezone.timedelta(minutes=10),
        )
        self.otp_last_sent = now
        self.save(update_fields=['otp_last_sent'])
        return otp


class OTPCode(models.Model):
    class DeliveryMethod(models.TextChoices):
        EMAIL = 'email', 'Email'
        SMS = 'sms', 'SMS'
        PIN = 'pin', 'Staff PIN'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='otp_codes')
    code = models.CharField(max_length=6)
    delivery_method = models.CharField(max_length=10, choices=DeliveryMethod.choices)
    is_used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.user.email} - {self.code} ({self.delivery_method})'

    @property
    def is_expired(self):
        return timezone.now() > self.expires_at

    @property
    def is_valid(self):
        return not self.is_used and not self.is_expired


class ExamPIN(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    pin = models.CharField(max_length=10, unique=True)
    exam = models.ForeignKey('exams.Exam', on_delete=models.CASCADE, related_name='pins')
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='exam_pins')
    max_uses = models.PositiveIntegerField(default=1)
    current_uses = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    expires_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.exam.title} - {self.pin}'

    @property
    def is_valid(self):
        if not self.is_active:
            return False
        if self.current_uses >= self.max_uses:
            return False
        if self.expires_at and timezone.now() > self.expires_at:
            return False
        return True

    @staticmethod
    def generate_pin(length=8):
        chars = string.ascii_uppercase + string.digits
        while True:
            pin = ''.join(secrets.choice(chars) for _ in range(length))
            if not ExamPIN.objects.filter(pin=pin).exists():
                return pin


class AuditLog(models.Model):
    class ActionType(models.TextChoices):
        LOGIN = 'login', 'Login'
        LOGIN_FAILED = 'login_failed', 'Login Failed'
        OTP_SENT = 'otp_sent', 'OTP Sent'
        OTP_VERIFIED = 'otp_verified', 'OTP Verified'
        OTP_FAILED = 'otp_failed', 'OTP Failed'
        EXAM_STARTED = 'exam_started', 'Exam Started'
        EXAM_SUBMITTED = 'exam_submitted', 'Exam Submitted'
        EXAM_AUTO_SUBMITTED = 'exam_auto_submitted', 'Exam Auto-Submitted'
        STUDENT_CREATED = 'student_created', 'Student Created'
        STUDENT_UPDATED = 'student_updated', 'Student Updated'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='audit_logs', null=True, blank=True)
    action = models.CharField(max_length=30, choices=ActionType.choices)
    details = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = 'Audit logs'

    def __str__(self):
        return f'{self.action} - {self.user or "system"} - {self.created_at}'
