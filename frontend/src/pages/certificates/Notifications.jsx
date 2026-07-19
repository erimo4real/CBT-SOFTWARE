import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { certificatesAPI } from '@/api/certificates';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import PageTransition from '@/components/PageTransition';
import { ListSkeleton } from '@/components/Skeletons';
import Pagination from '@/components/Pagination';
import { Bell, CheckCheck, Award, ClipboardList, BookOpen } from 'lucide-react';
import { formatDate } from '@/lib/format';
import { toast } from 'sonner';
import TableFilters from '@/components/TableFilters';

const typeIcons = {
  certificate: Award,
  exam: ClipboardList,
  course: BookOpen,
};

const PAGE_SIZE = 15;

export default function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const fetchNotifications = () => {
    certificatesAPI.getNotifications()
      .then((res) => setNotifications(Array.isArray(res.data) ? res.data : []))
      .catch(() => toast.error('Failed to load notifications'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchNotifications(); }, []);

  const markRead = async (id) => {
    try {
      await certificatesAPI.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch { /* silent */ }
  };

  const markAllRead = async () => {
    try {
      await certificatesAPI.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      toast.success('All marked as read');
    } catch {
      toast.error('Failed to mark as read');
    }
  };

  const handleClick = (notif) => {
    if (!notif.is_read) markRead(notif.id);
    if (notif.link) navigate(notif.link);
  };

  const filtered = useMemo(() => {
    if (!search) return notifications;
    const q = search.toLowerCase();
    return notifications.filter(n => n.title?.toLowerCase().includes(q) || n.message?.toLowerCase().includes(q));
  }, [notifications, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (loading) {
    return <ListSkeleton />;
  }

  return (
    <PageTransition>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground">{unreadCount} unread</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            <CheckCheck className="h-4 w-4 mr-1" />
            Mark all read
          </Button>
        )}
      </div>

      {notifications.length > 0 && (
        <TableFilters
          search={search}
          onSearch={setSearch}
          searchPlaceholder="Search notifications..."
        />
      )}

      {paged.length === 0 ? (
        <div className="text-center py-12">
          <Bell className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">{search ? 'No matching notifications' : 'No notifications'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {paged.map((notif) => {
            const Icon = typeIcons[notif.type] || Bell;
            return (
              <div
                key={notif.id}
                onClick={() => handleClick(notif)}
                className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors hover-lift ${
                  notif.is_read ? 'bg-background' : 'bg-accent/50 hover:bg-accent'
                } ${notif.link ? 'hover:shadow-sm' : ''}`}
              >
                <div className={`p-2 rounded-lg shrink-0 ${
                  notif.is_read ? 'bg-muted' : 'bg-primary/10'
                }`}>
                  <Icon className={`h-4 w-4 ${notif.is_read ? 'text-muted-foreground' : 'text-primary'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-medium ${!notif.is_read ? '' : 'text-muted-foreground'}`}>
                      {notif.title}
                    </p>
                    {!notif.is_read && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{notif.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">{formatDate(notif.created_at)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} totalItems={filtered.length} onPageChange={setPage} />
      </div>
    </PageTransition>
  );
}
