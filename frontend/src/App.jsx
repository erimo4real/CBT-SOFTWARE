import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider, useDispatch } from 'react-redux';
import { store } from './store';
import { fetchProfile } from './store/slices/authSlice';
import { authStorage } from '@/lib/authStorage';
import { Toaster } from 'sonner';
import { ProtectedRoute, GuestRoute, StudentRoute } from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import AppLayout from './components/layout/AppLayout';
import StudentLayout from './components/layout/StudentLayout';
import { GraduationCap } from 'lucide-react';

// Eagerly loaded
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import StudentLogin from './pages/student/StudentLogin';
import ExamTerminal from './pages/student/ExamTerminal';

// Lazy-loaded page chunks
const Profile = lazy(() => import('./pages/Profile'));

// Staff pages
const ExamDashboard = lazy(() => import('./pages/ExamDashboard'));

// Courses
const CourseCatalog = lazy(() => import('./pages/courses/CourseCatalog'));
const CourseDetail = lazy(() => import('./pages/courses/CourseDetail'));
const LessonView = lazy(() => import('./pages/courses/LessonView'));
const MyCourses = lazy(() => import('./pages/courses/MyCourses'));

// Exams
const ExamList = lazy(() => import('./pages/exams/ExamList'));
const ExamEngine = lazy(() => import('./pages/exams/ExamEngine'));
const ExamResults = lazy(() => import('./pages/exams/ExamResults'));
const ExamReview = lazy(() => import('./pages/exams/ExamReview'));

// Practice
const PracticeMode = lazy(() => import('./pages/practice/PracticeMode'));
const Bookmarks = lazy(() => import('./pages/practice/Bookmarks'));

// Certificates
const Certificates = lazy(() => import('./pages/certificates/Certificates'));
const Notifications = lazy(() => import('./pages/certificates/Notifications'));

// AI
const AITutor = lazy(() => import('./pages/ai/AITutor'));
const AIQuestionGenerator = lazy(() => import('./pages/ai/AIQuestionGenerator'));
const AIQuizGenerator = lazy(() => import('./pages/ai/AIQuizGenerator'));
const AIStudyPlanner = lazy(() => import('./pages/ai/AIStudyPlanner'));
const AIWeaknessAnalysis = lazy(() => import('./pages/ai/AIWeaknessAnalysis'));

// Staff management
const StudentManager = lazy(() => import('./pages/instructor/StudentManager'));
const ExamPinManager = lazy(() => import('./pages/instructor/ExamPinManager'));
const CourseManager = lazy(() => import('./pages/instructor/CourseManager'));
const QuestionBank = lazy(() => import('./pages/instructor/QuestionBank'));
const ExamBuilder = lazy(() => import('./pages/instructor/ExamBuilder'));
const ItemAnalysisPage = lazy(() => import('./pages/instructor/ItemAnalysis'));

// Admin
const UserManagement = lazy(() => import('./pages/admin/UserManagement'));
const CategoryManager = lazy(() => import('./pages/admin/CategoryManager'));

// Student portal pages
const StudentDashboard = lazy(() => import('./pages/student/StudentDashboard'));
const StudentExamList = lazy(() => import('./pages/student/StudentExamList'));
const Leaderboard = lazy(() => import('./pages/student/Leaderboard'));

function PageLoader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center animate-pulse">
        <GraduationCap className="h-6 w-6 text-primary" />
      </div>
    </div>
  );
}

function AuthInitializer({ children }) {
  const dispatch = useDispatch();
  useEffect(() => {
    if (authStorage.getTokens()) {
      dispatch(fetchProfile());
    }
  }, [dispatch]);
  return children;
}

function App() {
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <Router>
          <AuthInitializer>
            <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* ── Public Routes ── */}
              <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
              <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
              <Route path="/forgot-password" element={<GuestRoute><ForgotPassword /></GuestRoute>} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/student/login" element={<StudentLogin />} />
              <Route path="/terminal" element={<ExamTerminal />} />

              {/* ── Staff Panel (instructors + admins) ── */}
              <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route path="/dashboard" element={<ExamDashboard />} />
                <Route path="/profile" element={<Profile />} />

                {/* Courses */}
                <Route path="/courses" element={<CourseCatalog />} />
                <Route path="/courses/:id" element={<CourseDetail />} />
                <Route path="/courses/:courseId/lessons/:lessonId" element={<LessonView />} />
                <Route path="/my-courses" element={<MyCourses />} />

                {/* Exams */}
                <Route path="/exams" element={<ExamList />} />
                <Route path="/exams/:id/take" element={<ExamEngine />} />
                <Route path="/exams/:id/results" element={<ExamResults />} />
                <Route path="/exams/attempts/:id/review" element={<ExamReview />} />

                {/* Practice */}
                <Route path="/practice" element={<PracticeMode />} />
                <Route path="/bookmarks" element={<Bookmarks />} />

                {/* Certificates */}
                <Route path="/certificates" element={<Certificates />} />
                <Route path="/notifications" element={<Notifications />} />

                {/* AI */}
                <Route path="/ai/tutor" element={<AITutor />} />
                <Route path="/ai/questions" element={<AIQuestionGenerator />} />
                <Route path="/ai/quiz" element={<AIQuizGenerator />} />
                <Route path="/ai/study-plan" element={<AIStudyPlanner />} />
                <Route path="/ai/weakness" element={<AIWeaknessAnalysis />} />

                {/* Staff: Student & Exam PIN Management */}
                <Route path="/staff/students" element={<StudentManager />} />
                <Route path="/staff/exam-pins" element={<ExamPinManager />} />

                {/* Instructor */}
                <Route path="/instructor/courses" element={<CourseManager />} />
                <Route path="/instructor/questions" element={<QuestionBank />} />
                <Route path="/instructor/exams" element={<ExamBuilder />} />
                <Route path="/instructor/analytics" element={<ItemAnalysisPage />} />

                {/* Admin */}
                <Route path="/admin/users" element={<UserManagement />} />
                <Route path="/admin/categories" element={<CategoryManager />} />
              </Route>

              {/* ── Student Portal ── */}
              <Route element={<StudentRoute><StudentLayout /></StudentRoute>}>
                <Route path="/student/dashboard" element={<StudentDashboard />} />
                <Route path="/student/exams" element={<StudentExamList />} />
                <Route path="/student/exams/:id" element={<StudentExamList />} />
                <Route path="/student/leaderboard" element={<Leaderboard />} />
                <Route path="/student/results/:id" element={<ExamResults />} />
                <Route path="/student/results/:id/review" element={<ExamReview />} />
                <Route path="/student/certificates" element={<Certificates />} />
              </Route>

              {/* ── Root redirect ── */}
              <Route path="/" element={<Navigate to="/login" replace />} />

              {/* ── Catch-all ── */}
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </Suspense>

          <Toaster position="top-right" richColors />
          </AuthInitializer>
        </Router>
      </Provider>
    </ErrorBoundary>
  );
}

export default App;
