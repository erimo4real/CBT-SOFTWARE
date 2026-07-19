import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { selectUser } from '@/store/slices/authSlice';
import { examsAPI } from '@/api/exams';
import { coursesAPI } from '@/api/courses';
import { analyticsAPI } from '@/api/analytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  ClipboardList, Trophy, Award, Clock, ArrowRight, Play, CheckCircle2,
  Flame, BookOpen, TrendingUp, Target, Zap,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';

export default function StudentDashboard() {
  const user = useSelector(selectUser);
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      examsAPI.list({}).catch(() => ({ data: { results: [] } })),
      examsAPI.myAttempts({}).catch(() => ({ data: [] })),
      coursesAPI.getEnrollments().catch(() => ({ data: [] })),
      analyticsAPI.getDashboard().catch(() => ({ data: null })),
    ]).then(([examsRes, attemptsRes, enrollRes, dashRes]) => {
      setExams(examsRes.data.results || []);
      setAttempts(Array.isArray(attemptsRes.data) ? attemptsRes.data : (attemptsRes.data.results || []));
      setEnrollments(Array.isArray(enrollRes.data) ? enrollRes.data : (enrollRes.data.results || []));
      setDashboard(dashRes.data);
    }).finally(() => setLoading(false));
  }, []);

  const completedAttempts = attempts.filter(a => a.status === 'completed');
  const stats = dashboard?.stats || {};
  const bestScore = completedAttempts.length > 0
    ? Math.max(...completedAttempts.map(a => Number(a.percentage) || 0))
    : 0;
  const avgScore = completedAttempts.length > 0
    ? (completedAttempts.reduce((sum, a) => sum + (Number(a.percentage) || 0), 0) / completedAttempts.length).toFixed(1)
    : 0;

  const statCards = [
    { label: 'Study Streak', value: stats.streak_days || 0, suffix: ' days', icon: Flame, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { label: 'Exams Completed', value: completedAttempts.length, icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10' },
    { label: 'Average Score', value: avgScore, suffix: '%', icon: TrendingUp, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Best Score', value: bestScore, suffix: '%', icon: Trophy, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: 'XP Points', value: stats.xp_points || 0, suffix: ' XP', icon: Zap, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { label: 'Level', value: stats.level || 1, icon: Target, color: 'text-rose-500', bg: 'bg-rose-500/10' },
  ];

  // Build chart data from recent attempts (last 10)
  const chartData = completedAttempts
    .slice(-10)
    .map((a, i) => ({
      name: `Exam ${i + 1}`,
      score: Number(a.percentage) || 0,
      passed: a.passed,
    }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">
          Welcome back, {user?.first_name || user?.full_name || 'Student'}
        </h1>
        <p className="text-muted-foreground">
          Reg: {user?.reg_number || 'N/A'} &middot; {user?.class_level || 'No class assigned'}
          {stats.streak_days > 0 && (
            <span className="ml-2 inline-flex items-center gap-1 text-orange-500 font-medium">
              <Flame className="h-3.5 w-3.5" /> {stats.streak_days}-day streak!
            </span>
          )}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 stagger-children">
        {statCards.map((s, i) => (
          <Card key={i} className="card-shadow border-0">
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-xl font-bold mt-0.5">
                    {loading ? '—' : s.value}{!loading && s.suffix ? <span className="text-sm font-normal text-muted-foreground">{s.suffix}</span> : ''}
                  </p>
                </div>
                <div className={`p-2 rounded-lg ${s.bg}`}>
                  <s.icon className={`h-4 w-4 ${s.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Score Trend */}
        <Card className="card-shadow border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Score Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-48 w-full" />
            ) : chartData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                No exam results yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} barSize={24}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    formatter={(v) => [`${v}%`, 'Score']}
                  />
                  <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.passed ? '#16a34a' : '#dc2626'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Course Progress */}
        <Card className="card-shadow border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Course Progress</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : enrollments.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                <BookOpen className="h-8 w-8 mr-2 opacity-30" /> No enrollments yet
              </div>
            ) : (
              <div className="space-y-3">
                {enrollments.slice(0, 5).map((en) => {
                  const progress = en.progress || 0;
                  return (
                    <div key={en.id} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium truncate pr-2">{en.course_title || en.course?.title || 'Course'}</span>
                        <span className="text-muted-foreground shrink-0">{Math.round(progress)}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Available Exams */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Available Exams</h2>
          <Button variant="ghost" size="sm" onClick={() => navigate('/student/exams')}>
            View All <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
        {loading ? (
          <div className="grid gap-3 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}><CardContent className="pt-4"><Skeleton className="h-20 w-full" /></CardContent></Card>
            ))}
          </div>
        ) : exams.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No exams available yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {exams.slice(0, 6).map((exam) => (
              <Card key={exam.id} className="card-shadow border-0 hover:shadow-md transition-all cursor-pointer" onClick={() => navigate(`/student/exams/${exam.id}`)}>
                <CardContent className="pt-4 pb-3 px-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-medium truncate">{exam.title}</h3>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {exam.duration_display || '—'}
                        </span>
                        <span>{exam.total_marks} marks</span>
                      </div>
                    </div>
                    <Button size="sm" className="shrink-0">
                      <Play className="h-3.5 w-3.5 mr-1" /> Start
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Recent Results */}
      {completedAttempts.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Recent Results</h2>
          <div className="space-y-2">
            {completedAttempts.slice(0, 5).map((a) => (
              <Card key={a.id} className="border-0">
                <CardContent className="py-3 px-5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{a.exam_title || a.exam?.title || 'Exam'}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(a.start_time).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={a.passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {Number(a.percentage) || 0}%
                    </Badge>
                    <Button size="sm" variant="ghost" onClick={() => navigate(`/student/results/${a.id}`)}>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
