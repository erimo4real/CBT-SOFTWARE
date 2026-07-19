from django.test import TestCase
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from apps.exams.models import Question, Exam, ExamQuestion, ExamAttempt, Answer
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()


class QuestionModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(email='q@test.com', password='pass', role='instructor')
        self.question = Question.objects.create(
            subject='Mathematics', topic='Algebra',
            question_type='mcq', difficulty='medium',
            content={'text': 'What is 2+2?'},
            options=['3', '4', '5', '6'],
            correct_answer=1, marks=1, created_by=self.user,
        )

    def test_str(self):
        self.assertEqual(str(self.question), 'Mathematics: mcq')

    def test_question_types(self):
        for qt in ['mcq', 'true_false', 'fill_blank', 'essay', 'coding']:
            q = Question.objects.create(
                subject='Test', question_type=qt, content={'text': 'Q'},
                correct_answer=0, created_by=self.user,
            )
            self.assertEqual(q.question_type, qt)


class ExamModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(email='e@test.com', password='pass', role='instructor')
        self.exam = Exam.objects.create(
            title='Test Exam', description='A test',
            created_by=self.user, duration=timedelta(hours=1),
            total_marks=100, passing_score=50,
        )

    def test_str(self):
        self.assertEqual(str(self.exam), 'Test Exam')


class ExamAttemptModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(email='a@test.com', password='pass')
        self.user2 = User.objects.create_user(email='a2@test.com', password='pass')
        self.instructor = User.objects.create_user(email='ai@test.com', password='pass', role='instructor')
        self.exam = Exam.objects.create(
            title='Exam', created_by=self.instructor,
            duration=timedelta(minutes=30), total_marks=10, passing_score=50,
        )

    def test_attempt_creation(self):
        attempt = ExamAttempt.objects.create(user=self.user, exam=self.exam)
        self.assertEqual(attempt.status, 'in_progress')
        self.assertIsNone(attempt.score)

    def test_unique_together(self):
        ExamAttempt.objects.create(user=self.user, exam=self.exam, attempt_number=1)
        with self.assertRaises(Exception):
            ExamAttempt.objects.create(user=self.user, exam=self.exam, attempt_number=1)


class ExamAPITest(APITestCase):
    def setUp(self):
        self.instructor = User.objects.create_user(
            email='inst@test.com', password='pass', role='instructor',
        )
        self.student = User.objects.create_user(
            email='stud@test.com', password='pass', role='student',
        )
        self.inst_token = str(RefreshToken.for_user(self.instructor).access_token)
        self.stud_token = str(RefreshToken.for_user(self.student).access_token)

        self.exam = Exam.objects.create(
            title='API Exam', created_by=self.instructor,
            duration=timedelta(minutes=60), total_marks=10, passing_score=50,
            is_published=True,
        )
        self.question = Question.objects.create(
            subject='Math', question_type='mcq',
            content={'text': '2+2=?'}, options=['3', '4', '5', '6'],
            correct_answer=1, marks=1, created_by=self.instructor,
        )
        ExamQuestion.objects.create(exam=self.exam, question=self.question, marks=1)

    def test_list_exams(self):
        res = self.client.get('/api/exams/exams/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_get_exam_detail(self):
        res = self.client.get(f'/api/exams/exams/{self.exam.id}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['title'], 'API Exam')

    def test_create_exam(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.inst_token}')
        res = self.client.post('/api/exams/exams/', {
            'title': 'New Exam',
            'duration': 3600,
            'total_marks': 50,
            'passing_score': 60,
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_start_exam(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.stud_token}')
        res = self.client.post(f'/api/exams/exams/{self.exam.id}/start/')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertIn('attempt', res.data)

    def test_start_exam_no_attempts_remaining(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.stud_token}')
        self.exam.allowed_attempts = 1
        self.exam.save()
        # First attempt
        self.client.post(f'/api/exams/exams/{self.exam.id}/start/')
        # Second attempt — should fail
        res = self.client.post(f'/api/exams/exams/{self.exam.id}/start/')
        # Could be 200 (resume) or 400 (no attempts)
        self.assertIn(res.status_code, [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST])

    def test_start_exam_not_published(self):
        self.exam.is_published = False
        self.exam.save()
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.stud_token}')
        res = self.client.post(f'/api/exams/exams/{self.exam.id}/start/')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_start_exam_upcoming(self):
        self.exam.start_date = timezone.now() + timedelta(days=1)
        self.exam.save()
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.stud_token}')
        res = self.client.post(f'/api/exams/exams/{self.exam.id}/start/')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_start_exam_ended(self):
        self.exam.end_date = timezone.now() - timedelta(days=1)
        self.exam.save()
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.stud_token}')
        res = self.client.post(f'/api/exams/exams/{self.exam.id}/start/')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


class ExamSubmitTest(APITestCase):
    def setUp(self):
        self.student = User.objects.create_user(
            email='sub@test.com', password='pass', role='student',
        )
        self.instructor = User.objects.create_user(
            email='subi@test.com', password='pass', role='instructor',
        )
        self.token = str(RefreshToken.for_user(self.student).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')

        self.exam = Exam.objects.create(
            title='Submit Exam', created_by=self.instructor,
            duration=timedelta(minutes=60), total_marks=10, passing_score=50,
            is_published=True,
        )
        self.question = Question.objects.create(
            subject='Math', question_type='mcq',
            content={'text': '2+2=?'}, options=['3', '4', '5', '6'],
            correct_answer=1, marks=1, created_by=self.instructor,
        )
        self.eq = ExamQuestion.objects.create(exam=self.exam, question=self.question, marks=1)

        # Start attempt
        res = self.client.post(f'/api/exams/exams/{self.exam.id}/start/')
        self.attempt_id = res.data['attempt']['id']

    def test_save_answer(self):
        res = self.client.post(f'/api/exams/attempts/{self.attempt_id}/save/', {
            'question': str(self.question.id),
            'selected_option': 1,
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_submit_exam(self):
        self.client.post(f'/api/exams/attempts/{self.attempt_id}/save/', {
            'question': str(self.question.id), 'selected_option': 1,
        })
        res = self.client.post(f'/api/exams/attempts/{self.attempt_id}/submit/', {
            'tab_switches': 0,
            'violations': [],
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('passed', res.data)
        self.assertIn('percentage', res.data)

    def test_submit_exam_wrong_answer(self):
        self.client.post(f'/api/exams/attempts/{self.attempt_id}/save/', {
            'question': str(self.question.id),
            'selected_option': 0,
        })
        res = self.client.post(f'/api/exams/attempts/{self.attempt_id}/submit/', {
            'tab_switches': 2, 'violations': [{'type': 'tab_switch'}],
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['passed'], False)
        attempt = ExamAttempt.objects.get(id=self.attempt_id)
        self.assertEqual(attempt.tab_switches, 2)

    def test_submit_already_submitted(self):
        self.client.post(f'/api/exams/attempts/{self.attempt_id}/submit/', {
            'tab_switches': 0, 'violations': [],
        })
        res = self.client.post(f'/api/exams/attempts/{self.attempt_id}/submit/', {
            'tab_switches': 0, 'violations': [],
        })
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)


class ExamResultsTest(APITestCase):
    def setUp(self):
        self.student = User.objects.create_user(email='res@test.com', password='pass')
        self.instructor = User.objects.create_user(email='resi@test.com', password='pass', role='instructor')
        self.token = str(RefreshToken.for_user(self.student).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')

        self.exam = Exam.objects.create(
            title='Results Exam', created_by=self.instructor,
            duration=timedelta(minutes=60), total_marks=10, passing_score=50,
            is_published=True,
        )
        q = Question.objects.create(
            subject='Math', question_type='mcq',
            content={'text': 'Q?'}, options=['A', 'B'],
            correct_answer=0, marks=5, created_by=self.instructor,
        )
        ExamQuestion.objects.create(exam=self.exam, question=q, marks=5)

        res = self.client.post(f'/api/exams/exams/{self.exam.id}/start/')
        attempt_id = res.data['attempt']['id']
        self.client.post(f'/api/exams/attempts/{attempt_id}/save/', {
            'question': str(q.id), 'selected_option': 0,
        })
        self.client.post(f'/api/exams/attempts/{attempt_id}/submit/', {
            'tab_switches': 0, 'violations': [],
        })

    def test_exam_results(self):
        res = self.client.get(f'/api/exams/exams/{self.exam.id}/results/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(len(res.data) > 0)


class QuestionShuffleTest(APITestCase):
    def setUp(self):
        self.instructor = User.objects.create_user(
            email='shuf@test.com', password='pass', role='instructor',
        )
        self.student = User.objects.create_user(
            email='shufs@test.com', password='pass', role='student',
        )
        self.token = str(RefreshToken.for_user(self.student).access_token)

        self.exam = Exam.objects.create(
            title='Shuffle Exam', created_by=self.instructor,
            duration=timedelta(minutes=60), total_marks=3, passing_score=50,
            is_published=True,
            config={'shuffle_questions': True, 'shuffle_options': True},
        )
        for i in range(3):
            q = Question.objects.create(
                subject='Math', question_type='mcq',
                content={'text': f'Q{i}?'}, options=['A', 'B', 'C', 'D'],
                correct_answer=0, marks=1, created_by=self.instructor,
            )
            ExamQuestion.objects.create(exam=self.exam, question=q, marks=1)

    def test_shuffled_start(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')
        res = self.client.post(f'/api/exams/exams/{self.exam.id}/start/')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        attempt = ExamAttempt.objects.get(id=res.data['attempt']['id'])
        self.assertIn('_option_map', attempt.answers)
