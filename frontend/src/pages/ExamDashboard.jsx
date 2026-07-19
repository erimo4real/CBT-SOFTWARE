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
  XCircle, ArrowRight, TrendingUp,
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

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome, {user?.first_name || 'Student'}
          </h1>
          <p className="text-muted-foreground">Your exam portal</p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 stagger-children">
          <Card className="hover-lift card-shadow border-0 overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl stat-blue">
                  <ClipboardList className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Exams Taken</p>
                  <p className="text-3xl font-bold tracking-tight">{stats.exams_taken || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover-lift card-shadow border-0 overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl stat-green">
                  <BarChart3 className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Avg Score</p>
                  <p className="text-3xl font-bold tracking-tight">{stats.average_score || 0}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover-lift card-shadow border-0 overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl stat-amber">
                  <Trophy className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Pass Rate</p>
                  <p className="text-3xl font-bold tracking-tight">
                    {recentAttempts.length > 0
                      ? Math.round((recentAttempts.filter(a => a.passed).length / recentAttempts.length) * 100)
                      : 0}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover-lift card-shadow border-0 overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl stat-purple">
                  <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Level</p>
                  <p className="text-3xl font-bold tracking-tight">{stats.level || 1}</p>
                </div>
              </div>
            </CardContent>
          </Card>
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
                <Link to="/exams" className="text-xs text-primary hover:underline">View all</Link>
              </div>
            </CardHeader>
            <CardContent>
              {recentAttempts.length > 0 ? (
                <div className="space-y-3">
                  {recentAttempts.map((a) => (
                    <div key={a.id} className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-accent/50">
                      <div className="flex items-center gap-3 min-w-0">
                        {a.passed ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500 shrink-0" />
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
                <Link to="/exams" className="text-xs text-primary hover:underline">Browse all</Link>
              </div>
            </CardHeader>
            <CardContent>
              {exams.length > 0 ? (
                <div className="space-y-3">
                  {exams.slice(0, 5).map((exam) => (
                    <div key={exam.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 text-sm">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{exam.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {exam.question_count} questions · {exam.duration}min
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
