from django.urls import path
from . import views

app_name = 'accounts'

urlpatterns = [
    # ── Staff Auth (instructors + admins) ──
    path('register/', views.RegisterView.as_view(), name='register'),
    path('login/', views.LoginView.as_view(), name='login'),
    path('login/google/', views.GoogleLoginView.as_view(), name='google-login'),
    path('refresh/', views.RefreshTokenView.as_view(), name='token-refresh'),
    path('me/', views.ProfileView.as_view(), name='profile'),
    path('me/update/', views.UpdateProfileView.as_view(), name='update-profile'),
    path('me/avatar/', views.AvatarUploadView.as_view(), name='upload-avatar'),
    path('change-password/', views.ChangePasswordView.as_view(), name='change-password'),
    path('verify-email/', views.VerifyEmailView.as_view(), name='verify-email'),
    path('password-reset/', views.PasswordResetRequestView.as_view(), name='password-reset'),
    path('password-reset/confirm/', views.PasswordResetConfirmView.as_view(), name='password-reset-confirm'),

    # ── Student Auth Flow ──
    path('student/login/', views.StudentLoginView.as_view(), name='student-login'),
    path('student/otp/request/', views.StudentOTPRequestView.as_view(), name='student-otp-request'),
    path('student/otp/verify/', views.StudentOTPVerifyView.as_view(), name='student-otp-verify'),
    path('student/exam-access/', views.StudentExamAccessView.as_view(), name='student-exam-access'),

    # ── Student Management (Staff) ──
    path('students/', views.StudentListCreateView.as_view(), name='student-list-create'),
    path('students/bulk-import/', views.StudentBulkImportView.as_view(), name='student-bulk-import'),
    path('students/<uuid:pk>/', views.StudentDetailView.as_view(), name='student-detail'),

    # ── Exam PIN Management (Staff) ──
    path('exam-pins/', views.ExamPINListCreateView.as_view(), name='exam-pin-list-create'),
    path('exam-pins/<uuid:pk>/', views.ExamPINDetailView.as_view(), name='exam-pin-detail'),
    path('exam-pins/<uuid:pin_id>/print-slip/', views.ExamPrintSlipView.as_view(), name='exam-pin-print-slip'),

    # ── Audit Logs (Admin) ──
    path('audit-logs/', views.AuditLogListView.as_view(), name='audit-log-list'),

    # ── Admin User Management ──
    path('admin/users/', views.AdminUserListView.as_view(), name='admin-user-list'),
    path('admin/users/<uuid:pk>/', views.AdminUserDetailView.as_view(), name='admin-user-detail'),
]
