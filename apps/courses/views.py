from rest_framework import generics, status, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.db.models import Count, Q
from .models import Category, Course, Enrollment, Lesson, LessonProgress
from .serializers import (
    CategorySerializer, CourseListSerializer, CourseDetailSerializer,
    LessonSerializer, EnrollmentSerializer, LessonProgressSerializer,
)
from apps.accounts.permissions import IsInstructor, IsAdmin


# ── Categories ──

class CategoryListView(generics.ListCreateAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [AllowAny]

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdmin()]
        return [AllowAny()]


class CategoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer

    def get_permissions(self):
        if self.request.method in ('PUT', 'PATCH', 'DELETE'):
            return [IsAdmin()]
        return [AllowAny()]


# ── Courses ──

class CourseListView(generics.ListCreateAPIView):
    serializer_class = CourseListSerializer

    def get_queryset(self):
        queryset = Course.objects.select_related('instructor', 'category').annotate(
            lessons_count=Count('lessons'),
            students_count=Count('enrollments'),
        )

        # Filters
        category = self.request.query_params.get('category')
        difficulty = self.request.query_params.get('difficulty')
        instructor = self.request.query_params.get('instructor')
        search = self.request.query_params.get('search')
        published = self.request.query_params.get('published')

        if category:
            queryset = queryset.filter(category_id=category)
        if difficulty:
            queryset = queryset.filter(difficulty=difficulty)
        if instructor:
            queryset = queryset.filter(instructor_id=instructor)
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) | Q(description__icontains=search)
            )
        if published is not None:
            queryset = queryset.filter(is_published=published.lower() == 'true')
        else:
            # Non-instructors only see published
            if not self.request.user.is_authenticated or not (
                self.request.user.is_instructor or self.request.user.is_admin_role
            ):
                queryset = queryset.filter(is_published=True)

        return queryset

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsInstructor()]
        return [AllowAny()]

    def perform_create(self, serializer):
        serializer.save(instructor=self.request.user)


class CourseDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CourseDetailSerializer

    def get_queryset(self):
        return Course.objects.select_related('instructor', 'category').prefetch_related('lessons').annotate(
            lessons_count=Count('lessons'),
            students_count=Count('enrollments'),
        )

    def get_permissions(self):
        if self.request.method in ('PUT', 'PATCH'):
            return [IsAuthenticated()]
        if self.request.method == 'DELETE':
            return [IsInstructor() | IsAdmin()]
        return [AllowAny()]

    def update(self, request, *args, **kwargs):
        course = self.get_object()
        if request.user != course.instructor and not request.user.is_admin_role:
            return Response({'error': 'Not your course'}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        course = self.get_object()
        if request.user != course.instructor and not request.user.is_admin_role:
            return Response({'error': 'Not your course'}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)


class InstructorCoursesView(generics.ListAPIView):
    """List courses belonging to the logged-in instructor."""
    serializer_class = CourseListSerializer
    permission_classes = [IsInstructor]

    def get_queryset(self):
        return Course.objects.filter(instructor=self.request.user).select_related(
            'category'
        ).annotate(
            lessons_count=Count('lessons'),
            students_count=Count('enrollments'),
        )


# ── Lessons ──

class LessonListView(generics.ListCreateAPIView):
    serializer_class = LessonSerializer

    def get_queryset(self):
        return Lesson.objects.filter(course_id=self.kwargs['course_pk']).select_related('course')

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsInstructor()]
        return [AllowAny()]

    def perform_create(self, serializer):
        serializer.save(course_id=self.kwargs['course_pk'])


class LessonDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = LessonSerializer

    def get_queryset(self):
        return Lesson.objects.filter(course_id=self.kwargs['course_pk'])

    def get_permissions(self):
        if self.request.method in ('PUT', 'PATCH', 'DELETE'):
            return [IsInstructor()]
        return [AllowAny()]

    def perform_update(self, serializer):
        if serializer.instance.course.created_by != self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('You can only edit your own lessons')
        serializer.save()

    def perform_destroy(self, instance):
        if instance.course.created_by != self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('You can only delete your own lessons')
        instance.delete()


# ── Enrollment ──

class EnrollmentListView(generics.ListCreateAPIView):
    serializer_class = EnrollmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Enrollment.objects.filter(user=self.request.user).select_related(
            'course', 'course__category'
        )

    def create(self, request, *args, **kwargs):
        course_id = request.data.get('course')
        if not course_id:
            return Response({'error': 'Course ID required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            course = Course.objects.get(id=course_id, is_published=True)
        except Course.DoesNotExist:
            return Response({'error': 'Course not found'}, status=status.HTTP_404_NOT_FOUND)

        enrollment, created = Enrollment.objects.get_or_create(
            user=request.user, course=course
        )
        if not created:
            return Response({'error': 'Already enrolled'}, status=status.HTTP_400_BAD_REQUEST)

        return Response(EnrollmentSerializer(enrollment, context={'request': request}).data, status=status.HTTP_201_CREATED)


class EnrollmentDetailView(generics.RetrieveDestroyAPIView):
    serializer_class = EnrollmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Enrollment.objects.filter(user=self.request.user)

    def destroy(self, request, *args, **kwargs):
        enrollment = self.get_object()
        enrollment.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── Lesson Progress ──

class LessonProgressView(generics.RetrieveUpdateAPIView):
    serializer_class = LessonProgressSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        enrollment = Enrollment.objects.filter(
            user=self.request.user, course_id=self.kwargs['course_pk']
        ).first()
        if not enrollment:
            return None

        lesson_progress, _ = LessonProgress.objects.get_or_create(
            enrollment=enrollment, lesson_id=self.kwargs['lesson_pk']
        )
        return lesson_progress

    def retrieve(self, request, *args, **kwargs):
        obj = self.get_object()
        if not obj:
            return Response({'error': 'Not enrolled'}, status=status.HTTP_404_NOT_FOUND)
        return super().retrieve(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        obj = self.get_object()
        if not obj:
            return Response({'error': 'Not enrolled'}, status=status.HTTP_404_NOT_FOUND)

        completed = request.data.get('completed', False)
        if completed and not obj.completed:
            from django.utils import timezone
            obj.completed_at = timezone.now()

        return super().update(request, *args, **kwargs)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_lesson_complete(request, course_pk, lesson_pk):
    """Quick endpoint to mark a lesson as completed."""
    enrollment = Enrollment.objects.filter(user=request.user, course_id=course_pk).first()
    if not enrollment:
        return Response({'error': 'Not enrolled in this course'}, status=status.HTTP_404_NOT_FOUND)

    lp, _ = LessonProgress.objects.get_or_create(
        enrollment=enrollment, lesson_id=lesson_pk
    )
    if not lp.completed:
        from django.utils import timezone
        lp.completed = True
        lp.completed_at = timezone.now()
        lp.save()

    return Response({'message': 'Lesson marked as complete', 'completed': True})
