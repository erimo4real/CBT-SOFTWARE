import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { selectUser } from '@/store/slices/authSlice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User, Mail, Phone, Calendar, BookOpen, Hash, FileText, Settings } from 'lucide-react';
import { formatDate } from '@/lib/format';

const roleLabels = {
  student: 'Student',
  instructor: 'Instructor',
  admin: 'Administrator',
};

const roleBadgeColors = {
  student: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  instructor: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  admin: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

export default function Profile() {
  const user = useSelector(selectUser);
  const navigate = useNavigate();

  const initials = user
    ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || 'U'
    : 'U';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <Button variant="outline" size="sm" onClick={() => navigate('/settings')}>
          <Settings className="h-4 w-4 mr-2" />
          Edit Settings
        </Button>
      </div>

      {/* Avatar & header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-5">
            <Avatar className="h-24 w-24">
              {user?.avatar ? (
                <img src={user.avatar} alt="" className="h-full w-full object-cover" />
              ) : (
                <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                  {initials}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="space-y-1">
              <h2 className="text-xl font-bold">{user?.full_name || user?.email}</h2>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <Badge className={roleBadgeColors[user?.role]}>
                {roleLabels[user?.role] || user?.role}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <InfoRow icon={User} label="Full Name" value={user?.full_name || '—'} />
            <Separator />
            <InfoRow icon={Mail} label="Email" value={user?.email || '—'} />
            <Separator />
            <InfoRow icon={Phone} label="Phone" value={user?.phone || 'Not set'} />
            <Separator />
            <InfoRow icon={Calendar} label="Date of Birth" value={user?.date_of_birth ? formatDate(user.date_of_birth) : 'Not set'} />
            {user?.role === 'student' && (
              <>
                <Separator />
                <InfoRow icon={Hash} label="Registration No." value={user?.reg_number || '—'} />
                <Separator />
                <InfoRow icon={BookOpen} label="Class Level" value={user?.class_level || '—'} />
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bio */}
      {user?.bio && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Bio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">{user.bio}</p>
          </CardContent>
        </Card>
      )}

      {/* Account info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Hash className="h-4 w-4" />
            Account Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <InfoRow icon={Hash} label="User ID" value={user?.id || '—'} mono />
            <Separator />
            <InfoRow icon={User} label="Account Status" value={user?.account_status || 'active'} />
            {user?.role === 'student' && (
              <>
                <Separator />
                <InfoRow icon={Phone} label="Phone Verified" value={user?.phone_verified ? 'Yes' : 'No'} />
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, mono = false }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Icon className="h-4 w-4 shrink-0" />
        {label}
      </div>
      <span className={`text-sm font-medium text-right ${mono ? 'font-mono text-xs' : ''}`}>
        {value}
      </span>
    </div>
  );
}
