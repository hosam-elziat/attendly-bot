import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useSuperAdmin } from '@/contexts/SuperAdminContext';
import { useSuperAdminActivityLog } from '@/hooks/useSuperAdminActivityLog';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import CompanyActionsMenu from '@/components/super-admin/CompanyActionsMenu';
import CompanyAccountControls from '@/components/super-admin/CompanyAccountControls';
import TelegramBotDetails from '@/components/super-admin/TelegramBotDetails';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Building2, 
  Users, 
  Search,
  Eye,
  Mail,
  Calendar,
  Clock,
  CreditCard,
  Bot,
  Settings,
  UserCheck,
  RefreshCw,
  Phone,
  Globe,
  Filter,
  Trash2,
  Ban,
  CheckCircle
} from 'lucide-react';

interface Company {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  telegram_bot_connected: boolean;
  telegram_bot_username: string | null;
  work_start_time: string;
  work_end_time: string;
  country_code: string;
  timezone: string;
  default_currency: string;
  phone: string | null;
  is_suspended: boolean;
  is_deleted: boolean;
  suspended_reason: string | null;
  last_activity_at: string | null;
  employee_count?: number;
  owner_email?: string;
  subscription_status?: string;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  name_ar: string | null;
  max_employees: number | null;
  price_monthly: number;
  currency: string;
}

interface LoginAttempt {
  id: string;
  email: string;
  success: boolean;
  ip_address: string | null;
  user_agent: string | null;
  failure_reason: string | null;
  created_at: string;
}

interface CompanyDetails {
  company: Company;
  employees: Array<{
    id: string;
    full_name: string;
    email: string;
    department: string | null;
    is_active: boolean;
    base_salary: number;
    salary_type: string;
    telegram_chat_id: string | null;
  }>;
  subscription: {
    id: string;
    status: string;
    plan_name: string;
    plan_id: string | null;
    billing_cycle: string;
    max_employees: number;
    current_period_start: string;
    current_period_end: string;
  } | null;
  attendanceToday: {
    present: number;
    absent: number;
    late: number;
  };
  plans: SubscriptionPlan[];
  loginAttempts: LoginAttempt[];
}

type StatusFilter = 'all' | 'active' | 'suspended' | 'deleted' | 'trial' | 'expired';

const SuperAdminCompanies = () => {
  const { isSuperAdmin } = useSuperAdmin();
  const { logActivity } = useSuperAdminActivityLog();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [showDeleted, setShowDeleted] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<CompanyDetails | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [updating, setUpdating] = useState(false);

  const fetchCompanies = async () => {
    try {
      let query = supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      // Filter by deleted status
      if (!showDeleted) {
        query = query.or('is_deleted.is.null,is_deleted.eq.false');
      }

      const { data: companiesData, error: companiesError } = await query;

      if (companiesError) throw companiesError;

      // Fetch employee counts
      const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('company_id');

      if (empError) throw empError;

      // Fetch profiles for owner emails
      const { data: profiles, error: profError } = await supabase
        .from('profiles')
        .select('user_id, email');

      if (profError) throw profError;

      // Fetch subscriptions
      const { data: subscriptions, error: subError } = await supabase
        .from('subscriptions')
        .select('company_id, status');

      if (subError) throw subError;

      const enrichedCompanies = (companiesData || []).map(company => ({
        ...company,
        is_suspended: company.is_suspended || false,
        is_deleted: company.is_deleted || false,
        employee_count: (employees || []).filter(e => e.company_id === company.id).length,
        owner_email: (profiles || []).find(p => p.user_id === company.owner_id)?.email || 'غير معروف',
        subscription_status: (subscriptions || []).find(s => s.company_id === company.id)?.status || 'none',
      }));

      setCompanies(enrichedCompanies);
    } catch (error) {
      console.error('Error fetching companies:', error);
      toast.error('فشل في تحميل الشركات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, [showDeleted]);

  const viewCompanyDetails = async (company: Company) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const [employeesRes, subscriptionRes, attendanceRes, plansRes, loginAttemptsRes] = await Promise.all([
        supabase
          .from('employees')
          .select('id, full_name, email, department, is_active, base_salary, salary_type, telegram_chat_id')
          .eq('company_id', company.id),
        supabase
          .from('subscriptions')
          .select('id, status, plan_name, plan_id, billing_cycle, max_employees, current_period_start, current_period_end')
          .eq('company_id', company.id)
          .maybeSingle(),
        supabase
          .from('attendance_logs')
          .select('status')
          .eq('company_id', company.id)
          .eq('date', today),
        supabase
          .from('subscription_plans')
          .select('id, name, name_ar, max_employees, price_monthly, currency')
          .eq('is_active', true),
        supabase
          .from('login_attempts')
          .select('*')
          .eq('email', company.owner_email || '')
          .order('created_at', { ascending: false })
          .limit(20),
      ]);

      const employees = employeesRes.data || [];
      const attendance = attendanceRes.data || [];
      
      const presentCount = attendance.filter(a => a.status === 'checked_in' || a.status === 'checked_out').length;

      await logActivity({
        action: `عرض تفاصيل الشركة: ${company.name}`,
        actionType: 'view',
        targetType: 'company',
        targetId: company.id,
        targetName: company.name,
        companyId: company.id,
        companyName: company.name,
      });

      setSelectedCompany({
        company,
        employees,
        subscription: subscriptionRes.data,
        attendanceToday: {
          present: presentCount,
          absent: employees.filter(e => e.is_active).length - presentCount,
          late: 0,
        },
        plans: plansRes.data || [],
        loginAttempts: loginAttemptsRes.data || [],
      });
      setDetailsOpen(true);
    } catch (error) {
      console.error('Error fetching company details:', error);
      toast.error('فشل في تحميل تفاصيل الشركة');
    }
  };

  const updateSubscription = async (updates: {
    status?: 'active' | 'trial' | 'inactive' | 'cancelled';
    plan_id?: string;
    billing_cycle?: string;
    max_employees?: number;
    current_period_end?: string;
  }) => {
    if (!isSuperAdmin || !selectedCompany?.subscription) return;

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update(updates)
        .eq('id', selectedCompany.subscription.id);

      if (error) throw error;

      await logActivity({
        action: `تحديث اشتراك الشركة: ${selectedCompany.company.name}`,
        actionType: 'subscription_change',
        targetType: 'subscription',
        targetId: selectedCompany.subscription.id,
        targetName: selectedCompany.company.name,
        companyId: selectedCompany.company.id,
        companyName: selectedCompany.company.name,
        details: updates,
      });

      toast.success('تم تحديث الاشتراك');
      
      await viewCompanyDetails(selectedCompany.company);
      fetchCompanies();
    } catch (error) {
      console.error('Error updating subscription:', error);
      toast.error('فشل في تحديث الاشتراك');
    } finally {
      setUpdating(false);
    }
  };

  const renewSubscription = async (months: number) => {
    if (!selectedCompany?.subscription) return;

    const currentEnd = new Date(selectedCompany.subscription.current_period_end);
    const newEnd = new Date(currentEnd);
    newEnd.setMonth(newEnd.getMonth() + months);

    await updateSubscription({
      status: 'active',
      current_period_end: newEnd.toISOString(),
    });
  };

  const getStatusBadge = (company: Company) => {
    if (company.is_deleted) {
      return <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">محذوف</Badge>;
    }
    if (company.is_suspended) {
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">موقوف</Badge>;
    }
    switch (company.subscription_status) {
      case 'active':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">نشط</Badge>;
      case 'trial':
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">تجريبي</Badge>;
      case 'expired':
      case 'cancelled':
      case 'inactive':
        return <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">منتهي</Badge>;
      default:
        return <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">غير محدد</Badge>;
    }
  };

  const filteredCompanies = companies.filter(company => {
    const matchesSearch = 
      company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      company.owner_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      company.id.toLowerCase().includes(searchQuery.toLowerCase());

    // Status filter
    if (statusFilter === 'all') return matchesSearch;
    if (statusFilter === 'deleted') return matchesSearch && company.is_deleted;
    if (statusFilter === 'suspended') return matchesSearch && company.is_suspended && !company.is_deleted;
    if (statusFilter === 'active') return matchesSearch && !company.is_suspended && !company.is_deleted && company.subscription_status === 'active';
    if (statusFilter === 'trial') return matchesSearch && !company.is_suspended && !company.is_deleted && company.subscription_status === 'trial';
    if (statusFilter === 'expired') return matchesSearch && !company.is_suspended && !company.is_deleted && (company.subscription_status === 'expired' || company.subscription_status === 'cancelled' || company.subscription_status === 'inactive');
    
    return matchesSearch;
  });

  // Stats
  const stats = {
    total: companies.length,
    active: companies.filter(c => !c.is_suspended && !c.is_deleted && c.subscription_status === 'active').length,
    suspended: companies.filter(c => c.is_suspended && !c.is_deleted).length,
    trial: companies.filter(c => !c.is_suspended && !c.is_deleted && c.subscription_status === 'trial').length,
    expired: companies.filter(c => !c.is_suspended && !c.is_deleted && ['expired', 'cancelled', 'inactive'].includes(c.subscription_status || '')).length,
    deleted: companies.filter(c => c.is_deleted).length,
  };

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">إدارة الشركات</h1>
            <p className="text-slate-400 mt-1">إدارة جميع الشركات في النظام</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="البحث عن شركة أو ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10 w-full sm:w-64 bg-slate-900 border-slate-700 text-white"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="w-full sm:w-40 bg-slate-900 border-slate-700 text-white">
                <Filter className="w-4 h-4 me-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700">
                <SelectItem value="all" className="text-white">الكل</SelectItem>
                <SelectItem value="active" className="text-white">نشط</SelectItem>
                <SelectItem value="trial" className="text-white">تجريبي</SelectItem>
                <SelectItem value="suspended" className="text-white">موقوف</SelectItem>
                <SelectItem value="expired" className="text-white">منتهي</SelectItem>
                <SelectItem value="deleted" className="text-white">محذوف</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
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
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-slate-500">{stats.deleted}</p>
              <p className="text-slate-400 text-sm">محذوف</p>
            </CardContent>
          </Card>
        </div>

        {/* Show Deleted Toggle */}
        <div className="flex items-center gap-3">
          <Switch
            checked={showDeleted}
            onCheckedChange={setShowDeleted}
            className="data-[state=checked]:bg-primary"
          />
          <Label className="text-slate-300">إظهار الشركات المحذوفة</Label>
        </div>

        {/* Companies Table */}
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-slate-800/50">
                  <TableHead className="text-slate-400">ID</TableHead>
                  <TableHead className="text-slate-400">الشركة</TableHead>
                  <TableHead className="text-slate-400">البريد / الهاتف</TableHead>
                  <TableHead className="text-slate-400">الموظفين</TableHead>
                  <TableHead className="text-slate-400">الحالة</TableHead>
                  <TableHead className="text-slate-400">البوت</TableHead>
                  <TableHead className="text-slate-400">آخر نشاط</TableHead>
                  <TableHead className="text-slate-400">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-slate-400 py-8">
                      جاري التحميل...
                    </TableCell>
                  </TableRow>
                ) : filteredCompanies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-slate-400 py-8">
                      لا توجد شركات
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCompanies.map((company) => (
                    <TableRow 
                      key={company.id} 
                      className={`border-slate-800 hover:bg-slate-800/50 ${
                        company.is_deleted ? 'opacity-60' : company.is_suspended ? 'bg-red-950/20' : ''
                      }`}
                    >
                      <TableCell className="text-slate-500 font-mono text-xs">
                        {company.id.slice(0, 8)}...
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            company.is_deleted ? 'bg-slate-500/20' : 
                            company.is_suspended ? 'bg-red-500/20' : 'bg-primary/20'
                          }`}>
                            <Building2 className={`w-5 h-5 ${
                              company.is_deleted ? 'text-slate-500' :
                              company.is_suspended ? 'text-red-400' : 'text-primary'
                            }`} />
                          </div>
                          <div>
                            <span className="text-white font-medium block">{company.name}</span>
                            <span className="text-slate-500 text-xs">
                              {new Date(company.created_at).toLocaleDateString('ar-SA')}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-slate-300 text-sm">
                            <Mail className="w-3 h-3" />
                            {company.owner_email}
                          </div>
                          {company.phone && (
                            <div className="flex items-center gap-1 text-slate-400 text-xs">
                              <Phone className="w-3 h-3" />
                              {company.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-slate-300">
                          <Users className="w-4 h-4" />
                          {company.employee_count}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(company)}</TableCell>
                      <TableCell>
                        {company.telegram_bot_connected ? (
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                            <Bot className="w-3 h-3 me-1" /> متصل
                          </Badge>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-400 text-sm">
                        {company.last_activity_at 
                          ? new Date(company.last_activity_at).toLocaleDateString('ar-SA')
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        <CompanyActionsMenu
                          company={company}
                          onViewDetails={() => viewCompanyDetails(company)}
                          onRefresh={fetchCompanies}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Company Details Dialog */}
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-xl">
                <Building2 className="w-6 h-6 text-primary" />
                {selectedCompany?.company.name}
                {selectedCompany?.company.is_suspended && (
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30">موقوف</Badge>
                )}
                {selectedCompany?.company.is_deleted && (
                  <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">محذوف</Badge>
                )}
              </DialogTitle>
            </DialogHeader>
            
            {selectedCompany && (
              <Tabs defaultValue="overview" className="mt-4">
                <TabsList className="bg-slate-800 border-slate-700 flex-wrap">
                  <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
                  <TabsTrigger value="subscription">الاشتراك</TabsTrigger>
                  <TabsTrigger value="employees">الموظفين</TabsTrigger>
                  <TabsTrigger value="account">التحكم بالحساب</TabsTrigger>
                  <TabsTrigger value="telegram">Telegram</TabsTrigger>
                  <TabsTrigger value="settings">الإعدادات</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-6 mt-4">
                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="bg-slate-800/50 border-slate-700">
                      <CardContent className="p-4 text-center">
                        <Users className="w-8 h-8 mx-auto text-blue-400 mb-2" />
                        <p className="text-2xl font-bold text-white">{selectedCompany.employees.length}</p>
                        <p className="text-slate-400 text-sm">موظف</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-slate-800/50 border-slate-700">
                      <CardContent className="p-4 text-center">
                        <UserCheck className="w-8 h-8 mx-auto text-green-400 mb-2" />
                        <p className="text-2xl font-bold text-white">{selectedCompany.attendanceToday.present}</p>
                        <p className="text-slate-400 text-sm">حاضر اليوم</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-slate-800/50 border-slate-700">
                      <CardContent className="p-4 text-center">
                        <CreditCard className="w-8 h-8 mx-auto text-primary mb-2" />
                        <p className="text-lg font-bold text-white">{selectedCompany.subscription?.plan_name || 'بدون'}</p>
                        <p className="text-slate-400 text-sm">الباقة</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-slate-800/50 border-slate-700">
                      <CardContent className="p-4 text-center">
                        <Bot className="w-8 h-8 mx-auto text-amber-400 mb-2" />
                        <p className="text-lg font-bold text-white">
                          {selectedCompany.company.telegram_bot_connected ? 'متصل' : 'غير متصل'}
                        </p>
                        <p className="text-slate-400 text-sm">البوت</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Company Info */}
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-slate-800/50">
                      <div className="flex items-center gap-2 text-slate-400 mb-1">
                        <Mail className="w-4 h-4" />
                        <span className="text-sm">البريد الإلكتروني</span>
                      </div>
                      <p className="text-white">{selectedCompany.company.owner_email}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-800/50">
                      <div className="flex items-center gap-2 text-slate-400 mb-1">
                        <Phone className="w-4 h-4" />
                        <span className="text-sm">الهاتف</span>
                      </div>
                      <p className="text-white">{selectedCompany.company.phone || '-'}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-800/50">
                      <div className="flex items-center gap-2 text-slate-400 mb-1">
                        <Calendar className="w-4 h-4" />
                        <span className="text-sm">تاريخ التسجيل</span>
                      </div>
                      <p className="text-white">
                        {new Date(selectedCompany.company.created_at).toLocaleDateString('ar-SA')}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-800/50">
                      <div className="flex items-center gap-2 text-slate-400 mb-1">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm">أوقات العمل</span>
                      </div>
                      <p className="text-white">
                        {selectedCompany.company.work_start_time} - {selectedCompany.company.work_end_time}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-800/50">
                      <div className="flex items-center gap-2 text-slate-400 mb-1">
                        <Globe className="w-4 h-4" />
                        <span className="text-sm">الدولة / المنطقة الزمنية</span>
                      </div>
                      <p className="text-white">{selectedCompany.company.country_code} / {selectedCompany.company.timezone}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-800/50">
                      <div className="flex items-center gap-2 text-slate-400 mb-1">
                        <Settings className="w-4 h-4" />
                        <span className="text-sm">العملة</span>
                      </div>
                      <p className="text-white">{selectedCompany.company.default_currency}</p>
                    </div>
                  </div>

                  {/* Suspension Info */}
                  {selectedCompany.company.is_suspended && (
                    <Card className="bg-red-950/30 border-red-500/30">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-red-400 mb-2">
                          <Ban className="w-5 h-5" />
                          <span className="font-medium">الشركة موقوفة</span>
                        </div>
                        {selectedCompany.company.suspended_reason && (
                          <p className="text-slate-300 text-sm">
                            السبب: {selectedCompany.company.suspended_reason}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* Subscription Tab */}
                <TabsContent value="subscription" className="space-y-6 mt-4">
                  {selectedCompany.subscription ? (
                    <>
                      <Card className="bg-slate-800/50 border-slate-700">
                        <CardHeader>
                          <CardTitle className="text-white flex items-center justify-between">
                            <span>تفاصيل الاشتراك</span>
                            {getStatusBadge(selectedCompany.company)}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-slate-400">الباقة الحالية</Label>
                              <p className="text-white text-lg">{selectedCompany.subscription.plan_name}</p>
                            </div>
                            <div>
                              <Label className="text-slate-400">دورة الفوترة</Label>
                              <p className="text-white text-lg">
                                {selectedCompany.subscription.billing_cycle === 'monthly' ? 'شهري' :
                                 selectedCompany.subscription.billing_cycle === 'quarterly' ? 'ربع سنوي' : 'سنوي'}
                              </p>
                            </div>
                            <div>
                              <Label className="text-slate-400">الحد الأقصى للموظفين</Label>
                              <p className="text-white text-lg">
                                {selectedCompany.employees.length} / {selectedCompany.subscription.max_employees || '∞'}
                              </p>
                            </div>
                            <div>
                              <Label className="text-slate-400">تاريخ الانتهاء</Label>
                              <p className="text-white text-lg">
                                {new Date(selectedCompany.subscription.current_period_end).toLocaleDateString('ar-SA')}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {isSuperAdmin && (
                        <Card className="bg-slate-800/50 border-slate-700">
                          <CardHeader>
                            <CardTitle className="text-white">إدارة الاشتراك</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>تغيير الحالة</Label>
                                <Select
                                  value={selectedCompany.subscription.status}
                                  onValueChange={(value) => updateSubscription({ status: value as "active" | "inactive" | "trial" | "cancelled" })}
                                  disabled={updating}
                                >
                                  <SelectTrigger className="bg-slate-800 border-slate-700">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-slate-900 border-slate-700">
                                    <SelectItem value="active" className="text-white">نشط</SelectItem>
                                    <SelectItem value="trial" className="text-white">تجريبي</SelectItem>
                                    <SelectItem value="inactive" className="text-white">موقوف</SelectItem>
                                    <SelectItem value="cancelled" className="text-white">ملغي</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>الحد الأقصى للموظفين</Label>
                                <Input
                                  type="number"
                                  value={selectedCompany.subscription.max_employees}
                                  onChange={(e) => updateSubscription({ max_employees: parseInt(e.target.value) || 10 })}
                                  className="bg-slate-800 border-slate-700"
                                  disabled={updating}
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label>تجديد الاشتراك</Label>
                              <div className="flex gap-2">
                                <Button onClick={() => renewSubscription(1)} disabled={updating} variant="outline" className="flex-1">
                                  <RefreshCw className="w-4 h-4 me-2" /> شهر
                                </Button>
                                <Button onClick={() => renewSubscription(3)} disabled={updating} variant="outline" className="flex-1">
                                  <RefreshCw className="w-4 h-4 me-2" /> 3 أشهر
                                </Button>
                                <Button onClick={() => renewSubscription(12)} disabled={updating} variant="outline" className="flex-1">
                                  <RefreshCw className="w-4 h-4 me-2" /> سنة
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-12 text-slate-400">
                      <CreditCard className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p>لا يوجد اشتراك لهذه الشركة</p>
                    </div>
                  )}
                </TabsContent>

                {/* Employees Tab */}
                <TabsContent value="employees" className="mt-4">
                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        الموظفين ({selectedCompany.employees.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="max-h-96 overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-slate-700">
                              <TableHead className="text-slate-400">الاسم</TableHead>
                              <TableHead className="text-slate-400">البريد</TableHead>
                              <TableHead className="text-slate-400">القسم</TableHead>
                              <TableHead className="text-slate-400">Telegram</TableHead>
                              <TableHead className="text-slate-400">الراتب</TableHead>
                              <TableHead className="text-slate-400">الحالة</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedCompany.employees.map((employee) => (
                              <TableRow key={employee.id} className="border-slate-700">
                                <TableCell className="text-white">{employee.full_name}</TableCell>
                                <TableCell className="text-slate-300">{employee.email}</TableCell>
                                <TableCell className="text-slate-300">{employee.department || '-'}</TableCell>
                                <TableCell>
                                  {employee.telegram_chat_id ? (
                                    <Badge className="bg-green-500/20 text-green-400 text-xs">متصل</Badge>
                                  ) : (
                                    <span className="text-slate-500">-</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-slate-300">
                                  {employee.base_salary} ({employee.salary_type === 'monthly' ? 'شهري' : 'يومي'})
                                </TableCell>
                                <TableCell>
                                  <Badge className={employee.is_active ? 'bg-green-500/20 text-green-400' : 'bg-slate-500/20 text-slate-400'}>
                                    {employee.is_active ? 'نشط' : 'غير نشط'}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Account Control Tab */}
                <TabsContent value="account" className="mt-4">
                  <CompanyAccountControls
                    company={selectedCompany.company}
                    loginAttempts={selectedCompany.loginAttempts}
                    onRefresh={() => viewCompanyDetails(selectedCompany.company)}
                  />
                </TabsContent>

                {/* Telegram Tab */}
                <TabsContent value="telegram" className="mt-4">
                  <TelegramBotDetails
                    companyId={selectedCompany.company.id}
                    companyName={selectedCompany.company.name}
                    botUsername={selectedCompany.company.telegram_bot_username}
                    botConnected={selectedCompany.company.telegram_bot_connected}
                  />
                </TabsContent>

                {/* Settings Tab */}
                <TabsContent value="settings" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="bg-slate-800/50 border-slate-700">
                      <CardContent className="p-4">
                        <Label className="text-slate-400">الدولة</Label>
                        <p className="text-white text-lg">{selectedCompany.company.country_code}</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-slate-800/50 border-slate-700">
                      <CardContent className="p-4">
                        <Label className="text-slate-400">العملة</Label>
                        <p className="text-white text-lg">{selectedCompany.company.default_currency}</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-slate-800/50 border-slate-700">
                      <CardContent className="p-4">
                        <Label className="text-slate-400">بوت التيليجرام</Label>
                        <p className="text-white text-lg">
                          {selectedCompany.company.telegram_bot_username || 'غير متصل'}
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="bg-slate-800/50 border-slate-700">
                      <CardContent className="p-4">
                        <Label className="text-slate-400">المنطقة الزمنية</Label>
                        <p className="text-white text-lg">{selectedCompany.company.timezone}</p>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </SuperAdminLayout>
  );
};

export default SuperAdminCompanies;
