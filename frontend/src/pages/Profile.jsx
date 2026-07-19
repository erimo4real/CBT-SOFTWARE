import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { authAPI } from '@/api/auth';
import { selectUser, updateUser, fetchProfile } from '@/store/slices/authSlice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User, Lock, Camera, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Profile() {
  const user = useSelector(selectUser);
  const dispatch = useDispatch();
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    date_of_birth: '',
    bio: '',
  });
  const [passwords, setPasswords] = useState({ old_password: '', new_password: '' });
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [changingPw, setChangingPw] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        phone: user.phone || '',
        date_of_birth: user.date_of_birth || '',
        bio: user.bio || '',
      });
    }
  }, [user]);

  const validateProfile = () => {
    const errs = {};
    if (!form.first_name.trim()) errs.first_name = 'First name is required';
    else if (form.first_name.length > 150) errs.first_name = 'Max 150 characters';
    if (!form.last_name.trim()) errs.last_name = 'Last name is required';
    else if (form.last_name.length > 150) errs.last_name = 'Max 150 characters';
    if (form.phone && !/^[+]?[\d\s\-()]{7,20}$/.test(form.phone)) errs.phone = 'Invalid phone number';
    if (form.bio && form.bio.length > 500) errs.bio = 'Max 500 characters';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    if (!validateProfile()) return;
    setSaving(true);
    try {
      const res = await authAPI.updateProfile(form);
      dispatch(updateUser(res.data));
      toast.success('Profile updated');
    } catch (err) {
      const msg = err.response?.data;
      const detail = typeof msg === 'object' ? Object.values(msg).flat().join(' ') : msg;
      toast.error(detail || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!passwords.old_password) {
      toast.error('Current password is required');
      return;
    }
    if (passwords.new_password.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    if (passwords.old_password === passwords.new_password) {
      toast.error('New password must differ from current');
      return;
    }
    setChangingPw(true);
    try {
      await authAPI.changePassword(passwords);
      setPasswords({ old_password: '', new_password: '' });
      toast.success('Password changed');
    } catch (err) {
      const msg = err.response?.data;
      const detail = typeof msg === 'object' ? Object.values(msg).flat().join(' ') : msg;
      toast.error(detail || 'Failed to change password');
    } finally {
      setChangingPw(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      toast.error('Image must be under 5 MB');
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast.error('File must be an image');
      return;
    }
    try {
      const res = await authAPI.uploadAvatar(file);
      dispatch(updateUser(res.data));
      toast.success('Avatar updated');
    } catch {
      toast.error('Failed to upload avatar');
    }
  };

  const initials = user
    ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || 'U'
    : 'U';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Profile & Settings</h1>

      {/* Avatar & basics */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-20 w-20">
                {user?.avatar ? (
                  <img src={user.avatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  <AvatarFallback className="text-xl bg-primary text-primary-foreground">{initials}</AvatarFallback>
                )}
              </Avatar>
              <label className="absolute bottom-0 right-0 p-1.5 rounded-full bg-primary text-primary-foreground cursor-pointer hover:bg-primary/90">
                <Camera className="h-3.5 w-3.5" />
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </label>
            </div>
            <div>
              <h2 className="text-lg font-semibold">{user?.full_name || user?.email}</h2>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <Badge className="mt-1">{user?.role}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileSave} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>First Name</Label>
                <Input value={form.first_name} onChange={(e) => setForm((p) => ({ ...p, first_name: e.target.value }))} className={formErrors.first_name ? 'border-destructive' : ''} />
                {formErrors.first_name && <p className="text-xs text-destructive">{formErrors.first_name}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Last Name</Label>
                <Input value={form.last_name} onChange={(e) => setForm((p) => ({ ...p, last_name: e.target.value }))} className={formErrors.last_name ? 'border-destructive' : ''} />
                {formErrors.last_name && <p className="text-xs text-destructive">{formErrors.last_name}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} placeholder="Optional" className={formErrors.phone ? 'border-destructive' : ''} />
                {formErrors.phone && <p className="text-xs text-destructive">{formErrors.phone}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Date of Birth</Label>
                <Input type="date" value={form.date_of_birth} onChange={(e) => setForm((p) => ({ ...p, date_of_birth: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Bio</Label>
              <textarea
                value={form.bio}
                onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
                placeholder="Tell us about yourself..."
                className="w-full min-h-[80px] p-3 rounded-md border bg-background text-sm resize-y"
              />
            </div>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Change password */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Change Password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Current Password</Label>
              <Input
                type="password"
                value={passwords.old_password}
                onChange={(e) => setPasswords((p) => ({ ...p, old_password: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>New Password</Label>
              <Input
                type="password"
                value={passwords.new_password}
                onChange={(e) => setPasswords((p) => ({ ...p, new_password: e.target.value }))}
                placeholder="Min. 8 characters"
                required
              />
            </div>
            <Button type="submit" variant="outline" disabled={changingPw}>
              {changingPw && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Change Password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
