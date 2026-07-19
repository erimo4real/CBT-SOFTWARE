from django.contrib import admin
from .models import Certificate, Notification


@admin.register(Certificate)
class CertificateAdmin(admin.ModelAdmin):
    list_display = ['certificate_id', 'user', 'course', 'score', 'instructor_name', 'issued_at']
    search_fields = ['certificate_id', 'user__email', 'course__title']
    raw_id_fields = ['user', 'course', 'exam']


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['user', 'type', 'title', 'is_read', 'created_at']
    list_filter = ['type', 'is_read']
    search_fields = ['user__email', 'title']
    raw_id_fields = ['user']
