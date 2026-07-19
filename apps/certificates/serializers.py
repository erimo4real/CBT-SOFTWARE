from rest_framework import serializers
from .models import Certificate, Notification


class CertificateSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.full_name', read_only=True)
    course_title = serializers.CharField(source='course.title', read_only=True)
    instructor_name = serializers.CharField(read_only=True)
    verification_url = serializers.SerializerMethodField()

    class Meta:
        model = Certificate
        fields = [
            'id', 'certificate_id', 'user', 'user_name', 'course',
            'course_title', 'exam', 'issued_at', 'score',
            'instructor_name', 'qr_code', 'pdf_file', 'verification_url',
        ]
        read_only_fields = ['id', 'certificate_id', 'issued_at', 'user']

    def get_verification_url(self, obj):
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(f'/api/certificates/verify/{obj.certificate_id}/')
        return f'/api/certificates/verify/{obj.certificate_id}/'


class CertificateVerifySerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.full_name', read_only=True)
    course_title = serializers.CharField(source='course.title', read_only=True)
    instructor_name = serializers.CharField(read_only=True)
    is_valid = serializers.SerializerMethodField()

    class Meta:
        model = Certificate
        fields = [
            'certificate_id', 'user_name', 'course_title', 'instructor_name',
            'issued_at', 'score', 'is_valid',
        ]

    def get_is_valid(self, obj):
        return obj.pdf_file is not None or obj.qr_code is not None


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'type', 'title', 'message', 'is_read', 'link', 'created_at']
        read_only_fields = ['id', 'created_at']
