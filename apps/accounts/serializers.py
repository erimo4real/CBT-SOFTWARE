from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.utils import timezone

User = get_user_model()


# ── Staff: Student creation ──

class StudentCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password], required=False)
    generate_password = serializers.BooleanField(write_only=True, required=False, default=False)

    class Meta:
        model = User
        fields = [
            'email', 'first_name', 'last_name', 'phone', 'reg_number',
            'class_level', 'password', 'generate_password',
        ]

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError('A user with this email already exists')
        return value

    def validate_reg_number(self, value):
        if value and User.objects.filter(reg_number=value).exists():
            raise serializers.ValidationError('A user with this registration number already exists')
        return value

    def create(self, validated_data):
        generate_pw = validated_data.pop('generate_password', False)
        password = validated_data.pop('password', None)

        if generate_pw or not password:
            import random, string
            password = ''.join(random.choices(string.ascii_letters + string.digits, k=10))

        validated_data['role'] = 'student'
        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.save(update_fields=['password'])
        return user, password


class StudentBulkImportSerializer(serializers.Serializer):
    file = serializers.FileField()


# ── Staff: Student list/detail ──

class StudentSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)
    exam_attempts_count = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'full_name',
            'phone', 'phone_verified', 'reg_number', 'class_level',
            'account_status', 'date_of_birth', 'is_active',
            'otp_failed_attempts', 'otp_locked_until',
            'created_at', 'updated_at', 'exam_attempts_count',
        ]
        read_only_fields = [
            'id', 'email', 'phone_verified', 'otp_failed_attempts',
            'otp_locked_until', 'created_at', 'updated_at',
        ]

    def get_exam_attempts_count(self, obj):
        return obj.exam_attempts.count()


class StudentUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'phone', 'class_level', 'account_status', 'is_active']


# ── Student Auth Flow ──

class StudentLoginSerializer(serializers.Serializer):
    login = serializers.CharField(help_text='Email or registration number')
    password = serializers.CharField(write_only=True)


class OTPRequestSerializer(serializers.Serializer):
    user_id = serializers.UUIDField()
    delivery_method = serializers.ChoiceField(
        choices=[('email', 'Email'), ('sms', 'SMS'), ('pin', 'Staff PIN')]
    )


class OTPVerifySerializer(serializers.Serializer):
    user_id = serializers.UUIDField()
    code = serializers.CharField(max_length=6)


class ExamPinLoginSerializer(serializers.Serializer):
    reg_number = serializers.CharField(max_length=50)
    exam_pin = serializers.CharField(max_length=10)


# ── Exam PIN management ──

class ExamPINCreateSerializer(serializers.Serializer):
    exam_id = serializers.UUIDField()
    max_uses = serializers.IntegerField(default=1, min_value=1)
    expires_hours = serializers.IntegerField(default=24, min_value=1, help_text='Hours until PIN expires')


class ExamPINSerializer(serializers.ModelSerializer):
    exam_title = serializers.CharField(source='exam.title', read_only=True)

    class Meta:
        from .models import ExamPIN
        model = ExamPIN
        fields = [
            'id', 'pin', 'exam', 'exam_title', 'max_uses', 'current_uses',
            'is_active', 'expires_at', 'created_at',
        ]
        read_only_fields = ['id', 'pin', 'current_uses', 'created_at']


# ── Audit Log ──

class AuditLogSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source='user.email', read_only=True, default=None)

    class Meta:
        from .models import AuditLog
        model = AuditLog
        fields = ['id', 'user', 'user_email', 'action', 'details', 'ip_address', 'created_at']
        read_only_fields = fields


# ── Existing serializers (kept for staff/instructor auth) ──

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['email', 'first_name', 'last_name', 'password', 'password_confirm']

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({'password_confirm': 'Passwords do not match'})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User.objects.create_user(**validated_data)
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)
    is_student = serializers.BooleanField(read_only=True)
    is_instructor = serializers.BooleanField(read_only=True)
    is_admin_role = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'full_name',
            'role', 'avatar', 'phone', 'phone_verified', 'date_of_birth', 'bio',
            'reg_number', 'class_level', 'account_status',
            'email_verified', 'is_google_account',
            'is_student', 'is_instructor', 'is_admin_role',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'email', 'role', 'email_verified', 'is_google_account',
            'phone_verified', 'created_at', 'updated_at',
        ]


class UpdateProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'phone', 'date_of_birth', 'bio']


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, validators=[validate_password])

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Old password is incorrect')
        return value


class AvatarSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['avatar']


class GoogleLoginSerializer(serializers.Serializer):
    token = serializers.CharField()


class AdminUserSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'full_name',
            'role', 'is_active', 'email_verified', 'is_google_account',
            'created_at',
        ]
        read_only_fields = ['id', 'email', 'email_verified', 'is_google_account', 'created_at']
