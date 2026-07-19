import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { examsAPI } from '@/api/exams';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PageTransition from '@/components/PageTransition';
import { CourseCardSkeleton } from '@/components/Skeletons';
import { Search, Clock, FileText, Users, Play, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDuration, formatDate } from '@/lib/format';

export default function ExamList() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [nextPage, setNextPage] = useState(null);
  const [prevPage, setPrevPage] = useState(null);

  const fetchExams = async () => {
    setLoading(true);
    try {
      const params = { page };
      if (search) params.search = search;
      const res = await examsAPI.getExams(params);
      setExams(res.data.results || res.data);
      setCount(res.data.count || 0);
      setNextPage(res.data.next);
      setPrevPage(res.data.previous);
    } catch {
      setExams([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchExams(); }, [page, search]);

  const totalPages = Math.ceil(count / 20);

  return (
    <PageTransition>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Exams</h1>
        <p className="text-muted-foreground">Test your knowledge</p>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); setPage(1); fetchExams(); }} className="flex gap-2 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search exams..." className="pl-9" />
        </div>
        <Button type="submit" variant="secondary">Search</Button>
      </form>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CourseCardSkeleton key={i} />
          ))}
        </div>
      ) : exams.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <p>No exams available yet</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {exams.map((exam) => (
              <Card key={exam.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold">{exam.title}</h3>
                    <Badge variant={exam.is_published ? 'default' : 'secondary'}>
                      {exam.is_published ? 'Published' : 'Draft'}
                    </Badge>
                  </div>

                  {exam.course_title && (
                    <p className="text-xs text-muted-foreground">{exam.course_title}</p>
                  )}

                  <p className="text-sm text-muted-foreground line-clamp-2">{exam.description}</p>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5" />
                      {exam.question_count} questions
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {formatDuration(exam.duration)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {exam.attempt_count} attempts
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="text-xs text-muted-foreground">
                      Pass: {exam.passing_score}% | {exam.total_marks} marks
                    </div>
                    <Link to={`/exams/${exam.id}/take`}>
                      <Button size="sm">
                        <Play className="h-3.5 w-3.5 mr-1" />
                        Start
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 pt-4">
              <Button variant="outline" size="sm" disabled={!prevPage} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
              <Button variant="outline" size="sm" disabled={!nextPage} onClick={() => setPage((p) => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
      </div>
    </PageTransition>
  );
}
