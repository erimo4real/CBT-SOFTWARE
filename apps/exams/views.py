from rest_framework import generics, status, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from django.shortcuts import get_object_or_404
import random
import csv
import io

from .models import Question, Exam, ExamQuestion, ExamAttempt, Answer
from .serializers import (
    QuestionSerializer, QuestionBankSerializer,
    ExamListSerializer, ExamDetailSerializer,
    ExamAttemptListSerializer, ExamAttemptDetailSerializer,
    AnswerSerializer,
)
from apps.accounts.permissions import IsInstructor, IsInstructorOrAdmin, IsAdmin


# ── Question CRUD ──

class QuestionListView(generics.ListCreateAPIView):
    serializer_class = QuestionSerializer

    def get_queryset(self):
        queryset = Question.objects.select_related('created_by')

        subject = self.request.query_params.get('subject')
        topic = self.request.query_params.get('topic')
        qtype = self.request.query_params.get('type')
        difficulty = self.request.query_params.get('difficulty')
        search = self.request.query_params.get('search')

        if subject:
            queryset = queryset.filter(subject__icontains=subject)
        if topic:
            queryset = queryset.filter(topic__icontains=topic)
        if qtype:
            queryset = queryset.filter(question_type=qtype)
        if difficulty:
            queryset = queryset.filter(difficulty=difficulty)
        if search:
            queryset = queryset.filter(
                Q(content__icontains=search) |
                Q(subject__icontains=search) |
                Q(topic__icontains=search)
            )

        return queryset

    def get_serializer_class(self):
        if self.request.method == 'POST' or (self.request.user and self.request.user.is_authenticated and self.request.user.is_instructor):
            return QuestionSerializer
        return QuestionBankSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsInstructorOrAdmin()]
        return [AllowAny()]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class QuestionDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = QuestionSerializer
    queryset = Question.objects.select_related('created_by')

    def get_permissions(self):
        if self.request.method in ('PUT', 'PATCH', 'DELETE'):
            return [IsInstructorOrAdmin()]
        return [AllowAny()]


class QuestionBankView(generics.ListAPIView):
    """Read-only question bank — excludes correct answers."""
    serializer_class = QuestionBankSerializer
    permission_classes = [IsInstructorOrAdmin]

    def get_queryset(self):
        return Question.objects.select_related('created_by').order_by('-created_at')


@api_view(['POST'])
@permission_classes([IsInstructorOrAdmin])
def bulk_import_questions(request):
    """Import questions from CSV. Expected columns:
    subject, topic, question_type, difficulty, content, options, correct_answer, explanation, marks, tags
    """
    csv_file = request.FILES.get('file')
    if not csv_file:
        return Response({'error': 'CSV file required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        decoded = csv_file.read().decode('utf-8')
        reader = csv.DictReader(io.StringIO(decoded))

        created = 0
        errors = []

        for i, row in enumerate(reader, start=2):
            try:
                qtype = row.get('question_type', 'mcq')
                content_text = row.get('content', '')
                content = {'text': content_text}

                options = None
                if qtype == 'mcq':
                    options_text = row.get('options', '')
                    if options_text:
                        options = [o.strip() for o in options_text.split('|')]

                correct = row.get('correct_answer', '')
                if qtype == 'mcq' and options:
                    try:
                        correct = int(correct)
                    except ValueError:
                        correct = 0

                tags_text = row.get('tags', '')
                tags = [t.strip() for t in tags_text.split('|') if t.strip()] if tags_text else []

                Question.objects.create(
                    subject=row.get('subject', 'General'),
                    topic=row.get('topic', ''),
                    question_type=qtype,
                    difficulty=row.get('difficulty', 'medium'),
                    content=content,
                    options=options,
                    correct_answer=correct,
                    explanation=row.get('explanation', ''),
                    marks=int(row.get('marks', 1)),
                    created_by=request.user,
                    tags=tags,
                )
                created += 1
            except Exception as e:
                errors.append(f'Row {i}: {str(e)}')

        return Response({
            'message': f'{created} questions imported',
            'errors': errors,
        })
    except Exception as e:
        return Response({'error': f'Failed to parse CSV: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)


# ── Exam CRUD ──

class ExamListView(generics.ListCreateAPIView):
    serializer_class = ExamListSerializer

    def get_queryset(self):
        queryset = Exam.objects.select_related('created_by', 'course')

        course = self.request.query_params.get('course')
        search = self.request.query_params.get('search')
        published = self.request.query_params.get('published')

        if course:
            queryset = queryset.filter(course_id=course)
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) | Q(description__icontains=search)
            )
        if published is not None:
            queryset = queryset.filter(is_published=published.lower() == 'true')
        else:
            if not self.request.user.is_authenticated or not (
                self.request.user.is_instructor or self.request.user.is_admin_role
            ):
                queryset = queryset.filter(is_published=True)

        return queryset

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsInstructorOrAdmin()]
        return [AllowAny()]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class ExamDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ExamDetailSerializer

    def get_queryset(self):
        return Exam.objects.select_related('created_by', 'course').prefetch_related(
            'exam_questions__question'
        )

    def get_permissions(self):
        if self.request.method in ('PUT', 'PATCH', 'DELETE'):
            return [IsInstructorOrAdmin()]
        return [AllowAny()]


@api_view(['POST'])
@permission_classes([IsInstructorOrAdmin])
def add_question_to_exam(request, exam_pk):
    """Add a question to an exam. Body: { question: uuid, marks: int }"""
    exam = get_object_or_404(Exam, id=exam_pk)
    question_id = request.data.get('question')
    marks = request.data.get('marks', 1)

    if not question_id:
        return Response({'error': 'Question ID required'}, status=status.HTTP_400_BAD_REQUEST)

    question = get_object_or_404(Question, id=question_id)

    existing = ExamQuestion.objects.filter(exam=exam, question=question).first()
    if existing:
        return Response({'error': 'Question already in exam'}, status=status.HTTP_400_BAD_REQUEST)

    order = ExamQuestion.objects.filter(exam=exam).count()
    eq = ExamQuestion.objects.create(exam=exam, question=question, marks=marks, order=order)

    return Response({
        'message': 'Question added to exam',
        'exam_question_id': str(eq.id),
    }, status=status.HTTP_201_CREATED)


@api_view(['DELETE'])
@permission_classes([IsInstructorOrAdmin])
def remove_question_from_exam(request, exam_pk, eq_pk):
    """Remove a question from an exam."""
    eq = get_object_or_404(ExamQuestion, id=eq_pk, exam_id=exam_pk)
    eq.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# ── Exam Engine ──

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def start_exam(request, exam_pk):
    """Start an exam attempt. Creates ExamAttempt and returns questions."""
    exam = get_object_or_404(Exam, id=exam_pk, is_published=True)

    if exam.start_date and timezone.now() < exam.start_date:
        return Response({'error': 'Exam has not started yet'}, status=status.HTTP_400_BAD_REQUEST)

    if exam.end_date and timezone.now() > exam.end_date:
        return Response({'error': 'Exam has ended'}, status=status.HTTP_400_BAD_REQUEST)

    existing_in_progress = ExamAttempt.objects.filter(
        user=request.user, exam=exam, status='in_progress'
    ).first()
    if existing_in_progress:
        attempt_serializer = ExamAttemptDetailSerializer(existing_in_progress, context={'request': request})
        return Response({
            'message': 'Resuming existing attempt',
            'attempt': attempt_serializer.data,
        })

    attempt_count = ExamAttempt.objects.filter(user=request.user, exam=exam).count()
    if attempt_count >= exam.allowed_attempts:
        return Response({'error': 'No attempts remaining'}, status=status.HTTP_400_BAD_REQUEST)

    config = exam.config or {}
    exam_questions = list(ExamQuestion.objects.filter(exam=exam).select_related('question'))

    if config.get('shuffle_questions'):
        random.shuffle(exam_questions)

    for i, eq in enumerate(exam_questions):
        eq.order = i
        eq.save()

    attempt = ExamAttempt.objects.create(
        user=request.user,
        exam=exam,
        attempt_number=attempt_count + 1,
    )

    attempt_serializer = ExamAttemptDetailSerializer(attempt, context={'request': request})
    return Response({
        'message': 'Exam started',
        'attempt': attempt_serializer.data,
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def save_exam_answer(request, attempt_pk):
    """Auto-save an answer during the exam. Body: { question, selected_option, answer_text, time_spent }"""
    attempt = get_object_or_404(
        ExamAttempt, id=attempt_pk, user=request.user, status='in_progress'
    )

    question_id = request.data.get('question')
    if not question_id:
        return Response({'error': 'Question ID required'}, status=status.HTTP_400_BAD_REQUEST)

    question = get_object_or_404(Question, id=question_id)

    answer, _ = Answer.objects.get_or_create(attempt=attempt, question=question)

    if 'selected_option' in request.data:
        answer.selected_option = request.data['selected_option']
    if 'answer_text' in request.data:
        answer.answer_text = request.data['answer_text']
    if 'time_spent' in request.data:
        answer.time_spent = request.data['time_spent']

    answer.save()

    return Response({'message': 'Answer saved'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def toggle_flag(request, attempt_pk):
    """Flag/unflag a question. Body: { question, flagged: bool }"""
    attempt = get_object_or_404(
        ExamAttempt, id=attempt_pk, user=request.user, status='in_progress'
    )

    question_id = request.data.get('question')
    flagged = request.data.get('flagged', True)

    if not question_id:
        return Response({'error': 'Question ID required'}, status=status.HTTP_400_BAD_REQUEST)

    flags = attempt.answers.get('_flags', {})
    flags[str(question_id)] = flagged
    attempt.answers['_flags'] = flags
    attempt.save()

    return Response({'flagged': flagged})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_exam(request, attempt_pk):
    """Submit exam for grading."""
    with transaction.atomic():
        attempt = get_object_or_404(
            ExamAttempt.objects.select_for_update(),
            id=attempt_pk, user=request.user, status='in_progress'
        )
        attempt.end_time = timezone.now()
        attempt.status = 'completed'
        attempt.save(update_fields=['end_time', 'status'])

    total_marks = 0
    earned_marks = 0

    exam_questions = ExamQuestion.objects.filter(exam=attempt.exam).select_related('question')

    for eq in exam_questions:
        answer = Answer.objects.filter(attempt=attempt, question=eq.question).first()
        if not answer:
            answer = Answer.objects.create(attempt=attempt, question=eq.question)
        is_correct = _check_answer(answer, eq.question)
        answer.is_correct = is_correct
        if is_correct:
            answer.marks_awarded = eq.marks
            earned_marks += eq.marks
        else:
            answer.marks_awarded = 0
        answer.save()
        total_marks += eq.marks

    attempt.score = earned_marks
    attempt.percentage = round((earned_marks / total_marks * 100), 2) if total_marks > 0 else 0
    attempt.passed = attempt.percentage >= attempt.exam.passing_score
    attempt.save()

    return Response(ExamAttemptDetailSerializer(attempt, context={'request': request}).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def auto_submit_exam(request, attempt_pk):
    """Auto-submit when timer expires."""
    with transaction.atomic():
        attempt = get_object_or_404(
            ExamAttempt.objects.select_for_update(),
            id=attempt_pk, user=request.user, status='in_progress'
        )
        elapsed = timezone.now() - attempt.start_time
        if elapsed < attempt.exam.duration:
            return Response({'error': 'Timer has not expired yet'}, status=status.HTTP_400_BAD_REQUEST)

        attempt.end_time = timezone.now()
        attempt.status = 'timed_out'
        attempt.save(update_fields=['end_time', 'status'])

    total_marks = 0
    earned_marks = 0

    exam_questions = ExamQuestion.objects.filter(exam=attempt.exam).select_related('question')

    for eq in exam_questions:
        answer = Answer.objects.filter(attempt=attempt, question=eq.question).first()
        if not answer:
            answer = Answer.objects.create(attempt=attempt, question=eq.question)
        is_correct = _check_answer(answer, eq.question)
        answer.is_correct = is_correct
        if is_correct:
            answer.marks_awarded = eq.marks
            earned_marks += eq.marks
        else:
            answer.marks_awarded = 0
        answer.save()
        total_marks += eq.marks

    attempt.score = earned_marks
    attempt.percentage = round((earned_marks / total_marks * 100), 2) if total_marks > 0 else 0
    attempt.passed = attempt.percentage >= attempt.exam.passing_score
    attempt.save()

    return Response({
        'message': 'Exam auto-submitted (time expired)',
        'attempt': ExamAttemptDetailSerializer(attempt, context={'request': request}).data,
    })


def _check_answer(answer, question):
    """Check if an answer is correct based on question type."""
    qtype = question.question_type

    if qtype in ('mcq', 'true_false'):
        return answer.selected_option == question.correct_answer
    elif qtype == 'fill_blank':
        user_answer = (answer.answer_text or '').strip().lower()
        correct = question.correct_answer
        if isinstance(correct, list):
            return user_answer in [c.strip().lower() for c in correct]
        return user_answer == str(correct).strip().lower()
    elif qtype in ('essay', 'coding'):
        return None  # Needs manual grading
    return False


# ── Results & Review ──

class ExamAttemptListView(generics.ListAPIView):
    serializer_class = ExamAttemptListSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = ExamAttempt.objects.select_related('exam')

        exam_id = self.request.query_params.get('exam')
        if exam_id:
            queryset = queryset.filter(exam_id=exam_id)

        if self.request.user.is_student:
            queryset = queryset.filter(user=self.request.user)

        return queryset


class ExamAttemptDetailView(generics.RetrieveAPIView):
    serializer_class = ExamAttemptDetailSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if self.request.user.is_student:
            return ExamAttempt.objects.filter(user=self.request.user)
        return ExamAttempt.objects.all()


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def exam_results(request, exam_pk):
    """Get all results for a specific exam (instructor) or own results (student)."""
    exam = get_object_or_404(Exam, id=exam_pk)

    if request.user.is_student:
        attempts = ExamAttempt.objects.filter(user=request.user, exam=exam)
    elif request.user.is_instructor:
        if exam.created_by != request.user:
            return Response({'error': 'Not your exam'}, status=status.HTTP_403_FORBIDDEN)
        attempts = ExamAttempt.objects.filter(exam=exam)
    else:
        attempts = ExamAttempt.objects.filter(exam=exam)

    attempts = attempts.select_related('user').order_by('-start_time')

    return Response(ExamAttemptListSerializer(attempts, many=True).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def exam_review(request, attempt_pk):
    """Review an exam attempt with correct/wrong answers and explanations."""
    attempt = get_object_or_404(
        ExamAttempt, id=attempt_pk, status__in=['completed', 'timed_out']
    )

    if request.user.is_student and attempt.user != request.user:
        return Response({'error': 'Not your attempt'}, status=status.HTTP_403_FORBIDDEN)

    exam_questions = ExamQuestion.objects.filter(exam=attempt.exam).select_related('question').order_by('order')
    answers = {
        str(a.question_id): a
        for a in Answer.objects.filter(attempt=attempt)
    }

    review_data = []
    for eq in exam_questions:
        q = eq.question
        answer = answers.get(str(q.id))

        content = q.content
        if isinstance(content, dict):
            question_text = content.get('text', content.get('title', str(content)))
        else:
            question_text = str(content)

        item = {
            'question_id': str(q.id),
            'question_text': question_text,
            'question_type': q.question_type,
            'difficulty': q.difficulty,
            'subject': q.subject,
            'topic': q.topic,
            'options': q.options,
            'marks': eq.marks,
            'your_answer': answer.selected_option if answer else None,
            'your_text_answer': answer.answer_text if answer else None,
            'is_correct': answer.is_correct if answer else None,
            'marks_awarded': str(answer.marks_awarded) if answer else '0',
            'correct_answer': q.correct_answer,
            'explanation': q.explanation,
            'time_spent': answer.time_spent if answer else 0,
        }
        review_data.append(item)

    return Response({
        'attempt_id': str(attempt.id),
        'exam_title': attempt.exam.title,
        'score': str(attempt.score),
        'percentage': str(attempt.percentage),
        'passed': attempt.passed,
        'total_marks': attempt.exam.total_marks,
        'time_used': str(attempt.end_time - attempt.start_time) if attempt.end_time else None,
        'questions': review_data,
    })
