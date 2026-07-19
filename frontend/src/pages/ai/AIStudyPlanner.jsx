import { useState, useEffect } from 'react';
import { aiAPI } from '../../api/ai';
import { coursesAPI } from '../../api/courses';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '../../components/ui/select';
import { toast } from 'sonner';
import { CalendarDays, Loader2, BookOpen, Clock, Lightbulb, Sparkles } from 'lucide-react';

export default function AIStudyPlanner() {
  const [form, setForm] = useState({
    exam_date: '',
    course_id: '',
    study_hours_per_day: '2',
  });
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState(null);

  useEffect(() => {
    coursesAPI.getMyCourses().then(res => {
      setCourses(res.data.results || res.data);
    }).catch(() => {});
  }, []);

  async function handleGenerate(e) {
    e.preventDefault();
    if (!form.exam_date) {
      toast.error('Please select an exam date');
      return;
    }

    const examDate = new Date(form.exam_date);
    if (examDate <= new Date()) {
      toast.error('Exam date must be in the future');
      return;
    }

    setLoading(true);
    setPlan(null);
    try {
      const res = await aiAPI.getStudyPlan({
        exam_date: form.exam_date,
        course_id: form.course_id || undefined,
        study_hours_per_day: parseFloat(form.study_hours_per_day),
      });
      setPlan(res.data);
      toast.success('Study plan generated!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to generate study plan');
    } finally {
      setLoading(false);
    }
  }

  const priorityColors = {
    high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    low: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  };

  const typeIcons = {
    study: BookOpen,
    practice: Sparkles,
    review: Lightbulb,
    rest: Clock,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <CalendarDays className="h-6 w-6 text-primary" />
          AI Study Planner
        </h1>
        <p className="text-muted-foreground mt-1">Get a personalized day-by-day study plan powered by AI</p>
      </div>

      {!plan && (
        <Card>
          <CardHeader>
            <CardTitle>Plan Settings</CardTitle>
            <CardDescription>Tell the AI about your exam and study preferences</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleGenerate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="exam_date">Exam Date *</Label>
                  <Input
                    id="exam_date"
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={form.exam_date}
                    onChange={e => setForm({ ...form, exam_date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Course (optional)</Label>
                  <Select value={form.course_id} onValueChange={v => setForm({ ...form, course_id: v })}>
                    <SelectTrigger><SelectValue placeholder="All courses" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All courses</SelectItem>
                      {courses.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Hours per Day</Label>
                  <Select value={form.study_hours_per_day} onValueChange={v => setForm({ ...form, study_hours_per_day: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[1, 1.5, 2, 2.5, 3, 4, 5].map(h => (
                        <SelectItem key={h} value={String(h)}>{h} hours</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" disabled={loading} className="btn-press">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                {loading ? 'Creating Plan...' : 'Generate Study Plan'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {loading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
            <p className="text-sm text-muted-foreground">Analyzing your performance and building a study plan...</p>
          </CardContent>
        </Card>
      )}

      {plan && (
        <div className="space-y-4">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold mb-1">Your Study Plan</h2>
                  <p className="text-sm text-muted-foreground">{plan.overview}</p>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">{plan.total_days}</p>
                    <p className="text-xs text-muted-foreground">days</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">{form.study_hours_per_day}</p>
                    <p className="text-xs text-muted-foreground">hrs/day</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {plan.daily_plans?.map((day, idx) => (
            <Card key={idx} className="hover-lift">
              <CardContent className="pt-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-primary">D{day.day}</span>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{day.date}</p>
                    <p className="text-sm font-semibold">{day.focus}</p>
                  </div>
                </div>

                <div className="space-y-2 ml-8 sm:ml-[52px]">
                  {day.tasks?.map((task, ti) => {
                    const Icon = typeIcons[task.type] || BookOpen;
                    return (
                      <div key={ti} className="flex items-start gap-2 text-xs">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <span>{task.task}</span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-muted-foreground">{task.duration_minutes} min</span>
                            {task.priority && (
                              <span className={`px-1.5 py-0 rounded text-[10px] font-medium ${priorityColors[task.priority] || ''}`}>
                                {task.priority}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {day.tips && (
                  <div className="ml-8 sm:ml-[52px] mt-3 text-xs bg-accent/50 rounded-lg px-3 py-2 text-accent-foreground">
                    <Lightbulb className="h-3 w-3 inline mr-1" />
                    {day.tips}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          <Button onClick={() => setPlan(null)} variant="outline" className="btn-press">
            Create New Plan
          </Button>
        </div>
      )}
    </div>
  );
}
