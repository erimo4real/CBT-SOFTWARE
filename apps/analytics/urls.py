from django.urls import path
from . import views

app_name = 'analytics'

urlpatterns = [
    path('dashboard/', views.student_dashboard, name='student-dashboard'),
    path('weak-topics/', views.weak_topics, name='weak-topics'),
    path('item-analysis/', views.item_analysis, name='item-analysis'),
    path('item-analysis/<uuid:question_id>/', views.item_analysis, name='item-analysis-detail'),
    path('leaderboard/', views.leaderboard, name='leaderboard'),
    path('study/', views.study_analytics, name='study-analytics'),
]
