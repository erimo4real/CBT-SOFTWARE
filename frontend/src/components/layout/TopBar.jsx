import { useSelector, useDispatch } from 'react-redux';
import { selectUser, logout } from '@/store/slices/authSlice';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Bell, Menu, LogOut, User, Sun, Moon, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { certificatesAPI } from '@/api/certificates';

const roleColors = {
  student: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  instructor: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  admin: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

export default function TopBar({ onMenuToggle }) {
  const user = useSelector(selectUser);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [dark, setDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.theme === 'dark' ||
        (!localStorage.theme && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  useEffect(() => {
    certificatesAPI.getUnreadCount()
      .then((res) => setUnreadCount(res.data.unread_count || 0))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add('dark');
      localStorage.theme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.theme = 'light';
    }
  }, [dark]);

  const initials = user
    ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || 'U'
    : 'U';

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const isStudent = user?.role === 'student';
  const profilePath = isStudent ? '/student/profile' : '/profile';
  const settingsPath = isStudent ? '/student/settings' : '/settings';

  return (
    <header className="sticky top-0 z-30 flex items-center h-16 px-4 bg-background/70 backdrop-blur-xl border-b border-border/50 lg:px-6">
      <button
        onClick={onMenuToggle}
        className="p-2 rounded-lg hover:bg-muted/80 transition-colors lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        <Badge className={roleColors[user?.role] || roleColors.student}>
          {user?.role || 'student'}
        </Badge>

        <button
          onClick={() => setDark(!dark)}
          className="p-2 rounded-lg hover:bg-muted/80 transition-colors"
          title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        <button
          onClick={() => navigate('/notifications')}
          className="relative p-2 rounded-lg hover:bg-muted/80 transition-colors"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger className="focus:outline-none">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{user?.first_name} {user?.last_name}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate(profilePath)}>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(settingsPath)}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
