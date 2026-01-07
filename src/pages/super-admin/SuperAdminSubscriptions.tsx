import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSuperAdmin } from '@/contexts/SuperAdminContext';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  CreditCard, 
  Building2,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle
} from 'lucide-react';

interface Subscription {
  id: string;
  company_id: string;
  company_name?: string;
  status: string;
  plan_name: string;
  current_period_start: string;
  current_period_end: string;
  created_at: string;
}

const SuperAdminSubscriptions = () => {
  const { isSuperAdmin } = useSuperAdmin();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const fetchSubscriptions = async () => {
    try {
      const [subsRes, companiesRes] = await Promise.all([
        supabase
          .from('subscriptions')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('companies')
          .select('id, name'),
      ]);

      if (subsRes.error) throw subsRes.error;
      if (companiesRes.error) throw companiesRes.error;

      const enrichedSubs = (subsRes.data || []).map(sub => ({
        ...sub,
        company_name: (companiesRes.data || []).find(c => c.id === sub.company_id)?.name || 'غير معروف',
      }));

      setSubscriptions(enrichedSubs);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      toast.error('فشل في تحميل الاشتراكات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const updateSubscriptionStatus = async (subscriptionId: string, newStatus: 'active' | 'trial' | 'inactive' | 'cancelled') => {
    if (!isSuperAdmin) {
      toast.error('ليس لديك صلاحية لتنفيذ هذا الإجراء');
      return;
    }

    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ status: newStatus })
        .eq('id', subscriptionId);

      if (error) throw error;

      toast.success('تم تحديث حالة الاشتراك');
      fetchSubscriptions();
    } catch (error) {
      console.error('Error updating subscription:', error);
      toast.error('فشل في تحديث الاشتراك');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">نشط</Badge>;
      case 'trial':
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">تجريبي</Badge>;
      case 'suspended':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">موقوف</Badge>;
      case 'expired':
        return <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">منتهي</Badge>;
      case 'cancelled':
        return <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">ملغي</Badge>;
      default:
        return <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'trial':
        return <Clock className="w-5 h-5 text-amber-400" />;
      case 'suspended':
        return <AlertTriangle className="w-5 h-5 text-red-400" />;
      default:
        return <XCircle className="w-5 h-5 text-slate-400" />;
    }
  };

  const filteredSubscriptions = subscriptions.filter(sub =>
    statusFilter === 'all' || sub.status === statusFilter
  );

  const stats = {
    total: subscriptions.length,
    active: subscriptions.filter(s => s.status === 'active').length,
    trial: subscriptions.filter(s => s.status === 'trial').length,
    suspended: subscriptions.filter(s => s.status === 'suspended').length,
    expired: subscriptions.filter(s => s.status === 'expired' || s.status === 'cancelled').length,
  };

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">الاشتراكات</h1>
          <p className="text-slate-400 mt-1">إدارة اشتراكات الشركات</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-white">{stats.total}</p>
              <p className="text-slate-400 text-sm">الإجمالي</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-400">{stats.active}</p>
              <p className="text-slate-400 text-sm">نشط</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-amber-400">{stats.trial}</p>
              <p className="text-slate-400 text-sm">تجريبي</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-red-400">{stats.suspended}</p>
              <p className="text-slate-400 text-sm">موقوف</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-slate-400">{stats.expired}</p>
              <p className="text-slate-400 text-sm">منتهي</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter */}
        <div className="flex justify-end">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48 bg-slate-900 border-slate-700 text-white">
              <SelectValue placeholder="جميع الحالات" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-700">
              <SelectItem value="all" className="text-white">جميع الحالات</SelectItem>
              <SelectItem value="active" className="text-white">نشط</SelectItem>
              <SelectItem value="trial" className="text-white">تجريبي</SelectItem>
              <SelectItem value="suspended" className="text-white">موقوف</SelectItem>
              <SelectItem value="expired" className="text-white">منتهي</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-slate-800/50">
                  <TableHead className="text-slate-400">الشركة</TableHead>
                  <TableHead className="text-slate-400">الخطة</TableHead>
                  <TableHead className="text-slate-400">الحالة</TableHead>
                  <TableHead className="text-slate-400">بداية الفترة</TableHead>
                  <TableHead className="text-slate-400">نهاية الفترة</TableHead>
                  {isSuperAdmin && <TableHead className="text-slate-400">الإجراءات</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-slate-400 py-8">
                      جاري التحميل...
                    </TableCell>
                  </TableRow>
                ) : filteredSubscriptions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-slate-400 py-8">
                      لا توجد اشتراكات
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSubscriptions.map((sub) => (
                    <TableRow key={sub.id} className="border-slate-800 hover:bg-slate-800/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-primary" />
                          </div>
                          <span className="text-white font-medium">{sub.company_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-300">{sub.plan_name}</TableCell>
                      <TableCell>{getStatusBadge(sub.status)}</TableCell>
                      <TableCell className="text-slate-300">
                        {new Date(sub.current_period_start).toLocaleDateString('ar-SA')}
                      </TableCell>
                      <TableCell className="text-slate-300">
                        {new Date(sub.current_period_end).toLocaleDateString('ar-SA')}
                      </TableCell>
                      {isSuperAdmin && (
                        <TableCell>
                          <Select
                            value={sub.status}
                            onValueChange={(value: 'active' | 'trial' | 'inactive' | 'cancelled') => updateSubscriptionStatus(sub.id, value)}
                          >
                            <SelectTrigger className="w-32 bg-slate-800 border-slate-700 text-white h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-700">
                              <SelectItem value="active" className="text-white">تفعيل</SelectItem>
                              <SelectItem value="trial" className="text-white">تجريبي</SelectItem>
                              <SelectItem value="suspended" className="text-white">إيقاف</SelectItem>
                              <SelectItem value="expired" className="text-white">منتهي</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </SuperAdminLayout>
  );
};

export default SuperAdminSubscriptions;
