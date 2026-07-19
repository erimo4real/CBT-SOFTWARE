import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { coursesAPI } from '@/api/courses';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft, ArrowRight, CheckCircle2, Circle, Play, FileText,
  Video, Image, Headphones, Loader2, BookOpen,
} from 'lucide-react';
import { formatDuration } from '@/lib/format';
import { toast } from 'sonner';

const contentTypeIcons = {
  video: Video,
  pdf: FileText,
  audio: Headphones,
  image: Image,
  text: FileText,
};

export default function LessonView() {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [lesson, setLesson] = useState(null);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [courseRes, lessonRes] = await Promise.all([
          coursesAPI.getCourse(courseId),
          coursesAPI.getLesson(courseId, lessonId),
        ]);
        setCourse(courseRes.data);
        setLesson(lessonRes.data);

        try {
          const progressRes = await coursesAPI.getLessonProgress(courseId, lessonId);
          setProgress(progressRes.data);
        } catch {
          setProgress(null);
        }
      } catch {
        toast.error('Failed to load lesson');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [courseId, lessonId]);

  const handleMarkComplete = async () => {
    setCompleting(true);
    try {
      await coursesAPI.completeLesson(courseId, lessonId);
      setProgress((prev) => ({ ...prev, completed: true, completed_at: new Date().toISOString() }));
      toast.success('Lesson completed!');
    } catch {
      toast.error('Failed to mark lesson complete');
    } finally {
      setCompleting(false);
    }
  };

  const lessons = course?.lessons?.sort((a, b) => a.order - b.order) || [];
  const currentIndex = lessons.findIndex((l) => l.id === lessonId);
  const prevLesson = currentIndex > 0 ? lessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 sm:h-96 w-full rounded-lg" />
        <Skeleton className="h-6 w-3/4" />
      </div>
    );
  }

  if (!lesson || !course) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Lesson not found</p>
        <Button variant="link" onClick={() => navigate(`/courses/${courseId}`)}>Back to course</Button>
      </div>
    );
  }

  const Icon = contentTypeIcons[lesson.content_type] || FileText;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate(`/courses/${courseId}`)} className="w-fit">
        <ArrowLeft className="h-4 w-4 mr-2" />
        {course.title}
      </Button>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Badge variant="secondary">{lesson.content_type}</Badge>
          <span className="text-sm text-muted-foreground">
            Lesson {currentIndex + 1} of {lessons.length}
          </span>
        </div>
        {lesson.duration && (
          <span className="text-sm text-muted-foreground">{formatDuration(lesson.duration)}</span>
        )}
      </div>

      <Card>
        <CardContent className="pt-6">
          <h1 className="text-xl font-bold mb-4">{lesson.title}</h1>

          {lesson.content_type === 'video' && lesson.file ? (
            <video
              controls
              className="w-full rounded-lg bg-black"
              src={lesson.file}
            >
              Your browser does not support video playback.
            </video>
          ) : lesson.content_type === 'audio' && lesson.file ? (
            <div className="flex items-center justify-center py-12 bg-muted rounded-lg">
              <audio controls src={lesson.file} className="w-full max-w-md" />
            </div>
          ) : lesson.content_type === 'image' && lesson.file ? (
            <img src={lesson.file} alt={lesson.title} className="w-full rounded-lg" />
          ) : lesson.content_type === 'pdf' && lesson.file ? (
            <iframe
              src={lesson.file}
              className="w-full h-[50vh] sm:h-[600px] rounded-lg border"
              title={lesson.title}
            />
          ) : null}

          {lesson.content && (
            <div className="mt-6 prose prose-sm max-w-none">
              <div className="whitespace-pre-line text-sm text-muted-foreground">{lesson.content}</div>
            </div>
          )}

          {!lesson.content && !lesson.file && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Icon className="h-12 w-12 mb-3 opacity-50" />
              <p>No content available for this lesson</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {prevLesson ? (
          <Button variant="outline" onClick={() => navigate(`/courses/${courseId}/lessons/${prevLesson.id}`)} className="flex-1 sm:flex-none">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
        ) : <div />}

        {!progress?.completed ? (
          <Button onClick={handleMarkComplete} disabled={completing} className="flex-1 sm:flex-none">
            {completing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Mark as Complete
          </Button>
        ) : (
          <Badge className="bg-green-100 text-green-800 px-3 py-1">
            <CheckCircle2 className="mr-1.5 h-4 w-4" />
            Completed
          </Badge>
        )}

        {nextLesson ? (
          <Button onClick={() => navigate(`/courses/${courseId}/lessons/${nextLesson.id}`)} className="flex-1 sm:flex-none">
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : <div />}
      </div>

      <Separator />

      <div>
        <h2 className="text-sm font-semibold mb-3">All Lessons</h2>
        <div className="space-y-1">
          {lessons.map((l, idx) => {
            const isCurrent = l.id === lessonId;
            return (
              <div
                key={l.id}
                className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${
                  isCurrent ? 'bg-accent font-medium' : 'hover:bg-accent/50'
                }`}
                onClick={() => navigate(`/courses/${courseId}/lessons/${l.id}`)}
              >
                <span className="text-xs text-muted-foreground w-5 text-center">{idx + 1}</span>
                <p className="text-sm truncate flex-1">{l.title}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
