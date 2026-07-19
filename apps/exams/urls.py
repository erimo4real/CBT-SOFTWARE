from django.urls import path
from . import views
from . import practice_views

app_name = 'exams'

urlpatterns = [
    # Questions
    path('questions/', views.QuestionListView.as_view(), name='question-list'),
    path('questions/bank/', views.QuestionBankView.as_view(), name='question-bank'),
    path('questions/<uuid:pk>/', views.QuestionDetailView.as_view(), name='question-detail'),
    path('questions/bulk-import/', views.bulk_import_questions, name='bulk-import'),

    # Exams
    path('exams/', views.ExamListView.as_view(), name='exam-list'),
    path('exams/<uuid:pk>/', views.ExamDetailView.as_view(), name='exam-detail'),

    # Exam questions
    path('exams/<uuid:exam_pk>/questions/', views.add_question_to_exam, name='add-question-to-exam'),
    path('exams/<uuid:exam_pk>/questions/<uuid:eq_pk>/', views.remove_question_from_exam, name='remove-question-from-exam'),

    # Exam engine
    path('exams/<uuid:exam_pk>/start/', views.start_exam, name='start-exam'),
    path('attempts/<uuid:attempt_pk>/save/', views.save_exam_answer, name='save-answer'),
    path('attempts/<uuid:attempt_pk>/flag/', views.toggle_flag, name='toggle-flag'),
    path('attempts/<uuid:attempt_pk>/submit/', views.submit_exam, name='submit-exam'),
    path('attempts/<uuid:attempt_pk>/auto-submit/', views.auto_submit_exam, name='auto-submit'),

    # Results & review
    path('attempts/', views.ExamAttemptListView.as_view(), name='attempt-list'),
    path('attempts/<uuid:pk>/', views.ExamAttemptDetailView.as_view(), name='attempt-detail'),
    path('exams/<uuid:exam_pk>/results/', views.exam_results, name='exam-results'),
    path('attempts/<uuid:attempt_pk>/review/', views.exam_review, name='exam-review'),

    # Practice Mode
    path('practice/start/', practice_views.start_practice, name='practice-start'),
    path('practice/answer/', practice_views.practice_answer, name='practice-answer'),
    path('practice/history/', practice_views.practice_history, name='practice-history'),

    # Bookmarks
    path('bookmarks/', practice_views.bookmark_list_create, name='bookmark-list'),
    path('bookmarks/<uuid:bookmark_id>/', practice_views.bookmark_delete, name='bookmark-delete'),
]
