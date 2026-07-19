import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { coursesAPI } from '@/api/courses';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PageTransition from '@/components/PageTransition';
import { CourseCardSkeleton } from '@/components/Skeletons';
import { Search, Users, BookOpen, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDuration } from '@/lib/format';

const difficulties = ['', 'beginner', 'intermediate', 'advanced'];
const difficultyColors = {
  beginner: 'bg-green-100 text-green-800',
  intermediate: 'bg-amber-100 text-amber-800',
  advanced: 'bg-red-100 text-red-800',
};

export default function CourseCatalog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);
  const [nextPage, setNextPage] = useState(null);
  const [prevPage, setPrevPage] = useState(null);
  const [page, setPage] = useState(1);

  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') || '';
  const difficulty = searchParams.get('difficulty') || '';

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page };
      if (search) params.search = search;
      if (category) params.category = category;
      if (difficulty) params.difficulty = difficulty;
      const res = await coursesAPI.getCourses(params);
      setCourses(res.data.results || res.data);
      setCount(res.data.count || 0);
      setNextPage(res.data.next);
      setPrevPage(res.data.previous);
    } catch {
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, category, difficulty]);

  useEffect(() => {
    coursesAPI.getCategories().then((res) => setCategories(res.data.results || res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const updateParam = (key, value) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete('page');
    setSearchParams(params);
    setPage(1);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    updateParam('search', e.target.elements.search.value);
  };

  const totalPages = Math.ceil(count / 20);

  return (
    <PageTransition>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Browse Courses</h1>
        <p className="text-muted-foreground">Discover courses to advance your skills</p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input name="search" defaultValue={search} placeholder="Search courses..." className="pl-9" />
          </div>
          <Button type="submit" variant="secondary">Search</Button>
        </form>

        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            value={category}
            onChange={(e) => updateParam('category', e.target.value)}
            className="flex h-10 w-full sm:w-auto rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>

          <select
            value={difficulty}
            onChange={(e) => updateParam('difficulty', e.target.value)}
            className="flex h-10 w-full sm:w-auto rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">All Levels</option>
            {difficulties.filter(Boolean).map((d) => (
              <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CourseCardSkeleton key={i} />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <BookOpen className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <p>No courses found. Try adjusting your filters.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
            {courses.map((course) => (
              <Link key={course.id} to={`/courses/${course.id}`}>
                <Card className="h-full card-shadow border-0 hover-lift cursor-pointer overflow-hidden group">
                  {course.thumbnail_url ? (
                    <div className="overflow-hidden">
                      <img
                        src={course.thumbnail_url}
                        alt={course.title}
                        className="w-full h-40 object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-40 bg-gradient-to-br from-muted to-muted/60 flex items-center justify-center">
                      <BookOpen className="h-10 w-10 text-muted-foreground/40" />
                    </div>
                  )}
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">{course.title}</h3>
                      {course.difficulty && (
                        <Badge className={`shrink-0 text-[10px] ${difficultyColors[course.difficulty] || ''}`}>
                          {course.difficulty}
                        </Badge>
                      )}
                    </div>
                    {course.category_name && (
                      <p className="text-xs text-muted-foreground">{course.category_name}</p>
                    )}
                    <p className="text-sm text-muted-foreground line-clamp-2">{course.description}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {course.students_count || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-3.5 w-3.5" />
                        {course.lessons_count || 0} lessons
                      </span>
                      {course.estimated_duration && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {formatDuration(course.estimated_duration)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">by {course.instructor_name}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={!prevPage}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages} ({count} courses)
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={!nextPage}
                onClick={() => setPage((p) => p + 1)}
              >
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
