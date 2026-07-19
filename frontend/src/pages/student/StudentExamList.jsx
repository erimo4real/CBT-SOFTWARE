import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { examsAPI } from '@/api/exams';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import Pagination from '@/components/Pagination';
import {
  ClipboardList, Clock, Search, Play, CheckCircle2, CalendarClock, Lock, Hourglass,
} from 'lucide-react';

const PAGE_SIZE = 8;

function useCountdown(targetDate) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!targetDate) return null;
  const diff = new Date(targetDate).getTime() - now;
  if (diff <= 0) return null;
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
  return `${mins}m ${secs}s`;
}

export default function StudentExamList() {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
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

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search]);

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
      ) : paged.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">No exams found</p>
            <p className="text-sm mt-1">{search ? 'Try a different search' : 'Check back later for available exams'}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 stagger-children">
            {paged.map((exam) => (
              <ExamCard
                key={exam.id}
                exam={exam}
                attemptCount={getAttemptCount(exam.id)}
                onNavigate={navigate}
              />
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} totalItems={filtered.length} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}

function ExamCard({ exam, attemptCount, onNavigate }) {
  const canAttempt = attemptCount < (exam.allowed_attempts || 1);
  const examStatus = exam.exam_status || 'ongoing';
  const isUpcoming = examStatus === 'upcoming';
  const isEnded = examStatus === 'ended';
  const countdown = useCountdown(isUpcoming ? exam.start_date : null);

  return (
    <Card className={`card-shadow border-0 transition-all ${
      isEnded ? 'opacity-60' : 'hover:shadow-md'
    }`}>
      <CardContent className="pt-5 pb-4 px-5 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-base">{exam.title}</h3>
            {exam.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{exam.description}</p>
            )}
          </div>
          {isUpcoming ? (
            <Badge className="bg-blue-100 text-blue-800 shrink-0">
              <CalendarClock className="h-3 w-3 mr-1" /> Upcoming
            </Badge>
          ) : isEnded ? (
            <Badge className="bg-zinc-100 text-zinc-600 shrink-0">
              <Lock className="h-3 w-3 mr-1" /> Ended
            </Badge>
          ) : attemptCount > 0 ? (
            <Badge className="bg-green-100 text-green-800 shrink-0">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Done
            </Badge>
          ) : null}
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" /> {exam.duration_display || '—'}
          </span>
          <span>{exam.total_marks} marks</span>
          <span>Pass: {exam.passing_score}%</span>
        </div>

        {/* Countdown for upcoming exams */}
        {isUpcoming && countdown && (
          <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg px-3 py-2 text-sm">
            <Hourglass className="h-4 w-4 text-blue-500 animate-pulse" />
            <span className="font-medium text-blue-700 dark:text-blue-300">Starts in {countdown}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-muted-foreground">
            Attempts: {attemptCount}/{exam.allowed_attempts || 1}
          </span>
          {isUpcoming ? (
            <Button size="sm" disabled>
              <CalendarClock className="h-3.5 w-3.5 mr-1" /> Not Yet
            </Button>
          ) : isEnded ? (
            <Button size="sm" variant="outline" disabled>
              <Lock className="h-3.5 w-3.5 mr-1" /> Closed
            </Button>
          ) : (
            <Button
              size="sm"
              disabled={!canAttempt}
              onClick={() => onNavigate(`/student/exams/${exam.id}`)}
            >
              <Play className="h-3.5 w-3.5 mr-1" />
              {canAttempt ? 'Start' : 'Completed'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
