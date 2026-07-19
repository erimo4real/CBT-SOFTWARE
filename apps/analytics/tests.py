from django.test import TestCase
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from apps.analytics.models import StudySession, UserAnalytics, Bookmark
from apps.exams.models import Question, Exam, ExamAttempt, Answer, ExamQuestion
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()


class StudySessionModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(email='ss@test.com', password='pass')
        self.session = StudySession.objects.create(
            user=self.user, date=timezone.now().date(),
            study_time=3600, questions_attempted=20, questions_correct=15,
        )

    def test_str(self):
        self.assertIn('ss@test.com', str(self.session))


class UserAnalyticsModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(email='ua@test.com', password='pass')
        self.analytics = UserAnalytics.objects.get_or_create(user=self.user)[0]

    def test_str(self):
        self.assertIn('ua@test.com', str(self.analytics))

    def test_defaults(self):
        self.assertEqual(self.analytics.streak_days, 0)
        self.assertEqual(self.analytics.xp_points, 0)
        self.assertEqual(self.analytics.level, 1)


class LeaderboardTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email='lb@test.com', password='pass')
        self.token = str(RefreshToken.for_user(self.user).access_token)

        # Create some analytics
        for i in range(3):
            u = User.objects.create_user(
                email=f'lb{i}@test.com', password='pass', role='student',
            )
            a = UserAnalytics.objects.get_or_create(user=u)[0]
            a.xp_points = (3 - i) * 100
            a.streak_days = 3 - i
            a.save()

    def test_leaderboard_xp(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')
        res = self.client.get('/api/analytics/leaderboard/', {'sort': 'xp'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data['leaderboard']), 3)
        self.assertEqual(res.data['leaderboard'][0]['rank'], 1)

    def test_leaderboard_streak(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')
        res = self.client.get('/api/analytics/leaderboard/', {'sort': 'streak'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_leaderboard_score(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')
        res = self.client.get('/api/analytics/leaderboard/', {'sort': 'score'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)


class StudentDashboardTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='dash@test.com', password='pass', role='student',
        )
        self.token = str(RefreshToken.for_user(self.user).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')

    def test_dashboard_empty(self):
        res = self.client.get('/api/analytics/dashboard/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('stats', res.data)
        self.assertEqual(res.data['stats']['enrolled_courses'], 0)

    def test_dashboard_unauthenticated(self):
        self.client.credentials()
        res = self.client.get('/api/analytics/dashboard/')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)


class WeakTopicsTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email='wt@test.com', password='pass')
        self.instructor = User.objects.create_user(email='wti@test.com', password='pass', role='instructor')
        self.token = str(RefreshToken.for_user(self.user).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')

        self.exam = Exam.objects.create(
            title='WT Exam', created_by=self.instructor,
            duration=timedelta(minutes=30), total_marks=10, passing_score=50,
            is_published=True,
        )
        self.q = Question.objects.create(
            subject='Physics', topic='Forces', question_type='mcq',
            content={'text': 'Force = ?'}, options=['ma', 'mv', 'mg'],
            correct_answer=0, marks=1, created_by=self.instructor,
        )
        eq = ExamQuestion.objects.create(exam=self.exam, question=self.q, marks=1)

        res = self.client.post(f'/api/exams/exams/{self.exam.id}/start/')
        self.attempt_id = res.data['attempt']['id']
        self.client.post(f'/api/exams/attempts/{self.attempt_id}/save/', {
            'question': str(self.q.id), 'selected_option': 1,
        })
        self.client.post(f'/api/exams/attempts/{self.attempt_id}/submit/', {
            'tab_switches': 0, 'violations': [],
        })

    def test_weak_topics(self):
        res = self.client.get('/api/analytics/weak-topics/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIsInstance(res.data, (list, dict))


class StudyAnalyticsTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email='sa@test.com', password='pass')
        self.token = str(RefreshToken.for_user(self.user).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')

        StudySession.objects.create(
            user=self.user, date=timezone.now().date(),
            study_time=1800, questions_attempted=10, questions_correct=8,
        )

    def test_study_analytics(self):
        res = self.client.get('/api/analytics/study/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('daily', res.data)
        self.assertTrue(len(res.data['daily']) > 0)


class BookmarkTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email='bk@test.com', password='pass')
        self.instructor = User.objects.create_user(email='bki@test.com', password='pass', role='instructor')
        self.token = str(RefreshToken.for_user(self.user).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')
        self.question = Question.objects.create(
            subject='Math', question_type='mcq',
            content={'text': 'Bookmark Q'}, options=['A', 'B'],
            correct_answer=0, created_by=self.instructor,
        )

    def test_create_bookmark(self):
        res = self.client.post('/api/exams/bookmarks/', {
            'question_id': str(self.question.id),
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_list_bookmarks(self):
        Bookmark.objects.create(user=self.user, question=self.question)
        res = self.client.get('/api/exams/bookmarks/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_delete_bookmark(self):
        b = Bookmark.objects.create(user=self.user, question=self.question)
        res = self.client.delete(f'/api/exams/bookmarks/{b.id}/')
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
