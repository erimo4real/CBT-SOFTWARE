from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.db.models import Avg, Count, F, Q
from apps.accounts.permissions import IsInstructorOrAdmin
from django.utils import timezone
from datetime import timedelta

from .models import StudySession, UserAnalytics, Bookmark
from .serializers import StudySessionSerializer, UserAnalyticsSerializer
from apps.exams.models import Question, ExamAttempt, Answer
from apps.courses.models import Enrollment


# ── Student Dashboard ──

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def student_dashboard(request):
    """Student's main dashboard overview."""
    user = request.user
    analytics, _ = UserAnalytics.objects.get_or_create(user=user)

    enrollments = Enrollment.objects.filter(user=user).select_related('course')
    recent_attempts = ExamAttempt.objects.filter(user=user).select_related('exam')[:5]
    recent_sessions = StudySession.objects.filter(user=user)[:7]

    # Calculate overall stats
    total_enrolled = enrollments.count()
    total_exams = ExamAttempt.objects.filter(user=user, status='completed').count()
    avg_score = ExamAttempt.objects.filter(
        user=user, status='completed'
    ).aggregate(avg=Avg('percentage'))['avg'] or 0

    # Weekly study time
    week_ago = timezone.now().date() - timedelta(days=7)
    weekly_study = StudySession.objects.filter(
        user=user, date__gte=week_ago
    ).aggregate(total=Sum('study_time'))['total'] or 0

    # Upcoming exams
    upcoming = ExamAttempt.objects.filter(
        user=user, status='in_progress'
    ).select_related('exam')[:5]

    return Response({
        'stats': {
            'enrolled_courses': total_enrolled,
            'exams_taken': total_exams,
            'average_score': round(avg_score, 1),
            'streak_days': analytics.streak_days,
            'xp_points': analytics.xp_points,
            'level': analytics.level,
            'weekly_study_time': weekly_study,
        },
        'recent_attempts': [
            {
                'id': str(a.id),
                'exam_title': a.exam.title,
                'score': str(a.score),
                'percentage': str(a.percentage),
                'passed': a.passed,
                'status': a.status,
                'date': a.start_time.date(),
            }
            for a in recent_attempts
        ],
        'recent_sessions': StudySessionSerializer(recent_sessions, many=True).data,
        'upcoming_exams': [
            {
                'id': str(a.id),
                'exam_title': a.exam.title,
                'exam_id': str(a.exam.id),
            }
            for a in upcoming
        ],
    })


# ── Weak Topics Analysis ──

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def weak_topics(request):
    """Analyze weak topics based on incorrect answers."""
    user = request.user

    answers = Answer.objects.filter(
        attempt__user=user, is_correct__isnull=False
    ).select_related('question')

    topic_stats = {}
    for a in answers:
        topic = a.question.topic or a.question.subject
        if topic not in topic_stats:
            topic_stats[topic] = {'total': 0, 'correct': 0, 'incorrect': 0}
        topic_stats[topic]['total'] += 1
        if a.is_correct:
            topic_stats[topic]['correct'] += 1
        else:
            topic_stats[topic]['incorrect'] += 1

    topics = []
    for topic, stats in topic_stats.items():
        accuracy = round((stats['correct'] / stats['total'] * 100), 1) if stats['total'] > 0 else 0
        topics.append({
            'topic': topic,
            'total_attempts': stats['total'],
            'correct': stats['correct'],
            'incorrect': stats['incorrect'],
            'accuracy': accuracy,
        })

    topics.sort(key=lambda x: x['accuracy'])
    weak = [t for t in topics if t['accuracy'] < 70]
    strong = [t for t in topics if t['accuracy'] >= 70]

    return Response({
        'weak_topics': weak[:10],
        'strong_topics': strong[:10],
        'all_topics': topics,
    })


# ── Item Analysis (Instructor) ──

@api_view(['GET'])
@permission_classes([IsInstructorOrAdmin])
def item_analysis(request, question_id=None):
    """Item analysis for a question or all questions in an exam."""
    from apps.exams.models import ExamQuestion

    if question_id:
        question = Question.objects.get(id=question_id)
        analysis = _analyze_question(question)
        return Response(analysis)

    exam_id = request.query_params.get('exam')
    if not exam_id:
        return Response({'error': 'exam parameter required'}, status=status.HTTP_400_BAD_REQUEST)

    exam_questions = ExamQuestion.objects.filter(exam_id=exam_id).select_related('question')
    results = []
    for eq in exam_questions:
        analysis = _analyze_question(eq.question)
        analysis['exam_question_id'] = str(eq.id)
        analysis['marks'] = eq.marks
        results.append(analysis)

    return Response(results)


def _analyze_question(question):
    answers = Answer.objects.filter(question=question, is_correct__isnull=False)
    total = answers.count()
    correct = answers.filter(is_correct=True).count()

    difficulty_index = round(correct / total, 3) if total > 0 else 0

    # Discrimination index: difference between top 27% and bottom 27%
    sorted_answers = list(answers.order_by('-marks_awarded'))
    cutoff = max(1, int(total * 0.27))
    top_answers = sorted_answers[:cutoff]
    bottom_answers = sorted_answers[-cutoff:]

    top_correct = sum(1 for a in top_answers if a.is_correct) / cutoff if cutoff > 0 else 0
    bottom_correct = sum(1 for a in bottom_answers if a.is_correct) / cutoff if cutoff > 0 else 0
    discrimination_index = round(top_correct - bottom_correct, 3)

    # Distractor analysis for MCQ
    distractor_data = None
    if question.question_type == 'mcq' and question.options:
        option_counts = {}
        for i in range(len(question.options)):
            option_counts[str(i)] = answers.filter(selected_option=i).count()
        distractor_data = option_counts

    content = question.content
    if isinstance(content, dict):
        text = content.get('text', content.get('title', str(content)))
    else:
        text = str(content)

    return {
        'question_id': str(question.id),
        'question_text': text[:200],
        'subject': question.subject,
        'topic': question.topic,
        'question_type': question.question_type,
        'difficulty': question.difficulty,
        'total_attempts': total,
        'correct_count': correct,
        'difficulty_index': difficulty_index,
        'discrimination_index': discrimination_index,
        'distractor_data': distractor_data,
        'quality': _classify_question_quality(difficulty_index, discrimination_index),
    }


def _classify_question_quality(di, disc):
    if di < 0.3:
        return 'Too Difficult'
    elif di > 0.9:
        return 'Too Easy'
    elif disc < 0.2:
        return 'Poor Discrimination'
    elif disc >= 0.4:
        return 'Excellent'
    else:
        return 'Good'


# ── Leaderboard ──

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def leaderboard(request):
    """Student leaderboard by XP points, average score, or streak."""
    sort_by = request.query_params.get('sort', 'xp')
    limit = min(int(request.query_params.get('limit', 20)), 50)

    analytics_list = UserAnalytics.objects.select_related('user').filter(
        user__role='student'
    )

    if sort_by == 'score':
        analytics_list = analytics_list.order_by('-average_score')
    elif sort_by == 'streak':
        analytics_list = analytics_list.order_by('-streak_days')
    else:
        analytics_list = analytics_list.order_by('-xp_points')

    leaderboard = []
    for i, a in enumerate(analytics_list[:limit], start=1):
        leaderboard.append({
            'rank': i,
            'user_id': str(a.user.id),
            'full_name': a.user.full_name,
            'xp_points': a.xp_points,
            'level': a.level,
            'average_score': str(a.average_score),
            'streak_days': a.streak_days,
            'total_exams': a.total_exams_taken,
        })

    return Response({
        'sort': sort_by,
        'leaderboard': leaderboard,
    })


# ── Study Analytics ──

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def study_analytics(request):
    """Detailed study analytics for charts."""
    user = request.user
    days = min(int(request.query_params.get('days', 30)), 90)
    start_date = timezone.now().date() - timedelta(days=days)

    sessions = StudySession.objects.filter(
        user=user, date__gte=start_date
    ).order_by('date')

    daily_data = {}
    for s in sessions:
        day = str(s.date)
        daily_data[day] = {
            'date': day,
            'study_time': s.study_time,
            'questions_attempted': s.questions_attempted,
            'questions_correct': s.questions_correct,
            'accuracy': round((s.questions_correct / s.questions_attempted * 100), 1) if s.questions_attempted > 0 else 0,
        }

    # Subject distribution
    answers = Answer.objects.filter(
        attempt__user=user, is_correct__isnull=False
    ).select_related('question')

    subject_stats = {}
    for a in answers:
        subject = a.question.subject
        if subject not in subject_stats:
            subject_stats[subject] = {'total': 0, 'correct': 0}
        subject_stats[subject]['total'] += 1
        if a.is_correct:
            subject_stats[subject]['correct'] += 1

    subjects = [
        {
            'subject': s,
            'total': stats['total'],
            'correct': stats['correct'],
            'accuracy': round((stats['correct'] / stats['total'] * 100), 1),
        }
        for s, stats in subject_stats.items()
    ]

    return Response({
        'daily': list(daily_data.values()),
        'subject_distribution': subjects,
        'total_study_time': sum(s['study_time'] for s in daily_data.values()),
        'total_questions': sum(s['questions_attempted'] for s in daily_data.values()),
    })


from django.db.models import Sum
