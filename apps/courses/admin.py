from django.contrib import admin
from .models import Category, Course, Enrollment, Lesson, LessonProgress


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'icon', 'created_at']
    search_fields = ['name']


class LessonInline(admin.TabularInline):
    model = Lesson
    extra = 0
    fields = ['title', 'content_type', 'order', 'duration']


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ['title', 'instructor', 'category', 'difficulty', 'is_published', 'created_at']
    list_filter = ['is_published', 'difficulty', 'category']
    search_fields = ['title', 'description']
    inlines = [LessonInline]


@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    list_display = ['user', 'course', 'enrolled_at', 'completed']
    list_filter = ['completed']
    search_fields = ['user__email', 'course__title']


@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    list_display = ['title', 'course', 'content_type', 'order']
    list_filter = ['content_type']
    search_fields = ['title']


@admin.register(LessonProgress)
class LessonProgressAdmin(admin.ModelAdmin):
    list_display = ['enrollment', 'lesson', 'completed', 'watch_time', 'completed_at']
    list_filter = ['completed']
