from django.db import models
from django.conf import settings
import uuid
import uuid as uuid_lib


class Certificate(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    certificate_id = models.CharField(max_length=50, unique=True, help_text='Unique public certificate ID')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='certificates')
    course = models.ForeignKey('courses.Course', on_delete=models.CASCADE, related_name='certificates')
    exam = models.ForeignKey('exams.Exam', on_delete=models.SET_NULL, null=True, blank=True, related_name='certificates')
    issued_at = models.DateTimeField(auto_now_add=True)
    score = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    instructor_name = models.CharField(max_length=200, blank=True)
    qr_code = models.ImageField(upload_to='certificates/qr/', blank=True, null=True)
    pdf_file = models.FileField(upload_to='certificates/pdf/', blank=True, null=True)

    class Meta:
        ordering = ['-issued_at']

    def __str__(self):
        return f'{self.certificate_id} - {self.user.email}'

    def save(self, *args, **kwargs):
        if not self.certificate_id:
            self.certificate_id = f'CERT-{uuid_lib.uuid4().hex[:12].upper()}'
        super().save(*args, **kwargs)


class Notification(models.Model):
    class Type(models.TextChoices):
        INFO = 'info', 'Info'
        EXAM = 'exam', 'Exam'
        RESULT = 'result', 'Result'
        CERTIFICATE = 'certificate', 'Certificate'
        COURSE = 'course', 'Course'
        ANNOUNCEMENT = 'announcement', 'Announcement'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    type = models.CharField(max_length=20, choices=Type.choices, default=Type.INFO)
    title = models.CharField(max_length=300)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    link = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.user.email} - {self.title}'

    def mark_read(self):
        self.is_read = True
        self.save(update_fields=['is_read'])
