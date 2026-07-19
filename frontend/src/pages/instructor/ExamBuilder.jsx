import { useState, useEffect } from 'react';
import { examsAPI } from '../../api/exams';
import { coursesAPI } from '../../api/courses';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../../components/ui/dialog';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { Switch } from '../../components/ui/switch';
import PageTransition from '../../components/PageTransition';
import { CourseCardSkeleton } from '../../components/Skeletons';
import { toast } from 'sonner';
import {
  Plus, Pencil, Trash2, Settings, Eye, EyeOff, Search,
} from 'lucide-react';
import usePagination from '@/hooks/usePagination';
import Pagination from '@/components/Pagination';
import TableFilters from '@/components/TableFilters';

export default function ExamBuilder() {
  const [exams, setExams] = useState([]);
  const [courses, setCourses] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selectedExam, setSelectedExam] = useState(null);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [availableQuestions, setAvailableQuestions] = useState([]);
  const [questionSearch, setQuestionSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [saving, setSaving] = useState(false);

  const { page, search, filters, params, setPage, setSearch, setFilter, clearFilters, totalPages } = usePagination();

  const [form, setForm] = useState({
    title: '', description: '', course: '', duration: 60,
    passing_score: 50, allowed_attempts: 1, start_date: '', end_date: '',
    is_published: false, shuffle_questions: false, shuffle_options: false,
  });

  useEffect(() => {
    loadData();
  }, [page, search, filters]);

  useEffect(() => {
    coursesAPI.getCourses().then(res => setCourses(res.data.results || res.data)).catch(() => {});
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const query = { ...params, published: 'true' };
      if (filters.course) query.course = filters.course;
      const examsRes = await examsAPI.getExams(query);
      setExams(examsRes.data.results || []);
      setCount(examsRes.data.count || 0);
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setForm({
      title: '', description: '', course: '', duration: 60,
      passing_score: 50, allowed_attempts: 1, start_date: '', end_date: '',
      is_published: false, shuffle_questions: false, shuffle_options: false,
    });
    setDialogOpen(true);
  }

  function openEdit(exam) {
    setEditing(exam);
    const cfg = exam.config || {};
    setForm({
      title: exam.title,
      description: exam.description || '',
      course: exam.course || '',
      duration: Math.round((exam.duration || 0) / 60),
      passing_score: exam.passing_score || 50,
      allowed_attempts: exam.allowed_attempts || 1,
      start_date: exam.start_date ? exam.start_date.slice(0, 16) : '',
      end_date: exam.end_date ? exam.end_date.slice(0, 16) : '',
      is_published: exam.is_published,
      shuffle_questions: !!cfg.shuffle_questions,
      shuffle_options: !!cfg.shuffle_options,
    });
    setDialogOpen(true);
  }

  async function saveExam(e) {
    e.preventDefault();
    if (!form.title.trim()) return toast.error('Title is required');
    if (Number(form.duration) <= 0) return toast.error('Duration must be positive');
    if (Number(form.passing_score) < 0 || Number(form.passing_score) > 100) return toast.error('Passing score must be 0-100');
    if (Number(form.allowed_attempts) < 1) return toast.error('Must allow at least 1 attempt');
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        description: form.description,
        course: form.course || null,
        duration: Number(form.duration) * 60,
        passing_score: Number(form.passing_score),
        allowed_attempts: Number(form.allowed_attempts),
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        is_published: form.is_published,
        config: {
          shuffle_questions: form.shuffle_questions,
          shuffle_options: form.shuffle_options,
        },
      };
      if (editing) {
        await examsAPI.updateExam(editing.id, payload);
        toast.success('Exam updated');
      } else {
        await examsAPI.createExam(payload);
        toast.success('Exam created');
      }
      setDialogOpen(false);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save exam');
    } finally {
      setSaving(false);
    }
  }

  async function deleteExam(id) {
    try {
      await examsAPI.deleteExam(id);
      toast.success('Exam deleted');
      setExams(exams.filter(e => e.id !== id));
      setDeleteConfirm(null);
    } catch {
      toast.error('Failed to delete exam');
    }
  }

  async function openManage(exam) {
    setSelectedExam(exam);
    setManageOpen(true);
    try {
      const [detailRes, questionsRes] = await Promise.all([
        examsAPI.getExam(exam.id),
        examsAPI.getQuestions({ type: '', difficulty: '' }),
      ]);
      const existing = detailRes.data.questions || [];
      setSelectedQuestions(existing);
      const allQ = questionsRes.data.results || questionsRes.data;
      setAvailableQuestions(allQ);
    } catch {
      toast.error('Failed to load exam details');
    }
  }

  async function addQuestionToExam(questionId) {
    try {
      const res = await examsAPI.addExamQuestion(selectedExam.id, { question: questionId, marks: 1 });
      const q = availableQuestions.find(q => q.id === questionId);
      setSelectedQuestions([...selectedQuestions, {
        id: res.data.exam_question_id,
        question: q,
        marks: 1,
        order: selectedQuestions.length + 1,
      }]);
      toast.success('Question added');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add question');
    }
  }

  async function removeQuestion(eqId) {
    try {
      await examsAPI.removeExamQuestion(selectedExam.id, eqId);
      setSelectedQuestions(selectedQuestions.filter(eq => eq.id !== eqId));
      toast.success('Question removed');
    } catch {
      toast.error('Failed to remove question');
    }
  }

  const inExam = new Set(selectedQuestions.map(eq => eq.question?.id));

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <CourseCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Exam Builder</h1>
          <p className="text-muted-foreground">Create and configure exams</p>
        </div>
        <Button onClick={openCreate} className="shrink-0"><Plus className="h-4 w-4 mr-2" />New Exam</Button>
      </div>

      <TableFilters
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search exams..."
        filters={[
          { key: 'course', label: 'All courses', options: courses.map(c => ({ value: c.id, label: c.title })) },
        ]}
        values={filters}
        onFilter={setFilter}
        onClear={clearFilters}
      />

      {exams.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center py-12">
          <Settings className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium">No exams yet</p>
          <p className="text-sm text-muted-foreground mb-4">Create your first exam to get started</p>
          <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Create Exam</Button>
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {exams.map(exam => (
            <Card key={exam.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{exam.title}</CardTitle>
                  <Badge variant={exam.is_published ? 'default' : 'secondary'}>
                    {exam.is_published ? <><Eye className="h-3 w-3 mr-1" />Published</> : <><EyeOff className="h-3 w-3 mr-1" />Draft</>}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground line-clamp-2">{exam.description || 'No description'}</p>
                <div className="grid grid-cols-3 gap-1 sm:gap-2 text-xs text-muted-foreground">
                  <div><span className="font-medium text-foreground">{exam.question_count}</span> questions</div>
                  <div><span className="font-medium text-foreground">{Math.round(exam.duration / 60)}m</span> duration</div>
                  <div><span className="font-medium text-foreground">{exam.passing_score}%</span> pass</div>
                </div>
                <div className="flex gap-1 pt-2 border-t">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => openManage(exam)}>
                    <Settings className="h-3.5 w-3.5 mr-1" />Manage
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(exam)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(exam.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages(count)} totalItems={count} onPageChange={setPage} />

      {/* Create/Edit Exam Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Edit Exam' : 'New Exam'}</DialogTitle></DialogHeader>
          <form onSubmit={saveExam} className="space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Course</Label>
              <Select value={form.course} onValueChange={v => setForm({ ...form, course: v })}>
                <SelectTrigger><SelectValue placeholder="Optional — link to course" /></SelectTrigger>
                <SelectContent>
                  {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Duration (min)</Label>
                <Input type="number" min="1" value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Pass %</Label>
                <Input type="number" min="0" max="100" value={form.passing_score} onChange={e => setForm({ ...form, passing_score: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Max Attempts</Label>
                <Input type="number" min="1" value={form.allowed_attempts} onChange={e => setForm({ ...form, allowed_attempts: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="datetime-local" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input type="datetime-local" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.is_published} onCheckedChange={v => setForm({ ...form, is_published: v })} />
              <Label>Published</Label>
            </div>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Switch checked={form.shuffle_questions} onCheckedChange={v => setForm({ ...form, shuffle_questions: v })} />
                <Label className="text-sm">Shuffle question order</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.shuffle_options} onCheckedChange={v => setForm({ ...form, shuffle_options: v })} />
                <Label className="text-sm">Shuffle answer options</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Saving...' : editing ? 'Update' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Manage Questions Dialog */}
      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Manage Questions — {selectedExam?.title}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Added Questions ({selectedQuestions.length})</p>
              {selectedQuestions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No questions added yet. Search below to add.</p>
              ) : (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {selectedQuestions.map((eq, i) => {
                    const text = typeof eq.question?.content === 'object' ? eq.question.content.text : eq.question?.content;
                    return (
                      <div key={eq.id} className="flex items-center justify-between p-2 border rounded text-sm">
                        <div className="flex items-center gap-2">
                          <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs font-mono text-muted-foreground">{i + 1}</span>
                          <span className="line-clamp-1">{text || 'Untitled'}</span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => removeQuestion(eq.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="border-t pt-3">
              <p className="text-sm font-medium mb-2">Available Questions</p>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Search question bank..." value={questionSearch} onChange={e => setQuestionSearch(e.target.value)} />
              </div>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {availableQuestions
                  .filter(q => !inExam.has(q.id))
                  .filter(q => {
                    if (!questionSearch) return true;
                    const text = typeof q.content === 'object' ? q.content.text : q.content;
                    return (text || '').toLowerCase().includes(questionSearch.toLowerCase()) ||
                      q.subject.toLowerCase().includes(questionSearch.toLowerCase());
                  })
                  .map(q => {
                    const text = typeof q.content === 'object' ? q.content.text : q.content;
                    return (
                      <div key={q.id} className="flex items-center justify-between p-2 border rounded text-sm hover:bg-muted/30">
                        <div className="line-clamp-1 flex-1 mr-2">{text || 'Untitled'}</div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="outline" className="text-xs">{q.question_type}</Badge>
                          <Button variant="ghost" size="sm" onClick={() => addQuestionToExam(q.id)}>
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Exam?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This will permanently delete the exam and all associated attempts.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteExam(deleteConfirm)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </PageTransition>
  );
}
