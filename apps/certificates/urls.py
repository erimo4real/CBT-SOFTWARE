from django.urls import path
from . import views

app_name = 'certificates'

urlpatterns = [
    path('', views.CertificateListView.as_view(), name='certificate-list'),
    path('generate/', views.generate_certificate, name='generate-certificate'),
    path('verify/<str:certificate_id>/', views.verify_certificate, name='verify-certificate'),

    # Notifications
    path('notifications/', views.NotificationListView.as_view(), name='notification-list'),
    path('notifications/count/', views.notification_count, name='notification-count'),
    path('notifications/<uuid:notification_id>/read/', views.mark_notification_read, name='mark-read'),
    path('notifications/read-all/', views.mark_all_notifications_read, name='mark-all-read'),
]
