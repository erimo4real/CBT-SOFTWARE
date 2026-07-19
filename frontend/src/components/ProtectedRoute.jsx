import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';
import { selectIsAuthenticated, selectUser, selectAuthLoading } from '@/store/slices/authSlice';
import { GraduationCap } from 'lucide-react';

function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-screen gap-3">
      <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center animate-pulse">
        <GraduationCap className="h-6 w-6 text-primary-foreground" />
      </div>
      <p className="text-sm text-muted-foreground animate-pulse">Loading...</p>
    </div>
  );
}

export function ProtectedRoute({ children, roles = [] }) {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const user = useSelector(selectUser);
  const loading = useSelector(selectAuthLoading);
  const location = useLocation();

  if (loading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (roles.length > 0 && !roles.includes(user?.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

export function StudentRoute({ children }) {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const user = useSelector(selectUser);
  const loading = useSelector(selectAuthLoading);
  const location = useLocation();

  if (loading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/student/login" state={{ from: location.pathname }} replace />;
  if (user?.role !== 'student') return <Navigate to="/login" replace />;
  return children;
}

export function GuestRoute({ children }) {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const loading = useSelector(selectAuthLoading);

  if (loading) return <LoadingScreen />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return children;
}
