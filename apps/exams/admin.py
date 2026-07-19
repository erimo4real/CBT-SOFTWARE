from django.contrib import admin
from .models import Question, Exam, ExamQuestion, ExamAttempt, Answer


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ['subject', 'topic', 'question_type', 'difficulty', 'marks', 'created_by', 'created_at']
    list_filter = ['question_type', 'difficulty', 'subject']
    search_fields = ['subject', 'topic']
    raw_id_fields = ['created_by']


class ExamQuestionInline(admin.TabularInline):
    model = ExamQuestion
    extra = 0
    fields = ['question', 'marks', 'order']
    raw_id_fields = ['question']


@admin.register(Exam)
class ExamAdmin(admin.ModelAdmin):
    list_display = ['title', 'course', 'created_by', 'duration', 'total_marks', 'passing_score', 'is_published', 'created_at']
    list_filter = ['is_published']
    search_fields = ['title', 'description']
    inlines = [ExamQuestionInline]


@admin.register(ExamAttempt)
class ExamAttemptAdmin(admin.ModelAdmin):
    list_display = ['user', 'exam', 'attempt_number', 'score', 'percentage', 'passed', 'status', 'start_time']
    list_filter = ['status', 'passed']
    search_fields = ['user__email', 'exam__title']
    raw_id_fields = ['user', 'exam']


@admin.register(Answer)
class AnswerAdmin(admin.ModelAdmin):
    list_display = ['attempt', 'question', 'is_correct', 'marks_awarded', 'time_spent']
    list_filter = ['is_correct']
    raw_id_fields = ['attempt', 'question']
