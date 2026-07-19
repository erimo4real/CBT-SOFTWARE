from rest_framework import serializers
from .models import Category, Course, Enrollment, Lesson, LessonProgress


class CategorySerializer(serializers.ModelSerializer):
    course_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ['id', 'name', 'description', 'icon', 'course_count', 'created_at']

    def get_course_count(self, obj):
        return obj.courses.filter(is_published=True).count()


class LessonSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lesson
        fields = [
            'id', 'course', 'title', 'content_type', 'content',
            'file', 'duration', 'order', 'created_at',
        ]
        read_only_fields = ['id', 'course', 'created_at']


class LessonDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lesson
        fields = [
            'id', 'course', 'title', 'content_type', 'content',
            'file', 'duration', 'order', 'created_at',
        ]
        read_only_fields = ['id', 'course', 'created_at']


class CourseListSerializer(serializers.ModelSerializer):
    instructor_name = serializers.CharField(source='instructor.full_name', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True, default=None)
    lessons_count = serializers.IntegerField(read_only=True)
    students_count = serializers.IntegerField(read_only=True)
    thumbnail_url = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            'id', 'title', 'description', 'thumbnail_url', 'instructor',
            'instructor_name', 'category', 'category_name', 'difficulty',
            'estimated_duration', 'is_published', 'lessons_count',
            'students_count', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'instructor', 'created_at', 'updated_at']

    def get_thumbnail_url(self, obj):
        if obj.thumbnail:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.thumbnail.url)
            return obj.thumbnail.url
        return None


class CourseDetailSerializer(serializers.ModelSerializer):
    instructor_name = serializers.CharField(source='instructor.full_name', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True, default=None)
    lessons = LessonSerializer(many=True, read_only=True)
    lessons_count = serializers.IntegerField(read_only=True)
    students_count = serializers.IntegerField(read_only=True)
    thumbnail_url = serializers.SerializerMethodField()
    is_enrolled = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            'id', 'title', 'description', 'thumbnail_url', 'instructor',
            'instructor_name', 'category', 'category_name', 'difficulty',
            'estimated_duration', 'is_published', 'lessons', 'lessons_count',
            'students_count', 'is_enrolled', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'instructor', 'created_at', 'updated_at']

    def get_thumbnail_url(self, obj):
        if obj.thumbnail:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.thumbnail.url)
            return obj.thumbnail.url
        return None

    def get_is_enrolled(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return Enrollment.objects.filter(user=request.user, course=obj).exists()
        return False


class EnrollmentSerializer(serializers.ModelSerializer):
    course_title = serializers.CharField(source='course.title', read_only=True)
    course_thumbnail = serializers.SerializerMethodField()
    progress = serializers.SerializerMethodField()

    class Meta:
        model = Enrollment
        fields = ['id', 'course', 'course_title', 'course_thumbnail', 'enrolled_at', 'completed', 'progress']

    def get_course_thumbnail(self, obj):
        if obj.course.thumbnail:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.course.thumbnail.url)
            return obj.course.thumbnail.url
        return None

    def get_progress(self, obj):
        total = obj.course.lessons.count()
        if total == 0:
            return 0
        completed = LessonProgress.objects.filter(
            enrollment=obj, completed=True
        ).count()
        return round((completed / total) * 100, 1)


class LessonProgressSerializer(serializers.ModelSerializer):
    lesson_title = serializers.CharField(source='lesson.title', read_only=True)

    class Meta:
        model = LessonProgress
        fields = [
            'id', 'lesson', 'lesson_title', 'completed',
            'watch_time', 'last_position', 'completed_at',
        ]
        read_only_fields = ['id', 'completed_at']
