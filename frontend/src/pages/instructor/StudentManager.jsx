import { useState, useEffect } from 'react';
import { studentsAPI } from '@/api/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Users, Search, Plus, Upload, MoreHorizontal, Edit, Trash2,
  Loader2, Copy, CheckCircle2, XCircle, Download,
} from 'lucide-react';
import { toast } from 'sonner';
import usePagination from '@/hooks/usePagination';
import Pagination from '@/components/Pagination';
import TableFilters from '@/components/TableFilters';

export default function StudentManager() {
  const [students, setStudents] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [createdPassword, setCreatedPassword] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [bulkAction, setBulkAction] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);

  const { page, search, filters, params, setPage, setSearch, setFilter, clearFilters, totalPages } = usePagination();

  const fetchStudents = () => {
    setLoading(true);
    studentsAPI.list(params)
      .then((res) => {
        setStudents(res.data.results || []);
        setCount(res.data.count || 0);
      })
      .catch(() => toast.error('Failed to load students'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchStudents(); }, [page, search, filters]);

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === students.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(students.map(s => s.id)));
    }
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selected.size === 0) return;
    const ids = Array.from(selected);
    setBulkLoading(true);
    try {
      if (bulkAction === 'activate' || bulkAction === 'suspend') {
        const status = bulkAction === 'activate' ? 'active' : 'suspended';
        await Promise.all(ids.map(id => studentsAPI.patch(id, { account_status: status })));
        toast.success(`${ids.length} student(s) ${bulkAction}d`);
      } else if (bulkAction === 'delete') {
        if (!confirm(`Delete ${ids.length} student(s)? This cannot be undone.`)) {
          setBulkLoading(false);
          return;
        }
        await Promise.all(ids.map(id => studentsAPI.delete(id)));
        toast.success(`${ids.length} student(s) deleted`);
      }
      setSelected(new Set());
      setBulkAction('');
      fetchStudents();
    } catch {
      toast.error('Bulk action failed');
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Student Management</h1>
          <p className="text-muted-foreground">Create, import, and manage student accounts</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowImport(true)}>
            <Upload className="h-4 w-4 mr-2" /> Import CSV
          </Button>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-2" /> Add Student
          </Button>
        </div>
      </div>

      <TableFilters
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search by name, email, reg#..."
        filters={[{
          key: 'account_status',
          label: 'All statuses',
          options: [
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
            { value: 'suspended', label: 'Suspended' },
          ],
        }]}
        values={filters}
        onFilter={setFilter}
        onClear={clearFilters}
      />

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-3 px-4 flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium">{selected.size} selected</span>
            <Select value={bulkAction} onValueChange={setBulkAction}>
              <SelectTrigger className="w-44 h-9"><SelectValue placeholder="Bulk action..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="activate">Activate</SelectItem>
                <SelectItem value="suspend">Suspend</SelectItem>
                <SelectItem value="delete">Delete</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" disabled={!bulkAction || bulkLoading} onClick={handleBulkAction}>
              {bulkLoading && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Apply
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      ) : students.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No students found</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="p-3 w-10">
                      <input
                        type="checkbox"
                        checked={students.length > 0 && selected.size === students.length}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 rounded border-muted-foreground/30 accent-primary"
                      />
                    </th>
                    <th className="text-left p-3 font-medium">Name</th>
                    <th className="text-left p-3 font-medium">Email</th>
                    <th className="text-left p-3 font-medium">Reg #</th>
                    <th className="text-left p-3 font-medium">Class</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium hidden md:table-cell">Phone</th>
                    <th className="text-right p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.id} className={`border-b last:border-0 hover:bg-muted/20 transition-colors ${selected.has(s.id) ? 'bg-primary/5' : ''}`}>
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selected.has(s.id)}
                          onChange={() => toggleSelect(s.id)}
                          className="h-4 w-4 rounded border-muted-foreground/30 accent-primary"
                        />
                      </td>
                      <td className="p-3 font-medium">{s.full_name || `${s.first_name} ${s.last_name}`}</td>
                      <td className="p-3 text-muted-foreground">{s.email}</td>
                      <td className="p-3 font-mono text-xs">{s.reg_number || '—'}</td>
                      <td className="p-3">{s.class_level || '—'}</td>
                      <td className="p-3">
                        <Badge className={
                          s.account_status === 'active' ? 'bg-green-100 text-green-800' :
                          s.account_status === 'suspended' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }>{s.account_status}</Badge>
                      </td>
                      <td className="p-3 text-muted-foreground hidden md:table-cell">{s.phone || '—'}</td>
                      <td className="p-3 text-right">
                        <Button size="sm" variant="ghost" onClick={() => setShowDetail(s)}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Pagination page={page} totalPages={totalPages(count)} totalItems={count} onPageChange={setPage} />

      {/* Create Student Dialog */}
      <CreateStudentDialog open={showCreate} onClose={() => setShowCreate(false)} onCreated={(pw) => {
        setCreatedPassword(pw);
        fetchStudents();
      }} />

      {/* Import CSV Dialog */}
      <ImportCSVDIalog open={showImport} onClose={() => setShowImport(false)} onImported={fetchStudents} />

      {/* Created password display */}
      {createdPassword && (
        <Dialog open={!!createdPassword} onOpenChange={() => setCreatedPassword(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Student Created</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Share this password with the student. It will not be shown again.</p>
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <code className="flex-1 text-sm font-mono">{createdPassword.raw_password}</code>
                <Button size="sm" variant="ghost" onClick={() => {
                  navigator.clipboard.writeText(createdPassword.raw_password);
                  toast.success('Copied!');
                }}><Copy className="h-4 w-4" /></Button>
              </div>
              <Button className="w-full" onClick={() => setCreatedPassword(null)}>Done</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Student Detail Dialog */}
      {showDetail && (
        <StudentDetailDialog student={showDetail} onClose={() => setShowDetail(null)} onUpdated={fetchStudents} />
      )}
    </div>
  );
}


function CreateStudentDialog({ open, onClose, onCreated }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: '', first_name: '', last_name: '', phone: '',
    reg_number: '', class_level: '', password: '', generate_password: true,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await studentsAPI.create(form);
      toast.success('Student created');
      onCreated(res.data);
      onClose();
      setForm({ email: '', first_name: '', last_name: '', phone: '', reg_number: '', class_level: '', password: '', generate_password: true });
    } catch (err) {
      const data = err.response?.data;
      if (data && typeof data === 'object') {
        const firstError = Object.values(data).flat()[0];
        toast.error(typeof firstError === 'string' ? firstError : 'Failed to create student');
      } else {
        toast.error('Failed to create student');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Add New Student</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>First Name *</Label>
              <Input required value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Last Name *</Label>
              <Input required value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Email *</Label>
            <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Reg Number *</Label>
              <Input required value={form.reg_number} onChange={(e) => setForm({ ...form, reg_number: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Class / Level *</Label>
            <Input required placeholder="e.g., JSS1, SS3, Level 100" value={form.class_level} onChange={(e) => setForm({ ...form, class_level: e.target.value })} />
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="gen-pw" checked={form.generate_password} onChange={(e) => setForm({ ...form, generate_password: e.target.checked })} className="rounded" />
            <Label htmlFor="gen-pw" className="text-sm">Auto-generate password</Label>
          </div>
          {!form.generate_password && (
            <div className="space-y-1.5">
              <Label>Password *</Label>
              <Input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Create Student
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}


function ImportCSVDIalog({ open, onClose, onImported }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleImport = async () => {
    if (!file) return toast.error('Select a CSV file');
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) return toast.error('File must be under 10 MB');
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await studentsAPI.bulkImport(fd);
      setResult(res.data);
      onImported();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Import Students from CSV</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            CSV columns: <code>email, first_name, last_name, phone, reg_number, class_level</code>
          </p>
          <Input type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0])} />
          <Button onClick={handleImport} className="w-full" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Import
          </Button>
          {result && (
            <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
              <p className="flex items-center gap-1"><CheckCircle2 className="h-4 w-4 text-green-500" /> Created: {result.created} students</p>
              {result.errors?.length > 0 && (
                <div>
                  <p className="flex items-center gap-1 text-red-600"><XCircle className="h-4 w-4" /> Errors: {result.errors.length}</p>
                  {result.errors.map((e, i) => (
                    <p key={i} className="text-xs text-muted-foreground ml-5">Row {e.row}: {e.error}</p>
                  ))}
                </div>
              )}
              {result.students?.length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-xs font-medium">Generated passwords:</p>
                  {result.students.map((s, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span>{s.email}</span>
                      <code className="bg-background px-1 rounded">{s.password}</code>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}


function StudentDetailDialog({ student, onClose, onUpdated }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    first_name: student.first_name,
    last_name: student.last_name,
    phone: student.phone || '',
    class_level: student.class_level || '',
    account_status: student.account_status,
  });
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      await studentsAPI.patch(student.id, form);
      toast.success('Student updated');
      setEditing(false);
      onUpdated();
      onClose();
    } catch (err) {
      toast.error('Failed to update');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{student.full_name || `${student.first_name} ${student.last_name}`}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><span className="text-muted-foreground">Email:</span> <p className="font-medium">{student.email}</p></div>
            <div><span className="text-muted-foreground">Reg #:</span> <p className="font-mono">{student.reg_number || '—'}</p></div>
          </div>
          {editing ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1"><Label>First Name</Label><Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></div>
                <div className="space-y-1"><Label>Last Name</Label><Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div className="space-y-1"><Label>Class</Label><Input value={form.class_level} onChange={(e) => setForm({ ...form, class_level: e.target.value })} /></div>
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={form.account_status} onValueChange={(v) => setForm({ ...form, account_status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={handleSave} disabled={loading} className="flex-1">
                  {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Save
                </Button>
                <Button variant="outline" onClick={() => setEditing(false)} className="flex-1">Cancel</Button>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Phone:</span> <p>{student.phone || '—'}</p></div>
                <div><span className="text-muted-foreground">Class:</span> <p>{student.class_level || '—'}</p></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Status:</span>
                  <Badge className={
                    student.account_status === 'active' ? 'bg-green-100 text-green-800 ml-2' :
                    student.account_status === 'suspended' ? 'bg-red-100 text-red-800 ml-2' :
                    'bg-gray-100 text-gray-800 ml-2'
                  }>{student.account_status}</Badge>
                </div>
                <div><span className="text-muted-foreground">Exams taken:</span> <p className="font-medium">{student.exam_attempts_count}</p></div>
              </div>
              <div className="pt-2">
                <span className="text-muted-foreground">Joined:</span> <p>{new Date(student.created_at).toLocaleDateString()}</p>
              </div>
              <Button onClick={() => setEditing(true)} className="w-full mt-2">
                <Edit className="h-4 w-4 mr-2" /> Edit Student
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
