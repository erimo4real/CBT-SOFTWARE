import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '@/api/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Mail, CheckCircle2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import AuthSplitLayout from '@/components/AuthSplitLayout';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [errors, setErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!email) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = 'Invalid email';
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setLoading(true);
    try {
      await authAPI.requestPasswordReset({ email, frontend_url: window.location.origin });
      setSent(true);
    } catch {
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <AuthSplitLayout subtitle={<>Check Your<br />Email</>}>
        <Card className="shadow-xl border-0 card-shadow bg-white/90 dark:bg-background/90 backdrop-blur-md">
          <CardContent className="pt-8 pb-6 px-6 text-center space-y-4">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold">Check your email</h2>
            <p className="text-sm text-muted-foreground">
              If an account exists with <strong>{email}</strong>, we've sent a password reset link.
            </p>
            <Link to="/login">
              <Button variant="outline" className="mt-4"><ArrowLeft className="h-4 w-4 mr-2" /> Back to login</Button>
            </Link>
          </CardContent>
        </Card>
      </AuthSplitLayout>
    );
  }

  return (
    <AuthSplitLayout subtitle={<>Forgot Your<br />Password?</>}>
      <Card className="shadow-xl border-0 card-shadow bg-white/90 dark:bg-background/90 backdrop-blur-md">
        <CardContent className="pt-8 pb-6 px-6">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold tracking-tight">Reset Password</h1>
            <p className="text-sm text-muted-foreground mt-1">Enter your email to receive a reset link</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrors({}); }}
                placeholder="you@example.com"
                className={`h-11 ${errors.email ? 'border-destructive' : ''}`}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>
            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
              Send Reset Link
            </Button>
          </form>
          <div className="mt-6 pt-5 border-t text-center text-sm">
            <Link to="/login" className="text-primary/70 hover:text-primary transition-colors">
              <ArrowLeft className="h-3 w-3 inline mr-1" /> Back to login
            </Link>
          </div>
        </CardContent>
      </Card>
    </AuthSplitLayout>
  );
}
