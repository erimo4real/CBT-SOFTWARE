from rest_framework import serializers
from .models import Question, Exam, ExamQuestion, ExamAttempt, Answer


class QuestionSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)

    class Meta:
        model = Question
        fields = [
            'id', 'subject', 'topic', 'class_level', 'question_type', 'difficulty',
            'content', 'options', 'correct_answer', 'explanation',
            'marks', 'created_by', 'created_by_name', 'tags',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']


class QuestionBankSerializer(serializers.ModelSerializer):
    """List serializer for question bank — excludes correct_answer."""
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)

    class Meta:
        model = Question
        fields = [
            'id', 'subject', 'topic', 'class_level', 'question_type', 'difficulty',
            'content', 'options', 'marks', 'created_by', 'created_by_name',
            'tags', 'created_at',
        ]


class ExamQuestionSerializer(serializers.ModelSerializer):
    question = QuestionBankSerializer(read_only=True)

    class Meta:
        model = ExamQuestion
        fields = ['id', 'question', 'marks', 'order']


class ExamListSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    course_title = serializers.CharField(source='course.title', read_only=True, default=None)
    subject_names = serializers.SerializerMethodField()
    question_count = serializers.SerializerMethodField()
    attempt_count = serializers.SerializerMethodField()
    duration_display = serializers.SerializerMethodField()
    exam_status = serializers.SerializerMethodField()

    class Meta:
        model = Exam
        fields = [
            'id', 'title', 'description', 'class_level', 'course', 'course_title',
            'subjects', 'subject_names',
            'created_by', 'created_by_name', 'duration', 'total_marks',
            'passing_score', 'start_date', 'end_date', 'allowed_attempts',
            'is_published', 'is_visible', 'visible_from', 'visible_until',
            'question_count', 'attempt_count',
            'duration_display', 'exam_status',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']

    def get_subject_names(self, obj):
        return obj.subject_names

    def get_question_count(self, obj):
        return obj.exam_questions.count()

    def get_attempt_count(self, obj):
        return obj.attempts.count()

    def get_duration_display(self, obj):
        total = int(obj.duration.total_seconds()) if obj.duration else 0
        h, m = divmod(total // 60, 60)
        if h and m:
            return f'{h}h {m}m'
        return f'{h or m}{"h" if h else "m"}'

    def get_exam_status(self, obj):
        from django.utils import timezone
        now = timezone.now()
        if obj.start_date and now < obj.start_date:
            return 'upcoming'
        if obj.end_date and now > obj.end_date:
            return 'ended'
        return 'ongoing'


class ExamDetailSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    course_title = serializers.CharField(source='course.title', read_only=True, default=None)
    subject_names = serializers.SerializerMethodField()
    questions = ExamQuestionSerializer(source='exam_questions', many=True, read_only=True)
    question_count = serializers.SerializerMethodField()
    duration_display = serializers.SerializerMethodField()
    exam_status = serializers.SerializerMethodField()

    class Meta:
        model = Exam
        fields = [
            'id', 'title', 'description', 'class_level', 'course', 'course_title',
            'subjects', 'subject_names',
            'created_by', 'created_by_name', 'duration', 'total_marks',
            'passing_score', 'start_date', 'end_date', 'allowed_attempts',
            'config', 'anti_cheating', 'is_published',
            'is_visible', 'visible_from', 'visible_until',
            'questions', 'question_count', 'duration_display', 'exam_status',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']

    def get_subject_names(self, obj):
        return obj.subject_names

    def get_question_count(self, obj):
        return obj.exam_questions.count()

    def get_duration_display(self, obj):
        total = int(obj.duration.total_seconds()) if obj.duration else 0
        h, m = divmod(total // 60, 60)
        if h and m:
            return f'{h}h {m}m'
        return f'{h or m}{"h" if h else "m"}'

    def get_exam_status(self, obj):
        from django.utils import timezone
        now = timezone.now()
        if obj.start_date and now < obj.start_date:
            return 'upcoming'
        if obj.end_date and now > obj.end_date:
            return 'ended'
        return 'ongoing'


class AnswerSerializer(serializers.ModelSerializer):
    question_title = serializers.SerializerMethodField()

    class Meta:
        model = Answer
        fields = [
            'id', 'question', 'question_title', 'selected_option',
            'answer_text', 'is_correct', 'marks_awarded', 'time_spent',
        ]

    def get_question_title(self, obj):
        content = obj.question.content
        if isinstance(content, dict):
            return content.get('title', content.get('text', str(content)))
        return str(content)[:100]


class ExamAttemptListSerializer(serializers.ModelSerializer):
    exam_title = serializers.CharField(source='exam.title', read_only=True)

    class Meta:
        model = ExamAttempt
        fields = [
            'id', 'exam', 'exam_title', 'attempt_number', 'start_time',
            'end_time', 'score', 'percentage', 'passed', 'status',
        ]


class ExamAttemptDetailSerializer(serializers.ModelSerializer):
    exam_title = serializers.CharField(source='exam.title', read_only=True)
    answers = AnswerSerializer(many=True, source='answer_set', read_only=True)
    total_questions = serializers.SerializerMethodField()
    answered_count = serializers.SerializerMethodField()
    flagged_count = serializers.SerializerMethodField()
    time_remaining = serializers.SerializerMethodField()

    class Meta:
        model = ExamAttempt
        fields = [
            'id', 'exam', 'exam_title', 'attempt_number', 'start_time',
            'end_time', 'score', 'percentage', 'passed', 'status',
            'answers', 'total_questions', 'answered_count', 'flagged_count',
            'time_remaining',
        ]

    def get_total_questions(self, obj):
        return obj.exam.exam_questions.count()

    def get_answered_count(self, obj):
        return obj.answer_set.exclude(selected_option__isnull=True).exclude(
            selected_option=''
        ).exclude(answer_text='').count()

    def get_flagged_count(self, obj):
        flags = obj.answers.get('_flags', {})
        return sum(1 for v in flags.values() if v)

    def get_time_remaining(self, obj):
        if obj.status != 'in_progress':
            return 0
        from django.utils import timezone
        elapsed = timezone.now() - obj.start_time
        remaining = obj.exam.duration - elapsed
        return max(0, int(remaining.total_seconds()))
