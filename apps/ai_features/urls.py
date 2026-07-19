from django.urls import path
from . import views

app_name = 'ai_features'

urlpatterns = [
    path('tutor/', views.ai_tutor_chat, name='ai-tutor'),
    path('generate-questions/', views.generate_questions, name='generate-questions'),
    path('generate-quiz/', views.generate_quiz, name='generate-quiz'),
    path('study-plan/', views.generate_study_plan, name='study-plan'),
    path('weakness-analysis/', views.weakness_analysis, name='weakness-analysis'),
]
