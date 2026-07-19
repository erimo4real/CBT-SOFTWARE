import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { coursesAPI } from '@/api/courses';
import { selectUser } from '@/store/slices/authSlice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import PageTransition from '@/components/PageTransition';
import { PageSkeleton } from '@/components/Skeletons';
import { Separator } from '@/components/ui/separator';
import {
  BookOpen, Users, Clock, Play, FileText, Video, Image, Headphones,
  Loader2, CheckCircle2, ArrowLeft,
} from 'lucide-react';
import { formatDuration, formatDate } from '@/lib/format';
import { toast } from 'sonner';

const difficultyColors = {
  beginner: 'bg-green-100 text-green-800',
  intermediate: 'bg-amber-100 text-amber-800',
  advanced: 'bg-red-100 text-red-800',
};

const contentTypeIcons = {
  video: Video,
  pdf: FileText,
  audio: Headphones,
  image: Image,
  text: FileText,
};

export default function CourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useSelector(selectUser);
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    coursesAPI.getCourse(id)
      .then((res) => setCourse(res.data))
      .catch(() => toast.error('Failed to load course'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleEnroll = async () => {
    setEnrolling(true);
    try {
      await coursesAPI.enroll(id);
      setCourse((prev) => ({ ...prev, is_enrolled: true }));
      toast.success('Enrolled successfully!');
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to enroll';
      toast.error(msg);
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) {
    return <PageSkeleton />;
  }

  if (!course) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Course not found</p>
        <Button variant="link" onClick={() => navigate('/courses')}>Back to courses</Button>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/courses')} className="w-fit">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to courses
      </Button>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {course.thumbnail_url ? (
            <img src={course.thumbnail_url} alt={course.title} className="w-full h-64 object-cover rounded-lg" />
          ) : (
            <div className="w-full h-64 bg-muted rounded-lg flex items-center justify-center">
              <BookOpen className="h-16 w-16 text-muted-foreground/30" />
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-start gap-3 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight">{course.title}</h1>
              {course.difficulty && (
                <Badge className={difficultyColors[course.difficulty]}>
                  {course.difficulty}
                </Badge>
              )}
            </div>

            {course.category_name && (
              <p className="text-sm text-muted-foreground">{course.category_name}</p>
            )}

            <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                {course.students_count} students
              </span>
              <span className="flex items-center gap-1.5">
                <BookOpen className="h-4 w-4" />
                {course.lessons_count} lessons
              </span>
              {course.estimated_duration && (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {formatDuration(course.estimated_duration)}
                </span>
              )}
            </div>

            <p className="text-sm text-muted-foreground">by {course.instructor_name}</p>
          </div>

          <Separator />

          <div>
            <h2 className="text-lg font-semibold mb-3">About this course</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-line">{course.description}</p>
          </div>

          <Separator />

          <div>
            <h2 className="text-lg font-semibold mb-3">Lessons ({course.lessons?.length || 0})</h2>
            {course.lessons?.length > 0 ? (
              <div className="space-y-2">
                {[...course.lessons]
                  .sort((a, b) => a.order - b.order)
                  .map((lesson, idx) => {
                    const Icon = contentTypeIcons[lesson.content_type] || FileText;
                    return (
                      <div
                        key={lesson.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                          course.is_enrolled
                            ? 'cursor-pointer hover:bg-accent'
                            : 'opacity-70'
                        }`}
                        onClick={() => {
                          if (course.is_enrolled) {
                            navigate(`/courses/${id}/lessons/${lesson.id}`);
                          }
                        }}
                      >
                        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-muted text-sm font-medium shrink-0">
                          {idx + 1}
                        </div>
                        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{lesson.title}</p>
                          {lesson.duration && (
                            <p className="text-xs text-muted-foreground">{formatDuration(lesson.duration)}</p>
                          )}
                        </div>
                        {course.is_enrolled && (
                          <Play className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                      </div>
                    );
                  })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No lessons yet</p>
            )}
          </div>
        </div>

        <div className="lg:col-span-1">
          <Card className="sticky top-20">
            <CardContent className="pt-6 space-y-4">
              {course.is_enrolled ? (
                <>
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-medium">You're enrolled</span>
                  </div>
                  <Button className="w-full" onClick={() => {
                    const first = course.lessons?.sort((a, b) => a.order - b.order)[0];
                    if (first) navigate(`/courses/${id}/lessons/${first.id}`);
                  }}>
                    Continue Learning
                  </Button>
                </>
              ) : (
                <Button className="w-full" onClick={handleEnroll} disabled={enrolling}>
                  {enrolling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {enrolling ? 'Enrolling...' : 'Enroll Now'}
                </Button>
              )}

              <Separator />

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lessons</span>
                  <span className="font-medium">{course.lessons_count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Students</span>
                  <span className="font-medium">{course.students_count}</span>
                </div>
                {course.estimated_duration && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duration</span>
                    <span className="font-medium">{formatDuration(course.estimated_duration)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Level</span>
                  <span className="font-medium capitalize">{course.difficulty}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span className="font-medium">{formatDate(course.created_at)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      </div>
    </PageTransition>
  );
}
