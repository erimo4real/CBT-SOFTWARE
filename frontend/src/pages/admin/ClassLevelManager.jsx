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
import { Switch } from '../../components/ui/switch';
import { toast } from 'sonner';
import PageTransition from '../../components/PageTransition';
import { ListSkeleton } from '../../components/Skeletons';
import {
  Plus, Pencil, Trash2, Layers, GripVertical,
} from 'lucide-react';
import Pagination from '@/components/Pagination';
import TableFilters from '@/components/TableFilters';

const PAGE_SIZE = 20;

export default function ClassLevelManager() {
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [form, setForm] = useState({ name: '', order: 0, is_active: true });

  useEffect(() => { loadLevels(); }, []);

  async function loadLevels() {
    try {
      const res = await coursesAPI.getClassLevels();
      setLevels(res.data.results || res.data);
    } catch {
      toast.error('Failed to load class levels');
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setForm({ name: '', order: levels.length, is_active: true });
    setDialogOpen(true);
  }

  function openEdit(level) {
    setEditing(level);
    setForm({ name: level.name, order: level.order, is_active: level.is_active });
    setDialogOpen(true);
  }

  async function saveLevel(e) {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Name is required');
    setSaving(true);
    try {
      if (editing) {
        await coursesAPI.updateClassLevel(editing.id, form);
        toast.success('Level updated');
      } else {
        await coursesAPI.createClassLevel(form);
        toast.success('Level created');
      }
      setDialogOpen(false);
      loadLevels();
    } catch (err) {
      toast.error(err.response?.data?.detail || err.response?.data?.name?.[0] || 'Failed to save level');
    } finally {
      setSaving(false);
    }
  }

  async function deleteLevel(id) {
    try {
      await coursesAPI.deleteClassLevel(id);
      toast.success('Level deleted');
      setLevels(levels.filter(l => l.id !== id));
      setDeleteConfirm(null);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete level');
    }
  }

  const filtered = useMemo(() => {
    if (!search) return levels;
    const q = search.toLowerCase();
    return levels.filter(l => l.name.toLowerCase().includes(q));
  }, [levels, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search]);

  if (loading) {
    return <ListSkeleton />;
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Class Levels</h1>
            <p className="text-muted-foreground">Manage levels used for questions, topics, and exams</p>
          </div>
          <Button onClick={openCreate} className="shrink-0"><Plus className="h-4 w-4 mr-2" />New Level</Button>
        </div>

        <TableFilters
          search={search}
          onSearch={setSearch}
          searchPlaceholder="Search levels..."
        />

        {paged.length === 0 ? (
          <Card><CardContent className="flex flex-col items-center justify-center py-12">
            <Layers className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No class levels yet</p>
            <p className="text-sm text-muted-foreground mb-4">Create levels to organize questions by class</p>
            <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Create Level</Button>
          </CardContent></Card>
        ) : (
          <div className="space-y-2">
            {paged.map(level => (
              <div key={level.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{level.name}</p>
                    <p className="text-xs text-muted-foreground">Order: {level.order}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={level.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}>
                    {level.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(level)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(level.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Pagination page={page} totalPages={totalPages} totalItems={filtered.length} onPageChange={setPage} />

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{editing ? 'Edit Level' : 'New Level'}</DialogTitle></DialogHeader>
            <form onSubmit={saveLevel} className="space-y-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="e.g. JSS1, SS3, Level 100" />
              </div>
              <div className="space-y-2">
                <Label>Sort Order</Label>
                <Input type="number" min="0" value={form.order} onChange={e => setForm({ ...form, order: Number(e.target.value) })} />
                <p className="text-xs text-muted-foreground">Lower numbers appear first</p>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
                <Label>{form.is_active ? 'Active' : 'Inactive'}</Label>
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
            <DialogHeader><DialogTitle>Delete Level?</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">Questions, topics, and exams using this level will keep their existing value.</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => deleteLevel(deleteConfirm)}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
}
