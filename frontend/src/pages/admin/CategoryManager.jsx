import { useState, useEffect, useMemo } from 'react';
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
import { toast } from 'sonner';
import PageTransition from '../../components/PageTransition';
import { CourseCardSkeleton } from '../../components/Skeletons';
import {
  Plus, Pencil, Trash2, FolderOpen, BookOpen,
} from 'lucide-react';
import Pagination from '@/components/Pagination';
import TableFilters from '@/components/TableFilters';
import usePagination from '@/hooks/usePagination';

const PAGE_SIZE = 12;

export default function CategoryManager() {
  const [categories, setCategories] = useState([]);
  const [classLevels, setClassLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { filters, setFilter, clearFilters } = usePagination();

  const [form, setForm] = useState({ name: '', class_level: '', description: '', icon: '' });

  useEffect(() => {
    loadCategories();
    coursesAPI.getClassLevels().then(res => setClassLevels(res.data.results || res.data || [])).catch(() => {});
  }, []);

  async function loadCategories() {
    try {
      const res = await coursesAPI.getCategories();
      setCategories(res.data.results || res.data);
    } catch {
      toast.error('Failed to load subjects');
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setForm({ name: '', class_level: '', description: '', icon: '' });
    setDialogOpen(true);
  }

  function openEdit(cat) {
    setEditing(cat);
    setForm({ name: cat.name, class_level: cat.class_level || '', description: cat.description || '', icon: cat.icon || '' });
    setDialogOpen(true);
  }

  async function saveCategory(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await coursesAPI.updateCategory(editing.id, form);
        toast.success('Subject updated');
      } else {
        await coursesAPI.createCategory(form);
        toast.success('Subject created');
      }
      setDialogOpen(false);
      loadCategories();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save subject');
    } finally {
      setSaving(false);
    }
  }

  async function deleteCategory(id) {
    try {
      await coursesAPI.deleteCategory(id);
      toast.success('Subject deleted');
      setCategories(categories.filter(c => c.id !== id));
      setDeleteConfirm(null);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete subject');
    }
  }

  const filtered = useMemo(() => {
    let result = categories;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(c => c.name.toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q));
    }
    if (filters.class_level) {
      result = result.filter(c => c.class_level === filters.class_level);
    }
    return result;
  }, [categories, search, filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search, filters]);

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
            <h1 className="text-2xl font-bold tracking-tight">Subjects</h1>
            <p className="text-muted-foreground">{filtered.length} subjects</p>
          </div>
          <Button onClick={openCreate} className="shrink-0"><Plus className="h-4 w-4 mr-2" />New Subject</Button>
        </div>

        <TableFilters
          search={search}
          onSearch={setSearch}
          searchPlaceholder="Search subjects..."
          filters={[
            { key: 'class_level', label: 'All levels', options: classLevels.map(l => ({ value: l.name, label: l.name })) },
          ]}
          values={filters}
          onFilter={setFilter}
          onClear={clearFilters}
        />

        {paged.length === 0 ? (
          <Card><CardContent className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No subjects yet</p>
            <p className="text-sm text-muted-foreground mb-4">Create subjects to organize topics</p>
            <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Create Subject</Button>
          </CardContent></Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {paged.map(cat => (
              <Card key={cat.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{cat.name}</CardTitle>
                    <div className="flex items-center gap-1">
                      {cat.class_level && <Badge variant="outline" className="text-xs">{cat.class_level}</Badge>}
                      <Badge variant="outline" className="text-xs">
                        <BookOpen className="h-3 w-3 mr-1" />
                        {cat.course_count || 0} topics
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground line-clamp-2">{cat.description || 'No description'}</p>
                  <div className="flex gap-1 pt-2 border-t">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(cat)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(cat.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Pagination page={page} totalPages={totalPages} totalItems={filtered.length} onPageChange={setPage} />

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{editing ? 'Edit Subject' : 'New Subject'}</DialogTitle></DialogHeader>
            <form onSubmit={saveCategory} className="space-y-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Class Level</Label>
                <Select value={form.class_level} onValueChange={v => setForm({ ...form, class_level: v })}>
                  <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                  <SelectContent>
                    {classLevels.map(l => <SelectItem key={l.id} value={l.name}>{l.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Icon</Label>
                <Input value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} placeholder="Icon name or URL" />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={saving}>{saving ? 'Saving...' : editing ? 'Update' : 'Create'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Delete Subject?</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">Topics in this subject will become uncategorized.</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => deleteCategory(deleteConfirm)}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
}
