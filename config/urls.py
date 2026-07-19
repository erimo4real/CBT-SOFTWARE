from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.accounts.urls', namespace='accounts')),
    path('api/courses/', include('apps.courses.urls', namespace='courses')),
    path('api/exams/', include('apps.exams.urls', namespace='exams')),
    path('api/analytics/', include('apps.analytics.urls', namespace='analytics')),
    path('api/certificates/', include('apps.certificates.urls', namespace='certificates')),
    path('api/ai/', include('apps.ai_features.urls', namespace='ai_features')),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
