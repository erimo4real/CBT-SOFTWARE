from django.contrib import admin
from .models import StudySession, UserAnalytics, Bookmark


@admin.register(StudySession)
class StudySessionAdmin(admin.ModelAdmin):
    list_display = ['user', 'date', 'study_time', 'lessons_completed', 'questions_attempted', 'questions_correct']
    list_filter = ['date']
    search_fields = ['user__email']


@admin.register(UserAnalytics)
class UserAnalyticsAdmin(admin.ModelAdmin):
    list_display = ['user', 'total_study_time', 'total_courses_enrolled', 'total_exams_taken', 'average_score', 'streak_days', 'xp_points', 'level']
    search_fields = ['user__email']


@admin.register(Bookmark)
class BookmarkAdmin(admin.ModelAdmin):
    list_display = ['user', 'question', 'created_at']
    search_fields = ['user__email']
    raw_id_fields = ['user', 'question']
