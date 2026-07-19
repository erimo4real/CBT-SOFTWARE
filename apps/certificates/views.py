from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.conf import settings
import qrcode
import io
from io import BytesIO
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
from reportlab.lib import colors

from .models import Certificate, Notification
from .serializers import (
    CertificateSerializer, CertificateVerifySerializer, NotificationSerializer,
)
from apps.accounts.permissions import IsInstructor, IsAdmin
from apps.courses.models import Enrollment
from apps.exams.models import ExamAttempt


# ── Certificate Generation ──

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_certificate(request):
    """Generate a certificate for a completed course/exam.
    Body: { course: uuid, exam: uuid (optional) }
    """
    course_id = request.data.get('course')
    exam_id = request.data.get('exam')

    if not course_id:
        return Response({'error': 'Course ID required'}, status=status.HTTP_400_BAD_REQUEST)

    enrollment = Enrollment.objects.filter(
        user=request.user, course_id=course_id, completed=True
    ).first()

    if not enrollment:
        return Response(
            {'error': 'You have not completed this course'},
            status=status.HTTP_400_BAD_REQUEST
        )

    existing = Certificate.objects.filter(
        user=request.user, course_id=course_id
    ).first()
    if existing:
        return Response(
            CertificateSerializer(existing, context={'request': request}).data,
            status=status.HTTP_200_OK
        )

    score = None
    if exam_id:
        best_attempt = ExamAttempt.objects.filter(
            user=request.user, exam_id=exam_id, status='completed'
        ).order_by('-percentage').first()
        if best_attempt:
            score = best_attempt.percentage

    certificate = Certificate(
        user=request.user,
        course_id=course_id,
        exam_id=exam_id,
        score=score,
        instructor_name=enrollment.course.instructor.full_name,
    )
    certificate.save()

    # Generate QR code
    verify_url = f'{request.scheme}://{request.get_host()}/api/certificates/verify/{certificate.certificate_id}/'
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(verify_url)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color='black', back_color='white')

    qr_buffer = BytesIO()
    qr_img.save(qr_buffer, format='PNG')
    qr_buffer.seek(0)

    from django.core.files.base import ContentFile
    qr_name = f'{certificate.certificate_id}_qr.png'
    certificate.qr_code.save(qr_name, ContentFile(qr_buffer.read()), save=True)

    # Generate PDF certificate
    pdf_buffer = BytesIO()
    c = canvas.Canvas(pdf_buffer, pagesize=landscape(A4))
    width, height = landscape(A4)

    # Border
    c.setStrokeColor(colors.HexColor('#2563eb'))
    c.setLineWidth(3)
    c.rect(20, 20, width - 40, height - 40)

    # Inner border
    c.setStrokeColor(colors.HexColor('#93c5fd'))
    c.setLineWidth(1)
    c.rect(30, 30, width - 60, height - 60)

    # Title
    c.setFont('Helvetica-Bold', 36)
    c.setFillColor(colors.HexColor('#1e3a5f'))
    c.drawCentredString(width / 2, height - 100, 'Certificate of Completion')

    # Line
    c.setStrokeColor(colors.HexColor('#2563eb'))
    c.setLineWidth(2)
    c.line(width / 4, height - 120, 3 * width / 4, height - 120)

    # Body
    c.setFont('Helvetica', 16)
    c.setFillColor(colors.black)
    c.drawCentredString(width / 2, height - 170, 'This certifies that')

    # Name
    c.setFont('Helvetica-Bold', 28)
    c.setFillColor(colors.HexColor('#2563eb'))
    c.drawCentredString(width / 2, height - 210, request.user.full_name)

    # Course
    c.setFont('Helvetica', 16)
    c.setFillColor(colors.black)
    c.drawCentredString(width / 2, height - 250, 'has successfully completed the course')

    c.setFont('Helvetica-Bold', 22)
    c.setFillColor(colors.HexColor('#1e3a5f'))
    c.drawCentredString(width / 2, height - 285, enrollment.course.title)

    # Score
    if score:
        c.setFont('Helvetica', 14)
        c.drawCentredString(width / 2, height - 315, f'Score: {score}%')

    # Date
    c.setFont('Helvetica', 12)
    c.drawCentredString(width / 2, height - 345, f'Issued: {timezone.now().strftime("%B %d, %Y")}')

    # Certificate ID
    c.setFont('Helvetica', 10)
    c.setFillColor(colors.gray)
    c.drawCentredString(width / 2, height - 370, f'Certificate ID: {certificate.certificate_id}')

    # Instructor
    c.setFont('Helvetica', 14)
    c.setFillColor(colors.black)
    c.drawString(width / 2 - 100, 80, f'Instructor: {certificate.instructor_name}')
    c.line(width / 2 - 100, 77, width / 2 + 100, 77)

    c.save()

    pdf_buffer.seek(0)
    pdf_name = f'{certificate.certificate_id}.pdf'
    certificate.pdf_file.save(pdf_name, ContentFile(pdf_buffer.read()), save=True)

    # Create notification
    Notification.objects.create(
        user=request.user,
        type='certificate',
        title='Certificate Issued!',
        message=f'Your certificate for "{enrollment.course.title}" has been generated.',
        link=f'/certificates/{certificate.certificate_id}',
    )

    return Response(
        CertificateSerializer(certificate, context={'request': request}).data,
        status=status.HTTP_201_CREATED
    )


# ── Certificate List ──

class CertificateListView(generics.ListAPIView):
    serializer_class = CertificateSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Certificate.objects.filter(user=self.request.user).select_related('course', 'user')


# ── Certificate Verification (Public) ──

@api_view(['GET'])
@permission_classes([AllowAny])
def verify_certificate(request, certificate_id):
    """Public endpoint to verify a certificate by its ID."""
    certificate = get_object_or_404(Certificate, certificate_id=certificate_id)
    serializer = CertificateVerifySerializer(certificate)
    return Response(serializer.data)


# ── Notifications ──

class NotificationListView(generics.ListAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Notification.objects.filter(user=self.request.user)
        unread_only = self.request.query_params.get('unread')
        if unread_only == 'true':
            queryset = queryset.filter(is_read=False)
        return queryset


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_notification_read(request, notification_id):
    """Mark a notification as read."""
    notification = get_object_or_404(Notification, id=notification_id, user=request.user)
    notification.mark_read()
    return Response({'message': 'Marked as read'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_all_notifications_read(request):
    """Mark all notifications as read."""
    count = Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
    return Response({'message': f'{count} notifications marked as read'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def notification_count(request):
    """Get unread notification count."""
    count = Notification.objects.filter(user=request.user, is_read=False).count()
    return Response({'unread_count': count})
