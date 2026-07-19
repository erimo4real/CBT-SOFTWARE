import { useState, useEffect } from 'react';
import { adminUsersAPI } from '../../api/auth';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../../components/ui/dialog';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '../../components/ui/select';
import { Switch } from '../../components/ui/switch';
import PageTransition from '../../components/PageTransition';
import { StatsSkeleton, ListSkeleton } from '../../components/Skeletons';
import { toast } from 'sonner';
import {
  Search, Users, Shield, GraduationCap, BookOpen, CheckCircle, XCircle,
} from 'lucide-react';
import usePagination from '@/hooks/usePagination';
import Pagination from '@/components/Pagination';
import TableFilters from '@/components/TableFilters';

const roleColors = {
  student: 'bg-blue-100 text-blue-700',
  instructor: 'bg-purple-100 text-purple-700',
  admin: 'bg-amber-100 text-amber-700',
};
const roleIcons = {
  student: GraduationCap,
  instructor: BookOpen,
  admin: Shield,
};

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState(null);
  const [saving, setSaving] = useState(false);

  const { page, search, filters, params, setPage, setSearch, setFilter, clearFilters, totalPages } = usePagination();

  useEffect(() => { loadUsers(); }, [page, search, filters]);

  async function loadUsers() {
    setLoading(true);
    try {
      const res = await adminUsersAPI.list(params);
      setUsers(res.data.results || []);
      setCount(res.data.count || 0);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  function openEdit(user) {
    setEditUser({ ...user });
  }

  async function saveUser() {
    setSaving(true);
    try {
      await adminUsersAPI.update(editUser.id, {
        role: editUser.role,
        is_active: editUser.is_active,
      });
      toast.success('User updated');
      setEditUser(null);
      loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  }

  const stats = {
    total: count,
    students: users.filter(u => u.role === 'student').length,
    instructors: users.filter(u => u.role === 'instructor').length,
    admins: users.filter(u => u.role === 'admin').length,
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground">Manage platform users, roles, and access</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <GraduationCap className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{stats.students}</p>
                <p className="text-xs text-muted-foreground">Students</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <BookOpen className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{stats.instructors}</p>
                <p className="text-xs text-muted-foreground">Instructors</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-amber-500" />
              <div>
                <p className="text-2xl font-bold">{stats.admins}</p>
                <p className="text-xs text-muted-foreground">Admins</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filters */}
      <TableFilters
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search by name or email..."
        filters={[
          {
            key: 'role',
            label: 'All roles',
            options: [
              { value: 'student', label: 'Student' },
              { value: 'instructor', label: 'Instructor' },
              { value: 'admin', label: 'Admin' },
            ],
          },
          {
            key: 'is_active',
            label: 'All status',
            options: [
              { value: 'true', label: 'Active' },
              { value: 'false', label: 'Inactive' },
            ],
          },
        ]}
        values={filters}
        onFilter={setFilter}
        onClear={clearFilters}
      />

      {/* Users Table */}
      {loading ? (
        <div className="space-y-4">
          <StatsSkeleton />
          <ListSkeleton />
        </div>
      ) : users.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center py-12">
          <Users className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium">No users found</p>
        </CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto table-responsive">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-4 py-3 font-medium">User</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Verified</th>
                    <th className="px-4 py-3 font-medium">Joined</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => {
                    const RoleIcon = roleIcons[user.role] || Users;
                    return (
                      <tr key={user.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium">{user.full_name}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={`text-xs ${roleColors[user.role] || ''}`}>
                            <RoleIcon className="h-3 w-3 mr-1" />
                            {user.role}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={user.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
                            {user.is_active ? <><CheckCircle className="h-3 w-3 mr-1" />Active</> : <><XCircle className="h-3 w-3 mr-1" />Inactive</>}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={user.email_verified ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}>
                            {user.email_verified ? 'Verified' : 'Unverified'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(user)}>Edit</Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Pagination page={page} totalPages={totalPages(count)} totalItems={count} onPageChange={setPage} />

      {/* Edit User Dialog */}
      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          {editUser && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium">{editUser.full_name}</p>
                <p className="text-xs text-muted-foreground">{editUser.email}</p>
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={editUser.role} onValueChange={v => setEditUser({ ...editUser, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="instructor">Instructor</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={editUser.is_active} onCheckedChange={v => setEditUser({ ...editUser, is_active: v })} />
                <Label>{editUser.is_active ? 'Active' : 'Inactive'}</Label>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditUser(null)}>Cancel</Button>
                <Button onClick={saveUser} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </PageTransition>
  );
}
