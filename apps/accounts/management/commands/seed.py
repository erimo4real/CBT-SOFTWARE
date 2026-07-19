import random
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.accounts.models import User
from apps.courses.models import Category, Course, Lesson, Enrollment
from apps.exams.models import Question, Exam, ExamQuestion, ExamAttempt, Answer
from apps.certificates.models import Certificate


class Command(BaseCommand):
    help = 'Seed the database with realistic test data'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING('Seeding database...'))

        # ── Users ──
        admin = self._create_user('admin@cbt.com', 'admin123!', 'Admin', 'User', 'admin', is_staff=True, is_superuser=True)

        instructors = []
        instructor_data = [
            ('james.okon@cbt.com', 'James', 'Okon'),
            ('fatima.ali@cbt.com', 'Fatima', 'Ali'),
            ('david.chen@cbt.com', 'David', 'Chen'),
        ]
        for email, first, last in instructor_data:
            u = self._create_user(email, 'instructor123!', first, last, 'instructor')
            instructors.append(u)

        students = []
        student_data = [
            ('ada.eze@student.cbt.com', 'Ada', 'Eze', 'STU-001', 'Level 100'),
            ('bob.smith@student.cbt.com', 'Bob', 'Smith', 'STU-002', 'Level 100'),
            ('chi.nweke@student.cbt.com', 'Chi', 'Nweke', 'STU-003', 'Level 200'),
            ('dan.musa@student.cbt.com', 'Dan', 'Musa', 'STU-004', 'Level 200'),
            ('eve.johnson@student.cbt.com', 'Eve', 'Johnson', 'STU-005', 'Level 300'),
            ('frank.obi@student.cbt.com', 'Frank', 'Obi', 'STU-006', 'Level 300'),
            ('grace.ade@student.cbt.com', 'Grace', 'Ade', 'STU-007', 'Level 100'),
            ('hassan.bello@student.cbt.com', 'Hassan', 'Bello', 'STU-008', 'Level 200'),
            ('ire.okafor@student.cbt.com', 'Ire', 'Okafor', 'STU-009', 'Level 300'),
            ('john.udo@student.cbt.com', 'John', 'Udo', 'STU-010', 'Level 100'),
        ]
        for email, first, last, reg, level in student_data:
            u = self._create_user(email, 'student123!', first, last, 'student', reg_number=reg, class_level=level)
            students.append(u)

        # ── Categories ──
        categories = {}
        cat_data = [
            ('Mathematics', 'Mathematical concepts and problem solving', 'calculator'),
            ('Computer Science', 'Programming, algorithms, and CS fundamentals', 'code'),
            ('English Language', 'Grammar, comprehension, and writing skills', 'book-open'),
            ('Physics', 'Mechanics, thermodynamics, and modern physics', 'atom'),
        ]
        for name, desc, icon in cat_data:
            cat, _ = Category.objects.get_or_create(name=name, defaults={'description': desc, 'icon': icon})
            categories[name] = cat

        # ── Courses ──
        courses = []
        course_data = [
            ('Introduction to Calculus', 'Mathematics', 'beginner', instructors[0], 'Learn limits, derivatives, and integrals from scratch.'),
            ('Data Structures & Algorithms', 'Computer Science', 'intermediate', instructors[1], 'Master arrays, trees, graphs, and sorting algorithms.'),
            ('Academic Writing', 'English Language', 'beginner', instructors[2], 'Develop your essay writing and critical thinking skills.'),
            ('Classical Mechanics', 'Physics', 'intermediate', instructors[0], 'Newtonian mechanics, energy, and momentum.'),
            ('Python Programming', 'Computer Science', 'beginner', instructors[1], 'Learn Python from basics to advanced concepts.'),
            ('Linear Algebra', 'Mathematics', 'advanced', instructors[0], 'Vectors, matrices, eigenvalues, and linear transformations.'),
        ]
        for title, cat_name, diff, instr, desc in course_data:
            c, _ = Course.objects.get_or_create(
                title=title,
                defaults={
                    'description': desc,
                    'instructor': instr,
                    'category': categories[cat_name],
                    'difficulty': diff,
                    'is_published': True,
                    'estimated_duration': timedelta(hours=random.randint(10, 40)),
                }
            )
            courses.append(c)

        # ── Lessons ──
        lesson_topics = {
            0: ['Limits and Continuity', 'Derivatives', 'Integration Basics', 'Applications of Derivatives'],
            1: ['Arrays and Linked Lists', 'Stacks and Queues', 'Binary Trees', 'Graph Algorithms', 'Sorting and Searching'],
            2: ['Essay Structure', 'Thesis Statements', 'Citation and Referencing', 'Peer Review'],
            3: ['Newton\'s Laws', 'Energy and Work', 'Momentum and Collisions', 'Rotational Motion'],
            4: ['Variables and Types', 'Control Flow', 'Functions and Classes', 'File I/O and Modules'],
            5: ['Vectors and Spaces', 'Matrix Operations', 'Determinants', 'Eigenvalues'],
        }
        for i, topics in lesson_topics.items():
            for j, title in enumerate(topics):
                Lesson.objects.get_or_create(
                    course=courses[i],
                    title=title,
                    defaults={
                        'content_type': 'text',
                        'content': f'Content for {title}. This lesson covers the fundamentals of {title.lower()} with practical examples and exercises.',
                        'order': j + 1,
                        'duration': timedelta(minutes=random.randint(15, 60)),
                    }
                )

        # ── Enrollments ──
        for student in students:
            for course in random.sample(courses, k=random.randint(2, 4)):
                Enrollment.objects.get_or_create(user=student, course=course)

        # ── Questions ──
        all_questions = []

        # Calculus questions
        calc_qs = [
            ('What is the derivative of x^2?', ['2x', 'x^2', '2x^2', 'x'], 0, 'easy', 'Derivatives'),
            ('Evaluate: lim(x→0) sin(x)/x', ['0', '1', '∞', 'Undefined'], 1, 'medium', 'Limits'),
            ('What is ∫ 2x dx?', ['x^2 + C', '2x^2 + C', 'x + C', '2 + C'], 0, 'easy', 'Integration'),
            ('The second derivative test is used to find:', ['Inflection points', 'Local extrema', 'Asymptotes', 'Continuity'], 1, 'medium', 'Applications'),
            ('What is d/dx[e^x]?', ['e^x', 'xe^x', 'e^(x-1)', '1/e^x'], 0, 'easy', 'Derivatives'),
        ]
        for content, opts, correct, diff, topic in calc_qs:
            q = Question.objects.create(
                subject='Mathematics', topic=topic, question_type='mcq', difficulty=diff,
                content={'text': content},
                options=[{'text': o, 'id': i} for i, o in enumerate(opts)],
                correct_answer=correct, explanation=f'The correct answer is {opts[correct]}.',
                marks=1, created_by=instructors[0],
            )
            all_questions.append(q)

        # CS questions
        cs_qs = [
            ('What is the time complexity of binary search?', ['O(n)', 'O(log n)', 'O(n^2)', 'O(1)'], 1, 'medium', 'Algorithms'),
            ('Which data structure uses LIFO?', ['Queue', 'Stack', 'Array', 'Linked List'], 1, 'easy', 'Data Structures'),
            ('A binary tree node has at most ___ children.', ['1', '2', '3', '4'], 1, 'easy', 'Data Structures'),
            ('What does DFS stand for?', ['Data Flow System', 'Depth First Search', 'Direct File Storage', 'Dynamic Function Set'], 1, 'easy', 'Graph Algorithms'),
            ('Which sorting algorithm has worst case O(n log n)?', ['Bubble Sort', 'Quick Sort', 'Merge Sort', 'Selection Sort'], 2, 'medium', 'Sorting'),
            ('What is a hash table used for?', ['Sorting', 'Fast lookup', 'Tree traversal', 'Graph搜索'], 1, 'easy', 'Data Structures'),
        ]
        for content, opts, correct, diff, topic in cs_qs:
            q = Question.objects.create(
                subject='Computer Science', topic=topic, question_type='mcq', difficulty=diff,
                content={'text': content},
                options=[{'text': o, 'id': i} for i, o in enumerate(opts)],
                correct_answer=correct, explanation=f'The correct answer is {opts[correct]}.',
                marks=1, created_by=instructors[1],
            )
            all_questions.append(q)

        # English T/F questions
        eng_qs = [
            ('A thesis statement should be placed in the conclusion.', False, 'easy', 'Essay Structure'),
            ('Peer review helps improve the quality of academic writing.', True, 'easy', 'Peer Review'),
            ('An essay can have multiple thesis statements.', False, 'medium', 'Thesis Statements'),
            ('APA and MLA are two common citation styles.', True, 'easy', 'Citation'),
        ]
        for content, correct, diff, topic in eng_qs:
            q = Question.objects.create(
                subject='English Language', topic=topic, question_type='true_false', difficulty=diff,
                content={'text': content},
                options=[{'text': 'True', 'id': 0}, {'text': 'False', 'id': 1}],
                correct_answer=0 if correct else 1, explanation='See textbook reference.',
                marks=1, created_by=instructors[2],
            )
            all_questions.append(q)

        # Physics questions
        phys_qs = [
            ('What is the SI unit of force?', ['Joule', 'Newton', 'Watt', 'Pascal'], 1, 'easy', 'Newton\'s Laws'),
            ('F = ma is Newton\'s ___ law.', ['First', 'Second', 'Third', 'Fourth'], 1, 'easy', 'Newton\'s Laws'),
            ('Kinetic energy formula is:', ['mv', 'mv^2', '1/2 mv^2', '2mv'], 2, 'medium', 'Energy'),
            ('Momentum equals:', ['mass × velocity', 'mass × acceleration', 'force × time', 'mass × distance'], 0, 'easy', 'Momentum'),
        ]
        for content, opts, correct, diff, topic in phys_qs:
            q = Question.objects.create(
                subject='Physics', topic=topic, question_type='mcq', difficulty=diff,
                content={'text': content},
                options=[{'text': o, 'id': i} for i, o in enumerate(opts)],
                correct_answer=correct, explanation=f'The correct answer is {opts[correct]}.',
                marks=1, created_by=instructors[0],
            )
            all_questions.append(q)

        # Math MCQ questions
        math_qs = [
            ('What is the value of π to two decimal places?', ['3.14', '3.16', '3.12', '3.18'], 0, 'easy', 'General'),
            ('Solve: 2x + 5 = 15. What is x?', ['5', '10', '7.5', '2.5'], 0, 'easy', 'Algebra'),
            ('What is the determinant of a 2x2 identity matrix?', ['0', '1', '2', '-1'], 1, 'easy', 'Linear Algebra'),
        ]
        for content, opts, correct, diff, topic in math_qs:
            q = Question.objects.create(
                subject='Mathematics', topic=topic, question_type='mcq', difficulty=diff,
                content={'text': content},
                options=[{'text': o, 'id': i} for i, o in enumerate(opts)],
                correct_answer=correct, explanation=f'The correct answer is {opts[correct]}.',
                marks=1, created_by=instructors[0],
            )
            all_questions.append(q)

        self.stdout.write(self.style.SUCCESS(f'Created {len(all_questions)} questions'))

        # ── Exams ──
        exams = []

        exam_data = [
            ('Calculus Midterm', 0, 'Mathematics', 60, 15, 50),
            ('Data Structures Final', 1, 'Computer Science', 90, 20, 50),
            ('English Essay Quiz', 2, 'English Language', 30, 5, 60),
            ('Physics Practice Test', 3, 'Physics', 45, 10, 40),
            ('Python Basics Quiz', 4, 'Computer Science', 30, 10, 50),
            ('Linear Algebra Final', 5, 'Mathematics', 120, 20, 50),
        ]
        for title, course_idx, subject, duration_mins, num_qs, pass_score in exam_data:
            subject_qs = [q for q in all_questions if q.subject == subject]
            selected = random.sample(subject_qs, k=min(num_qs, len(subject_qs)))

            exam, _ = Exam.objects.get_or_create(
                title=title,
                defaults={
                    'course': courses[course_idx],
                    'created_by': instructors[course_idx % len(instructors)],
                    'duration': timedelta(minutes=duration_mins),
                    'total_marks': len(selected),
                    'passing_score': pass_score,
                    'is_published': True,
                    'start_date': timezone.now() - timedelta(days=7),
                    'end_date': timezone.now() + timedelta(days=30),
                    'allowed_attempts': 3,
                }
            )
            for j, q in enumerate(selected):
                ExamQuestion.objects.get_or_create(
                    exam=exam, question=q,
                    defaults={'marks': q.marks, 'order': j + 1}
                )
            exams.append(exam)

        self.stdout.write(self.style.SUCCESS(f'Created {len(exams)} exams'))

        # ── Exam attempts (some completed, some in-progress) ──
        attempt_count = 0
        for student in random.sample(students, k=6):
            for exam in random.sample(exams, k=random.randint(1, 3)):
                try:
                    attempt = ExamAttempt.objects.create(
                        user=student, exam=exam, attempt_number=1, status='completed',
                        start_time=timezone.now() - timedelta(days=random.randint(1, 10)),
                        end_time=timezone.now() - timedelta(days=random.randint(1, 9)),
                    )
                    exam_qs = ExamQuestion.objects.filter(exam=exam)
                    earned = 0
                    total = 0
                    for eq in exam_qs:
                        correct = random.random() > 0.35
                        Answer.objects.create(
                            attempt=attempt, question=eq.question,
                            selected_option=eq.question.correct_answer if correct else 99,
                            is_correct=correct,
                            marks_awarded=eq.marks if correct else 0,
                        )
                        earned += eq.marks if correct else 0
                        total += eq.marks
                    attempt.score = earned
                    attempt.percentage = round((earned / total * 100), 2) if total else 0
                    attempt.passed = attempt.percentage >= exam.passing_score
                    attempt.save()
                    attempt_count += 1
                except Exception:
                    pass

        self.stdout.write(self.style.SUCCESS(f'Created {attempt_count} exam attempts'))

        # ── Certificates for passed attempts ──
        cert_count = 0
        for attempt in ExamAttempt.objects.filter(passed=True):
            if not attempt.exam.course:
                continue
            cert, created = Certificate.objects.get_or_create(
                user=attempt.user, course=attempt.exam.course,
                defaults={
                    'exam': attempt.exam,
                    'score': attempt.percentage,
                    'instructor_name': attempt.exam.created_by.full_name,
                }
            )
            if created:
                cert_count += 1

        self.stdout.write(self.style.SUCCESS(f'Created {cert_count} certificates'))

        # ── Summary ──
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('=' * 50))
        self.stdout.write(self.style.SUCCESS('  SEED COMPLETE'))
        self.stdout.write(self.style.SUCCESS('=' * 50))
        self.stdout.write(f'  Users:          {User.objects.count()}')
        self.stdout.write(f'  Categories:     {Category.objects.count()}')
        self.stdout.write(f'  Courses:        {Course.objects.count()}')
        self.stdout.write(f'  Lessons:        {Lesson.objects.count()}')
        self.stdout.write(f'  Enrollments:    {Enrollment.objects.count()}')
        self.stdout.write(f'  Questions:      {Question.objects.count()}')
        self.stdout.write(f'  Exams:          {Exam.objects.count()}')
        self.stdout.write(f'  Exam Attempts:  {ExamAttempt.objects.count()}')
        self.stdout.write(f'  Certificates:   {Certificate.objects.count()}')
        self.stdout.write(self.style.SUCCESS('=' * 50))
        self.stdout.write('')
        self.stdout.write('  Admin:       admin@cbt.com / admin123!')
        self.stdout.write('  Instructor:  james.okon@cbt.com / instructor123!')
        self.stdout.write('  Student:     ada.eze@student.cbt.com / student123!')
        self.stdout.write('')

    def _create_user(self, email, password, first, last, role, **extra):
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'first_name': first,
                'last_name': last,
                'role': role,
                'email_verified': True,
                **extra,
            }
        )
        if created:
            user.set_password(password)
            user.save()
        return user
