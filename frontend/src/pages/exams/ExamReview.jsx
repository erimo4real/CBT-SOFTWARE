import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { examsAPI } from '@/api/exams';
import { Card, CardContent } from '@/components/ui/card';
import ExamResultCharts from '@/components/ExamResultCharts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft, CheckCircle2, XCircle, Clock, AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

export default function ExamReview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    examsAPI.reviewAttempt(id)
      .then((res) => setReview(res.data))
      .catch(() => toast.error('Failed to load review'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}><CardContent className="pt-4 space-y-3"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-20 w-full" /></CardContent></Card>
        ))}
      </div>
    );
  }

  if (!review) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Review not available</p>
        <Button variant="link" onClick={() => navigate('/exams')}>Back to exams</Button>
      </div>
    );
  }

  const score = Number(review.score) || 0;
  const percentage = Number(review.percentage) || 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="w-fit">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      {/* Summary card */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-3">
            <h1 className="text-2xl font-bold">{review.exam_title}</h1>
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-sm">
              <div>
                <p className="text-muted-foreground">Score</p>
                <p className="text-2xl font-bold">{score}/{review.total_marks}</p>
              </div>
              <Separator orientation="vertical" className="h-12" />
              <div>
                <p className="text-muted-foreground">Percentage</p>
                <p className="text-2xl font-bold">{percentage}%</p>
              </div>
              <Separator orientation="vertical" className="h-12" />
              <div>
                <p className="text-muted-foreground">Result</p>
                <Badge className={review.passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                  {review.passed ? 'Passed' : 'Failed'}
                </Badge>
              </div>
            </div>
            {review.time_used && (
              <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                Time used: {review.time_used}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Performance breakdown charts */}
      <ExamResultCharts questions={review.questions} />

      {/* Questions review */}
      <h2 className="text-lg font-semibold">Question Review</h2>
      <div className="space-y-3">
        {review.questions?.map((q, idx) => (
          <Card key={q.question_id}>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">Q{idx + 1}</span>
                  <Badge variant="outline">{q.question_type}</Badge>
                  <span className="text-xs text-muted-foreground">{q.marks} mark{q.marks !== 1 ? 's' : ''}</span>
                </div>
                {q.is_correct === true ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                ) : q.is_correct === false ? (
                  <XCircle className="h-5 w-5 text-red-600 shrink-0" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
                )}
              </div>

              <p className="text-sm">{q.question_text}</p>

              {/* Options */}
              {q.options && (
                <div className="space-y-1.5">
                  {q.options.map((opt, oIdx) => {
                    const isCorrect = oIdx === q.correct_answer;
                    const isYours = oIdx === q.your_answer;
                    return (
                      <div
                        key={oIdx}
                        className={`flex items-center gap-2 p-2 rounded text-sm ${
                          isCorrect
                            ? 'bg-green-50 border border-green-200'
                            : isYours && !isCorrect
                            ? 'bg-red-50 border border-red-200'
                            : 'bg-muted/50'
                        }`}
                      >
                        {isCorrect && <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />}
                        {isYours && !isCorrect && <XCircle className="h-3.5 w-3.5 text-red-600" />}
                        <span>{opt}</span>
                        {isCorrect && <span className="text-xs text-green-600 ml-auto">Correct</span>}
                        {isYours && !isCorrect && <span className="text-xs text-red-600 ml-auto">Your answer</span>}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Free text answer */}
              {!q.options && q.your_text_answer && (
                <div className="space-y-1.5">
                  <div className="p-2 rounded bg-red-50 border border-red-200 text-sm">
                    <span className="text-xs text-muted-foreground">Your answer:</span>
                    <p>{q.your_text_answer}</p>
                  </div>
                </div>
              )}

              {/* Explanation */}
              {q.explanation && (
                <div className="p-3 rounded bg-blue-50 border border-blue-200 text-sm">
                  <span className="font-medium text-blue-800">Explanation: </span>
                  <span className="text-blue-700">{q.explanation}</span>
                </div>
              )}

              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>Marks awarded: {q.marks_awarded || 0}/{q.marks}</span>
                {q.time_spent > 0 && <span>Time: {q.time_spent}s</span>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
