from rest_framework import status, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.throttling import AnonRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db.models import Q, F
from django.db import transaction
from django.http import HttpResponse
from decouple import config
import csv
import io
import logging

logger = logging.getLogger(__name__)

from .serializers import (
    RegisterSerializer, UserSerializer, UpdateProfileSerializer,
    ChangePasswordSerializer, AvatarSerializer, GoogleLoginSerializer,
    AdminUserSerializer, StudentCreateSerializer, StudentSerializer,
    StudentUpdateSerializer, StudentLoginSerializer, OTPRequestSerializer,
    OTPVerifySerializer, ExamPinLoginSerializer, ExamPINCreateSerializer,
    ExamPINSerializer, AuditLogSerializer, StudentBulkImportSerializer,
)
from .models import OTPCode, ExamPIN, AuditLog
from .permissions import IsAdmin, IsInstructorOrAdmin

User = get_user_model()


# ── Helper ──

def get_client_ip(request):
    x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    return x_forwarded.split(',')[0] if x_forwarded else request.META.get('REMOTE_ADDR')


def log_action(user, action, request=None, details=None):
    AuditLog.objects.create(
        user=user,
        action=action,
        ip_address=get_client_ip(request) if request else None,
        details=details or {},
    )


# ── Staff Auth (instructors + admins) ──

class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'tokens': {
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            },
            'message': 'Registration successful. Please verify your email.',
        }, status=status.HTTP_201_CREATED)


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = 'email'


class LoginView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        tokens = serializer.validated_data
        user = User.objects.get(email=request.data['email'])
        log_action(user, AuditLog.ActionType.LOGIN, request)
        return Response({
            'user': UserSerializer(user).data,
            'tokens': {
                'access': str(tokens['access']),
                'refresh': str(tokens['refresh']),
            },
        })


class RefreshTokenView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response({'error': 'Refresh token required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            refresh = RefreshToken(refresh_token)
            return Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            })
        except Exception:
            return Response({'error': 'Invalid refresh token'}, status=status.HTTP_401_UNAUTHORIZED)


class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class UpdateProfileView(generics.UpdateAPIView):
    serializer_class = UpdateProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save(update_fields=['password'])
        return Response({'message': 'Password changed successfully. Please log in again.'})


class AvatarUploadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = AvatarSerializer(data=request.data, instance=request.user, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSerializer(request.user).data)


class GoogleLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = GoogleLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        token = serializer.validated_data['token']

        try:
            from google.oauth2 import id_token as google_id_token
            from google.auth.transport import requests as google_requests

            idinfo = google_id_token.verify_oauth2_token(
                token, google_requests.Request(),
                client_id=config('GOOGLE_CLIENT_ID', default=None)
            )

            email = idinfo.get('email')
            first_name = idinfo.get('given_name', '')
            last_name = idinfo.get('family_name', '')

            if not email:
                return Response({'error': 'Email not found in token'}, status=status.HTTP_400_BAD_REQUEST)

            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    'first_name': first_name,
                    'last_name': last_name,
                    'is_google_account': True,
                    'email_verified': True,
                }
            )

            if created:
                user.set_unusable_password()
                user.save()

            refresh = RefreshToken.for_user(user)
            return Response({
                'user': UserSerializer(user).data,
                'tokens': {
                    'access': str(refresh.access_token),
                    'refresh': str(refresh),
                },
                'created': created,
            })

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class VerifyEmailView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        token = request.data.get('token')
        if not token:
            return Response({'error': 'Token required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            from allauth.account.models import EmailConfirmation
            confirmation = EmailConfirmation.from_key(token)
            confirmation.confirm(request)
            return Response({'message': 'Email verified successfully'})
        except Exception:
            return Response({'error': 'Invalid or expired token'}, status=status.HTTP_400_BAD_REQUEST)


class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]

    def post(self, request):
        from django.contrib.auth import get_user_model
        from django.contrib.auth.tokens import PasswordResetTokenGenerator
        from django.core.mail import send_mail
        from django.conf import settings
        import logging

        logger = logging.getLogger(__name__)
        User = get_user_model()
        email = request.data.get('email', '').strip().lower()

        if not email:
            return Response({'error': 'Email required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email)
            token = PasswordResetTokenGenerator().make_token(user)
            reset_url = f"{request.data.get('frontend_url', 'http://localhost:5173')}/reset-password?token={token}&uid={user.pk}"

            try:
                send_mail(
                    subject='Password Reset — CBT Platform',
                    message=f'Click the link to reset your password: {reset_url}\n\nThis link expires in 1 hour.',
                    from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@cbt.com'),
                    recipient_list=[user.email],
                    fail_silently=True,
                )
                logger.info(f'Password reset email sent to {user.email}')
            except Exception as e:
                logger.error(f'Failed to send password reset email: {e}')
        except User.DoesNotExist:
            pass

        return Response({'message': 'If the email exists, a reset link has been sent'})


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        from django.contrib.auth import get_user_model
        from django.contrib.auth.tokens import PasswordResetTokenGenerator
        from django.contrib.auth.password_validation import validate_password
        import logging

        logger = logging.getLogger(__name__)
        User = get_user_model()
        token = request.data.get('token')
        uid = request.data.get('uid')
        new_password = request.data.get('new_password')

        if not token or not uid or not new_password:
            return Response({'error': 'Token, uid, and new_password required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(pk=uid)
        except (User.DoesNotExist, ValueError):
            return Response({'error': 'Invalid or expired token'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            validate_password(new_password, user)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        if not PasswordResetTokenGenerator().check_token(user, token):
            return Response({'error': 'Invalid or expired token'}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save(update_fields=['password'])
        logger.info(f'Password reset completed for {user.email}')
        return Response({'message': 'Password reset successful'})


# ── Student Management (Staff) ──

class StudentListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsInstructorOrAdmin]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return StudentCreateSerializer
        return StudentSerializer

    def get_queryset(self):
        queryset = User.objects.filter(role='student')
        search = self.request.query_params.get('search')
        class_level = self.request.query_params.get('class_level')
        account_status = self.request.query_params.get('account_status')

        if search:
            queryset = queryset.filter(
                Q(email__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(reg_number__icontains=search) |
                Q(phone__icontains=search)
            )
        if class_level:
            queryset = queryset.filter(class_level=class_level)
        if account_status:
            queryset = queryset.filter(account_status=account_status)

        return queryset.order_by('-created_at')

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user, raw_password = serializer.save()
        log_action(
            request.user, AuditLog.ActionType.STUDENT_CREATED,
            request, details={'student_email': user.email, 'student_id': str(user.id)}
        )
        return Response({
            'student': StudentSerializer(user).data,
            'raw_password': raw_password,
            'message': f'Student created. Password: {raw_password}',
        }, status=status.HTTP_201_CREATED)


class StudentDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = StudentSerializer
    permission_classes = [IsInstructorOrAdmin]
    queryset = User.objects.filter(role='student')

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = StudentUpdateSerializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        log_action(
            request.user, AuditLog.ActionType.STUDENT_UPDATED,
            request, details={'student_email': instance.email}
        )
        return Response(StudentSerializer(instance).data)


class StudentBulkImportView(APIView):
    permission_classes = [IsInstructorOrAdmin]

    def post(self, request):
        serializer = StudentBulkImportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        file = serializer.validated_data['file']
        try:
            decoded = file.read().decode('utf-8')
            reader = csv.DictReader(io.StringIO(decoded))
        except Exception:
            return Response({'error': 'Invalid CSV file'}, status=status.HTTP_400_BAD_REQUEST)

        created = []
        errors = []

        for i, row in enumerate(reader, start=2):
            email = row.get('email', '').strip()
            first_name = row.get('first_name', '').strip()
            last_name = row.get('last_name', '').strip()
            phone = row.get('phone', '').strip()
            reg_number = row.get('reg_number', '').strip()
            class_level = row.get('class_level', '').strip()

            if not email:
                errors.append({'row': i, 'error': 'Email is required'})
                continue
            if User.objects.filter(email=email).exists():
                errors.append({'row': i, 'error': f'Email {email} already exists'})
                continue
            if reg_number and User.objects.filter(reg_number=reg_number).exists():
                errors.append({'row': i, 'error': f'Reg number {reg_number} already exists'})
                continue

            import random, string
            raw_password = ''.join(random.choices(string.ascii_letters + string.digits, k=10))

            user = User.objects.create_user(
                email=email,
                password=raw_password,
                first_name=first_name,
                last_name=last_name,
                phone=phone,
                reg_number=reg_number or None,
                class_level=class_level,
                role='student',
            )
            created.append({
                'email': email,
                'reg_number': reg_number,
                'password': raw_password,
            })

        return Response({
            'created': len(created),
            'errors': errors,
            'students': created,
        }, status=status.HTTP_201_CREATED)


# ── Student Auth Flow ──

class StudentLoginView(APIView):
    """Step 1: Student logs in with email/reg_number + password."""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = StudentLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        login_id = serializer.validated_data['login']
        password = serializer.validated_data['password']

        user = User.objects.filter(
            Q(email__iexact=login_id) | Q(reg_number__iexact=login_id),
            role='student'
        ).first()

        if not user:
            return Response({
                'error': 'Account not found. Please visit the admin or instructor to create your account.',
                'code': 'ACCOUNT_NOT_FOUND',
            }, status=status.HTTP_404_NOT_FOUND)

        if not user.is_active or user.account_status != 'active':
            return Response({
                'error': 'Your account is inactive or suspended. Please contact the administrator.',
                'code': 'ACCOUNT_INACTIVE',
            }, status=status.HTTP_403_FORBIDDEN)

        if not user.check_password(password):
            log_action(user, AuditLog.ActionType.LOGIN_FAILED, request, details={'reason': 'wrong_password'})
            return Response({
                'error': 'Incorrect email/password. Please visit the admin or instructor for more details.',
                'code': 'INVALID_CREDENTIALS',
            }, status=status.HTTP_401_UNAUTHORIZED)

        log_action(user, AuditLog.ActionType.LOGIN, request)

        has_email = bool(user.email)
        has_phone = bool(user.phone)

        return Response({
            'user_id': str(user.id),
            'has_email': has_email,
            'has_phone': has_phone,
            'email': user.email if has_email else None,
            'phone_masked': f'{user.phone[:3]}***{user.phone[-2:]}' if has_phone else None,
            'message': 'Credentials verified. Request OTP to continue.',
        })


class StudentOTPRequestView(APIView):
    """Step 2: Request OTP via email or SMS."""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = OTPRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = User.objects.filter(
            id=serializer.validated_data['user_id'], role='student'
        ).first()

        if not user:
            return Response({'error': 'Invalid user'}, status=status.HTTP_400_BAD_REQUEST)

        if user.is_otp_locked:
            remaining = (user.otp_locked_until - timezone.now()).total_seconds() / 60
            return Response({
                'error': f'Too many failed attempts. Try again in {int(remaining)} minutes.',
                'code': 'OTP_LOCKED',
            }, status=status.HTTP_429_TOO_MANY_REQUESTS)

        delivery = serializer.validated_data['delivery_method']

        if delivery == 'email' and not user.email:
            return Response({'error': 'No email on file'}, status=status.HTTP_400_BAD_REQUEST)
        if delivery == 'sms' and not user.phone:
            return Response({'error': 'No phone number on file'}, status=status.HTTP_400_BAD_REQUEST)

        otp = user.generate_otp(delivery_method=delivery)
        log_action(user, AuditLog.ActionType.OTP_SENT, request, details={'delivery': delivery})

        response_data = {
            'message': f'OTP sent via {delivery}',
            'delivery_method': delivery,
            'expires_in_hours': 24,
        }

        if delivery == 'email':
            response_data['email'] = f'{user.email[:2]}***@{user.email.split("@")[1]}'
        elif delivery == 'sms':
            response_data['phone'] = f'{user.phone[:3]}***{user.phone[-2:]}'

        return Response(response_data)


class StudentOTPVerifyView(APIView):
    """Step 3: Verify OTP and get JWT tokens."""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = OTPVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = User.objects.filter(
            id=serializer.validated_data['user_id'], role='student'
        ).first()

        if not user:
            return Response({'error': 'Invalid user'}, status=status.HTTP_400_BAD_REQUEST)

        if user.is_otp_locked:
            return Response({
                'error': 'Account temporarily locked due to too many failed attempts.',
                'code': 'OTP_LOCKED',
            }, status=status.HTTP_429_TOO_MANY_REQUESTS)

        code = serializer.validated_data['code']
        otp = OTPCode.objects.filter(
            user=user, code=code, is_used=False
        ).order_by('-created_at').first()

        if not otp or not otp.is_valid:
            user.increment_otp_failed(max_attempts=5, lockout_minutes=30)
            log_action(user, AuditLog.ActionType.OTP_FAILED, request)
            remaining = 5 - user.otp_failed_attempts
            return Response({
                'error': f'Invalid or expired OTP. {max(0, remaining)} attempts remaining.',
                'code': 'INVALID_OTP',
            }, status=status.HTTP_400_BAD_REQUEST)

        rows = OTPCode.objects.filter(id=otp.id, is_used=False).update(is_used=True)
        if rows == 0:
            return Response({
                'error': 'OTP already used',
                'code': 'OTP_USED',
            }, status=status.HTTP_400_BAD_REQUEST)
        user.reset_otp_lock()
        log_action(user, AuditLog.ActionType.OTP_VERIFIED, request)

        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'tokens': {
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            },
            'message': 'Login successful',
        })


class StudentExamAccessView(APIView):
    """Exam terminal: student enters reg_number + exam PIN to start exam."""
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]
    throttle_scope = 'exam_access'

    def post(self, request):
        serializer = ExamPinLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        reg_number = serializer.validated_data['reg_number']
        pin_code = serializer.validated_data['exam_pin']

        user = User.objects.filter(reg_number__iexact=reg_number, role='student').first()
        if not user:
            return Response({
                'error': 'Registration number not found',
                'code': 'REG_NOT_FOUND',
            }, status=status.HTTP_404_NOT_FOUND)

        if not user.is_active or user.account_status != 'active':
            return Response({
                'error': 'Account is inactive or suspended',
                'code': 'ACCOUNT_INACTIVE',
            }, status=status.HTTP_403_FORBIDDEN)

        exam_pin = ExamPIN.objects.filter(pin__iexact=pin_code).first()
        if not exam_pin or not exam_pin.is_valid:
            return Response({
                'error': 'Invalid or expired exam PIN',
                'code': 'INVALID_PIN',
            }, status=status.HTTP_400_BAD_REQUEST)

        ExamPIN.objects.filter(id=exam_pin.id).update(current_uses=F('current_uses') + 1)

        log_action(user, AuditLog.ActionType.LOGIN, request, details={
            'method': 'exam_pin', 'exam': str(exam_pin.exam_id)
        })

        from apps.exams.serializers import ExamDetailSerializer
        return Response({
            'user': UserSerializer(user).data,
            'exam': ExamDetailSerializer(exam_pin.exam).data,
            'message': 'Access granted. You may now begin the exam.',
        })


# ── Exam PIN Management (Staff) ──

class ExamPINListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsInstructorOrAdmin]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ExamPINCreateSerializer
        return ExamPINSerializer

    def get_queryset(self):
        queryset = ExamPIN.objects.select_related('exam')
        exam_id = self.request.query_params.get('exam_id')
        if exam_id:
            queryset = queryset.filter(exam_id=exam_id)
        return queryset

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        from apps.exams.models import Exam
        exam = Exam.objects.filter(id=serializer.validated_data['exam_id']).first()
        if not exam:
            return Response({'error': 'Exam not found'}, status=status.HTTP_404_NOT_FOUND)

        max_uses = serializer.validated_data.get('max_uses', 1)
        expires_hours = serializer.validated_data.get('expires_hours', 24)

        pin = ExamPIN.objects.create(
            pin=ExamPIN.generate_pin(),
            exam=exam,
            created_by=request.user,
            max_uses=max_uses,
            expires_at=timezone.now() + timezone.timedelta(hours=expires_hours),
        )

        return Response({
            'pin': ExamPINSerializer(pin).data,
            'message': f'PIN generated: {pin.pin}',
        }, status=status.HTTP_201_CREATED)


class ExamPINDetailView(generics.RetrieveDestroyAPIView):
    serializer_class = ExamPINSerializer
    permission_classes = [IsInstructorOrAdmin]
    queryset = ExamPIN.objects.all()


class ExamPrintSlipView(APIView):
    """Generate printable exam slip HTML."""
    permission_classes = [IsInstructorOrAdmin]

    def get(self, request, pin_id):
        pin = ExamPIN.objects.select_related('exam', 'created_by').filter(id=pin_id).first()
        if not pin:
            return Response({'error': 'PIN not found'}, status=status.HTTP_404_NOT_FOUND)

        html = f"""<!DOCTYPE html>
<html><head><title>Exam Slip</title>
<style>
body {{ font-family: Arial, sans-serif; padding: 40px; }}
.slip {{ border: 2px solid #333; padding: 30px; max-width: 400px; margin: auto; }}
h1 {{ font-size: 18px; text-align: center; margin-bottom: 5px; }}
h2 {{ font-size: 14px; text-align: center; color: #666; margin-top: 0; }}
.field {{ margin: 15px 0; }}
.field label {{ font-size: 12px; color: #666; }}
.field p {{ font-size: 16px; font-weight: bold; margin: 4px 0; }}
.pin-code {{ font-size: 28px; text-align: center; letter-spacing: 8px; padding: 15px; border: 2px dashed #333; margin: 20px 0; }}
.footer {{ font-size: 11px; color: #999; text-align: center; margin-top: 20px; }}
@media print {{ body {{ padding: 0; }} .slip {{ border: 2px solid #000; }} }}</style>
</head><body>
<div class="slip">
<h1>CBT Platform - Exam Slip</h1>
<h2>{pin.exam.title}</h2>
<div class="field"><label>Registration Number</label><p>_______________</p></div>
<div class="field"><label>Student Name</label><p>_______________</p></div>
<div class="field"><label>Exam PIN</label>
<div class="pin-code">{pin.pin}</div></div>
<div class="field"><label>Valid Until</label><p>{pin.expires_at.strftime('%d %B %Y, %I:%M %p') if pin.expires_at else 'No expiry'}</p></div>
<div class="footer">This slip is valid for one-time use only. Do not share your PIN.</div>
</div></body></html>"""

        return HttpResponse(html, content_type='text/html')


# ── Audit Logs ──

class AuditLogListView(generics.ListAPIView):
    serializer_class = AuditLogSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        queryset = AuditLog.objects.select_related('user')
        action = self.request.query_params.get('action')
        user_id = self.request.query_params.get('user_id')
        if action:
            queryset = queryset.filter(action=action)
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        return queryset[:200]


# ── Admin User Management ──

class AdminUserListView(generics.ListAPIView):
    serializer_class = AdminUserSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        queryset = User.objects.all()
        search = self.request.query_params.get('search')
        role = self.request.query_params.get('role')
        is_active = self.request.query_params.get('is_active')

        if search:
            queryset = queryset.filter(
                Q(email__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search)
            )
        if role:
            queryset = queryset.filter(role=role)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')

        return queryset.order_by('-created_at')


class AdminUserDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = AdminUserSerializer
    permission_classes = [IsAdmin]
    queryset = User.objects.all()
