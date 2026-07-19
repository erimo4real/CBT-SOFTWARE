import { useState } from 'react';
import { aiAPI } from '../../api/ai';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '../../components/ui/select';
import { toast } from 'sonner';
import { Sparkles, Loader2, CheckCircle2, XCircle, Trophy, RotateCcw, Target } from 'lucide-react';

export default function AIQuizGenerator() {
  const [config, setConfig] = useState({ count: '10', difficulty: '' });
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [weakAreas, setWeakAreas] = useState('');

  async function handleGenerate() {
    setLoading(true);
    setQuestions([]);
    setAnswers({});
    setSubmitted(false);
    setWeakAreas('');
    try {
      const res = await aiAPI.generateQuiz({
        count: parseInt(config.count),
        difficulty: config.difficulty || undefined,
      });
      setQuestions(res.data.questions);
      setWeakAreas(res.data.weak_areas);
      toast.success(`Quiz ready — ${res.data.count} questions on your weak areas`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to generate quiz');
    } finally {
      setLoading(false);
    }
  }

  function handleAnswer(qIdx, value) {
    setAnswers(prev => ({ ...prev, [qIdx]: value }));
  }

  function handleSubmit() {
    if (Object.keys(answers).length < questions.length) {
      toast.error('Please answer all questions before submitting');
      return;
    }
    setSubmitted(true);
  }

  function handleRetry() {
    setQuestions([]);
    setAnswers({});
    setSubmitted(false);
    setWeakAreas('');
  }

  function getScore() {
    let correct = 0;
    questions.forEach((q, i) => {
      const userAns = answers[i];
      const correctAns = String(q.correct_answer).toLowerCase().trim();
      if (String(userAns).toLowerCase().trim() === correctAns) correct++;
    });
    return correct;
  }

  const score = submitted ? getScore() : 0;
  const percentage = submitted ? Math.round((score / questions.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Target className="h-6 w-6 text-primary" />
          AI Weak Area Quiz
        </h1>
        <p className="text-muted-foreground mt-1">AI generates questions targeting your weak areas from past exams</p>
      </div>

      {questions.length === 0 && !loading && (
        <Card>
          <CardHeader>
            <CardTitle>Quiz Settings</CardTitle>
            <CardDescription>The AI will analyze your past mistakes and create a targeted quiz</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {weakAreas && (
              <div className="text-sm bg-muted/50 rounded-lg px-4 py-3">
                <span className="font-medium">Weak areas detected:</span> {weakAreas}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Number of Questions</Label>
                <Select value={config.count} onValueChange={v => setConfig({ ...config, count: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[5, 10, 15, 20, 30].map(n => (
                      <SelectItem key={n} value={String(n)}>{n} questions</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Difficulty</Label>
                <Select value={config.difficulty} onValueChange={v => setConfig({ ...config, difficulty: v })}>
                  <SelectTrigger><SelectValue placeholder="Mixed (recommended)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Mixed (recommended)</SelectItem>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleGenerate} disabled={loading} className="btn-press">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
              {loading ? 'Generating Quiz...' : 'Generate Quiz'}
            </Button>
          </CardContent>
        </Card>
      )}

      {loading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
            <p className="text-sm text-muted-foreground">Analyzing your weak areas and generating questions...</p>
          </CardContent>
        </Card>
      )}

      {questions.length > 0 && !submitted && (
        <div className="space-y-4">
          {questions.map((q, idx) => (
            <Card key={idx}>
              <CardContent className="pt-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                    {idx + 1}
                  </span>
                  <Badge variant="outline" className="text-[10px] uppercase">
                    {q.question_type === 'true_false' ? 'True/False' : q.question_type === 'fill_blank' ? 'Fill Blank' : 'MCQ'}
                  </Badge>
                  {q.subject && (
                    <Badge variant="secondary" className="text-[10px]">{q.subject}</Badge>
                  )}
                </div>
                <p className="text-sm font-medium mb-3">{q.question_text}</p>

                {q.question_type === 'mcq' && q.options && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {q.options.map((opt, oi) => (
                      <button
                        key={oi}
                        type="button"
                        onClick={() => handleAnswer(idx, String(oi))}
                        className={`text-left text-xs px-3 py-2.5 rounded-lg border transition-all ${
                          answers[idx] === String(oi)
                            ? 'bg-primary/10 border-primary/40 ring-1 ring-primary/20'
                            : 'bg-muted/30 hover:bg-muted/60'
                        }`}
                      >
                        <span className="font-medium mr-1">{String.fromCharCode(65 + oi)}.</span> {opt}
                      </button>
                    ))}
                  </div>
                )}

                {q.question_type === 'true_false' && (
                  <div className="flex gap-2">
                    {['true', 'false'].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handleAnswer(idx, val)}
                        className={`text-xs px-6 py-2.5 rounded-lg border transition-all capitalize ${
                          answers[idx] === val
                            ? 'bg-primary/10 border-primary/40 ring-1 ring-primary/20'
                            : 'bg-muted/30 hover:bg-muted/60'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                )}

                {q.question_type === 'fill_blank' && (
                  <input
                    type="text"
                    placeholder="Type your answer..."
                    value={answers[idx] || ''}
                    onChange={e => handleAnswer(idx, e.target.value)}
                    className="text-xs w-full max-w-sm px-3 py-2.5 rounded-lg border bg-muted/30 focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                )}
              </CardContent>
            </Card>
          ))}

          <Button onClick={handleSubmit} className="btn-press" size="lg">
            Submit Quiz ({Object.keys(answers).length}/{questions.length} answered)
          </Button>
        </div>
      )}

      {submitted && (
        <div className="space-y-4">
          <Card className="border-primary/20">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <div className={`h-20 w-20 rounded-2xl flex items-center justify-center mb-4 ${
                  percentage >= 70 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
                }`}>
                  {percentage >= 70
                    ? <Trophy className="h-10 w-10 text-green-600" />
                    : <XCircle className="h-10 w-10 text-red-600" />
                  }
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold mb-1">{percentage}%</h2>
                <p className="text-muted-foreground">
                  {score} out of {questions.length} correct
                </p>
                <Button onClick={handleRetry} variant="outline" className="mt-4 btn-press">
                  <RotateCcw className="h-4 w-4 mr-2" /> Generate New Quiz
                </Button>
              </div>
            </CardContent>
          </Card>

          {questions.map((q, idx) => {
            const userAns = String(answers[idx] || '').toLowerCase().trim();
            const correctAns = String(q.correct_answer).toLowerCase().trim();
            const isCorrect = userAns === correctAns;

            return (
              <Card key={idx} className={isCorrect ? 'border-green-200 dark:border-green-800' : 'border-red-200 dark:border-red-800'}>
                <CardContent className="pt-5">
                  <div className="flex items-start gap-3">
                    {isCorrect
                      ? <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                      : <XCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                    }
                    <div className="flex-1">
                      <p className="text-sm font-medium mb-2">{q.question_text}</p>
                      <div className="text-xs space-y-1">
                        {!isCorrect && (
                          <p className="text-red-600 dark:text-red-400">
                            Your answer: {q.question_type === 'mcq' && q.options ? q.options[parseInt(userAns)] || userAns : userAns}
                          </p>
                        )}
                        <p className="text-green-600 dark:text-green-400">
                          Correct: {q.question_type === 'mcq' && q.options ? q.options[parseInt(correctAns)] || correctAns : q.correct_answer}
                        </p>
                        {q.explanation && (
                          <p className="text-muted-foreground mt-2 bg-muted/50 rounded px-2 py-1">{q.explanation}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          <Button onClick={handleRetry} variant="outline" className="btn-press">
            <RotateCcw className="h-4 w-4 mr-2" /> Generate New Quiz
          </Button>
        </div>
      )}
    </div>
  );
}
