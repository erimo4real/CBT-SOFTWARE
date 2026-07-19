import { useState, useEffect, useRef } from 'react';
import { examsAPI } from '../../api/exams';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent } from '../../components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../../components/ui/dialog';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import PageTransition from '../../components/PageTransition';
import { ListSkeleton } from '../../components/Skeletons';
import { toast } from 'sonner';
import {
  Plus, Pencil, Trash2, Upload, Search, Filter, FileText,
} from 'lucide-react';

const Q_TYPES = [
  { value: 'mcq', label: 'Multiple Choice' },
  { value: 'true_false', label: 'True / False' },
  { value: 'fill_blank', label: 'Fill in the Blank' },
  { value: 'essay', label: 'Essay' },
  { value: 'coding', label: 'Coding' },
];
const DIFFICULTIES = ['easy', 'medium', 'hard'];

export default function QuestionBank() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ subject: '', topic: '', type: '', difficulty: '' });
  const [showFilters, setShowFilters] = useState(false);
  const fileRef = useRef(null);

  const [form, setForm] = useState({
    subject: '', topic: '', question_type: 'mcq', difficulty: 'medium',
    content: '', options: ['', '', '', ''], correct_answer: 0,
    explanation: '', marks: 1, tags: '',
  });

  useEffect(() => {
    loadQuestions();
  }, [search, filters]);

  async function loadQuestions() {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (filters.subject) params.subject = filters.subject;
      if (filters.topic) params.topic = filters.topic;
      if (filters.type) params.type = filters.type;
      if (filters.difficulty) params.difficulty = filters.difficulty;
      const res = await examsAPI.getQuestions(params);
      setQuestions(res.data.results || res.data);
    } catch {
      toast.error('Failed to load questions');
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setForm({
      subject: '', topic: '', question_type: 'mcq', difficulty: 'medium',
      content: '', options: ['', '', '', ''], correct_answer: 0,
      explanation: '', marks: 1, tags: '',
    });
    setDialogOpen(true);
  }

  function openEdit(q) {
    setEditing(q);
    const contentText = typeof q.content === 'object' ? (q.content.text || '') : (q.content || '');
    setForm({
      subject: q.subject || '',
      topic: q.topic || '',
      question_type: q.question_type,
      difficulty: q.difficulty,
      content: contentText,
      options: q.options ? [...q.options, '', '', '', ''].slice(0, 4) : ['', '', '', ''],
      correct_answer: q.correct_answer ?? 0,
      explanation: q.explanation || '',
      marks: q.marks || 1,
      tags: q.tags ? q.tags.join(', ') : '',
    });
    setDialogOpen(true);
  }

  async function saveQuestion(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        subject: form.subject,
        topic: form.topic,
        question_type: form.question_type,
        difficulty: form.difficulty,
        content: { text: form.content },
        correct_answer: form.question_type === 'mcq' ? Number(form.correct_answer) : form.correct_answer,
        explanation: form.explanation,
        marks: Number(form.marks),
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      };
      if (form.question_type === 'mcq') {
        payload.options = form.options.filter(o => o.trim());
      }
      if (editing) {
        await examsAPI.updateQuestion(editing.id, payload);
        toast.success('Question updated');
      } else {
        await examsAPI.createQuestion(payload);
        toast.success('Question created');
      }
      setDialogOpen(false);
      loadQuestions();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save question');
    } finally {
      setSaving(false);
    }
  }

  async function deleteQuestion(id) {
    try {
      await examsAPI.deleteQuestion(id);
      toast.success('Question deleted');
      setQuestions(questions.filter(q => q.id !== id));
      setDeleteConfirm(null);
    } catch {
      toast.error('Failed to delete question');
    }
  }

  async function handleImport() {
    if (!csvFile) return;
    if (csvFile.size > 10 * 1024 * 1024) return toast.error('File must be under 10 MB');
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append('file', csvFile);
      const res = await examsAPI.bulkImportQuestions(fd);
      toast.success(res.data.message || 'Import complete');
      if (res.data.errors?.length > 0) {
        toast.warning(`${res.data.errors.length} rows had errors`);
      }
      setImportOpen(false);
      setCsvFile(null);
      loadQuestions();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Import failed');
    } finally {
      setImporting(false);
    }
  }

  const qtypeColors = {
    mcq: 'bg-blue-100 text-blue-700',
    true_false: 'bg-purple-100 text-purple-700',
    fill_blank: 'bg-amber-100 text-amber-700',
    essay: 'bg-teal-100 text-teal-700',
    coding: 'bg-red-100 text-red-700',
  };
  const diffColors = { easy: 'bg-emerald-100 text-emerald-700', medium: 'bg-amber-100 text-amber-700', hard: 'bg-red-100 text-red-700' };

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Question Bank</h1>
          <p className="text-muted-foreground">{questions.length} questions</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" onClick={() => setImportOpen(true)}><Upload className="h-4 w-4 mr-2" />Import CSV</Button>
          <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />New Question</Button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search questions..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
          <Filter className="h-4 w-4 mr-2" />Filters
        </Button>
      </div>
      {showFilters && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 border rounded-lg bg-muted/30">
          <div className="space-y-1">
            <Label className="text-xs">Subject</Label>
            <Input value={filters.subject} onChange={e => setFilters({ ...filters, subject: e.target.value })} placeholder="e.g. Mathematics" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Topic</Label>
            <Input value={filters.topic} onChange={e => setFilters({ ...filters, topic: e.target.value })} placeholder="e.g. Algebra" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Type</Label>
            <Select value={filters.type} onValueChange={v => setFilters({ ...filters, type: v })}>
              <SelectTrigger><SelectValue placeholder="All types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">All types</SelectItem>
                {Q_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Difficulty</Label>
            <Select value={filters.difficulty} onValueChange={v => setFilters({ ...filters, difficulty: v })}>
              <SelectTrigger><SelectValue placeholder="All levels" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">All levels</SelectItem>
                {DIFFICULTIES.map(d => <SelectItem key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Questions List */}
      {loading ? (
        <ListSkeleton />
      ) : questions.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium">No questions found</p>
          <p className="text-sm text-muted-foreground mb-4">Create or import questions to get started</p>
          <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />New Question</Button>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {questions.map(q => {
            const text = typeof q.content === 'object' ? (q.content.text || JSON.stringify(q.content)) : q.content;
            return (
              <div key={q.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                <div className="flex-1 min-w-0 mr-4">
                  <p className="text-sm font-medium line-clamp-1">{text}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Badge variant="outline" className={`text-xs ${qtypeColors[q.question_type] || ''}`}>{q.question_type.replace('_', ' ')}</Badge>
                    <Badge variant="outline" className={`text-xs ${diffColors[q.difficulty] || ''}`}>{q.difficulty}</Badge>
                    <span className="text-xs text-muted-foreground">{q.subject} · {q.topic}</span>
                    <span className="text-xs text-muted-foreground">· {q.marks} mark{q.marks !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(q)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(q.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Edit Question' : 'New Question'}</DialogTitle></DialogHeader>
          <form onSubmit={saveQuestion} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Subject *</Label>
                <Input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Topic *</Label>
                <Input value={form.topic} onChange={e => setForm({ ...form, topic: e.target.value })} required />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Type *</Label>
                <Select value={form.question_type} onValueChange={v => setForm({ ...form, question_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Q_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Difficulty</Label>
                <Select value={form.difficulty} onValueChange={v => setForm({ ...form, difficulty: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DIFFICULTIES.map(d => <SelectItem key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Marks</Label>
                <Input type="number" min="1" value={form.marks} onChange={e => setForm({ ...form, marks: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Question Text *</Label>
              <Textarea rows={3} value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} required />
            </div>
            {form.question_type === 'mcq' && (
              <div className="space-y-2">
                <Label>Options (correct answer index below)</Label>
                {form.options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input type="radio" name="correct" checked={Number(form.correct_answer) === i} onChange={() => setForm({ ...form, correct_answer: i })} className="accent-primary" />
                    <Input value={opt} onChange={e => {
                      const newOpts = [...form.options];
                      newOpts[i] = e.target.value;
                      setForm({ ...form, options: newOpts });
                    }} placeholder={`Option ${i + 1}`} />
                  </div>
                ))}
              </div>
            )}
            {form.question_type === 'true_false' && (
              <div className="space-y-2">
                <Label>Correct Answer</Label>
                <Select value={String(form.correct_answer)} onValueChange={v => setForm({ ...form, correct_answer: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">True</SelectItem>
                    <SelectItem value="false">False</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {form.question_type === 'fill_blank' && (
              <div className="space-y-2">
                <Label>Correct Answer</Label>
                <Input value={form.correct_answer} onChange={e => setForm({ ...form, correct_answer: e.target.value })} />
              </div>
            )}
            <div className="space-y-2">
              <Label>Explanation</Label>
              <Textarea rows={2} value={form.explanation} onChange={e => setForm({ ...form, explanation: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Tags (comma-separated)</Label>
              <Input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="algebra, basics" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Saving...' : editing ? 'Update' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* CSV Import Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Import Questions from CSV</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              CSV columns: subject, topic, question_type, difficulty, content, options (pipe-separated), correct_answer, explanation, marks, tags (pipe-separated)
            </p>
            <div className="space-y-2">
              <Input ref={fileRef} type="file" accept=".csv" onChange={e => setCsvFile(e.target.files?.[0] || null)} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setImportOpen(false)}>Cancel</Button>
              <Button onClick={handleImport} disabled={!csvFile || importing}>
                {importing ? 'Importing...' : 'Import'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Question?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteQuestion(deleteConfirm)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </PageTransition>
  );
}
