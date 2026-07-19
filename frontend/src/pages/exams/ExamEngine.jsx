import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { examsAPI } from '@/api/exams';
import { selectUser } from '@/store/slices/authSlice';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Clock, Flag, FlagOff, ChevronLeft, ChevronRight, Send,
  AlertTriangle, Loader2, CheckCircle2, Maximize, ShieldAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import useAntiCheat from '@/hooks/useAntiCheat';

export default function ExamEngine() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useSelector(selectUser);

  const [exam, setExam] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [answers, setAnswers] = useState({});
  const [flags, setFlags] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const [instructionsAccepted, setInstructionsAccepted] = useState(false);

  const autoSaveTimer = useRef(null);

  const antiCheat = useAntiCheat({
    enabled: attempt?.status === 'in_progress',
    onViolation: (v) => {
      toast.warning(`Violation: ${v.type.replace('_', ' ')}`, { duration: 3000 });
    },
  });

  // Load exam details only (don't start yet)
  useEffect(() => {
    const init = async () => {
      try {
        const examRes = await examsAPI.getExam(id);
        setExam(examRes.data);
      } catch (err) {
        toast.error('Failed to load exam');
        navigate('/exams');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [id, navigate]);

  // Start exam after instructions accepted
  const handleStartExam = async () => {
    setStarting(true);
    try {
      const startRes = await examsAPI.startExam(id);
      const att = startRes.data.attempt;
      setAttempt(att);
      setTimeLeft(att.time_remaining || 0);

      // Restore answers from attempt
      const ansMap = {};
      const flagMap = {};
      if (att.answers) {
        att.answers.forEach((a) => {
          ansMap[a.question] = {
            selected_option: a.selected_option,
            answer_text: a.answer_text,
            time_spent: a.time_spent || 0,
          };
        });
      }
      // Restore flags
      if (att._flags) {
        Object.entries(att._flags).forEach(([qId, flagged]) => {
          if (flagged) flagMap[qId] = true;
        });
      }
      setAnswers(ansMap);
      setFlags(flagMap);
      setShowInstructions(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to start exam');
      navigate('/exams');
    } finally {
      setStarting(false);
    }
  };

  // Timer countdown
  useEffect(() => {
    if (!attempt || attempt.status !== 'in_progress' || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [attempt?.status, timeLeft > 0]);

  // Auto-save
  const autoSave = useCallback(async (questionId, data) => {
    if (!attempt) return;
    try {
      await examsAPI.saveAnswer(attempt.id, { question: questionId, ...data });
    } catch {
      // silent
    }
  }, [attempt]);

  useEffect(() => {
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, []);

  const questions = exam?.questions || [];
  const current = questions[currentIndex];
  const currentQuestion = current?.question;
  const totalQuestions = questions.length;
  const answeredCount = Object.keys(answers).length;
  const flaggedCount = Object.keys(flags).filter((k) => flags[k]).length;

  const handleAnswer = (questionId, data) => {
    setAnswers((prev) => ({ ...prev, [questionId]: { ...prev[questionId], ...data } }));
    // Debounced auto-save
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => autoSave(questionId, data), 1500);
  };

  const handleFlag = async (questionId) => {
    if (!attempt) return;
    const newFlagged = !flags[questionId];
    setFlags((prev) => ({ ...prev, [questionId]: newFlagged }));
    try {
      await examsAPI.flagQuestion(attempt.id, { question: questionId, flagged: newFlagged });
    } catch {
      setFlags((prev) => ({ ...prev, [questionId]: !newFlagged }));
    }
  };

  const handleSubmit = async (timedOut = false) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const payload = {
        tab_switches: antiCheat.tabSwitches,
        violations: antiCheat.violations,
      };
      if (timedOut) {
        await examsAPI.autoSubmit(attempt.id);
      } else {
        await examsAPI.submitExam(attempt.id, payload);
      }
      // Exit fullscreen on submit
      if (document.fullscreenElement) {
        try { document.exitFullscreen(); } catch {}
      }
      toast.success(timedOut ? 'Time expired — exam submitted' : 'Exam submitted!');
      navigate(`/exams/${id}/results`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit');
      setSubmitting(false);
    }
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      : `${m}:${String(s).padStart(2, '0')}`;
  };

  if (loading || starting) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">{starting ? 'Starting exam...' : 'Loading exam...'}</p>
        </div>
      </div>
    );
  }

  // Instructions screen before exam starts
  if (showInstructions && exam && !attempt) {
    const totalQ = exam.questions?.length || exam.question_count || 0;
    const totalMin = exam.duration ? Math.round(exam.duration / 60) : '—';
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="card-shadow border-0">
          <CardContent className="pt-6 space-y-5">
            <div className="text-center space-y-2">
              <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <ShieldAlert className="h-7 w-7 text-primary" />
              </div>
              <h1 className="text-2xl font-bold">{exam.title}</h1>
              {exam.course_title && <p className="text-muted-foreground">{exam.course_title}</p>}
            </div>

            <Separator />

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div className="space-y-1">
                <p className="text-2xl font-bold">{totalQ}</p>
                <p className="text-xs text-muted-foreground">Questions</p>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold">{totalMin}{typeof totalMin === 'number' ? 'm' : ''}</p>
                <p className="text-xs text-muted-foreground">Duration</p>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold">{exam.passing_score}%</p>
                <p className="text-xs text-muted-foreground">Pass Score</p>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold">{exam.total_marks}</p>
                <p className="text-xs text-muted-foreground">Total Marks</p>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <h2 className="font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" /> Exam Rules
              </h2>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                  This exam must be taken in <strong>fullscreen mode</strong>.
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                  Switching tabs or windows is <strong>tracked and may be flagged</strong>.
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                  Copying, pasting, and right-click are <strong>disabled</strong>.
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                  Your answers are <strong>auto-saved</strong> every few seconds.
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                  The timer starts immediately — once started, the exam <strong>cannot be paused</strong>.
                </li>
                {exam.allowed_attempts > 1 && (
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                    You have <strong>{exam.allowed_attempts} attempt{exam.allowed_attempts > 1 ? 's' : ''}</strong> for this exam.
                  </li>
                )}
              </ul>
            </div>

            <Separator />

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="accept-rules"
                checked={instructionsAccepted}
                onChange={(e) => setInstructionsAccepted(e.target.checked)}
                className="h-4 w-4 rounded border-muted-foreground/30 accent-primary"
              />
              <label htmlFor="accept-rules" className="text-sm font-medium cursor-pointer select-none">
                I have read and understood the rules
              </label>
            </div>

            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => navigate('/student/exams')}>
                Back
              </Button>
              <Button
                disabled={!instructionsAccepted}
                onClick={handleStartExam}
              >
                <Play className="h-4 w-4 mr-2" /> Start Exam
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No questions in this exam</p>
        <Button variant="link" onClick={() => navigate('/exams')}>Back to exams</Button>
      </div>
    );
  }

  const content = currentQuestion.content;
  const questionText = typeof content === 'string' ? content : content?.text || content?.title || '';

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between p-3 bg-card/80 backdrop-blur-sm border border-border/50 rounded-xl shadow-sm sticky top-0 z-10 gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="sm" onClick={() => navigate('/exams')} className="text-muted-foreground hover:text-foreground">Exit</Button>
          <Separator orientation="vertical" className="h-6 hidden sm:block" />
          <span className="text-sm font-medium truncate">{exam?.title}</span>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <div className={`flex items-center gap-1.5 text-sm font-mono px-2 py-1 rounded-lg ${timeLeft < 300 ? 'text-red-600 bg-red-50 dark:bg-red-900/20 animate-pulse' : 'text-muted-foreground bg-muted/50'}`}>
            <Clock className="h-4 w-4" />
            {formatTime(timeLeft)}
          </div>
          <Separator orientation="vertical" className="h-6 hidden sm:block" />
          <span className="text-xs text-muted-foreground font-medium">
            {answeredCount}/{totalQuestions}
          </span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        {/* Question area */}
        <div className="space-y-4">
          <Card className="card-shadow border-0">
            <CardContent className="pt-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    Question {currentIndex + 1} of {totalQuestions}
                  </span>
                  <Badge variant="outline">{currentQuestion.question_type}</Badge>
                  {currentQuestion.difficulty && (
                    <Badge variant="secondary">{currentQuestion.difficulty}</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{current.marks} mark{current.marks !== 1 ? 's' : ''}</span>
                  <Button
                    variant={flags[currentQuestion.id] ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleFlag(currentQuestion.id)}
                  >
                    {flags[currentQuestion.id] ? <FlagOff className="h-4 w-4" /> : <Flag className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <p className="text-base">{questionText}</p>

              {/* MCQ / True-False options */}
              {(currentQuestion.question_type === 'mcq' || currentQuestion.question_type === 'true_false') && currentQuestion.options && (
                <div className="space-y-2 pt-2">
                  {currentQuestion.options.map((opt, idx) => (
                    <label
                      key={idx}
                      className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all duration-150 ${
                        answers[currentQuestion.id]?.selected_option === idx
                          ? 'border-primary bg-primary/5 ring-1 ring-primary/20 shadow-sm'
                          : 'hover:bg-accent/60 hover:border-border/80'
                      }`}
                    >
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                        answers[currentQuestion.id]?.selected_option === idx
                          ? 'border-primary bg-primary'
                          : 'border-muted-foreground/30'
                      }`}>
                        {answers[currentQuestion.id]?.selected_option === idx && (
                          <span className="h-2 w-2 rounded-full bg-primary-foreground" />
                        )}
                      </span>
                      <span className="text-sm leading-relaxed">{opt}</span>
                    </label>
                  ))}
                </div>
              )}

              {/* Fill blank / Essay / Coding */}
              {(currentQuestion.question_type === 'fill_blank' || currentQuestion.question_type === 'essay' || currentQuestion.question_type === 'coding') && (
                <div className="pt-2">
                  <textarea
                    value={answers[currentQuestion.id]?.answer_text || ''}
                    onChange={(e) => handleAnswer(currentQuestion.id, { answer_text: e.target.value })}
                    placeholder={currentQuestion.question_type === 'fill_blank' ? 'Type your answer...' : 'Write your answer here...'}
                    className="w-full min-h-[120px] p-4 rounded-xl border bg-background text-sm resize-y focus-visible:ring-primary/20 focus-visible:border-primary/40 transition-all"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((i) => i - 1)}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Previous</span>
            </Button>

            {currentIndex === totalQuestions - 1 ? (
              <Button size="sm" onClick={() => setShowConfirm(true)}>
                <Send className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Submit Exam</span>
                <span className="sm:hidden">Submit</span>
              </Button>
            ) : (
              <Button size="sm" onClick={() => setCurrentIndex((i) => i + 1)}>
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>

        {/* Sidebar — question map */}
        <div className="space-y-4">
          <Card className="sticky top-20 card-shadow border-0">
            <CardContent className="pt-4 space-y-3">
              <h3 className="text-sm font-semibold">Questions</h3>

              <div className="grid grid-cols-5 gap-1.5 overflow-y-auto max-h-48">
                {questions.map((q, idx) => {
                  const qId = q.question.id;
                  const isAnswered = !!answers[qId];
                  const isFlagged = !!flags[qId];
                  const isCurrent = idx === currentIndex;
                  return (
                    <button
                      key={qId}
                      onClick={() => setCurrentIndex(idx)}
                      className={`relative h-9 rounded-lg text-xs font-medium transition-all duration-150 ${
                        isCurrent
                          ? 'bg-primary text-primary-foreground shadow-md scale-105'
                          : isAnswered
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-900/50'
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                    >
                      {idx + 1}
                      {isFlagged && (
                        <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-1 ring-background" />
                      )}
                    </button>
                  );
                })}
              </div>

              <Separator />

              <div className="space-y-1.5 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded bg-emerald-100 dark:bg-emerald-900/30 border" /> Answered ({answeredCount})
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded bg-muted border" /> Unanswered ({totalQuestions - answeredCount})
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500" /> Flagged ({flaggedCount})
                </div>
              </div>

              <Separator />

              <Button
                variant="destructive"
                className="w-full"
                onClick={() => setShowConfirm(true)}
              >
                <Send className="h-4 w-4 mr-2" />
                Submit
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Submit confirmation dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 text-amber-500" />
                <h2 className="text-lg font-semibold">Submit Exam?</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                You have answered {answeredCount} of {totalQuestions} questions.
                {answeredCount < totalQuestions && (
                  <span className="text-amber-600 font-medium">
                    {' '}{totalQuestions - answeredCount} question{totalQuestions - answeredCount !== 1 ? 's' : ''} unanswered.
                  </span>
                )}
              </p>
              {antiCheat.totalViolations > 0 && (
                <p className="text-xs text-destructive">
                  {antiCheat.totalViolations} violation{antiCheat.totalViolations !== 1 ? 's' : ''} recorded ({antiCheat.tabSwitches} tab switch{antiCheat.tabSwitches !== 1 ? 'es' : ''})
                </p>
              )}
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setShowConfirm(false)}>Cancel</Button>
                <Button onClick={() => { setShowConfirm(false); handleSubmit(); }} disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Confirm Submit
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Fullscreen prompt */}
      {attempt?.status === 'in_progress' && !antiCheat.isFullscreen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <Card className="w-full max-w-sm mx-4">
            <CardContent className="pt-6 text-center space-y-4">
              <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Maximize className="h-7 w-7 text-primary" />
              </div>
              <h2 className="text-lg font-bold">Enter Fullscreen</h2>
              <p className="text-sm text-muted-foreground">
                This exam requires fullscreen mode. Please click below to continue.
              </p>
              <Button onClick={antiCheat.requestFullscreen} className="w-full btn-press">
                <Maximize className="h-4 w-4 mr-2" /> Enter Fullscreen
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Violation warning toast */}
      {antiCheat.showWarning && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-destructive text-destructive-foreground shadow-lg">
            <ShieldAlert className="h-5 w-5 shrink-0" />
            <span className="text-sm font-medium">{antiCheat.warningMessage}</span>
          </div>
        </div>
      )}

      {/* Violation counter in header */}
      {antiCheat.totalViolations > 0 && (
        <div className="fixed bottom-4 right-4 z-40">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
            <ShieldAlert className="h-3.5 w-3.5" />
            {antiCheat.totalViolations} violation{antiCheat.totalViolations !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  );
}
