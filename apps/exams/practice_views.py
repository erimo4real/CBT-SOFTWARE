from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Avg, Count, Q
from django.utils import timezone
import random

from .models import Question, ExamAttempt, Answer
from apps.analytics.models import StudySession, UserAnalytics, Bookmark


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def start_practice(request):
    """Start a practice session. Body: { subject, topic, difficulty, type, count }"""
    subject = request.data.get('subject')
    topic = request.data.get('topic')
    difficulty = request.data.get('difficulty')
    qtype = request.data.get('type')
    count = min(int(request.data.get('count', 10)), 50)

    questions = Question.objects.all()

    if subject:
        questions = questions.filter(subject__icontains=subject)
    if topic:
        questions = questions.filter(topic__icontains=topic)
    if difficulty:
        questions = questions.filter(difficulty=difficulty)
    if qtype:
        questions = questions.filter(question_type=qtype)

    if not questions.exists():
        return Response({'error': 'No questions found matching criteria'}, status=status.HTTP_404_NOT_FOUND)

    sample_size = min(count, questions.count())
    selected = random.sample(list(questions), sample_size)

    # Create a lightweight practice "attempt"
    session, _ = StudySession.objects.update_or_create(
        user=request.user,
        date=timezone.now().date(),
        defaults={'questions_attempted': sample_size},
    )

    questions_data = []
    for i, q in enumerate(selected):
        content = q.content
        if isinstance(content, dict):
            text = content.get('text', content.get('title', str(content)))
        else:
            text = str(content)

        questions_data.append({
            'order': i + 1,
            'question_id': str(q.id),
            'subject': q.subject,
            'topic': q.topic,
            'question_type': q.question_type,
            'difficulty': q.difficulty,
            'content': q.content,
            'options': q.options,
            'marks': q.marks,
        })

    return Response({
        'session_id': str(session.id),
        'total_questions': len(questions_data),
        'questions': questions_data,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def practice_answer(request):
    """Submit a practice answer and get immediate feedback.
    Body: { session_id, question_id, selected_option, answer_text }
    """
    session_id = request.data.get('session_id')
    question_id = request.data.get('question_id')

    if not session_id or not question_id:
        return Response({'error': 'session_id and question_id required'}, status=status.HTTP_400_BAD_REQUEST)

    session = get_object_or_404(StudySession, id=session_id, user=request.user)
    question = get_object_or_404(Question, id=question_id)

    selected_option = request.data.get('selected_option')
    answer_text = request.data.get('answer_text', '')

    is_correct = _check_practice_answer(question, selected_option, answer_text)

    # Update session stats
    session.questions_attempted += 1
    if is_correct:
        session.questions_correct += 1
    session.save()

    # Update analytics
    analytics, _ = UserAnalytics.objects.get_or_create(user=request.user)
    analytics.xp_points += 10 if is_correct else 2

    # Update streak
    today = timezone.now().date()
    if analytics.last_active_date:
        diff = (today - analytics.last_active_date).days
        if diff == 1:
            analytics.streak_days += 1
        elif diff > 1:
            analytics.streak_days = 1
    else:
        analytics.streak_days = 1
    analytics.last_active_date = today
    analytics.save()

    # Return feedback
    qtype = question.question_type
    content = question.content
    if isinstance(content, dict):
        text = content.get('text', content.get('title', str(content)))
    else:
        text = str(content)

    response_data = {
        'question_id': str(question.id),
        'your_answer': selected_option if qtype in ('mcq', 'true_false') else answer_text,
        'is_correct': is_correct,
        'correct_answer': question.correct_answer,
        'explanation': question.explanation,
        'xp_earned': 10 if is_correct else 2,
        'current_streak': analytics.streak_days,
    }

    return Response(response_data)


def _check_practice_answer(question, selected_option, answer_text):
    qtype = question.question_type
    if qtype in ('mcq', 'true_false'):
        return selected_option == question.correct_answer
    elif qtype == 'fill_blank':
        user_answer = (answer_text or '').strip().lower()
        correct = question.correct_answer
        if isinstance(correct, list):
            return user_answer in [c.strip().lower() for c in correct]
        return user_answer == str(correct).strip().lower()
    return False


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def practice_history(request):
    """Get practice session history."""
    sessions = StudySession.objects.filter(user=request.user).order_by('-date')[:30]

    data = []
    for s in sessions:
        accuracy = round((s.questions_correct / s.questions_attempted * 100), 1) if s.questions_attempted > 0 else 0
        data.append({
            'id': str(s.id),
            'date': s.date,
            'study_time': s.study_time,
            'lessons_completed': s.lessons_completed,
            'questions_attempted': s.questions_attempted,
            'questions_correct': s.questions_correct,
            'accuracy': accuracy,
        })

    return Response(data)


# ── Bookmarks ──

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def bookmark_list_create(request):
    if request.method == 'GET':
        bookmarks = Bookmark.objects.filter(user=request.user).select_related('question')
        data = []
        for b in bookmarks:
            q = b.question
            content = q.content
            if isinstance(content, dict):
                text = content.get('text', content.get('title', str(content)))
            else:
                text = str(content)
            data.append({
                'id': str(b.id),
                'question_id': str(q.id),
                'subject': q.subject,
                'topic': q.topic,
                'question_type': q.question_type,
                'difficulty': q.difficulty,
                'content': q.content,
                'options': q.options,
                'created_at': b.created_at,
            })
        return Response(data)

    # POST
    question_id = request.data.get('question_id')
    if not question_id:
        return Response({'error': 'question_id required'}, status=status.HTTP_400_BAD_REQUEST)

    question = get_object_or_404(Question, id=question_id)
    bookmark, created = Bookmark.objects.get_or_create(user=request.user, question=question)

    if not created:
        return Response({'message': 'Already bookmarked'})

    return Response({'message': 'Bookmarked', 'id': str(bookmark.id)}, status=status.HTTP_201_CREATED)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def bookmark_delete(request, bookmark_id):
    bookmark = get_object_or_404(Bookmark, id=bookmark_id, user=request.user)
    bookmark.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)
