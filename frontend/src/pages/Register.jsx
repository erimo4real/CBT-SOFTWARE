import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { registerUser, selectAuthLoading, clearError } from '@/store/slices/authSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Eye, EyeOff, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import AuthSplitLayout from '@/components/AuthSplitLayout';

export default function Register() {
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const dispatch = useDispatch();
  const loading = useSelector(selectAuthLoading);
  const navigate = useNavigate();

  const update = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const passwordChecks = [
    { label: 'Min. 8 characters', met: form.password.length >= 8 },
    { label: 'Has uppercase letter', met: /[A-Z]/.test(form.password) },
    { label: 'Has number', met: /\d/.test(form.password) },
  ];

  const validate = () => {
    const errs = {};
    if (!form.first_name.trim()) errs.first_name = 'Required';
    if (!form.last_name.trim()) errs.last_name = 'Required';
    if (!form.email) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Invalid email';
    if (!form.password) errs.password = 'Password is required';
    else if (form.password.length < 8) errs.password = 'Min. 8 characters';
    if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    dispatch(clearError());
    try {
      const { confirmPassword, ...data } = form;
      await dispatch(registerUser(data)).unwrap();
      toast.success('Account created!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err || 'Registration failed');
    }
  };

  return (
    <AuthSplitLayout subtitle={<>Create Your<br />Account</>}>
      <Card className="shadow-xl border-0 card-shadow bg-white/90 dark:bg-background/90 backdrop-blur-md">
        <CardContent className="pt-8 pb-6 px-6">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold tracking-tight">Create Account</h1>
            <p className="text-sm text-muted-foreground mt-1">Join the learning platform</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="first_name" className="text-sm font-medium">First Name</Label>
                <Input
                  id="first_name"
                  value={form.first_name}
                  onChange={update('first_name')}
                  className={`h-11 transition-all ${errors.first_name ? 'border-destructive' : 'focus-visible:ring-primary/20 focus-visible:border-primary/40'}`}
                />
                {errors.first_name && <p className="text-xs text-destructive">{errors.first_name}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name" className="text-sm font-medium">Last Name</Label>
                <Input
                  id="last_name"
                  value={form.last_name}
                  onChange={update('last_name')}
                  className={`h-11 transition-all ${errors.last_name ? 'border-destructive' : 'focus-visible:ring-primary/20 focus-visible:border-primary/40'}`}
                />
                {errors.last_name && <p className="text-xs text-destructive">{errors.last_name}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={update('email')}
                placeholder="you@example.com"
                className={`h-11 transition-all ${errors.email ? 'border-destructive' : 'focus-visible:ring-primary/20 focus-visible:border-primary/40'}`}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={update('password')}
                  placeholder="Min. 8 characters"
                  className={`h-11 pr-10 transition-all ${errors.password ? 'border-destructive' : 'focus-visible:ring-primary/20 focus-visible:border-primary/40'}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
              {form.password && (
                <div className="flex flex-wrap gap-2 mt-1">
                  {passwordChecks.map((c) => (
                    <span key={c.label} className={`text-xs flex items-center gap-1 ${c.met ? 'text-emerald-600 font-medium' : 'text-muted-foreground'}`}>
                      {c.met ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                      {c.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={update('confirmPassword')}
                placeholder="Repeat your password"
                className={`h-11 transition-all ${errors.confirmPassword ? 'border-destructive' : 'focus-visible:ring-primary/20 focus-visible:border-primary/40'}`}
              />
              {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword}</p>}
            </div>
            <Button type="submit" className="w-full h-11 font-medium btn-press" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="text-primary font-medium underline underline-offset-4 hover:text-primary/80 transition-colors">
              Sign In
            </Link>
          </div>
        </CardContent>
      </Card>
    </AuthSplitLayout>
  );
}
