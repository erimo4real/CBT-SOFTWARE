import { useState, useEffect } from 'react';
import { examPinsAPI, studentsAPI } from '@/api/auth';
import { examsAPI } from '@/api/exams';
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
  Key, Plus, Loader2, Copy, Printer, Trash2, Clock, Users,
} from 'lucide-react';
import { toast } from 'sonner';

export default function ExamPinManager() {
  const [pins, setPins] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const fetchPins = () => {
    setLoading(true);
    Promise.all([
      examPinsAPI.list({}).catch(() => ({ data: { results: [] } })),
      examsAPI.list({}).catch(() => ({ data: { results: [] } })),
    ]).then(([pinsRes, examsRes]) => {
      setPins(pinsRes.data.results || []);
      setExams(examsRes.data.results || []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchPins(); }, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this PIN?')) return;
    try {
      await examPinsAPI.delete(id);
      toast.success('PIN deleted');
      fetchPins();
    } catch {
      toast.error('Failed to delete');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Exam PINs</h1>
          <p className="text-muted-foreground">Generate and manage exam access PINs</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" /> Generate PIN
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      ) : pins.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Key className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No exam PINs generated yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 stagger-children">
          {pins.map((pin) => (
            <Card key={pin.id} className="card-shadow border-0">
              <CardContent className="pt-4 pb-3 px-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground truncate">{pin.exam_title}</p>
                    <p className="font-mono text-lg font-bold tracking-wider mt-1">{pin.pin}</p>
                  </div>
                  <Badge className={
                    pin.is_active && new Date(pin.expires_at) > new Date()
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }>
                    {pin.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {pin.current_uses}/{pin.max_uses}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {pin.expires_at ? new Date(pin.expires_at).toLocaleDateString() : 'No expiry'}
                  </span>
                </div>
                <div className="flex gap-1.5 pt-1">
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => {
                    navigator.clipboard.writeText(pin.pin);
                    toast.success('PIN copied');
                  }}>
                    <Copy className="h-3 w-3 mr-1" /> Copy
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => {
                    window.open(examPinsAPI.printSlipUrl(pin.id), '_blank');
                  }}>
                    <Printer className="h-3 w-3 mr-1" /> Print Slip
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-red-500" onClick={() => handleDelete(pin.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create PIN Dialog */}
      <CreatePinDialog open={showCreate} onClose={() => setShowCreate(false)} exams={exams} onCreated={fetchPins} />
    </div>
  );
}


function CreatePinDialog({ open, onClose, exams, onCreated }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ exam_id: '', max_uses: 1, expires_hours: 24 });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.exam_id) return toast.error('Select an exam');
    if (form.max_uses < 1 || form.max_uses > 1000) return toast.error('Max uses must be 1-1000');
    if (form.expires_hours < 1 || form.expires_hours > 720) return toast.error('Expiry must be 1-720 hours');
    setLoading(true);
    try {
      const res = await examPinsAPI.create(form);
      toast.success(res.data.message || 'PIN generated');
      onCreated();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to generate PIN');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Generate Exam PIN</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Exam *</Label>
            <Select value={form.exam_id} onValueChange={(v) => setForm({ ...form, exam_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select exam" /></SelectTrigger>
              <SelectContent>
                {exams.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Max Uses</Label>
              <Input type="number" min="1" value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: parseInt(e.target.value) || 1 })} />
            </div>
            <div className="space-y-1.5">
              <Label>Expires In (hours)</Label>
              <Input type="number" min="1" value={form.expires_hours} onChange={(e) => setForm({ ...form, expires_hours: parseInt(e.target.value) || 24 })} />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Generate PIN
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
