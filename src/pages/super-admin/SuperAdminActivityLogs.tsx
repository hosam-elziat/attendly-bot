import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { 
  History,
  Search,
  Filter,
  Download,
  RefreshCw,
  Eye,
  Building2,
  User,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

interface ActivityLog {
  id: string;
  admin_id: string;
  admin_email: string;
  admin_name: string;
  action: string;
  action_type: string;
  target_type: string;
  target_id: string | null;
  target_name: string | null;
  company_id: string | null;
  company_name: string | null;
  details: unknown;
  user_agent: string | null;
  created_at: string;
}

interface SystemActivity {
  id: string;
  event_type: string;
  event_category: string;
  title: string;
  description: string | null;
  company_id: string | null;
  company_name: string | null;
  user_email: string | null;
  severity: string;
  metadata: unknown;
  created_at: string;
}

const SuperAdminActivityLogs = () => {
  const [adminLogs, setAdminLogs] = useState<ActivityLog[]>([]);
  const [systemActivities, setSystemActivities] = useState<SystemActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionTypeFilter, setActionTypeFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'admin' | 'system'>('admin');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const [adminRes, systemRes] = await Promise.all([
        supabase
          .from('super_admin_activity_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(500),
        supabase
          .from('system_activity_feed')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(500),
      ]);

      if (adminRes.error) throw adminRes.error;
      if (systemRes.error) throw systemRes.error;

      setAdminLogs(adminRes.data || []);
      setSystemActivities(systemRes.data || []);
    } catch (error) {
      console.error('Error fetching logs:', error);
      toast.error('فشل في تحميل السجلات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const getActionTypeBadge = (actionType: string) => {
    const colors: Record<string, string> = {
      view: 'bg-blue-500/20 text-blue-400',
      create: 'bg-green-500/20 text-green-400',
      update: 'bg-amber-500/20 text-amber-400',
      delete: 'bg-red-500/20 text-red-400',
      suspend: 'bg-orange-500/20 text-orange-400',
      activate: 'bg-emerald-500/20 text-emerald-400',
      password_reset: 'bg-purple-500/20 text-purple-400',
      subscription_change: 'bg-cyan-500/20 text-cyan-400',
    };
    return colors[actionType] || 'bg-slate-500/20 text-slate-400';
  };

  const getSeverityBadge = (severity: string) => {
    const colors: Record<string, string> = {
      error: 'bg-red-500/20 text-red-400',
      warning: 'bg-amber-500/20 text-amber-400',
      success: 'bg-green-500/20 text-green-400',
      info: 'bg-blue-500/20 text-blue-400',
    };
    return colors[severity] || 'bg-slate-500/20 text-slate-400';
  };

  const filteredAdminLogs = adminLogs.filter(log => {
    const matchesSearch = 
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.admin_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.target_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = actionTypeFilter === 'all' || log.action_type === actionTypeFilter;
    
    return matchesSearch && matchesType;
  });

  const filteredSystemActivities = systemActivities.filter(activity => {
    const matchesSearch = 
      activity.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      activity.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      activity.user_email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  });

  const exportLogs = () => {
    const data = activeTab === 'admin' ? filteredAdminLogs : filteredSystemActivities;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${activeTab}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('تم تصدير السجلات');
  };

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">سجلات النشاط</h1>
            <p className="text-slate-400 mt-1">تتبع جميع الأنشطة في النظام</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportLogs}
              className="gap-2 border-slate-700 text-slate-300"
            >
              <Download className="w-4 h-4" />
              تصدير
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchLogs}
              className="gap-2 border-slate-700 text-slate-300"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              تحديث
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <Button
            variant={activeTab === 'admin' ? 'default' : 'outline'}
            onClick={() => setActiveTab('admin')}
            className="gap-2"
          >
            <User className="w-4 h-4" />
            سجلات الإداريين
          </Button>
          <Button
            variant={activeTab === 'system' ? 'default' : 'outline'}
            onClick={() => setActiveTab('system')}
            className="gap-2"
          >
            <History className="w-4 h-4" />
            أحداث النظام
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="البحث..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10 bg-slate-900 border-slate-700 text-white"
            />
          </div>
          {activeTab === 'admin' && (
            <Select value={actionTypeFilter} onValueChange={setActionTypeFilter}>
              <SelectTrigger className="w-48 bg-slate-900 border-slate-700 text-white">
                <Filter className="w-4 h-4 me-2" />
                <SelectValue placeholder="نوع الإجراء" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700">
                <SelectItem value="all" className="text-white">الكل</SelectItem>
                <SelectItem value="view" className="text-white">عرض</SelectItem>
                <SelectItem value="create" className="text-white">إنشاء</SelectItem>
                <SelectItem value="update" className="text-white">تحديث</SelectItem>
                <SelectItem value="delete" className="text-white">حذف</SelectItem>
                <SelectItem value="suspend" className="text-white">إيقاف</SelectItem>
                <SelectItem value="activate" className="text-white">تفعيل</SelectItem>
                <SelectItem value="password_reset" className="text-white">إعادة كلمة المرور</SelectItem>
                <SelectItem value="subscription_change" className="text-white">تغيير اشتراك</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Logs Table */}
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              {activeTab === 'admin' ? (
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-800">
                      <TableHead className="text-slate-400">الإداري</TableHead>
                      <TableHead className="text-slate-400">الإجراء</TableHead>
                      <TableHead className="text-slate-400">النوع</TableHead>
                      <TableHead className="text-slate-400">الهدف</TableHead>
                      <TableHead className="text-slate-400">الشركة</TableHead>
                      <TableHead className="text-slate-400">التاريخ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                          جاري التحميل...
                        </TableCell>
                      </TableRow>
                    ) : filteredAdminLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                          لا توجد سجلات
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAdminLogs.map((log) => (
                        <TableRow key={log.id} className="border-slate-800">
                          <TableCell>
                            <div>
                              <p className="text-white text-sm">{log.admin_name}</p>
                              <p className="text-slate-500 text-xs">{log.admin_email}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-300 text-sm max-w-[200px] truncate">
                            {log.action}
                          </TableCell>
                          <TableCell>
                            <Badge className={getActionTypeBadge(log.action_type)}>
                              {log.action_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-300 text-sm">
                            {log.target_name || log.target_id || '-'}
                          </TableCell>
                          <TableCell className="text-slate-300 text-sm">
                            {log.company_name || '-'}
                          </TableCell>
                          <TableCell className="text-slate-400 text-xs">
                            {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: ar })}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-800">
                      <TableHead className="text-slate-400">الحدث</TableHead>
                      <TableHead className="text-slate-400">الفئة</TableHead>
                      <TableHead className="text-slate-400">الشدة</TableHead>
                      <TableHead className="text-slate-400">الشركة</TableHead>
                      <TableHead className="text-slate-400">المستخدم</TableHead>
                      <TableHead className="text-slate-400">التاريخ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                          جاري التحميل...
                        </TableCell>
                      </TableRow>
                    ) : filteredSystemActivities.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                          لا توجد أحداث
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSystemActivities.map((activity) => (
                        <TableRow key={activity.id} className="border-slate-800">
                          <TableCell>
                            <div>
                              <p className="text-white text-sm">{activity.title}</p>
                              {activity.description && (
                                <p className="text-slate-500 text-xs truncate max-w-[200px]">{activity.description}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-slate-700 text-slate-300">
                              {activity.event_category}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={getSeverityBadge(activity.severity)}>
                              {activity.severity}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-300 text-sm">
                            {activity.company_name || '-'}
                          </TableCell>
                          <TableCell className="text-slate-300 text-sm">
                            {activity.user_email || '-'}
                          </TableCell>
                          <TableCell className="text-slate-400 text-xs">
                            {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true, locale: ar })}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </SuperAdminLayout>
  );
};

export default SuperAdminActivityLogs;
