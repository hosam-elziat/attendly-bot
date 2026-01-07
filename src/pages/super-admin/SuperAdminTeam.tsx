import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSuperAdmin } from '@/contexts/SuperAdminContext';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  UserCog, 
  Plus,
  Shield,
  Edit,
  Trash2,
  Loader2
} from 'lucide-react';

interface TeamMember {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  role: 'super_admin' | 'manager' | 'support' | 'viewer';
  permissions: {
    view_companies: boolean;
    manage_companies: boolean;
    view_employees: boolean;
    manage_subscriptions: boolean;
  };
  is_active: boolean;
  created_at: string;
}

const SuperAdminTeam = () => {
  const { isSuperAdmin, teamMember: currentUser } = useSuperAdmin();
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [newMember, setNewMember] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'viewer' as 'super_admin' | 'manager' | 'support' | 'viewer',
    permissions: {
      view_companies: true,
      manage_companies: false,
      view_employees: true,
      manage_subscriptions: false,
    },
  });

  const fetchTeam = async () => {
    try {
      const { data, error } = await supabase
        .from('saas_team')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped = (data || []).map(d => ({
        ...d,
        role: d.role as TeamMember['role'],
        permissions: d.permissions as TeamMember['permissions'],
      }));
      setTeam(mapped);
    } catch (error) {
      console.error('Error fetching team:', error);
      toast.error('فشل في تحميل فريق العمل');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  const handleAddMember = async () => {
    if (!isSuperAdmin) {
      toast.error('ليس لديك صلاحية لإضافة أعضاء');
      return;
    }

    if (!newMember.email || !newMember.password || !newMember.full_name) {
      toast.error('الرجاء ملء جميع الحقول المطلوبة');
      return;
    }

    setSubmitting(true);

    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newMember.email,
        password: newMember.password,
        options: {
          emailRedirectTo: `${window.location.origin}/super-admin`,
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('فشل في إنشاء الحساب');

      // Add to saas_team
      const { error: teamError } = await supabase
        .from('saas_team')
        .insert({
          user_id: authData.user.id,
          email: newMember.email,
          full_name: newMember.full_name,
          role: newMember.role,
          permissions: newMember.permissions,
          is_active: true,
        });

      if (teamError) throw teamError;

      toast.success('تم إضافة العضو بنجاح');
      setAddDialogOpen(false);
      setNewMember({
        email: '',
        password: '',
        full_name: '',
        role: 'viewer',
        permissions: {
          view_companies: true,
          manage_companies: false,
          view_employees: true,
          manage_subscriptions: false,
        },
      });
      fetchTeam();
    } catch (error: any) {
      console.error('Error adding member:', error);
      toast.error(error.message || 'فشل في إضافة العضو');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateMember = async () => {
    if (!isSuperAdmin || !editingMember) return;

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('saas_team')
        .update({
          role: editingMember.role,
          permissions: editingMember.permissions,
          is_active: editingMember.is_active,
        })
        .eq('id', editingMember.id);

      if (error) throw error;

      toast.success('تم تحديث العضو بنجاح');
      setEditDialogOpen(false);
      setEditingMember(null);
      fetchTeam();
    } catch (error) {
      console.error('Error updating member:', error);
      toast.error('فشل في تحديث العضو');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    if (!isSuperAdmin) return;

    if (!confirm('هل أنت متأكد من حذف هذا العضو؟')) return;

    try {
      const { error } = await supabase
        .from('saas_team')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      toast.success('تم حذف العضو');
      fetchTeam();
    } catch (error) {
      console.error('Error deleting member:', error);
      toast.error('فشل في حذف العضو');
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'super_admin':
        return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">مدير النظام</Badge>;
      case 'manager':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">مدير</Badge>;
      case 'support':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">دعم فني</Badge>;
      case 'viewer':
        return <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">مشاهد</Badge>;
      default:
        return <Badge>{role}</Badge>;
    }
  };

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">فريق العمل</h1>
            <p className="text-slate-400 mt-1">إدارة أعضاء فريق العمل والصلاحيات</p>
          </div>
          {isSuperAdmin && (
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  إضافة عضو
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-slate-800 text-white">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <UserCog className="w-5 h-5" />
                    إضافة عضو جديد
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>الاسم الكامل</Label>
                    <Input
                      value={newMember.full_name}
                      onChange={(e) => setNewMember({ ...newMember, full_name: e.target.value })}
                      className="bg-slate-800 border-slate-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>البريد الإلكتروني</Label>
                    <Input
                      type="email"
                      value={newMember.email}
                      onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                      className="bg-slate-800 border-slate-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>كلمة المرور</Label>
                    <Input
                      type="password"
                      value={newMember.password}
                      onChange={(e) => setNewMember({ ...newMember, password: e.target.value })}
                      className="bg-slate-800 border-slate-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>الدور</Label>
                    <Select
                      value={newMember.role}
                      onValueChange={(value: any) => setNewMember({ ...newMember, role: value })}
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-700">
                        <SelectItem value="super_admin" className="text-white">مدير النظام</SelectItem>
                        <SelectItem value="manager" className="text-white">مدير</SelectItem>
                        <SelectItem value="support" className="text-white">دعم فني</SelectItem>
                        <SelectItem value="viewer" className="text-white">مشاهد</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-3">
                    <Label>الصلاحيات</Label>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-300 text-sm">مشاهدة الشركات</span>
                        <Switch
                          checked={newMember.permissions.view_companies}
                          onCheckedChange={(checked) =>
                            setNewMember({
                              ...newMember,
                              permissions: { ...newMember.permissions, view_companies: checked },
                            })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-300 text-sm">إدارة الشركات</span>
                        <Switch
                          checked={newMember.permissions.manage_companies}
                          onCheckedChange={(checked) =>
                            setNewMember({
                              ...newMember,
                              permissions: { ...newMember.permissions, manage_companies: checked },
                            })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-300 text-sm">مشاهدة الموظفين</span>
                        <Switch
                          checked={newMember.permissions.view_employees}
                          onCheckedChange={(checked) =>
                            setNewMember({
                              ...newMember,
                              permissions: { ...newMember.permissions, view_employees: checked },
                            })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-300 text-sm">إدارة الاشتراكات</span>
                        <Switch
                          checked={newMember.permissions.manage_subscriptions}
                          onCheckedChange={(checked) =>
                            setNewMember({
                              ...newMember,
                              permissions: { ...newMember.permissions, manage_subscriptions: checked },
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                  <Button onClick={handleAddMember} disabled={submitting} className="w-full">
                    {submitting && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                    إضافة العضو
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Team Table */}
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-slate-800/50">
                  <TableHead className="text-slate-400">العضو</TableHead>
                  <TableHead className="text-slate-400">البريد الإلكتروني</TableHead>
                  <TableHead className="text-slate-400">الدور</TableHead>
                  <TableHead className="text-slate-400">الحالة</TableHead>
                  {isSuperAdmin && <TableHead className="text-slate-400">الإجراءات</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-slate-400 py-8">
                      جاري التحميل...
                    </TableCell>
                  </TableRow>
                ) : team.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-slate-400 py-8">
                      لا يوجد أعضاء في الفريق
                    </TableCell>
                  </TableRow>
                ) : (
                  team.map((member) => (
                    <TableRow key={member.id} className="border-slate-800 hover:bg-slate-800/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                            {member.role === 'super_admin' ? (
                              <Shield className="w-5 h-5 text-primary" />
                            ) : (
                              <span className="text-primary font-medium">
                                {member.full_name.charAt(0)}
                              </span>
                            )}
                          </div>
                          <span className="text-white font-medium">{member.full_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-300">{member.email}</TableCell>
                      <TableCell>{getRoleBadge(member.role)}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            member.is_active
                              ? 'bg-green-500/20 text-green-400 border-green-500/30'
                              : 'bg-slate-500/20 text-slate-400 border-slate-500/30'
                          }
                        >
                          {member.is_active ? 'نشط' : 'غير نشط'}
                        </Badge>
                      </TableCell>
                      {isSuperAdmin && (
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingMember(member);
                                setEditDialogOpen(true);
                              }}
                              className="text-slate-300 hover:text-white"
                              disabled={member.user_id === currentUser?.user_id}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteMember(member.id)}
                              className="text-red-400 hover:text-red-300"
                              disabled={member.user_id === currentUser?.user_id}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="bg-slate-900 border-slate-800 text-white">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="w-5 h-5" />
                تعديل العضو
              </DialogTitle>
            </DialogHeader>
            {editingMember && (
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>الدور</Label>
                  <Select
                    value={editingMember.role}
                    onValueChange={(value: any) =>
                      setEditingMember({ ...editingMember, role: value })
                    }
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700">
                      <SelectItem value="super_admin" className="text-white">مدير النظام</SelectItem>
                      <SelectItem value="manager" className="text-white">مدير</SelectItem>
                      <SelectItem value="support" className="text-white">دعم فني</SelectItem>
                      <SelectItem value="viewer" className="text-white">مشاهد</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <Label>الصلاحيات</Label>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300 text-sm">مشاهدة الشركات</span>
                      <Switch
                        checked={editingMember.permissions.view_companies}
                        onCheckedChange={(checked) =>
                          setEditingMember({
                            ...editingMember,
                            permissions: { ...editingMember.permissions, view_companies: checked },
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300 text-sm">إدارة الشركات</span>
                      <Switch
                        checked={editingMember.permissions.manage_companies}
                        onCheckedChange={(checked) =>
                          setEditingMember({
                            ...editingMember,
                            permissions: { ...editingMember.permissions, manage_companies: checked },
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300 text-sm">مشاهدة الموظفين</span>
                      <Switch
                        checked={editingMember.permissions.view_employees}
                        onCheckedChange={(checked) =>
                          setEditingMember({
                            ...editingMember,
                            permissions: { ...editingMember.permissions, view_employees: checked },
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300 text-sm">إدارة الاشتراكات</span>
                      <Switch
                        checked={editingMember.permissions.manage_subscriptions}
                        onCheckedChange={(checked) =>
                          setEditingMember({
                            ...editingMember,
                            permissions: { ...editingMember.permissions, manage_subscriptions: checked },
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">الحالة</span>
                  <Switch
                    checked={editingMember.is_active}
                    onCheckedChange={(checked) =>
                      setEditingMember({ ...editingMember, is_active: checked })
                    }
                  />
                </div>
                <Button onClick={handleUpdateMember} disabled={submitting} className="w-full">
                  {submitting && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                  حفظ التغييرات
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </SuperAdminLayout>
  );
};

export default SuperAdminTeam;
