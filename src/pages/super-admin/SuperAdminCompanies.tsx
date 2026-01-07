import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useSuperAdmin } from '@/contexts/SuperAdminContext';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Ban,
  CheckCircle,
  Mail,
  Calendar,
  Clock,
  CreditCard,
  Bot,
  Settings,
  BarChart3,
  UserCheck,
  RefreshCw
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
}

const SuperAdminCompanies = () => {
  const { isSuperAdmin } = useSuperAdmin();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<CompanyDetails | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [updating, setUpdating] = useState(false);

  const fetchCompanies = async () => {
    try {
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

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
  }, []);

  const viewCompanyDetails = async (company: Company) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const [employeesRes, subscriptionRes, attendanceRes, plansRes] = await Promise.all([
        supabase
          .from('employees')
          .select('id, full_name, email, department, is_active, base_salary, salary_type')
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
      ]);

      const employees = employeesRes.data || [];
      const attendance = attendanceRes.data || [];
      
      const presentCount = attendance.filter(a => a.status === 'checked_in' || a.status === 'checked_out').length;

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

      toast.success('تم تحديث الاشتراك');
      
      // Refresh data
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
      default:
        return <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">غير محدد</Badge>;
    }
  };

  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    company.owner_email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">الشركات</h1>
            <p className="text-slate-400 mt-1">إدارة جميع الشركات في النظام</p>
          </div>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="البحث عن شركة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10 w-full sm:w-64 bg-slate-900 border-slate-700 text-white"
            />
          </div>
        </div>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-slate-800/50">
                  <TableHead className="text-slate-400">الشركة</TableHead>
                  <TableHead className="text-slate-400">البريد الإلكتروني</TableHead>
                  <TableHead className="text-slate-400">الموظفين</TableHead>
                  <TableHead className="text-slate-400">الاشتراك</TableHead>
                  <TableHead className="text-slate-400">البوت</TableHead>
                  <TableHead className="text-slate-400">تاريخ التسجيل</TableHead>
                  <TableHead className="text-slate-400">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-slate-400 py-8">
                      جاري التحميل...
                    </TableCell>
                  </TableRow>
                ) : filteredCompanies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-slate-400 py-8">
                      لا توجد شركات
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCompanies.map((company) => (
                    <TableRow key={company.id} className="border-slate-800 hover:bg-slate-800/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-primary" />
                          </div>
                          <span className="text-white font-medium">{company.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-300">{company.owner_email}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-slate-300">
                          <Users className="w-4 h-4" />
                          {company.employee_count}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(company.subscription_status || 'none')}</TableCell>
                      <TableCell>
                        {company.telegram_bot_connected ? (
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                            <Bot className="w-3 h-3 me-1" /> متصل
                          </Badge>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-300">
                        {new Date(company.created_at).toLocaleDateString('ar-SA')}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => viewCompanyDetails(company)}
                          className="text-slate-300 hover:text-white gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          عرض التفاصيل
                        </Button>
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
          <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-xl">
                <Building2 className="w-6 h-6 text-primary" />
                {selectedCompany?.company.name}
              </DialogTitle>
            </DialogHeader>
            
            {selectedCompany && (
              <Tabs defaultValue="overview" className="mt-4">
                <TabsList className="bg-slate-800 border-slate-700">
                  <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
                  <TabsTrigger value="subscription">الاشتراك</TabsTrigger>
                  <TabsTrigger value="employees">الموظفين</TabsTrigger>
                  <TabsTrigger value="settings">الإعدادات</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-6 mt-4">
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

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-slate-800/50">
                      <div className="flex items-center gap-2 text-slate-400 mb-1">
                        <Mail className="w-4 h-4" />
                        <span className="text-sm">البريد الإلكتروني</span>
                      </div>
                      <p className="text-white">{selectedCompany.company.owner_email}</p>
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
                        <Settings className="w-4 h-4" />
                        <span className="text-sm">المنطقة الزمنية</span>
                      </div>
                      <p className="text-white">{selectedCompany.company.timezone}</p>
                    </div>
                  </div>
                </TabsContent>

                {/* Subscription Tab */}
                <TabsContent value="subscription" className="space-y-6 mt-4">
                  {selectedCompany.subscription ? (
                    <>
                      <Card className="bg-slate-800/50 border-slate-700">
                        <CardHeader>
                          <CardTitle className="text-white flex items-center justify-between">
                            <span>تفاصيل الاشتراك</span>
                            {getStatusBadge(selectedCompany.subscription.status)}
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
                                    <SelectItem value="suspended" className="text-white">موقوف</SelectItem>
                                    <SelectItem value="expired" className="text-white">منتهي</SelectItem>
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
