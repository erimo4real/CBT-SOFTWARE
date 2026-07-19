import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectUser } from '@/store/slices/authSlice';
import { analyticsAPI } from '@/api/analytics';
import { examsAPI } from '@/api/exams';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import PageTransition from '@/components/PageTransition';
import PerformanceCharts from '@/components/PerformanceCharts';
import { StatsSkeleton, ListSkeleton } from '@/components/Skeletons';
import {
  ClipboardList, Trophy, BarChart3, Clock, Play, CheckCircle2,
  XCircle, ArrowRight, TrendingUp, Sparkles, BookOpen,
} from 'lucide-react';
import { formatDate } from '@/lib/format';

export default function ExamDashboard() {
  const user = useSelector(selectUser);
  const [dashboard, setDashboard] = useState(null);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      analyticsAPI.getDashboard().catch(() => ({ data: null })),
      examsAPI.getExams({ page_size: 6 }).catch(() => ({ data: { results: [] } })),
    ]).then(([dashRes, examRes]) => {
      setDashboard(dashRes.data);
      setExams(examRes.data.results || []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <StatsSkeleton />
        <ListSkeleton />
      </div>
    );
  }

  const stats = dashboard?.stats || {};
  const recentAttempts = dashboard?.recent_attempts || [];
  const inProgress = dashboard?.upcoming_exams || [];

  const passRate = recentAttempts.length > 0
    ? Math.round((recentAttempts.filter(a => a.passed).length / recentAttempts.length) * 100)
    : 0;

  const statCards = [
    {
      label: 'Exams Taken',
      value: stats.exams_taken || 0,
      icon: ClipboardList,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'stat-blue',
      cardClass: 'stat-card-blue',
    },
    {
      label: 'Avg Score',
      value: `${stats.average_score || 0}%`,
      icon: BarChart3,
      color: 'text-green-600 dark:text-green-400',
      bg: 'stat-green',
      cardClass: 'stat-card-green',
    },
    {
      label: 'Pass Rate',
      value: `${passRate}%`,
      icon: Trophy,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'stat-amber',
      cardClass: 'stat-card-amber',
    },
    {
      label: 'Level',
      value: stats.level || 1,
      icon: TrendingUp,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'stat-purple',
      cardClass: 'stat-card-purple',
    },
  ];

  return (
    <PageTransition>
      <div className="space-y-6 animate-slide-up">
        {/* Hero Banner */}
        <div className="hero-banner rounded-2xl p-6 sm:p-8">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">Staff Panel</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Welcome back, {user?.first_name || 'Instructor'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {user?.role === 'admin' ? 'Manage your CBT platform' : 'Manage exams and track student progress'}
            </p>
            <div className="flex items-center gap-4 mt-4">
              <Link to="/instructor/exams">
                <Button size="sm" className="btn-press">
                  <Play className="h-3.5 w-3.5 mr-1.5" /> Create Exam
                </Button>
              </Link>
              <Link to="/staff/students">
                <Button size="sm" variant="outline" className="btn-press">
                  <BookOpen className="h-3.5 w-3.5 mr-1.5" /> Manage Students
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 stagger-children">
          {statCards.map((s, i) => (
            <Card key={i} className={`hover-lift card-shadow border-0 stat-card-premium ${s.cardClass} overflow-hidden`}>
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${s.bg}`}>
                    <s.icon className={`h-6 w-6 ${s.color}`} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">{s.label}</p>
                    <p className="text-3xl font-bold tracking-tight">{s.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* In-progress exams */}
        {inProgress.length > 0 && (
          <Card className="card-shadow border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                Continue Exam
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {inProgress.map((e) => (
                  <Link
                    key={e.id}
                    to={`/exams/${e.exam_id}/take`}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-accent/80 text-sm transition-all group"
                  >
                    <span className="font-medium group-hover:text-primary transition-colors">{e.exam_title}</span>
                    <Button size="sm" variant="outline" className="btn-press">
                      Resume <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Performance Charts */}
        <PerformanceCharts />

        <div className="grid gap-4 lg:grid-cols-2 stagger-children">
          {/* Recent results */}
          <Card className="card-shadow border-0">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Recent Results</CardTitle>
                <Link to="/exams" className="text-xs text-primary hover:underline font-medium">View all</Link>
              </div>
            </CardHeader>
            <CardContent>
              {recentAttempts.length > 0 ? (
                <div className="space-y-1">
                  {recentAttempts.map((a) => (
                    <div key={a.id} className="flex items-center justify-between text-sm p-2.5 rounded-xl hover:bg-accent/50 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        {a.passed ? (
                          <div className="h-8 w-8 rounded-lg bg-green-50 dark:bg-green-950/30 flex items-center justify-center shrink-0">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          </div>
                        ) : (
                          <div className="h-8 w-8 rounded-lg bg-red-50 dark:bg-red-950/30 flex items-center justify-center shrink-0">
                            <XCircle className="h-4 w-4 text-red-500" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium truncate">{a.exam_title}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(a.date)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-bold">{Number(a.percentage)}%</span>
                        <Badge variant={a.passed ? 'default' : 'destructive'} className="text-[10px]">
                          {a.passed ? 'Pass' : 'Fail'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ClipboardList className="mx-auto h-8 w-8 mb-2 opacity-40" />
                  <p className="text-sm">No exams taken yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Available exams */}
          <Card className="card-shadow border-0">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Available Exams</CardTitle>
                <Link to="/exams" className="text-xs text-primary hover:underline font-medium">Browse all</Link>
              </div>
            </CardHeader>
            <CardContent>
              {exams.length > 0 ? (
                <div className="space-y-1">
                  {exams.slice(0, 5).map((exam) => (
                    <div key={exam.id} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-accent/50 text-sm transition-colors">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{exam.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {exam.question_count} questions · {Math.round(exam.duration / 60)}min
                        </p>
                      </div>
                      <Link to={`/exams/${exam.id}/take`}>
                        <Button size="sm" className="btn-press">
                          <Play className="h-3.5 w-3.5 mr-1" />
                          Start
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Trophy className="mx-auto h-8 w-8 mb-2 opacity-40" />
                  <p className="text-sm">No exams available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
}
