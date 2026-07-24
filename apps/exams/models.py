from django.db import models
from django.conf import settings
import uuid
import json


class Question(models.Model):
    class Type(models.TextChoices):
        MCQ = 'mcq', 'Multiple Choice'
        TRUE_FALSE = 'true_false', 'True/False'
        FILL_BLANK = 'fill_blank', 'Fill in the Blank'
        ESSAY = 'essay', 'Essay'
        CODING = 'coding', 'Coding'

    class Difficulty(models.TextChoices):
        EASY = 'easy', 'Easy'
        MEDIUM = 'medium', 'Medium'
        HARD = 'hard', 'Hard'

    CLASS_LEVELS = [
        ('JSS1', 'JSS1'), ('JSS2', 'JSS2'), ('JSS3', 'JSS3'),
        ('SS1', 'SS1'), ('SS2', 'SS2'), ('SS3', 'SS3'),
        ('Level 100', 'Level 100'), ('Level 200', 'Level 200'),
        ('Level 300', 'Level 300'), ('Level 400', 'Level 400'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    subject = models.CharField(max_length=200)
    topic = models.CharField(max_length=200, blank=True)
    class_level = models.CharField(max_length=50, choices=CLASS_LEVELS, blank=True)
    question_type = models.CharField(max_length=20, choices=Type.choices)
    difficulty = models.CharField(max_length=20, choices=Difficulty.choices, default=Difficulty.MEDIUM)
    content = models.JSONField(help_text='Question content with rich text, images, code blocks')
    options = models.JSONField(blank=True, null=True, help_text='Answer options for MCQ')
    correct_answer = models.JSONField(help_text='Correct answer(s)')
    explanation = models.TextField(blank=True)
    marks = models.PositiveIntegerField(default=1)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='questions')
    tags = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.subject}: {self.question_type}'


class Exam(models.Model):
    CLASS_LEVELS = Question.CLASS_LEVELS

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=300)
    description = models.TextField(blank=True)
    class_level = models.CharField(max_length=50, choices=CLASS_LEVELS, blank=True)
    course = models.ForeignKey('courses.Course', on_delete=models.SET_NULL, null=True, blank=True, related_name='exams')
    subjects = models.ManyToManyField('courses.Category', blank=True, related_name='exams')
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='exams')
    duration = models.DurationField(help_text='Exam duration')
    total_marks = models.PositiveIntegerField(default=100)
    passing_score = models.PositiveIntegerField(default=50)
    start_date = models.DateTimeField(blank=True, null=True)
    end_date = models.DateTimeField(blank=True, null=True)
    allowed_attempts = models.PositiveIntegerField(default=1)
    config = models.JSONField(default=dict, blank=True, help_text='Shuffle, random, pool settings')
    anti_cheating = models.JSONField(default=dict, blank=True)
    is_published = models.BooleanField(default=False)
    is_visible = models.BooleanField(default=False, help_text='Controls whether students see this exam')
    visible_from = models.DateTimeField(blank=True, null=True, help_text='Auto-reveal at this time')
    visible_until = models.DateTimeField(blank=True, null=True, help_text='Auto-hide at this time')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title

    @property
    def is_currently_visible(self):
        from django.utils import timezone
        now = timezone.now()
        if not self.is_visible:
            return False
        if self.visible_from and now < self.visible_from:
            return False
        if self.visible_until and now > self.visible_until:
            return False
        return True

    @property
    def subject_names(self):
        return list(self.subjects.values_list('name', flat=True))


class ExamQuestion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name='exam_questions')
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    marks = models.PositiveIntegerField(default=1)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']
        unique_together = ['exam', 'question']


class ExamAttempt(models.Model):
    class Status(models.TextChoices):
        IN_PROGRESS = 'in_progress', 'In Progress'
        COMPLETED = 'completed', 'Completed'
        TIMED_OUT = 'timed_out', 'Timed Out'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='exam_attempts')
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name='attempts')
    attempt_number = models.PositiveIntegerField(default=1)
    start_time = models.DateTimeField(auto_now_add=True)
    end_time = models.DateTimeField(blank=True, null=True)
    score = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    percentage = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    passed = models.BooleanField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.IN_PROGRESS)
    answers = models.JSONField(default=dict, blank=True)
    tab_switches = models.PositiveIntegerField(default=0)
    violations = models.JSONField(default=list, blank=True)

    class Meta:
        ordering = ['-start_time']
        unique_together = ['user', 'exam', 'attempt_number']

    def __str__(self):
        return f'{self.user.email} - {self.exam.title} (#{self.attempt_number})'


class Answer(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    attempt = models.ForeignKey(ExamAttempt, on_delete=models.CASCADE, related_name='answer_set')
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    selected_option = models.JSONField(blank=True, null=True)
    answer_text = models.TextField(blank=True)
    is_correct = models.BooleanField(blank=True, null=True)
    marks_awarded = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    time_spent = models.PositiveIntegerField(default=0, help_text='Time spent in seconds')

    class Meta:
        unique_together = ['attempt', 'question']
