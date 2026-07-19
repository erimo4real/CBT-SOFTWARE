from django.test import TestCase
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from apps.courses.models import Category, Course, Enrollment, Lesson, LessonProgress
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()


class CategoryModelTest(TestCase):
    def test_create(self):
        cat = Category.objects.create(name='Computer Science', description='CS courses')
        self.assertEqual(str(cat), 'Computer Science')


class CourseModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(email='cr@test.com', password='pass', role='instructor')
        self.category = Category.objects.create(name='Math')
        self.course = Course.objects.create(
            title='Algebra 101', description='Basics',
            instructor=self.user, category=self.category,
            difficulty='beginner',
        )

    def test_str(self):
        self.assertEqual(str(self.course), 'Algebra 101')

    def test_total_lessons(self):
        self.assertEqual(self.course.total_lessons, 0)
        Lesson.objects.create(course=self.course, title='L1', content_type='text', order=1)
        self.assertEqual(self.course.total_lessons, 1)

    def test_total_students(self):
        self.assertEqual(self.course.total_students, 0)


class CourseAPITest(APITestCase):
    def setUp(self):
        self.instructor = User.objects.create_user(
            email='ci@test.com', password='pass', role='instructor',
        )
        self.token = str(RefreshToken.for_user(self.instructor).access_token)
        self.category = Category.objects.create(name='Science')
        self.course = Course.objects.create(
            title='Physics 101', description='Mechanics',
            instructor=self.instructor, category=self.category,
            is_published=True,
        )

    def test_list_courses(self):
        res = self.client.get('/api/courses/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_get_course(self):
        res = self.client.get(f'/api/courses/{self.course.id}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_create_course(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')
        res = self.client.post('/api/courses/', {
            'title': 'New Course', 'description': 'Desc',
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_create_category(self):
        admin = User.objects.create_user(email='adminc@test.com', password='pass', role='admin')
        admin_token = str(RefreshToken.for_user(admin).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {admin_token}')
        res = self.client.post('/api/courses/categories/', {
            'name': 'Technology',
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)


class EnrollmentTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email='en@test.com', password='pass')
        self.instructor = User.objects.create_user(email='eni@test.com', password='pass', role='instructor')
        self.token = str(RefreshToken.for_user(self.user).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')

        self.course = Course.objects.create(
            title='Enroll Course', description='Desc',
            instructor=self.instructor, is_published=True,
        )

    def test_enroll(self):
        res = self.client.post('/api/courses/enrollments/', {
            'course': str(self.course.id),
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Enrollment.objects.filter(user=self.user, course=self.course).exists())

    def test_duplicate_enroll(self):
        self.client.post('/api/courses/enrollments/', {'course': str(self.course.id)})
        res = self.client.post('/api/courses/enrollments/', {'course': str(self.course.id)})
        self.assertIn(res.status_code, [status.HTTP_400_BAD_REQUEST, status.HTTP_409_CONFLICT])

    def test_list_enrollments(self):
        Enrollment.objects.create(user=self.user, course=self.course)
        res = self.client.get('/api/courses/enrollments/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)


class LessonModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(email='ls@test.com', password='pass', role='instructor')
        self.course = Course.objects.create(
            title='Lesson Course', description='D',
            instructor=self.user, is_published=True,
        )
        self.lesson = Lesson.objects.create(
            course=self.course, title='Introduction',
            content_type='text', content='Hello world', order=1,
        )

    def test_str(self):
        self.assertIn('Introduction', str(self.lesson))
