import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { selectUser } from '@/store/slices/authSlice';
import { examsAPI } from '@/api/exams';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ClipboardList, Trophy, Award, Clock, ArrowRight, Play, CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';

export default function StudentDashboard() {
  const user = useSelector(selectUser);
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      examsAPI.list({}).catch(() => ({ data: { results: [] } })),
      examsAPI.myAttempts({}).catch(() => ({ data: [] })),
    ]).then(([examsRes, attemptsRes]) => {
      setExams(examsRes.data.results || []);
      setAttempts(Array.isArray(attemptsRes.data) ? attemptsRes.data : []);
    }).finally(() => setLoading(false));
  }, []);

  const stats = [
    { label: 'Available Exams', value: exams.length, icon: ClipboardList, color: 'text-blue-500' },
    { label: 'Completed', value: attempts.filter(a => a.status === 'completed').length, icon: CheckCircle2, color: 'text-green-500' },
    { label: 'Best Score', value: attempts.length > 0 ? `${Math.max(...attempts.map(a => Number(a.percentage) || 0))}%` : '-', icon: Trophy, color: 'text-amber-500' },
    { label: 'Certificates', value: '—', icon: Award, color: 'text-purple-500' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          Welcome back, {user?.first_name || user?.full_name || 'Student'}
        </h1>
        <p className="text-muted-foreground">
          Reg: {user?.reg_number || 'N/A'} &middot; {user?.class_level || 'No class assigned'}
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 stagger-children">
        {stats.map((s, i) => (
          <Card key={i} className="card-shadow border-0">
            <CardContent className="pt-5 pb-4 px-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <p className="text-2xl font-bold mt-1">{loading ? '—' : s.value}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-muted/50">
                  <s.icon className={`h-5 w-5 ${s.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
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
      {attempts.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Recent Results</h2>
          <div className="space-y-2">
            {attempts.slice(0, 5).map((a) => (
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
