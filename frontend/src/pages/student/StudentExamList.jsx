import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { examsAPI } from '@/api/exams';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { ClipboardList, Clock, Search, Play, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function StudentExamList() {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [search, setSearch] = useState('');
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

  const filtered = exams.filter((e) =>
    e.title.toLowerCase().includes(search.toLowerCase())
  );

  const getAttemptCount = (examId) =>
    attempts.filter((a) => a.exam === examId || a.exam?.id === examId).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Exams</h1>
        <p className="text-muted-foreground">Browse and take your assigned exams</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search exams..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><CardContent className="pt-4 space-y-3"><Skeleton className="h-6 w-3/4" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-8 w-24" /></CardContent></Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">No exams found</p>
            <p className="text-sm mt-1">Check back later for available exams</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 stagger-children">
          {filtered.map((exam) => {
            const attemptCount = getAttemptCount(exam.id);
            const canAttempt = attemptCount < (exam.allowed_attempts || 1);
            return (
              <Card key={exam.id} className="card-shadow border-0 hover:shadow-md transition-all">
                <CardContent className="pt-5 pb-4 px-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-base">{exam.title}</h3>
                      {exam.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{exam.description}</p>
                      )}
                    </div>
                    {attemptCount > 0 && (
                      <Badge className="bg-green-100 text-green-800 shrink-0">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Done
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> {exam.duration_display || '—'}
                    </span>
                    <span>{exam.total_marks} marks</span>
                    <span>Pass: {exam.passing_score}%</span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-muted-foreground">
                      Attempts: {attemptCount}/{exam.allowed_attempts || 1}
                    </span>
                    <Button
                      size="sm"
                      disabled={!canAttempt}
                      onClick={() => navigate(`/student/exams/${exam.id}`)}
                    >
                      <Play className="h-3.5 w-3.5 mr-1" />
                      {canAttempt ? 'Start' : 'Completed'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
