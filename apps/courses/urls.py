from django.urls import path
from . import views

app_name = 'courses'

urlpatterns = [
    # Class Levels
    path('class-levels/', views.ClassLevelListView.as_view(), name='classlevel-list'),
    path('class-levels/<uuid:pk>/', views.ClassLevelDetailView.as_view(), name='classlevel-detail'),

    # Categories
    path('categories/', views.CategoryListView.as_view(), name='category-list'),
    path('categories/<uuid:pk>/', views.CategoryDetailView.as_view(), name='category-detail'),

    # Courses
    path('', views.CourseListView.as_view(), name='course-list'),
    path('my-courses/', views.InstructorCoursesView.as_view(), name='instructor-courses'),
    path('<uuid:pk>/', views.CourseDetailView.as_view(), name='course-detail'),

    # Lessons (nested under course)
    path('<uuid:course_pk>/lessons/', views.LessonListView.as_view(), name='lesson-list'),
    path('<uuid:course_pk>/lessons/<uuid:pk>/', views.LessonDetailView.as_view(), name='lesson-detail'),

    # Enrollment
    path('enrollments/', views.EnrollmentListView.as_view(), name='enrollment-list'),
    path('enrollments/<uuid:pk>/', views.EnrollmentDetailView.as_view(), name='enrollment-detail'),

    # Lesson progress
    path('<uuid:course_pk>/lessons/<uuid:lesson_pk>/progress/', views.LessonProgressView.as_view(), name='lesson-progress'),
    path('<uuid:course_pk>/lessons/<uuid:lesson_pk>/complete/', views.mark_lesson_complete, name='mark-lesson-complete'),
]
