from django.db import models
from django.conf import settings
import uuid


class Category(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200, unique=True)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=50, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = 'Categories'
        ordering = ['name']

    def __str__(self):
        return self.name


class Course(models.Model):
    class Difficulty(models.TextChoices):
        BEGINNER = 'beginner', 'Beginner'
        INTERMEDIATE = 'intermediate', 'Intermediate'
        ADVANCED = 'advanced', 'Advanced'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=300)
    description = models.TextField()
    thumbnail = models.ImageField(upload_to='courses/thumbnails/', blank=True, null=True)
    instructor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='courses')
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='courses')
    difficulty = models.CharField(max_length=20, choices=Difficulty.choices, default=Difficulty.BEGINNER)
    estimated_duration = models.DurationField(blank=True, null=True)
    prerequisites = models.ManyToManyField('self', blank=True, symmetrical=False, related_name='required_for')
    is_published = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title

    @property
    def total_lessons(self):
        return self.lessons.count()

    @property
    def total_students(self):
        return self.enrollments.count()


class Enrollment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='enrollments')
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='enrollments')
    enrolled_at = models.DateTimeField(auto_now_add=True)
    completed = models.BooleanField(default=False)

    class Meta:
        unique_together = ['user', 'course']
        ordering = ['-enrolled_at']

    def __str__(self):
        return f'{self.user.email} - {self.course.title}'


class Lesson(models.Model):
    class ContentType(models.TextChoices):
        VIDEO = 'video', 'Video'
        PDF = 'pdf', 'PDF'
        AUDIO = 'audio', 'Audio'
        IMAGE = 'image', 'Image'
        TEXT = 'text', 'Text'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='lessons')
    title = models.CharField(max_length=300)
    content_type = models.CharField(max_length=20, choices=ContentType.choices)
    content = models.TextField(blank=True)
    file = models.FileField(upload_to='courses/lessons/', blank=True, null=True)
    duration = models.DurationField(blank=True, null=True)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f'{self.course.title} - {self.title}'


class LessonProgress(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    enrollment = models.ForeignKey(Enrollment, on_delete=models.CASCADE, related_name='lesson_progress')
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE)
    completed = models.BooleanField(default=False)
    watch_time = models.PositiveIntegerField(default=0, help_text='Time spent in seconds')
    last_position = models.PositiveIntegerField(default=0, help_text='Video position in seconds')
    completed_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        unique_together = ['enrollment', 'lesson']
