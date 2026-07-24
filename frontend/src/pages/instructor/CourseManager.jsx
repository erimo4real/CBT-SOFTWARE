import { useState, useEffect } from 'react';
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
  Plus, Pencil, Trash2, BookOpen, Users, Eye, EyeOff,
} from 'lucide-react';

export default function CourseManager() {
  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [classLevels, setClassLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [editingLesson, setEditingLesson] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [saving, setSaving] = useState(false);

  const [courseForm, setCourseForm] = useState({
    title: '', description: '', category: '', class_level: '', difficulty: 'beginner',
    thumbnail_url: '', is_published: false,
  });
  const [lessonForm, setLessonForm] = useState({
    title: '', description: '', content_type: 'text', content: '',
    order: 0, duration: '', is_free: false,
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [coursesRes, catsRes, levelsRes] = await Promise.all([
        coursesAPI.getMyCourses(),
        coursesAPI.getCategories(),
        coursesAPI.getClassLevels(),
      ]);
      setCourses(coursesRes.data.results || coursesRes.data);
      setCategories(catsRes.data.results || catsRes.data);
      setClassLevels(levelsRes.data.results || levelsRes.data || []);
    } catch {
      toast.error('Failed to load courses');
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditingCourse(null);
    setCourseForm({
      title: '', description: '', category: '', class_level: '', difficulty: 'beginner',
      thumbnail_url: '', is_published: false,
    });
    setDialogOpen(true);
  }

  function openEdit(course) {
    setEditingCourse(course);
    setCourseForm({
      title: course.title,
      description: course.description || '',
      category: course.category || '',
      class_level: course.class_level || '',
      difficulty: course.difficulty || 'beginner',
      thumbnail_url: course.thumbnail_url || '',
      is_published: course.is_published,
    });
    setDialogOpen(true);
  }

  async function saveCourse(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...courseForm };
      if (payload.category === '') delete payload.category;
      if (editingCourse) {
        await coursesAPI.updateCourse(editingCourse.id, payload);
        toast.success('Topic updated');
      } else {
        await coursesAPI.createCourse(payload);
        toast.success('Topic created');
      }
      setDialogOpen(false);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save topic');
    } finally {
      setSaving(false);
    }
  }

  async function deleteCourse(id) {
    try {
      await coursesAPI.deleteCourse(id);
      toast.success('Topic deleted');
      setCourses(courses.filter(c => c.id !== id));
      setDeleteConfirm(null);
    } catch {
      toast.error('Failed to delete topic');
    }
  }

  async function openLessons(course) {
    setSelectedCourse(course);
    setLessonDialogOpen(true);
    try {
      const res = await coursesAPI.getLessons(course.id);
      setLessons(res.data.results || res.data);
    } catch {
      toast.error('Failed to load chapters');
    }
  }

  function openCreateLesson() {
    setEditingLesson(null);
    setLessonForm({
      title: '', description: '', content_type: 'text', content: '',
      order: lessons.length, duration: '', is_free: false,
    });
  }

  function openEditLesson(lesson) {
    setEditingLesson(lesson);
    setLessonForm({
      title: lesson.title,
      description: lesson.description || '',
      content_type: lesson.content_type || 'text',
      content: lesson.content || '',
      order: lesson.order || 0,
      duration: lesson.duration || '',
      is_free: lesson.is_free || false,
    });
  }

  async function saveLesson(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...lessonForm };
      if (payload.order !== undefined) payload.order = Number(payload.order);
      if (editingLesson) {
        await coursesAPI.updateLesson(selectedCourse.id, editingLesson.id, payload);
        toast.success('Chapter updated');
      } else {
        await coursesAPI.createLesson(selectedCourse.id, payload);
        toast.success('Chapter created');
      }
      const res = await coursesAPI.getLessons(selectedCourse.id);
      setLessons(res.data.results || res.data);
      setEditingLesson(null);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save chapter');
    } finally {
      setSaving(false);
    }
  }

  async function deleteLesson(lessonId) {
    try {
      await coursesAPI.deleteLesson(selectedCourse.id, lessonId);
      toast.success('Chapter deleted');
      setLessons(lessons.filter(l => l.id !== lessonId));
    } catch {
      toast.error('Failed to delete chapter');
    }
  }

  const diffColors = { beginner: 'bg-emerald-100 text-emerald-700', intermediate: 'bg-amber-100 text-amber-700', advanced: 'bg-red-100 text-red-700' };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
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
            <h1 className="text-2xl font-bold tracking-tight">Topics</h1>
          <p className="text-muted-foreground">Create and manage your topics</p>
        </div>
        <Button onClick={openCreate} className="shrink-0"><Plus className="h-4 w-4 mr-2" />New Topic</Button>
      </div>

      {courses.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center py-12">
          <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium">No topics yet</p>
          <p className="text-sm text-muted-foreground mb-4">Create your first topic to get started</p>
          <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Create Topic</Button>
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {courses.map(course => (
            <Card key={course.id} className="relative group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg line-clamp-2">{course.title}</CardTitle>
                  <div className="flex gap-1 shrink-0">
                    {course.class_level && <Badge variant="outline" className="text-xs bg-slate-100 text-slate-700">{course.class_level}</Badge>}
                    <Badge variant="outline" className={diffColors[course.difficulty] || ''}>
                      {course.difficulty}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground line-clamp-2">{course.description || 'No description'}</p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" />{course.lessons_count || 0} chapters</span>
                  <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{course.students_count || 0} students</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <Badge variant={course.is_published ? 'default' : 'secondary'}>
                    {course.is_published ? <><Eye className="h-3 w-3 mr-1" />Published</> : <><EyeOff className="h-3 w-3 mr-1" />Draft</>}
                  </Badge>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openLessons(course)} title="Manage Chapters">
                      <BookOpen className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(course)} title="Edit">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(course.id)} title="Delete">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Topic Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingCourse ? 'Edit Topic' : 'New Topic'}</DialogTitle></DialogHeader>
          <form onSubmit={saveCourse} className="space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input value={courseForm.title} onChange={e => setCourseForm({ ...courseForm, title: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea rows={3} value={courseForm.description} onChange={e => setCourseForm({ ...courseForm, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Subject</Label>
                <Select value={courseForm.category} onValueChange={v => setCourseForm({ ...courseForm, category: v })}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Difficulty</Label>
                <Select value={courseForm.difficulty} onValueChange={v => setCourseForm({ ...courseForm, difficulty: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Class Level</Label>
                <Select value={courseForm.class_level} onValueChange={v => setCourseForm({ ...courseForm, class_level: v })}>
                  <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                  <SelectContent>
                    {classLevels.map(l => <SelectItem key={l.id} value={l.name}>{l.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Thumbnail URL</Label>
              <Input value={courseForm.thumbnail_url} onChange={e => setCourseForm({ ...courseForm, thumbnail_url: e.target.value })} placeholder="https://..." />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={courseForm.is_published} onCheckedChange={v => setCourseForm({ ...courseForm, is_published: v })} />
              <Label>Published</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Saving...' : editingCourse ? 'Update' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Lessons Manager Dialog */}
      <Dialog open={lessonDialogOpen} onOpenChange={setLessonDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chapters — {selectedCourse?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {lessons.length === 0 && !editingLesson ? (
              <p className="text-sm text-muted-foreground text-center py-4">No chapters yet. Add your first chapter below.</p>
            ) : (
              lessons.sort((a, b) => a.order - b.order).map(lesson => (
                <div key={lesson.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-muted-foreground w-6">{lesson.order}</span>
                    <div>
                      <p className="font-medium text-sm">{lesson.title}</p>
                      <p className="text-xs text-muted-foreground">{lesson.content_type}{lesson.is_free ? ' · Free' : ''}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEditLesson(lesson)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteLesson(lesson.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                </div>
              ))
            )}
            {editingLesson !== null || lessons.length === 0 ? (
              <form onSubmit={saveLesson} className="border-t pt-4 space-y-3">
                <p className="text-sm font-medium">{editingLesson ? 'Edit Chapter' : 'Add Chapter'}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Title *</Label>
                    <Input value={lessonForm.title} onChange={e => setLessonForm({ ...lessonForm, title: e.target.value })} required />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Order</Label>
                    <Input type="number" value={lessonForm.order} onChange={e => setLessonForm({ ...lessonForm, order: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Content Type</Label>
                    <Select value={lessonForm.content_type} onValueChange={v => setLessonForm({ ...lessonForm, content_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="video">Video</SelectItem>
                        <SelectItem value="pdf">PDF</SelectItem>
                        <SelectItem value="audio">Audio</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Duration</Label>
                    <Input value={lessonForm.duration} onChange={e => setLessonForm({ ...lessonForm, duration: e.target.value })} placeholder="PT30M" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Content</Label>
                  <Textarea rows={3} value={lessonForm.content} onChange={e => setLessonForm({ ...lessonForm, content: e.target.value })} />
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={lessonForm.is_free} onCheckedChange={v => setLessonForm({ ...lessonForm, is_free: v })} />
                  <Label className="text-xs">Free preview</Label>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" size="sm" disabled={saving}>{saving ? 'Saving...' : editingLesson ? 'Update' : 'Add'}</Button>
                  {editingLesson && <Button type="button" size="sm" variant="outline" onClick={() => setEditingLesson(null)}>Cancel</Button>}
                </div>
              </form>
            ) : (
              <Button variant="outline" size="sm" onClick={openCreateLesson} className="w-full"><Plus className="h-4 w-4 mr-2" />Add Chapter</Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Topic?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This will permanently remove the topic and all its lessons. This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteCourse(deleteConfirm)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </PageTransition>
  );
}
