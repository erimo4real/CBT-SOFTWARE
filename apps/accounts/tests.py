from django.test import TestCase, override_settings
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from apps.accounts.models import OTPCode, ExamPIN, AuditLog

User = get_user_model()


class UserModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@student.com', password='testpass123',
            first_name='Test', last_name='User', role='student',
        )

    def test_str(self):
        self.assertEqual(str(self.user), 'test@student.com')

    def test_full_name(self):
        self.assertEqual(self.user.full_name, 'Test User')

    def test_full_name_fallback(self):
        u = User.objects.create_user(email='fallback@test.com', password='x')
        self.assertEqual(u.full_name, 'fallback')

    def test_is_student(self):
        self.assertTrue(self.user.is_student)
        self.assertFalse(self.user.is_instructor)
        self.assertFalse(self.user.is_admin_role)

    def test_is_instructor(self):
        self.user.role = 'instructor'
        self.user.save()
        self.assertTrue(self.user.is_instructor)

    def test_is_admin_role(self):
        self.user.role = 'admin'
        self.user.save()
        self.assertTrue(self.user.is_admin_role)

    def test_generate_otp(self):
        otp = self.user.generate_otp(delivery_method='email')
        self.assertEqual(len(otp.code), 6)
        self.assertFalse(otp.is_used)
        self.assertEqual(otp.delivery_method, 'email')
        self.assertTrue(otp.is_valid)

    def test_otp_invalidates_previous(self):
        otp1 = self.user.generate_otp()
        otp2 = self.user.generate_otp()
        otp1.refresh_from_db()
        self.assertTrue(otp1.is_used)
        self.assertFalse(otp2.is_used)

    def test_otp_lock(self):
        self.assertFalse(self.user.is_otp_locked)
        for _ in range(5):
            self.user.increment_otp_failed()
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_otp_locked)

    def test_otp_lock_reset(self):
        for _ in range(5):
            self.user.increment_otp_failed()
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_otp_locked)
        self.user.reset_otp_lock()
        self.assertFalse(self.user.is_otp_locked)
        self.assertEqual(self.user.otp_failed_attempts, 0)


class OTPCodeModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(email='otp@test.com', password='pass')

    def test_is_expired(self):
        from django.utils import timezone
        from datetime import timedelta
        otp = OTPCode.objects.create(
            user=self.user, code='123456', delivery_method='email',
            expires_at=timezone.now() - timedelta(minutes=1),
        )
        self.assertTrue(otp.is_expired)

    def test_is_valid(self):
        from django.utils import timezone
        from datetime import timedelta
        otp = OTPCode.objects.create(
            user=self.user, code='123456', delivery_method='email',
            expires_at=timezone.now() + timedelta(minutes=10),
        )
        self.assertTrue(otp.is_valid)
        otp.is_used = True
        otp.save()
        self.assertFalse(otp.is_valid)


class ExamPINModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(email='pin@test.com', password='pass', role='instructor')
        from apps.exams.models import Exam
        from datetime import timedelta
        self.exam = Exam.objects.create(
            title='Test Exam', created_by=self.user,
            duration=timedelta(hours=1), total_marks=100, passing_score=50,
        )

    def test_generate_pin_unique(self):
        pin1 = ExamPIN.generate_pin()
        pin2 = ExamPIN.generate_pin()
        self.assertNotEqual(pin1, pin2)

    def test_is_valid_active(self):
        pin = ExamPIN.objects.create(
            pin='TEST1234', exam=self.exam, created_by=self.user,
            max_uses=3, is_active=True,
        )
        self.assertTrue(pin.is_valid)

    def test_is_valid_max_uses(self):
        pin = ExamPIN.objects.create(
            pin='USED1234', exam=self.exam, created_by=self.user,
            max_uses=1, current_uses=1,
        )
        self.assertFalse(pin.is_valid)

    def test_is_valid_inactive(self):
        pin = ExamPIN.objects.create(
            pin='INACTIVE1', exam=self.exam, created_by=self.user,
            is_active=False,
        )
        self.assertFalse(pin.is_valid)

    def test_is_valid_expired(self):
        from django.utils import timezone
        from datetime import timedelta
        pin = ExamPIN.objects.create(
            pin='EXPIRED1', exam=self.exam, created_by=self.user,
            expires_at=timezone.now() - timedelta(hours=1),
        )
        self.assertFalse(pin.is_valid)


class AuditLogTest(TestCase):
    def test_create_log(self):
        from apps.accounts.views import log_action
        user = User.objects.create_user(email='log@test.com', password='pass')
        log_action(user, 'login', details={'method': 'password'})
        log = AuditLog.objects.get(user=user, action='login')
        self.assertEqual(log.details['method'], 'password')


class RegisterViewTest(APITestCase):
    def test_register_success(self):
        data = {
            'email': 'new@instructor.com',
            'password': 'StrongPass123!',
            'password_confirm': 'StrongPass123!',
            'first_name': 'New',
            'last_name': 'Instructor',
        }
        res = self.client.post('/api/auth/register/', data)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertIn('tokens', res.data)
        self.assertTrue(User.objects.filter(email='new@instructor.com').exists())

    def test_register_duplicate_email(self):
        User.objects.create_user(email='dup@test.com', password='pass')
        data = {
            'email': 'dup@test.com',
            'password': 'StrongPass123!',
            'password_confirm': 'StrongPass123!',
        }
        res = self.client.post('/api/auth/register/', data)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_password_mismatch(self):
        data = {
            'email': 'mismatch@test.com',
            'password': 'Pass123!',
            'password_confirm': 'DifferentPass123!',
        }
        res = self.client.post('/api/auth/register/', data)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


class LoginViewTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='login@test.com', password='testpass123', role='instructor',
        )

    def test_login_success(self):
        res = self.client.post('/api/auth/login/', {
            'email': 'login@test.com', 'password': 'testpass123',
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('tokens', res.data)
        self.assertIn('access', res.data['tokens'])

    def test_login_wrong_password(self):
        res = self.client.post('/api/auth/login/', {
            'email': 'login@test.com', 'password': 'wrongpass',
        })
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)


class ProfileViewTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='profile@test.com', password='pass', first_name='P', last_name='Test',
        )
        from rest_framework_simplejwt.tokens import RefreshToken
        token = str(RefreshToken.for_user(self.user).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    def test_get_profile(self):
        res = self.client.get('/api/auth/me/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['email'], 'profile@test.com')

    def test_update_profile(self):
        res = self.client.put('/api/auth/me/update/', {
            'first_name': 'Updated', 'last_name': 'Name',
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, 'Updated')

    def test_unauthenticated_profile(self):
        self.client.credentials()
        res = self.client.get('/api/auth/me/')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)


class ChangePasswordTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email='pw@test.com', password='oldpass123')
        from rest_framework_simplejwt.tokens import RefreshToken
        token = str(RefreshToken.for_user(self.user).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    def test_change_password_success(self):
        res = self.client.post('/api/auth/change-password/', {
            'old_password': 'oldpass123', 'new_password': 'newpass456',
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_change_password_wrong_old(self):
        res = self.client.post('/api/auth/change-password/', {
            'old_password': 'wrongold', 'new_password': 'newpass456',
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


class StudentManagementTest(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            email='admin@test.com', password='pass', role='admin',
        )
        self.instructor = User.objects.create_user(
            email='inst@test.com', password='pass', role='instructor',
        )
        from rest_framework_simplejwt.tokens import RefreshToken
        self.admin_token = str(RefreshToken.for_user(self.admin).access_token)
        self.inst_token = str(RefreshToken.for_user(self.instructor).access_token)

    def test_create_student_as_admin(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.admin_token}')
        res = self.client.post('/api/auth/students/', {
            'email': 'newstudent@test.com',
            'first_name': 'New',
            'last_name': 'Student',
            'reg_number': 'STU001',
            'class_level': 'JSS1',
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(email='newstudent@test.com').exists())

    def test_create_student_as_instructor(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.inst_token}')
        res = self.client.post('/api/auth/students/', {
            'email': 'inststudent@test.com',
            'first_name': 'Inst',
            'last_name': 'Student',
            'reg_number': 'STU002',
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_create_student_unauthenticated(self):
        res = self.client.post('/api/auth/students/', {
            'email': 'unauth@test.com', 'first_name': 'X', 'last_name': 'Y',
        })
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_students(self):
        User.objects.create_user(email='s1@test.com', password='pass', role='student', reg_number='S1')
        User.objects.create_user(email='s2@test.com', password='pass', role='student', reg_number='S2')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.admin_token}')
        res = self.client.get('/api/auth/students/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_update_student(self):
        student = User.objects.create_user(
            email='upd@test.com', password='pass', role='student', reg_number='UPD01',
        )
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.admin_token}')
        res = self.client.patch(f'/api/auth/students/{student.id}/', {
            'account_status': 'suspended',
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        student.refresh_from_db()
        self.assertEqual(student.account_status, 'suspended')

    def test_delete_student(self):
        student = User.objects.create_user(
            email='del@test.com', password='pass', role='student', reg_number='DEL01',
        )
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.admin_token}')
        res = self.client.delete(f'/api/auth/students/{student.id}/')
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(User.objects.filter(id=student.id).exists())
