import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { loginUser, selectAuthLoading, clearError } from '@/store/slices/authSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import AuthSplitLayout from '@/components/AuthSplitLayout';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const dispatch = useDispatch();
  const loading = useSelector(selectAuthLoading);
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/dashboard';

  const validate = () => {
    const errs = {};
    if (!email) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = 'Invalid email';
    if (!password) errs.password = 'Password is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    dispatch(clearError());
    try {
      await dispatch(loginUser({ email, password })).unwrap();
      toast.success('Welcome back!');
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(err || 'Invalid credentials');
    }
  };

  return (
    <AuthSplitLayout subtitle={<>Welcome Back<br />to CBT</>}>
      <Card className="shadow-xl border-0 card-shadow bg-white/90 dark:bg-background/90 backdrop-blur-md">
        <CardContent className="pt-8 pb-6 px-6">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold tracking-tight">Sign In</h1>
            <p className="text-sm text-muted-foreground mt-1">Enter your credentials to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrors({ ...errors, email: '' }); }}
                placeholder="you@example.com"
                className={`h-11 transition-all ${errors.email ? 'border-destructive focus-visible:ring-destructive' : 'focus-visible:ring-primary/20 focus-visible:border-primary/40'}`}
              />
              {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setErrors({ ...errors, password: '' }); }}
                  placeholder="Enter your password"
                  className={`h-11 pr-10 transition-all ${errors.password ? 'border-destructive focus-visible:ring-destructive' : 'focus-visible:ring-primary/20 focus-visible:border-primary/40'}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-destructive mt-1">{errors.password}</p>}
            </div>
            <Button type="submit" className="w-full h-11 font-medium btn-press" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
            <div className="text-right">
              <Link to="/forgot-password" className="text-xs text-muted-foreground hover:text-primary transition-colors">
                Forgot password?
              </Link>
            </div>
          </form>

          <div className="mt-6 pt-5 border-t text-center text-sm text-muted-foreground space-y-2">
            <p>
              Don't have an account?{' '}
              <Link to="/register" className="text-primary font-medium underline underline-offset-4 hover:text-primary/80 transition-colors">
                Sign Up
              </Link>
            </p>
            <p>
              <Link to="/student/login" className="text-primary/70 hover:text-primary transition-colors">
                Student? Login here
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </AuthSplitLayout>
  );
}
