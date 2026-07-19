from django.db import models
from django.conf import settings
import uuid


class StudySession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='study_sessions')
    date = models.DateField()
    study_time = models.PositiveIntegerField(default=0, help_text='Total study time in seconds')
    lessons_completed = models.PositiveIntegerField(default=0)
    questions_attempted = models.PositiveIntegerField(default=0)
    questions_correct = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = ['user', 'date']
        ordering = ['-date']

    def __str__(self):
        return f'{self.user.email} - {self.date}'


class UserAnalytics(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='analytics')
    total_study_time = models.PositiveIntegerField(default=0)
    total_courses_enrolled = models.PositiveIntegerField(default=0)
    total_courses_completed = models.PositiveIntegerField(default=0)
    total_exams_taken = models.PositiveIntegerField(default=0)
    average_score = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    streak_days = models.PositiveIntegerField(default=0)
    last_active_date = models.DateField(blank=True, null=True)
    xp_points = models.PositiveIntegerField(default=0)
    level = models.PositiveIntegerField(default=1)

    def __str__(self):
        return f'Analytics: {self.user.email}'


class Bookmark(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='bookmarks')
    question = models.ForeignKey('exams.Question', on_delete=models.CASCADE, related_name='bookmarks')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['user', 'question']
        ordering = ['-created_at']
