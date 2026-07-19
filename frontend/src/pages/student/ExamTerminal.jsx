import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { studentAuthAPI } from '@/api/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Monitor, Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export default function ExamTerminal() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ reg_number: '', exam_pin: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.reg_number || !form.exam_pin) {
      toast.error('Enter both registration number and exam PIN');
      return;
    }
    if (form.exam_pin.length < 4) {
      toast.error('Exam PIN must be at least 4 characters');
      return;
    }
    setLoading(true);
    try {
      const res = await studentAuthAPI.examAccess(form);
      const exam = res.data.exam;
      sessionStorage.setItem('terminal_exam', JSON.stringify(exam));
      navigate(`/terminal/exam/${exam.id}/take`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Access denied');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center terminal-auth-bg p-4">
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-slate-800/80 to-slate-900/90" />

      <div className="relative z-10 w-full max-w-md">
        <Card className="border-slate-600 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md card-shadow">
          <CardHeader className="text-center space-y-3">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Monitor className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">CBT Exam Terminal</CardTitle>
            <CardDescription className="text-muted-foreground">
              Enter your registration number and exam PIN to begin
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Registration Number</Label>
                <Input
                  placeholder="e.g., REG-001"
                  value={form.reg_number}
                  onChange={(e) => setForm({ ...form, reg_number: e.target.value })}
                  disabled={loading}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label>Exam PIN</Label>
                <Input
                  placeholder="e.g., ABCD1234"
                  value={form.exam_pin}
                  onChange={(e) => setForm({ ...form, exam_pin: e.target.value.toUpperCase() })}
                  className="text-center text-xl tracking-widest font-mono"
                  disabled={loading}
                />
              </div>
              <Button type="submit" className="w-full h-12 text-base" disabled={loading}>
                {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <ArrowRight className="h-5 w-5 mr-2" />}
                Start Exam
              </Button>
            </form>
            <p className="text-center text-xs text-muted-foreground mt-6">
              See exam center staff if you need assistance
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
