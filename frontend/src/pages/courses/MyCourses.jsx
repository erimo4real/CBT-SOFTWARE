import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { coursesAPI } from '@/api/courses';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PageTransition from '@/components/PageTransition';
import { CourseCardSkeleton } from '@/components/Skeletons';
import { Progress } from '@/components/ui/progress';
import Pagination from '@/components/Pagination';
import { BookOpen, Clock, GraduationCap, Search } from 'lucide-react';
import { formatDate } from '@/lib/format';
import { toast } from 'sonner';

const PAGE_SIZE = 9;

export default function MyCourses() {
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    coursesAPI.getEnrollments()
      .then((res) => setEnrollments(res.data.results || res.data))
      .catch(() => toast.error('Failed to load enrollments'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!search) return enrollments;
    const q = search.toLowerCase();
    return enrollments.filter(e => e.course_title?.toLowerCase().includes(q));
  }, [enrollments, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search]);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <CourseCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Courses</h1>
          <p className="text-muted-foreground">Continue learning where you left off</p>
        </div>

        {enrollments.length > 0 && (
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search courses..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        )}

      {paged.length === 0 ? (
        <div className="text-center py-12">
          <GraduationCap className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground mb-4">{search ? 'No matching courses' : "You haven't enrolled in any courses yet"}</p>
          {!search && (
            <Link to="/courses">
              <Button>Browse Courses</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {paged.map((enrollment) => (
            <Link key={enrollment.id} to={`/courses/${enrollment.course}`}>
              <Card className="h-full hover:shadow-md transition-shadow cursor-pointer hover-lift">
                {enrollment.course_thumbnail ? (
                  <img
                    src={enrollment.course_thumbnail}
                    alt={enrollment.course_title}
                    className="w-full h-40 object-cover rounded-t-lg"
                  />
                ) : (
                  <div className="w-full h-40 bg-muted rounded-t-lg flex items-center justify-center">
                    <BookOpen className="h-10 w-10 text-muted-foreground/50" />
                  </div>
                )}
                <CardContent className="pt-4 space-y-3">
                  <h3 className="font-semibold line-clamp-1">{enrollment.course_title}</h3>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Progress</span>
                      <span>{enrollment.progress}%</span>
                    </div>
                    <Progress value={enrollment.progress} className="h-2" />
                  </div>

                  {enrollment.completed && (
                    <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
                      ✓ Completed
                    </span>
                  )}

                  <p className="text-xs text-muted-foreground">
                    Enrolled {formatDate(enrollment.enrolled_at)}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} totalItems={filtered.length} onPageChange={setPage} />
      </div>
    </PageTransition>
  );
}
