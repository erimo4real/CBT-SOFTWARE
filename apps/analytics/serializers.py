from rest_framework import serializers
from .models import StudySession, UserAnalytics, Bookmark


class StudySessionSerializer(serializers.ModelSerializer):
    accuracy = serializers.SerializerMethodField()

    class Meta:
        model = StudySession
        fields = [
            'id', 'date', 'study_time', 'lessons_completed',
            'questions_attempted', 'questions_correct', 'accuracy',
        ]

    def get_accuracy(self, obj):
        if obj.questions_attempted == 0:
            return 0
        return round((obj.questions_correct / obj.questions_attempted) * 100, 1)


class UserAnalyticsSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserAnalytics
        fields = [
            'total_study_time', 'total_courses_enrolled', 'total_courses_completed',
            'total_exams_taken', 'average_score', 'streak_days', 'last_active_date',
            'xp_points', 'level',
        ]
