import { useState } from 'react';
import { aiAPI } from '../../api/ai';
import { coursesAPI } from '../../api/courses';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '../../components/ui/select';
import { toast } from 'sonner';
import { Sparkles, Loader2, CheckCircle2, XCircle, Eye, EyeOff, FileText, Plus } from 'lucide-react';

export default function AIQuestionGenerator() {
  const [form, setForm] = useState({
    subject: '',
    topic: '',
    count: '5',
    difficulty: 'medium',
    types: ['mcq'],
  });
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [showAnswers, setShowAnswers] = useState({});

  const toggleType = (type) => {
    setForm(prev => {
      const types = prev.types.includes(type)
        ? prev.types.filter(t => t !== type)
        : [...prev.types, type];
      return { ...prev, types: types.length ? types : prev.types };
    });
  };

  const toggleAnswer = (idx) => {
    setShowAnswers(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  async function handleGenerate(e) {
    e.preventDefault();
    if (!form.subject.trim() && !form.topic.trim()) {
      toast.error('Please enter at least a subject or topic');
      return;
    }

    setLoading(true);
    setQuestions([]);
    try {
      const res = await aiAPI.generateQuestions({
        subject: form.subject,
        topic: form.topic,
        count: parseInt(form.count),
        difficulty: form.difficulty,
        types: form.types,
      });
      setQuestions(res.data.questions);
      toast.success(`Generated ${res.data.count} questions`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to generate questions');
    } finally {
      setLoading(false);
    }
  }

  const difficultyColors = {
    easy: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    hard: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          AI Question Generator
        </h1>
        <p className="text-muted-foreground mt-1">Generate exam questions from topics using AI</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Question Settings</CardTitle>
          <CardDescription>Configure the questions you want to generate</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleGenerate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject *</Label>
                <Input
                  id="subject"
                  placeholder="e.g., Mathematics"
                  value={form.subject}
                  onChange={e => setForm({ ...form, subject: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="topic">Topic</Label>
                <Input
                  id="topic"
                  placeholder="e.g., Quadratic Equations"
                  value={form.topic}
                  onChange={e => setForm({ ...form, topic: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Count</Label>
                <Select value={form.count} onValueChange={v => setForm({ ...form, count: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[3, 5, 10, 15, 20].map(n => (
                      <SelectItem key={n} value={String(n)}>{n} questions</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Difficulty</Label>
                <Select value={form.difficulty} onValueChange={v => setForm({ ...form, difficulty: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Question Types</Label>
                <div className="flex gap-2 pt-1">
                  {[
                    { value: 'mcq', label: 'MCQ' },
                    { value: 'true_false', label: 'T/F' },
                    { value: 'fill_blank', label: 'Fill' },
                  ].map(t => (
                    <Button
                      key={t.value}
                      type="button"
                      variant={form.types.includes(t.value) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleType(t.value)}
                      className="text-xs"
                    >
                      {t.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <Button type="submit" disabled={loading} className="btn-press">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
              {loading ? 'Generating...' : 'Generate Questions'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {questions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Generated Questions ({questions.length})</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAnswers(prev => {
                const all = questions.every((_, i) => prev[i]);
                const next = {};
                questions.forEach((_, i) => { next[i] = !all; });
                return next;
              })}
            >
              {questions.every((_, i) => showAnswers[i]) ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
              {questions.every((_, i) => showAnswers[i]) ? 'Hide All' : 'Show All'}
            </Button>
          </div>

          {questions.map((q, idx) => (
            <Card key={idx} className="hover-lift">
              <CardContent className="pt-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                      {idx + 1}
                    </span>
                    <Badge variant="outline" className="text-[10px] uppercase">
                      {q.question_type === 'true_false' ? 'True/False' : q.question_type === 'fill_blank' ? 'Fill Blank' : 'MCQ'}
                    </Badge>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${difficultyColors[q.difficulty] || difficultyColors.medium}`}>
                      {q.difficulty}
                    </span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => toggleAnswer(idx)} className="h-7 px-2">
                    {showAnswers[idx] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                </div>

                <p className="text-sm font-medium mb-3">{q.question_text}</p>

                {q.options && q.question_type === 'mcq' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                    {q.options.map((opt, oi) => (
                      <div
                        key={oi}
                        className={`text-xs px-3 py-2 rounded-lg border ${
                          showAnswers[idx] && String(q.correct_answer) === String(oi)
                            ? 'bg-green-50 border-green-300 text-green-800 dark:bg-green-900/20 dark:border-green-700 dark:text-green-300'
                            : 'bg-muted/50'
                        }`}
                      >
                        <span className="font-medium mr-1">{String.fromCharCode(65 + oi)}.</span> {opt}
                      </div>
                    ))}
                  </div>
                )}

                {q.options && q.question_type === 'true_false' && (
                  <div className="flex gap-2 mb-3">
                    {['true', 'false'].map(val => (
                      <div
                        key={val}
                        className={`text-xs px-4 py-2 rounded-lg border capitalize ${
                          showAnswers[idx] && q.correct_answer === val
                            ? 'bg-green-50 border-green-300 text-green-800 dark:bg-green-900/20 dark:border-green-700 dark:text-green-300'
                            : 'bg-muted/50'
                        }`}
                      >
                        {val}
                      </div>
                    ))}
                  </div>
                )}

                {q.question_type === 'fill_blank' && showAnswers[idx] && (
                  <div className="text-xs px-3 py-2 rounded-lg border bg-green-50 border-green-300 text-green-800 dark:bg-green-900/20 dark:border-green-700 dark:text-green-300 mb-3">
                    Answer: {q.correct_answer}
                  </div>
                )}

                {showAnswers[idx] && q.explanation && (
                  <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 mt-2">
                    <span className="font-medium">Explanation:</span> {q.explanation}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && questions.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-primary/60" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No questions yet</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Enter a subject and topic above, then click Generate to create AI-powered exam questions.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
