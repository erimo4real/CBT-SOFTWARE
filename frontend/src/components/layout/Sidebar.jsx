import { useSelector } from 'react-redux';
import { selectUser } from '@/store/slices/authSlice';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  ClipboardList,
  BarChart3,
  FileText,
  HelpCircle,
  FolderOpen,
  Users,
  Settings,
  Award,
  Key,
  GraduationCap,
  Sparkles,
  Trophy,
  User,
  Layers,
} from 'lucide-react';

const studentNav = [
  { to: '/student/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/student/exams', label: 'Exams', icon: ClipboardList },
  { to: '/student/leaderboard', label: 'Leaderboard', icon: Trophy },
  { to: '/student/certificates', label: 'Certificates', icon: Award },
];

const studentAiNav = [
  { to: '/ai/tutor', label: 'AI Tutor', icon: Sparkles },
  { to: '/ai/quiz', label: 'AI Quiz', icon: HelpCircle },
  { to: '/ai/study-plan', label: 'Study Planner', icon: FileText },
  { to: '/ai/weakness', label: 'Weakness Analysis', icon: BarChart3 },
];

const staffNav = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/exams', label: 'Exams', icon: ClipboardList },
  { to: '/certificates', label: 'Certificates', icon: Award },
];

const staffAiNav = [
  { to: '/ai/tutor', label: 'AI Tutor', icon: Sparkles },
  { to: '/ai/questions', label: 'Question Generator', icon: HelpCircle },
];

const instructorNav = [
  { to: '/staff/students', label: 'Students', icon: Users },
  { to: '/staff/exam-pins', label: 'Exam PINs', icon: Key },
  { to: '/admin/categories', label: 'Subjects', icon: FolderOpen },
  { to: '/instructor/courses', label: 'Topics', icon: FileText },
  { to: '/instructor/questions', label: 'Question Bank', icon: HelpCircle },
  { to: '/instructor/exams', label: 'Exam Builder', icon: ClipboardList },
  { to: '/instructor/analytics', label: 'Item Analysis', icon: BarChart3 },
];

const adminNav = [
  { to: '/staff/students', label: 'Students', icon: Users },
  { to: '/staff/exam-pins', label: 'Exam PINs', icon: Key },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/class-levels', label: 'Class Levels', icon: Layers },
  { to: '/admin/categories', label: 'Subjects', icon: FolderOpen },
  { to: '/instructor/courses', label: 'Topics', icon: FileText },
  { to: '/instructor/questions', label: 'Question Bank', icon: HelpCircle },
  { to: '/instructor/exams', label: 'Exam Builder', icon: ClipboardList },
  { to: '/instructor/analytics', label: 'Item Analysis', icon: BarChart3 },
];

export default function Sidebar({ isOpen, onClose }) {
  const user = useSelector(selectUser);

  const isStudent = user?.role === 'student';
  const isInstructor = user?.role === 'instructor';
  const isAdmin = user?.role === 'admin';

  const sections = [];

  if (isStudent) {
    sections.push({ label: null, items: studentNav });
    sections.push({ label: 'AI Tools', items: studentAiNav });
  } else {
    sections.push({ label: null, items: staffNav });
    sections.push({ label: 'AI Tools', items: staffAiNav });
    if (isAdmin) {
      sections.push({ label: 'Management', items: adminNav });
    } else if (isInstructor) {
      sections.push({ label: 'Management', items: instructorNav });
    }
  }

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-64 bg-sidebar border-r border-sidebar-border transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:z-auto',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center gap-3 px-5 h-16 border-b border-sidebar-border bg-gradient-to-r from-primary/5 to-transparent">
          <div className="p-2 rounded-xl bg-primary/10 shadow-sm">
            <GraduationCap className="h-6 w-6 text-primary" />
          </div>
          <div>
            <span className="text-lg font-bold text-sidebar-foreground tracking-tight">CBT</span>
            <p className="text-[10px] text-muted-foreground font-medium -mt-0.5">
              {isStudent ? 'Student Portal' : 'Staff Panel'}
            </p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
          {sections.map((section, si) => (
            <div key={si}>
              {section.label && (
                <p className="px-3 mb-2 text-[10px] font-bold text-muted-foreground/50 uppercase tracking-[0.15em]">
                  {section.label}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onClose}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                        isActive
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm ring-1 ring-sidebar-border'
                          : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground'
                      )
                    }
                  >
                    <item.icon className="h-[18px] w-[18px] shrink-0" />
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-sidebar-border space-y-0.5">
          <NavLink
            to={isStudent ? '/student/profile' : '/profile'}
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm ring-1 ring-sidebar-border'
                  : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground'
              )
            }
          >
            <User className="h-[18px] w-[18px] shrink-0" />
            Profile
          </NavLink>
          <NavLink
            to={isStudent ? '/student/settings' : '/settings'}
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm ring-1 ring-sidebar-border'
                  : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground'
              )
            }
          >
            <Settings className="h-[18px] w-[18px] shrink-0" />
            Settings
          </NavLink>
        </div>
      </aside>
    </>
  );
}
