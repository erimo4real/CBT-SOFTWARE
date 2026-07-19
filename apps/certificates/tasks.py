from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone


@shared_task
def send_welcome_email(user_id):
    """Send welcome email after registration."""
    from django.contrib.auth import get_user_model
    User = get_user_model()
    try:
        user = User.objects.get(id=user_id)
        send_mail(
            subject='Welcome to CBT Platform!',
            message=f'Hi {user.first_name or "there"},\n\nWelcome to CBT Platform! We\'re excited to have you on board.\n\nStart exploring courses and practice exams today.\n\nBest regards,\nCBT Platform Team',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=True,
        )
    except User.DoesNotExist:
        pass


@shared_task
def send_exam_result_email(attempt_id):
    """Send exam result notification email."""
    from apps.exams.models import ExamAttempt
    try:
        attempt = ExamAttempt.objects.select_related('user', 'exam').get(id=attempt_id)
        status_text = 'passed' if attempt.passed else 'did not pass'
        subject = f'Exam Result: {attempt.exam.title}'

        message = (
            f'Hi {attempt.user.first_name or "there"},\n\n'
            f'Your result for "{attempt.exam.title}" is ready.\n\n'
            f'Score: {attempt.score} ({attempt.percentage}%)\n'
            f'Result: You {status_text}.\n'
            f'Passing score: {attempt.exam.passing_score}%\n\n'
        )

        if attempt.passed:
            message += 'Congratulations! You can now download your certificate from the dashboard.\n\n'

        message += 'Best regards,\nCBT Platform Team'

        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[attempt.user.email],
            fail_silently=True,
        )
    except Exception:
        pass


@shared_task
def send_certificate_email(certificate_id):
    """Send certificate ready email."""
    from .models import Certificate
    try:
        cert = Certificate.objects.select_related('user', 'course').get(id=certificate_id)
        send_mail(
            subject='Your Certificate is Ready!',
            message=(
                f'Hi {cert.user.first_name or "there"},\n\n'
                f'Congratulations! Your certificate for "{cert.course.title}" is ready.\n\n'
                f'Certificate ID: {cert.certificate_id}\n\n'
                f'You can download it from your dashboard.\n\n'
                f'Best regards,\nCBT Platform Team'
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[cert.user.email],
            fail_silently=True,
        )
    except Exception:
        pass


@shared_task
def send_password_reset_email(user_id, reset_link):
    """Send password reset email."""
    from django.contrib.auth import get_user_model
    User = get_user_model()
    try:
        user = User.objects.get(id=user_id)
        send_mail(
            subject='Password Reset Request',
            message=(
                f'Hi {user.first_name or "there"},\n\n'
                f'You requested a password reset. Click the link below to reset your password:\n\n'
                f'{reset_link}\n\n'
                f'If you didn\'t request this, ignore this email.\n\n'
                f'This link expires in 1 hour.\n\n'
                f'Best regards,\nCBT Platform Team'
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=True,
        )
    except User.DoesNotExist:
        pass


@shared_task
def send_notification_email(user_id, title, message):
    """Generic notification email sender."""
    from django.contrib.auth import get_user_model
    User = get_user_model()
    try:
        user = User.objects.get(id=user_id)
        send_mail(
            subject=title,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=True,
        )
    except User.DoesNotExist:
        pass
