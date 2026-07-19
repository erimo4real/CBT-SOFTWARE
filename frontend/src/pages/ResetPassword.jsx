import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { authAPI } from '@/api/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CheckCircle2, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import AuthSplitLayout from '@/components/AuthSplitLayout';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const uid = searchParams.get('uid');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState({});

  if (!token || !uid) {
    return (
      <AuthSplitLayout subtitle={<>Invalid<br />Link</>}>
        <Card className="shadow-xl border-0 card-shadow">
          <CardContent className="pt-8 pb-6 px-6 text-center space-y-4">
            <p className="text-destructive font-medium">Invalid reset link</p>
            <Link to="/forgot-password"><Button variant="outline">Request a new link</Button></Link>
          </CardContent>
        </Card>
      </AuthSplitLayout>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!password) errs.password = 'Password is required';
    else if (password.length < 8) errs.password = 'Min. 8 characters';
    if (password !== confirm) errs.confirm = 'Passwords do not match';
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setLoading(true);
    try {
      await authAPI.confirmPasswordReset({ token, uid, new_password: password });
      setDone(true);
      toast.success('Password reset successful');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Reset failed. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <AuthSplitLayout subtitle={<>Password<br />Updated</>}>
        <Card className="shadow-xl border-0 card-shadow">
          <CardContent className="pt-8 pb-6 px-6 text-center space-y-4">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold">Password updated</h2>
            <p className="text-sm text-muted-foreground">You can now log in with your new password.</p>
            <Button onClick={() => navigate('/login')} className="mt-4">Go to Login</Button>
          </CardContent>
        </Card>
      </AuthSplitLayout>
    );
  }

  return (
    <AuthSplitLayout subtitle={<>Set a New<br />Password</>}>
      <Card className="shadow-xl border-0 card-shadow">
        <CardContent className="pt-8 pb-6 px-6">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold tracking-tight">New Password</h1>
            <p className="text-sm text-muted-foreground mt-1">Enter your new password below</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>New Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setErrors({}); }}
                  placeholder="Min. 8 characters"
                  className={`h-11 pr-10 ${errors.password ? 'border-destructive' : ''}`}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
            </div>
            <div className="space-y-2">
              <Label>Confirm Password</Label>
              <Input
                type="password"
                value={confirm}
                onChange={(e) => { setConfirm(e.target.value); setErrors({}); }}
                placeholder="Repeat your password"
                className={`h-11 ${errors.confirm ? 'border-destructive' : ''}`}
              />
              {errors.confirm && <p className="text-xs text-destructive">{errors.confirm}</p>}
            </div>
            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Reset Password
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
