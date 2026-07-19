from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Avg
import json

from .services import chat_completion, generate_with_context
from apps.courses.models import Course, Lesson, Enrollment, LessonProgress
from apps.exams.models import Question, ExamAttempt, Answer
from apps.analytics.models import UserAnalytics, StudySession
from apps.certificates.models import Notification


# ── AI Tutor (RAG Chat with Course Materials) ──

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ai_tutor_chat(request):
    """Chat with AI tutor using course materials as context.
    Body: { course_id, message, history (optional) }
    """
    course_id = request.data.get('course_id')
    user_message = request.data.get('message', '').strip()
    history = request.data.get('history', [])

    if not user_message:
        return Response({'error': 'Message required'}, status=status.HTTP_400_BAD_REQUEST)

    # Build course context
    context = ''
    if course_id:
        course = get_object_or_404(Course, id=course_id, is_published=True)
        lessons = Lesson.objects.filter(course=course).order_by('order')

        lesson_texts = []
        for lesson in lessons[:20]:
            content = lesson.content or ''
            if content:
                lesson_texts.append(f'Lesson: {lesson.title}\n{content[:2000]}')

        context = f'\n\nCourse: {course.title}\nDescription: {course.description}\n\nLessons:\n' + '\n---\n'.join(lesson_texts)
    else:
        context = '\n\nYou are a general academic tutor. Help students with any subject.'

    system_prompt = f'''You are a helpful AI tutor for a Computer-Based Testing (CBT) learning platform.
Your role is to help students understand course material, explain concepts, and guide their learning.

Course Materials:
{context}

Guidelines:
- Answer questions based on the course materials above when available
- Be clear, concise, and educational
- Use examples to explain complex concepts
- If asked about something not in the course materials, you may provide general knowledge but note it's outside the course scope
- Encourage deeper learning with follow-up questions
- Format responses with markdown for readability
'''

    messages = [{'role': 'system', 'content': system_prompt}]
    for h in history[-10:]:
        messages.append({'role': h.get('role', 'user'), 'content': h.get('content', '')})
    messages.append({'role': 'user', 'content': user_message})

    try:
        response = chat_completion(messages, model='gpt-4o-mini', temperature=0.7)
        return Response({'response': response})
    except Exception as e:
        return Response(
            {'error': 'AI service unavailable. Please configure OPENAI_API_KEY.'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )


# ── AI Question Generator ──

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_questions(request):
    """Generate questions from lesson content or topic.
    Body: { lesson_id (optional), subject, topic, count, difficulty, types }
    """
    lesson_id = request.data.get('lesson_id')
    subject = request.data.get('subject', '')
    topic = request.data.get('topic', '')
    count = min(int(request.data.get('count', 5)), 20)
    difficulty = request.data.get('difficulty', 'medium')
    types = request.data.get('types', ['mcq'])

    content_text = ''
    if lesson_id:
        lesson = get_object_or_404(Lesson, id=lesson_id)
        content_text = lesson.content or ''
        if not subject:
            subject = lesson.course.title
        if not topic:
            topic = lesson.title

    if not content_text and not subject:
        return Response({'error': 'Provide lesson_id or subject/topic'}, status=status.HTTP_400_BAD_REQUEST)

    types_str = ', '.join(types)
    prompt = f'''Generate {count} exam questions for the following:

Subject: {subject}
Topic: {topic}
Difficulty: {difficulty}
Question Types: {types_str}

Content:
{content_text[:4000] if content_text else f'General {subject} questions about {topic}'}

Return a JSON array where each question has:
- "question_text": the question text
- "question_type": one of {types}
- "options": array of options (for MCQ, exactly 4 options; null for others)
- "correct_answer": the correct answer (index 0-3 for MCQ, "true"/"false" for true_false, text for fill_blank)
- "explanation": brief explanation of the correct answer
- "difficulty": easy/medium/hard

Return ONLY the JSON array, no other text.'''

    try:
        response = generate_with_context(
            'You are an expert exam question writer. Generate high-quality educational questions.',
            prompt
        )

        # Parse JSON from response
        response = response.strip()
        if response.startswith('```'):
            response = response.split('\n', 1)[1].rsplit('```', 1)[0].strip()

        questions = json.loads(response)

        created = []
        for q in questions:
            qtype = q.get('question_type', 'mcq')
            options = q.get('options')
            if qtype == 'mcq' and options and isinstance(options[0], dict):
                options = [o.get('text', str(o)) for o in options]

            created.append({
                'question_text': q.get('question_text', ''),
                'question_type': qtype,
                'options': options,
                'correct_answer': q.get('correct_answer'),
                'explanation': q.get('explanation', ''),
                'difficulty': q.get('difficulty', difficulty),
            })

        return Response({
            'subject': subject,
            'topic': topic,
            'count': len(created),
            'questions': created,
        })

    except json.JSONDecodeError:
        return Response({'error': 'Failed to parse AI response'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    except Exception as e:
        return Response(
            {'error': 'AI service unavailable. Configure OPENAI_API_KEY.'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )


# ── AI Quiz Generator (from weak areas) ──

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_quiz(request):
    """Generate a quiz based on student's weak areas.
    Body: { count, difficulty }
    """
    count = min(int(request.data.get('count', 10)), 30)
    difficulty = request.data.get('difficulty', None)

    # Find weak topics
    answers = Answer.objects.filter(
        attempt__user=request.user, is_correct=False
    ).select_related('question')

    weak_subjects = {}
    for a in answers:
        subj = a.question.subject
        if subj not in weak_subjects:
            weak_subjects[subj] = 0
        weak_subjects[subj] += 1

    if not weak_subjects:
        # Fallback: use most common subject
        top_subjects = Question.objects.values('subject').annotate(
            count=Avg('marks')
        ).order_by('-count')[:3]
        weak_subjects = {s['subject']: 1 for s in top_subjects}

    subjects_str = ', '.join(f'{s} ({c} wrong)' for s, c in sorted(weak_subjects.items(), key=lambda x: -x[1])[:5])

    prompt = f'''Generate a quiz of {count} questions targeting these weak areas:
{subjects_str}

{f'Difficulty: {difficulty}' if difficulty else 'Mix of easy, medium, and hard questions.'}

Return a JSON array where each question has:
- "question_text": the question
- "question_type": one of "mcq", "true_false", "fill_blank"
- "options": array of options (4 for MCQ, null for others)
- "correct_answer": correct answer
- "explanation": why this answer is correct
- "subject": the subject
- "topic": the topic
- "difficulty": easy/medium/hard

Return ONLY the JSON array.'''

    try:
        response = generate_with_context(
            'You are an expert exam question writer. Generate targeted practice questions.',
            prompt
        )

        response = response.strip()
        if response.startswith('```'):
            response = response.split('\n', 1)[1].rsplit('```', 1)[0].strip()

        questions = json.loads(response)

        return Response({
            'weak_areas': subjects_str,
            'count': len(questions),
            'questions': questions,
        })

    except json.JSONDecodeError:
        return Response({'error': 'Failed to parse AI response'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    except Exception:
        return Response(
            {'error': 'AI service unavailable. Configure OPENAI_API_KEY.'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )


# ── AI Study Planner ──

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_study_plan(request):
    """Generate a personalized study plan.
    Body: { exam_date, course_id (optional), study_hours_per_day }
    """
    exam_date = request.data.get('exam_date')
    course_id = request.data.get('course_id')
    hours_per_day = float(request.data.get('study_hours_per_day', 2))

    if not exam_date:
        return Response({'error': 'exam_date required'}, status=status.HTTP_400_BAD_REQUEST)

    # Gather user data
    weak_answers = Answer.objects.filter(
        attempt__user=request.user, is_correct=False
    ).select_related('question')

    weak_topics = {}
    for a in weak_answers:
        topic = a.question.topic or a.question.subject
        if topic not in weak_topics:
            weak_topics[topic] = 0
        weak_topics[topic] += 1

    sessions = StudySession.objects.filter(user=request.user).order_by('-date')[:14]
    avg_daily_time = sum(s.study_time for s in sessions) / max(len(sessions), 1) / 3600

    course_info = ''
    if course_id:
        course = get_object_or_404(Course, id=course_id)
        lessons = Lesson.objects.filter(course=course)
        total_lessons = lessons.count()
        completed = LessonProgress.objects.filter(
            enrollment__user=request.user,
            enrollment__course=course,
            completed=True
        ).count()
        course_info = f'\nCourse: {course.title}\nTotal Lessons: {total_lessons}\nCompleted: {completed}\nRemaining: {total_lessons - completed}'

    weak_str = '\n'.join(f'- {topic}: {count} wrong answers' for topic, count in sorted(weak_topics.items(), key=lambda x: -x[1])[:10]) or 'No weak areas identified yet'

    prompt = f'''Create a personalized study plan for this student.

Exam Date: {exam_date}
Study Hours Per Day: {hours_per_day}
Current Average Study Time: {avg_daily_time:.1f} hours/day
{course_info}

Weak Areas (prioritize these):
{weak_str}

Generate a day-by-day study plan in JSON format:
{{
  "overview": "brief summary of the plan",
  "total_days": number,
  "daily_plans": [
    {{
      "day": 1,
      "date": "YYYY-MM-DD",
      "focus": "main topic for the day",
      "tasks": [
        {{
          "task": "description",
          "duration_minutes": 30,
          "type": "study/practice/review/rest",
          "priority": "high/medium/low"
        }}
      ],
      "tips": "motivational or strategic tip for the day"
    }}
  ]
}}

Return ONLY the JSON, no other text.'''

    try:
        response = generate_with_context(
            'You are an expert study coach. Create personalized, actionable study plans.',
            prompt
        )

        response = response.strip()
        if response.startswith('```'):
            response = response.split('\n', 1)[1].rsplit('```', 1)[0].strip()

        plan = json.loads(response)
        return Response(plan)

    except json.JSONDecodeError:
        return Response({'error': 'Failed to parse AI response'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    except Exception:
        return Response(
            {'error': 'AI service unavailable. Configure OPENAI_API_KEY.'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )


# ── AI Weakness Detection + Recommendations ──

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def weakness_analysis(request):
    """AI-powered analysis of student weaknesses with recommendations."""
    user = request.user

    answers = Answer.objects.filter(
        attempt__user=user, is_correct__isnull=False
    ).select_related('question')

    if not answers.exists():
        return Response({
            'message': 'No exam data available yet. Take some exams to get AI-powered analysis.',
            'weak_topics': [],
            'recommendations': [],
        })

    topic_stats = {}
    for a in answers:
        topic = a.question.topic or a.question.subject
        if topic not in topic_stats:
            topic_stats[topic] = {'total': 0, 'correct': 0, 'wrong': 0}
        topic_stats[topic]['total'] += 1
        if a.is_correct:
            topic_stats[topic]['correct'] += 1
        else:
            topic_stats[topic]['wrong'] += 1

    topics_analysis = []
    for topic, stats in topic_stats.items():
        accuracy = round(stats['correct'] / stats['total'] * 100, 1)
        topics_analysis.append({
            'topic': topic,
            'accuracy': accuracy,
            'total': stats['total'],
            'correct': stats['correct'],
            'wrong': stats['wrong'],
        })

    topics_analysis.sort(key=lambda x: x['accuracy'])
    weak = [t for t in topics_analysis if t['accuracy'] < 70][:5]

    if not weak:
        weak = topics_analysis[:3]

    weak_str = '\n'.join(f"- {t['topic']}: {t['accuracy']}% accuracy ({t['total']} attempts)" for t in weak)

    prompt = f'''Analyze this student's performance and provide recommendations.

Weak Topics:
{weak_str}

Total Questions Attempted: {answers.count()}
Overall Accuracy: {round(answers.filter(is_correct=True).count() / answers.count() * 100, 1)}%

Generate a JSON response:
{{
  "summary": "brief performance summary",
  "weak_topics": [
    {{
      "topic": "topic name",
      "accuracy": percentage,
      "severity": "critical/warning/needs_improvement",
      "suggestion": "specific study recommendation"
    }}
  ],
  "recommendations": [
    {{
      "title": "recommendation title",
      "description": "detailed recommendation",
      "priority": "high/medium/low",
      "action": "specific action to take"
    }}
  ],
  "encouragement": "motivational message"
}}

Return ONLY the JSON.'''

    try:
        response = generate_with_context(
            'You are an expert education analyst. Provide actionable, specific recommendations.',
            prompt
        )

        response = response.strip()
        if response.startswith('```'):
            response = response.split('\n', 1)[1].rsplit('```', 1)[0].strip()

        analysis = json.loads(response)
        analysis['raw_stats'] = topics_analysis
        return Response(analysis)

    except json.JSONDecodeError:
        return Response({
            'summary': f'You have {len(weak)} weak areas identified.',
            'weak_topics': [{'topic': t['topic'], 'accuracy': t['accuracy'], 'severity': 'needs_improvement'} for t in weak],
            'recommendations': [{'title': 'Practice More', 'description': f'Focus on: {", ".join(t["topic"] for t in weak)}', 'priority': 'high'}],
            'raw_stats': topics_analysis,
        })
    except Exception:
        return Response({
            'summary': 'AI analysis unavailable.',
            'weak_topics': [{'topic': t['topic'], 'accuracy': t['accuracy']} for t in weak],
            'recommendations': [],
            'raw_stats': topics_analysis,
        })
