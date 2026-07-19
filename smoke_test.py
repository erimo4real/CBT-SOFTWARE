import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.test.client import Client
from apps.accounts.models import User, OTPCode
from apps.courses.models import Category, Course, Lesson, Enrollment
from apps.exams.models import Question, Exam, ExamQuestion, ExamAttempt, Answer
from apps.certificates.models import Certificate, Notification
# Clean previous test data using Django ORM (safe FK handling)
from apps.analytics.models import UserAnalytics, StudySession
from apps.certificates.models import Certificate, Notification
from apps.exams.models import Answer, ExamAttempt, ExamQuestion, Exam, Question
from apps.courses.models import Enrollment, Lesson, Course, Category
from apps.accounts.models import OTPCode, ExamPIN, AuditLog

Answer.objects.all().delete()
ExamAttempt.objects.all().delete()
ExamQuestion.objects.all().delete()
Enrollment.objects.all().delete()
Lesson.objects.all().delete()
Exam.objects.all().delete()
Course.objects.all().delete()
Category.objects.all().delete()
Question.objects.all().delete()
Certificate.objects.all().delete()
Notification.objects.all().delete()
StudySession.objects.all().delete()
UserAnalytics.objects.all().delete()
OTPCode.objects.all().delete()
ExamPIN.objects.all().delete()
AuditLog.objects.all().delete()
User.objects.filter(email__in=[
    'student@test.com', 'instructor@test.com', 'otpstudent@test.com',
    'bulk1@test.com', 'bulk2@test.com'
]).delete()

client = Client()
results = []

def test(name, passed, detail=''):
    status = 'PASS' if passed else 'FAIL'
    results.append((name, passed, detail))
    print(f'  [{status}] {name}' + (f' -- {detail}' if detail else ''))


print('\n' + '='*60)
print('  CBT PLATFORM - TIER 0-5 SMOKE TEST')
print('='*60)

# ── 1. AUTH ──
print('\n-- Authentication --')

resp = client.post('/api/auth/register/', {
    'email': 'student@test.com',
    'password': 'TestPass123!',
    'password_confirm': 'TestPass123!',
    'first_name': 'Test',
    'last_name': 'Student',
}, content_type='application/json')
test('Register student', resp.status_code == 201, f'HTTP {resp.status_code}')

resp = client.post('/api/auth/login/', {
    'email': 'student@test.com',
    'password': 'TestPass123!',
}, content_type='application/json')
test('Login student', resp.status_code == 200, f'HTTP {resp.status_code}')
student_access = resp.data.get('tokens', {}).get('access', '')

resp = client.post('/api/auth/login/', {
    'email': 'admin@cbt.com',
    'password': 'admin123!',
}, content_type='application/json')
test('Login admin', resp.status_code == 200, f'HTTP {resp.status_code}')
admin_access = resp.data.get('tokens', {}).get('access', '')

resp = client.post('/api/auth/register/', {
    'email': 'instructor@test.com',
    'password': 'TestPass123!',
    'password_confirm': 'TestPass123!',
    'first_name': 'Test',
    'last_name': 'Instructor',
}, content_type='application/json')
test('Register instructor', resp.status_code == 201, f'HTTP {resp.status_code}')

instructor = User.objects.get(email='instructor@test.com')
instructor.role = 'instructor'
instructor.save()
instructor.refresh_from_db()
test('Set instructor role', instructor.is_instructor)

resp = client.post('/api/auth/login/', {
    'email': 'instructor@test.com',
    'password': 'TestPass123!',
}, content_type='application/json')
test('Login instructor', resp.status_code == 200, f'HTTP {resp.status_code}')
instructor_access = resp.data.get('tokens', {}).get('access', '')

auth_admin = {'HTTP_AUTHORIZATION': f'Bearer {admin_access}'}
auth_instructor = {'HTTP_AUTHORIZATION': f'Bearer {instructor_access}'}
auth_student = {'HTTP_AUTHORIZATION': f'Bearer {student_access}'}

resp = client.get('/api/auth/me/', **auth_admin)
test('Get profile', resp.status_code == 200, f'HTTP {resp.status_code}')

# ── 2. CATEGORIES ──
print('\n-- Categories --')

resp = client.post('/api/courses/categories/', {
    'name': 'Mathematics',
    'description': 'Math courses',
    'icon': 'calculate',
}, content_type='application/json', **auth_admin)
test('Create category', resp.status_code == 201, f'HTTP {resp.status_code}')
cat_id = resp.data.get('id', '')

resp = client.get('/api/courses/categories/', **auth_student)
test('List categories', resp.status_code == 200, f'HTTP {resp.status_code}')

# ── 3. COURSES ──
print('\n-- Courses --')

resp = client.post('/api/courses/', {
    'title': 'Introduction to Python',
    'description': 'Learn Python from scratch',
    'category': cat_id,
    'difficulty': 'beginner',
    'is_published': True,
}, content_type='application/json', **auth_instructor)
test('Create course (instructor)', resp.status_code == 201, f'HTTP {resp.status_code}')
course_id = resp.data.get('id', '')

resp = client.get(f'/api/courses/{course_id}/', **auth_student)
test('Get course detail', resp.status_code == 200, f'HTTP {resp.status_code}')

# ── 4. LESSONS ──
print('\n-- Lessons --')

resp = client.post(f'/api/courses/{course_id}/lessons/', {
    'title': 'Variables and Types',
    'content_type': 'text',
    'content': 'Python variables are dynamically typed...',
    'order': 1,
}, content_type='application/json', **auth_instructor)
test('Create lesson', resp.status_code == 201, f'HTTP {resp.status_code}')
lesson_id = resp.data.get('id', '')

resp = client.get(f'/api/courses/{course_id}/lessons/')
test('List lessons', resp.status_code == 200, f'HTTP {resp.status_code}')

# ── 5. ENROLLMENT ──
print('\n-- Enrollment --')

resp = client.post('/api/courses/enrollments/', {
    'course': course_id,
}, content_type='application/json', **auth_student)
test('Enroll in course', resp.status_code == 201, f'HTTP {resp.status_code}')

resp = client.get('/api/courses/enrollments/', **auth_student)
test('List enrollments', resp.status_code == 200, f'HTTP {resp.status_code}')

# ── 6. QUESTIONS ──
print('\n-- Questions --')

resp = client.post('/api/exams/questions/', {
    'subject': 'Python',
    'topic': 'Variables',
    'question_type': 'mcq',
    'difficulty': 'easy',
    'content': {'text': 'What is the output of type(5)?'},
    'options': ["<class 'int'>", "<class 'float'>", "<class 'str'>", "<class 'bool'>"],
    'correct_answer': 0,
    'explanation': '5 is an integer',
    'marks': 1,
}, content_type='application/json', **auth_instructor)
test('Create MCQ question', resp.status_code == 201, f'HTTP {resp.status_code}')
q1_id = resp.data.get('id', '')

resp = client.post('/api/exams/questions/', {
    'subject': 'Python',
    'topic': 'Booleans',
    'question_type': 'true_false',
    'difficulty': 'easy',
    'content': {'text': 'Python is a statically typed language'},
    'correct_answer': 'false',
    'explanation': 'Python is dynamically typed',
    'marks': 1,
}, content_type='application/json', **auth_instructor)
test('Create T/F question', resp.status_code == 201, f'HTTP {resp.status_code}')
q2_id = resp.data.get('id', '')

resp = client.get('/api/exams/questions/', **auth_student)
test('List questions', resp.status_code == 200, f'HTTP {resp.status_code}')

# ── 7. EXAM ──
print('\n-- Exam --')

resp = client.post('/api/exams/exams/', {
    'title': 'Python Basics Quiz',
    'description': 'Test your Python fundamentals',
    'course': course_id,
    'duration': '00:30:00',
    'total_marks': 2,
    'passing_score': 50,
    'is_published': True,
    'allowed_attempts': 3,
}, content_type='application/json', **auth_instructor)
test('Create exam', resp.status_code == 201, f'HTTP {resp.status_code}')
exam_id = resp.data.get('id', '')

resp = client.post(f'/api/exams/exams/{exam_id}/questions/', {
    'question': q1_id,
    'marks': 1,
}, content_type='application/json', **auth_instructor)
test('Add question to exam', resp.status_code == 201, f'HTTP {resp.status_code}')

resp = client.post(f'/api/exams/exams/{exam_id}/questions/', {
    'question': q2_id,
    'marks': 1,
}, content_type='application/json', **auth_instructor)
test('Add question 2 to exam', resp.status_code == 201, f'HTTP {resp.status_code}')

# ── 8. EXAM ENGINE ──
print('\n-- Exam Engine --')

resp = client.post(f'/api/exams/exams/{exam_id}/start/', {}, content_type='application/json', **auth_student)
test('Start exam', resp.status_code == 201, f'HTTP {resp.status_code}')
if hasattr(resp, 'data'):
    attempt_id = resp.data.get('attempt', {}).get('id', '')
else:
    attempt_id = ''
    test('Start exam', False, f'HTTP {resp.status_code}')

if attempt_id:
    resp = client.post(f'/api/exams/attempts/{attempt_id}/save/', {
        'question': q1_id,
        'selected_option': 0,
        'time_spent': 30,
    }, content_type='application/json', **auth_student)
    test('Save answer (correct)', resp.status_code == 200, f'HTTP {resp.status_code}')

    resp = client.post(f'/api/exams/attempts/{attempt_id}/save/', {
        'question': q2_id,
        'selected_option': 'true',
        'time_spent': 15,
    }, content_type='application/json', **auth_student)
    test('Save answer (wrong)', resp.status_code == 200, f'HTTP {resp.status_code}')

    resp = client.post(f'/api/exams/attempts/{attempt_id}/flag/', {
        'question': q1_id,
        'flagged': True,
    }, content_type='application/json', **auth_student)
    test('Flag question', resp.status_code == 200, f'HTTP {resp.status_code}')

    resp = client.post(f'/api/exams/attempts/{attempt_id}/submit/', {}, content_type='application/json', **auth_student)
    test('Submit exam', resp.status_code == 200, f'HTTP {resp.status_code}')
    score = resp.data.get('score')
    passed = resp.data.get('passed')
    test('Score calculated', score is not None, f'Score: {score}, Passed: {passed}')

    resp = client.get(f'/api/exams/attempts/{attempt_id}/review/', **auth_student)
    test('Review attempt', resp.status_code == 200, f'HTTP {resp.status_code}')

# ── 9. PRACTICE ──
print('\n-- Practice Mode --')

resp = client.post('/api/exams/practice/start/', {
    'subject': 'Python',
    'count': 2,
}, content_type='application/json', **auth_student)
test('Start practice', resp.status_code == 200, f'HTTP {resp.status_code}')
practice_session_id = resp.data.get('session_id')

if practice_session_id and resp.data.get('questions'):
    first_q = resp.data['questions'][0]['question_id']
    resp = client.post('/api/exams/practice/answer/', {
        'session_id': practice_session_id,
        'question_id': first_q,
        'selected_option': 0,
    }, content_type='application/json', **auth_student)
    test('Practice answer', resp.status_code == 200, f'HTTP {resp.status_code}')

# ── 10. BOOKMARKS ──
print('\n-- Bookmarks --')

resp = client.post('/api/exams/bookmarks/', {
    'question_id': q1_id,
}, content_type='application/json', **auth_student)
test('Bookmark question', resp.status_code == 201, f'HTTP {resp.status_code}')

resp = client.get('/api/exams/bookmarks/', **auth_student)
test('List bookmarks', resp.status_code == 200, f'HTTP {resp.status_code}')

# ── 11. ANALYTICS ──
print('\n-- Analytics --')

resp = client.get('/api/analytics/dashboard/', **auth_student)
test('Student dashboard', resp.status_code == 200, f'HTTP {resp.status_code}')

resp = client.get('/api/analytics/weak-topics/', **auth_student)
test('Weak topics', resp.status_code == 200, f'HTTP {resp.status_code}')

resp = client.get('/api/analytics/leaderboard/', **auth_student)
test('Leaderboard', resp.status_code == 200, f'HTTP {resp.status_code}')

resp = client.get('/api/analytics/study/', **auth_student)
test('Study analytics', resp.status_code == 200, f'HTTP {resp.status_code}')

resp = client.get(f'/api/analytics/item-analysis/?exam={exam_id}', **auth_instructor)
test('Item analysis', resp.status_code == 200, f'HTTP {resp.status_code}')

# ── 12. CERTIFICATES ──
print('\n-- Certificates --')

enrollment = Enrollment.objects.filter(user__email='student@test.com', course_id=course_id).first()
if enrollment:
    enrollment.completed = True
    enrollment.save()

resp = client.post('/api/certificates/generate/', {
    'course': course_id,
}, content_type='application/json', **auth_student)
test('Generate certificate', resp.status_code == 201, f'HTTP {resp.status_code}')
cert_id = resp.data.get('certificate_id', '')

resp = client.get('/api/certificates/', **auth_student)
test('List certificates', resp.status_code == 200, f'HTTP {resp.status_code}')

if cert_id:
    resp = client.get(f'/api/certificates/verify/{cert_id}/')
    test('Verify certificate (public)', resp.status_code == 200, f'HTTP {resp.status_code}')

# ── 13. NOTIFICATIONS ──
print('\n-- Notifications --')

resp = client.get('/api/certificates/notifications/', **auth_student)
test('List notifications', resp.status_code == 200, f'HTTP {resp.status_code}')

resp = client.get('/api/certificates/notifications/count/', **auth_student)
test('Unread count', resp.status_code == 200, f'HTTP {resp.status_code}')

# ── 14. ADMIN ──
print('\n-- Admin Dashboard --')

client.login(email='admin@cbt.com', password='admin123!')
resp = client.get('/admin/')
test('Admin panel accessible', resp.status_code == 200, f'HTTP {resp.status_code}')

# ── 15. STUDENT AUTH (OTP FLOW) ──
print('\n-- Student Auth (OTP Flow) --')

# Staff creates a student
resp = client.post('/api/auth/students/', {
    'email': 'otpstudent@test.com',
    'first_name': 'OTP',
    'last_name': 'Student',
    'phone': '+2348012345678',
    'reg_number': 'REG-OTP-001',
    'class_level': 'JSS1',
    'generate_password': True,
}, content_type='application/json', **auth_admin)
test('Staff creates student', resp.status_code == 201, f'HTTP {resp.status_code}')
raw_password = resp.data.get('raw_password', '')
otp_user_id = resp.data.get('student', {}).get('id', '')

# List students
resp = client.get('/api/auth/students/', **auth_admin)
test('List students', resp.status_code == 200, f'HTTP {resp.status_code}')

# Student login step 1
resp = client.post('/api/auth/student/login/', {
    'login': 'otpstudent@test.com',
    'password': raw_password,
}, content_type='application/json')
test('Student login (credentials)', resp.status_code == 200, f'HTTP {resp.status_code}')

# Student login with wrong password
resp = client.post('/api/auth/student/login/', {
    'login': 'otpstudent@test.com',
    'password': 'wrongpassword',
}, content_type='application/json')
test('Student login (wrong password)', resp.status_code == 401, f'HTTP {resp.status_code}')

# Request OTP via email
resp = client.post('/api/auth/student/otp/request/', {
    'user_id': otp_user_id,
    'delivery_method': 'email',
}, content_type='application/json')
test('Request OTP (email)', resp.status_code == 200, f'HTTP {resp.status_code}')

# Verify OTP with wrong code
resp = client.post('/api/auth/student/otp/verify/', {
    'user_id': otp_user_id,
    'code': '000000',
}, content_type='application/json')
test('Verify OTP (wrong code)', resp.status_code == 400, f'HTTP {resp.status_code}')

# Verify OTP with correct code
from apps.accounts.models import OTPCode
otp = OTPCode.objects.filter(user_id=otp_user_id, is_used=False).order_by('-created_at').first()
if otp:
    resp = client.post('/api/auth/student/otp/verify/', {
        'user_id': otp_user_id,
        'code': otp.code,
    }, content_type='application/json')
    test('Verify OTP (correct code)', resp.status_code == 200, f'HTTP {resp.status_code}')
    student_access = resp.data.get('tokens', {}).get('access', '')
else:
    test('Verify OTP (correct code)', False, 'No OTP found')

# ── 16. EXAM PIN FLOW ──
print('\n-- Exam PIN Flow --')

resp = client.post('/api/auth/exam-pins/', {
    'exam_id': exam_id,
    'max_uses': 5,
    'expires_hours': 24,
}, content_type='application/json', **auth_instructor)
test('Generate exam PIN', resp.status_code == 201, f'HTTP {resp.status_code}')
exam_pin = resp.data.get('pin', {}).get('pin', '')

# List exam pins
resp = client.get('/api/auth/exam-pins/', **auth_instructor)
test('List exam PINs', resp.status_code == 200, f'HTTP {resp.status_code}')

# Exam terminal access
if exam_pin:
    resp = client.post('/api/auth/student/exam-access/', {
        'reg_number': 'REG-OTP-001',
        'exam_pin': exam_pin,
    }, content_type='application/json')
    test('Exam terminal access', resp.status_code == 200, f'HTTP {resp.status_code}')

# Bulk import
import io, csv
csv_content = 'email,first_name,last_name,phone,reg_number,class_level\nbulk1@test.com,Bulk,One,+2348011111111,BULK-001,JSS2\nbulk2@test.com,Bulk,Two,+2348022222222,BULK-002,JSS2'
csv_file = io.BytesIO(csv_content.encode('utf-8'))
csv_file.name = 'students.csv'
resp = client.post('/api/auth/students/bulk-import/', {'file': csv_file}, **auth_admin)
test('Bulk import students', resp.status_code == 201, f'HTTP {resp.status_code}')

# Audit logs
resp = client.get('/api/auth/audit-logs/', **auth_admin)
test('List audit logs', resp.status_code == 200, f'HTTP {resp.status_code}')

# ── SUMMARY ──
print('\n' + '='*60)
passed = sum(1 for _, p, _ in results if p)
failed = sum(1 for _, p, _ in results if not p)
total = len(results)
print(f'  RESULTS: {passed}/{total} passed, {failed} failed')
print('='*60)

if failed > 0:
    print('\nFailed tests:')
    for name, p, detail in results:
        if not p:
            print(f'  * {name}: {detail}')
