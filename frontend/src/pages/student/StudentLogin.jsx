import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { studentAuthAPI } from '@/api/auth';
import { setTokens, setUser } from '@/store/slices/authSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { GraduationCap, Mail, Phone, KeyRound, ArrowLeft, Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

const STEPS = {
  CREDENTIALS: 'credentials',
  OTP_REQUEST: 'otp_request',
  OTP_VERIFY: 'otp_verify',
};

export default function StudentLogin() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/student/dashboard';
  const [step, setStep] = useState(STEPS.CREDENTIALS);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);
  const [otpInfo, setOtpInfo] = useState(null);

  const [credentials, setCredentials] = useState({ login: '', password: '' });
  const [otpDelivery, setOtpDelivery] = useState('');
  const [otpCode, setOtpCode] = useState('');

  const handleCredentials = async (e) => {
    e.preventDefault();
    if (!credentials.login || !credentials.password) {
      toast.error('Please enter your email/reg number and password');
      return;
    }
    setLoading(true);
    try {
      const res = await studentAuthAPI.login(credentials);
      setUserId(res.data.user_id);
      setOtpInfo(res.data);
      setStep(STEPS.OTP_REQUEST);
      toast.success('Credentials verified. Request your OTP to continue.');
    } catch (err) {
      const msg = err.response?.data?.error || 'Login failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOTP = async (method) => {
    setOtpDelivery(method);
    setLoading(true);
    try {
      await studentAuthAPI.requestOTP({ user_id: userId, delivery_method: method });
      toast.success(`OTP sent via ${method}`);
      setStep(STEPS.OTP_VERIFY);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (!otpCode || otpCode.length !== 6) {
      toast.error('Enter a valid 6-digit code');
      return;
    }
    setLoading(true);
    try {
      const res = await studentAuthAPI.verifyOTP({ user_id: userId, code: otpCode });
      dispatch(setTokens(res.data.tokens));
      dispatch(setUser(res.data.user));
      toast.success('Login successful!');
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.error || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center student-auth-bg p-4">
      {/* Decorative overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/80 via-primary/60 to-primary/40" />

      <div className="relative z-10 w-full max-w-md">
        <Card className="card-shadow border-0 bg-white/90 dark:bg-background/90 backdrop-blur-md">
          <CardHeader className="text-center space-y-3">
            <div className="mx-auto h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <GraduationCap className="h-7 w-7 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">Student Portal</CardTitle>
            <CardDescription>
              {step === STEPS.CREDENTIALS && 'Enter your credentials to access exams'}
              {step === STEPS.OTP_REQUEST && 'Choose how to receive your verification code'}
              {step === STEPS.OTP_VERIFY && `Enter the code sent to your ${otpDelivery}`}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {/* Step 1: Credentials */}
            {step === STEPS.CREDENTIALS && (
              <form onSubmit={handleCredentials} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login">Email or Registration Number</Label>
                  <Input
                    id="login"
                    placeholder="you@email.com or REG-001"
                    value={credentials.login}
                    onChange={(e) => setCredentials({ ...credentials, login: e.target.value })}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={credentials.password}
                    onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                    disabled={loading}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <KeyRound className="h-4 w-4 mr-2" />}
                  Verify Credentials
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  Don't have an account? Contact your administrator.
                </p>
                <p className="text-center text-sm">
                  <a href="/login" className="text-primary/70 hover:text-primary transition-colors">
                    Staff? Login here
                  </a>
                </p>
              </form>
            )}

            {/* Step 2: OTP Delivery Method */}
            {step === STEPS.OTP_REQUEST && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground text-center mb-4">
                  Select a verification method:
                </p>
                {otpInfo?.has_email && (
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-3 h-14"
                    onClick={() => handleRequestOTP('email')}
                    disabled={loading}
                  >
                    <Mail className="h-5 w-5 text-blue-500" />
                    <div className="text-left">
                      <p className="font-medium">Email</p>
                      <p className="text-xs text-muted-foreground">{otpInfo.email}</p>
                    </div>
                  </Button>
                )}
                {otpInfo?.has_phone && (
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-3 h-14"
                    onClick={() => handleRequestOTP('sms')}
                    disabled={loading}
                  >
                    <Phone className="h-5 w-5 text-green-500" />
                    <div className="text-left">
                      <p className="font-medium">SMS</p>
                      <p className="text-xs text-muted-foreground">{otpInfo.phone_masked}</p>
                    </div>
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 h-14"
                  onClick={() => handleRequestOTP('pin')}
                  disabled={loading}
                >
                  <ShieldCheck className="h-5 w-5 text-amber-500" />
                  <div className="text-left">
                    <p className="font-medium">Staff-Generated PIN</p>
                    <p className="text-xs text-muted-foreground">Get a PIN from exam center staff</p>
                  </div>
                </Button>
                <Button
                  variant="ghost"
                  className="w-full mt-2"
                  onClick={() => setStep(STEPS.CREDENTIALS)}
                  disabled={loading}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back
                </Button>
              </div>
            )}

            {/* Step 3: OTP Verify */}
            {step === STEPS.OTP_VERIFY && (
              <form onSubmit={handleVerifyOTP} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp">6-Digit Code</Label>
                  <Input
                    id="otp"
                    placeholder="000000"
                    maxLength={6}
                    className="text-center text-2xl tracking-[0.5em] font-mono"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    disabled={loading}
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    Code expires in 10 minutes
                  </p>
                </div>
                <Button type="submit" className="w-full" disabled={loading || otpCode.length !== 6}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                  Verify Code
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setStep(STEPS.OTP_REQUEST);
                    setOtpCode('');
                  }}
                  disabled={loading}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" /> Try another method
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
