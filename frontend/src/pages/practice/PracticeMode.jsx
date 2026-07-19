import { useState, useEffect } from 'react';
import { examsAPI } from '@/api/exams';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Dumbbell, CheckCircle2, XCircle, Flame, Star, Zap, RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';

export default function PracticeMode() {
  const [config, setConfig] = useState({ subject: '', topic: '', difficulty: '', type: '', count: 10 });
  const [session, setSession] = useState(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [answerText, setAnswerText] = useState('');
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    examsAPI.getPracticeHistory()
      .then((res) => setHistory(Array.isArray(res.data) ? res.data : []))
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, []);

  const startSession = async () => {
    setLoading(true);
    try {
      const params = {};
      if (config.subject) params.subject = config.subject;
      if (config.topic) params.topic = config.topic;
      if (config.difficulty) params.difficulty = config.difficulty;
      if (config.type) params.type = config.type;
      params.count = config.count;
      const res = await examsAPI.startPractice(params);
      setSession(res.data);
      setCurrentIdx(0);
      setSelectedOption(null);
      setAnswerText('');
      setResult(null);
    } catch (err) {
      toast.error(err.response?.data?.error || 'No questions found');
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async () => {
    if (!session) return;
    const q = session.questions[currentIdx];
    setLoading(true);
    try {
      const data = { session_id: session.session_id, question_id: q.question_id };
      if (q.question_type === 'mcq' || q.question_type === 'true_false') {
        data.selected_option = selectedOption;
      } else {
        data.answer_text = answerText;
      }
      const res = await examsAPI.practiceAnswer(data);
      setResult(res.data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit answer');
    } finally {
      setLoading(false);
    }
  };

  const nextQuestion = () => {
    if (currentIdx < session.total_questions - 1) {
      setCurrentIdx((i) => i + 1);
      setSelectedOption(null);
      setAnswerText('');
      setResult(null);
    } else {
      toast.success('Practice session complete!');
      setSession(null);
    }
  };

  const q = session?.questions?.[currentIdx];
  const totalCorrect = session?.questions?.slice(0, currentIdx + 1).filter((_, i) => i <= currentIdx).length;

  const recentHistory = history.slice(0, 5);

  // Setup screen
  if (!session) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Practice Mode</h1>
          <p className="text-muted-foreground">Sharpen your skills with instant feedback</p>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <h2 className="text-lg font-semibold">Start a Practice Session</h2>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Subject</label>
                <Input value={config.subject} onChange={(e) => setConfig((p) => ({ ...p, subject: e.target.value }))} placeholder="e.g. Mathematics" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Topic</label>
                <Input value={config.topic} onChange={(e) => setConfig((p) => ({ ...p, topic: e.target.value }))} placeholder="e.g. Algebra" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Difficulty</label>
                <select value={config.difficulty} onChange={(e) => setConfig((p) => ({ ...p, difficulty: e.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Any</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Type</label>
                <select value={config.type} onChange={(e) => setConfig((p) => ({ ...p, type: e.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Any</option>
                  <option value="mcq">Multiple Choice</option>
                  <option value="true_false">True/False</option>
                  <option value="fill_blank">Fill in the Blank</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Questions</label>
                <Input type="number" min={1} max={50} value={config.count} onChange={(e) => setConfig((p) => ({ ...p, count: parseInt(e.target.value) || 10 }))} />
              </div>
            </div>

            <Button onClick={startSession} disabled={loading}>
              <Dumbbell className="h-4 w-4 mr-2" />
              Start Practice
            </Button>
          </CardContent>
        </Card>

        {/* Recent history */}
        {recentHistory.length > 0 && (
          <Card>
            <CardContent className="pt-4 space-y-3">
              <h3 className="text-sm font-semibold">Recent Sessions</h3>
              {recentHistory.map((h) => (
                <div key={h.id} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{h.date}</span>
                  <span>{h.questions_correct}/{h.questions_attempted} ({h.accuracy}%)</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Active practice session
  const content = q?.content;
  const questionText = typeof content === 'string' ? content : content?.text || '';

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Progress bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Question {currentIdx + 1}/{session.total_questions}</span>
          {result && (
            result.is_correct ? (
              <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="h-3 w-3 mr-1" /> Correct</Badge>
            ) : (
              <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" /> Incorrect</Badge>
            )
          )}
        </div>
        {result && (
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Zap className="h-3.5 w-3.5" /> +{result.xp_earned} XP</span>
            <span className="flex items-center gap-1"><Flame className="h-3.5 w-3.5" /> Streak: {result.current_streak}</span>
          </div>
        )}
      </div>

      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary transition-all" style={{ width: `${((currentIdx + 1) / session.total_questions) * 100}%` }} />
      </div>

      {/* Question */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{q?.question_type}</Badge>
            {q?.difficulty && <Badge variant="secondary">{q.difficulty}</Badge>}
            {q?.subject && <span className="text-xs text-muted-foreground">{q.subject}{q.topic ? ` › ${q.topic}` : ''}</span>}
          </div>

          <p className="text-base">{questionText}</p>

          {/* Options for MCQ / True-False */}
          {!result && (q?.question_type === 'mcq' || q?.question_type === 'true_false') && q?.options && (
            <div className="space-y-2">
              {q.options.map((opt, idx) => (
                <label
                  key={idx}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedOption === idx ? 'border-primary bg-primary/5' : 'hover:bg-accent'
                  }`}
                >
                  <input type="radio" name="practice" checked={selectedOption === idx} onChange={() => setSelectedOption(idx)} className="accent-primary" />
                  <span className="text-sm">{opt}</span>
                </label>
              ))}
            </div>
          )}

          {/* Show correct/wrong after answer */}
          {result && q?.options && (
            <div className="space-y-2">
              {q.options.map((opt, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-2 p-2.5 rounded text-sm ${
                    idx === result.correct_answer ? 'bg-green-50 border border-green-200' :
                    idx === result.your_answer && !result.is_correct ? 'bg-red-50 border border-red-200' :
                    'bg-muted/30'
                  }`}
                >
                  {idx === result.correct_answer && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                  {idx === result.your_answer && !result.is_correct && <XCircle className="h-4 w-4 text-red-600" />}
                  <span>{opt}</span>
                </div>
              ))}
            </div>
          )}

          {/* Free text */}
          {!result && (q?.question_type === 'fill_blank' || q?.question_type === 'essay') && (
            <textarea
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              placeholder="Type your answer..."
              className="w-full min-h-[80px] p-3 rounded-lg border bg-background text-sm resize-y"
            />
          )}

          {/* Explanation */}
          {result?.explanation && (
            <div className="p-3 rounded bg-blue-50 border border-blue-200 text-sm">
              <span className="font-medium text-blue-800">Explanation: </span>
              <span className="text-blue-700">{result.explanation}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" onClick={() => { setSession(null); }}>
          <RotateCcw className="h-4 w-4 mr-2" />
          New Session
        </Button>

        {!result ? (
          <Button onClick={submitAnswer} disabled={loading || (selectedOption === null && !answerText)}>
            Check Answer
          </Button>
        ) : (
          <Button onClick={nextQuestion}>
            {currentIdx < session.total_questions - 1 ? 'Next Question' : 'Finish'}
          </Button>
        )}
      </div>
    </div>
  );
}
