import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  X,
  LayoutDashboard,
  Users,
  Clock,
  Wallet,
  Gift,
  Bot,
  Settings,
  CreditCard,
  History,
  Building2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Calendar,
  Mail,
  Phone
} from 'lucide-react';
import { toast } from 'sonner';

interface Company {
  id: string;
  name: string;
  owner_id: string;
  telegram_bot_username: string | null;
  telegram_bot_connected: boolean;
  work_start_time: string;
  work_end_time: string;
  country_code: string;
  timezone: string;
  is_suspended: boolean;
  created_at: string;
}

interface Employee {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  department: string | null;
  is_active: boolean;
  base_salary: number;
  telegram_chat_id: string | null;
}

interface Subscription {
  id: string;
  status: string;
  plan_name: string;
  current_period_start: string;
  current_period_end: string;
  max_employees: number;
}

interface CompanyViewAsModeProps {
  company: Company;
  onClose: () => void;
}

export const CompanyViewAsMode = ({ company, onClose }: CompanyViewAsModeProps) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [attendanceToday, setAttendanceToday] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    fetchCompanyData();
  }, [company.id]);

  const fetchCompanyData = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];

      const [employeesRes, subscriptionRes, attendanceRes, auditRes] = await Promise.all([
        supabase
          .from('employees')
          .select('id, full_name, email, phone, department, is_active, base_salary, telegram_chat_id')
          .eq('company_id', company.id)
          .order('full_name'),
        supabase
          .from('subscriptions')
          .select('id, status, plan_name, current_period_start, current_period_end, max_employees')
          .eq('company_id', company.id)
          .maybeSingle(),
        supabase
          .from('attendance_logs')
          .select('id, employee_id, status, check_in_time, check_out_time, date')
          .eq('company_id', company.id)
          .eq('date', today),
        supabase
          .from('audit_logs')
          .select('id, action, table_name, description, created_at, user_email')
          .eq('company_id', company.id)
          .order('created_at', { ascending: false })
          .limit(20),
      ]);

      setEmployees(employeesRes.data || []);
      setSubscription(subscriptionRes.data);
      setAttendanceToday(attendanceRes.data || []);
      setRecentActivity(auditRes.data || []);
    } catch (error) {
      console.error('Error fetching company data:', error);
      toast.error('فشل في تحميل بيانات الشركة');
    } finally {
      setLoading(false);
    }
  };

  const activeEmployees = employees.filter(e => e.is_active);
  const presentToday = attendanceToday.filter(a => a.status === 'checked_in' || a.status === 'checked_out').length;
  const absentToday = activeEmployees.length - presentToday;

  const stats = [
    { icon: Users, label: 'الموظفين', value: employees.length, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { icon: CheckCircle, label: 'حاضرون', value: presentToday, color: 'text-green-400', bg: 'bg-green-500/10' },
    { icon: XCircle, label: 'غائبون', value: absentToday, color: 'text-red-400', bg: 'bg-red-500/10' },
    { icon: Bot, label: 'البوت', value: company.telegram_bot_connected ? 'متصل' : 'غير متصل', color: company.telegram_bot_connected ? 'text-green-400' : 'text-slate-400', bg: 'bg-slate-500/10' },
  ];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-slate-950 border-slate-800 text-white max-w-[95vw] w-[1400px] h-[90vh] p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  {company.name}
                  <Badge className={company.is_suspended ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}>
                    {company.is_suspended ? 'موقوف' : 'نشط'}
                  </Badge>
                </h2>
                <p className="text-slate-400 text-sm">
                  عرض كامل للشركة • {company.timezone}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 p-4 bg-slate-900/50 border-b border-slate-800">
            {stats.map((stat) => (
              <div key={stat.label} className={`flex items-center gap-3 p-3 rounded-xl ${stat.bg}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
                <div>
                  <p className="text-white font-bold">{loading ? '...' : stat.value}</p>
                  <p className="text-slate-400 text-xs">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="bg-slate-900 border-b border-slate-800 rounded-none justify-start p-0 h-auto">
              <TabsTrigger value="dashboard" className="data-[state=active]:bg-slate-800 rounded-none border-b-2 border-transparent data-[state=active]:border-primary py-3 px-6 gap-2">
                <LayoutDashboard className="w-4 h-4" />
                لوحة التحكم
              </TabsTrigger>
              <TabsTrigger value="employees" className="data-[state=active]:bg-slate-800 rounded-none border-b-2 border-transparent data-[state=active]:border-primary py-3 px-6 gap-2">
                <Users className="w-4 h-4" />
                الموظفين
              </TabsTrigger>
              <TabsTrigger value="attendance" className="data-[state=active]:bg-slate-800 rounded-none border-b-2 border-transparent data-[state=active]:border-primary py-3 px-6 gap-2">
                <Clock className="w-4 h-4" />
                الحضور
              </TabsTrigger>
              <TabsTrigger value="subscription" className="data-[state=active]:bg-slate-800 rounded-none border-b-2 border-transparent data-[state=active]:border-primary py-3 px-6 gap-2">
                <CreditCard className="w-4 h-4" />
                الاشتراك
              </TabsTrigger>
              <TabsTrigger value="audit" className="data-[state=active]:bg-slate-800 rounded-none border-b-2 border-transparent data-[state=active]:border-primary py-3 px-6 gap-2">
                <History className="w-4 h-4" />
                سجل النشاط
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-hidden p-4">
              {/* Dashboard Tab */}
              <TabsContent value="dashboard" className="m-0 h-full">
                <div className="grid grid-cols-2 gap-6 h-full">
                  {/* Company Info */}
                  <Card className="bg-slate-900 border-slate-800">
                    <CardHeader>
                      <CardTitle className="text-white text-base flex items-center gap-2">
                        <Settings className="w-4 h-4 text-primary" />
                        معلومات الشركة
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between items-center p-2 rounded bg-slate-800/50">
                        <span className="text-slate-400 text-sm">ساعات العمل</span>
                        <span className="text-white">{company.work_start_time} - {company.work_end_time}</span>
                      </div>
                      <div className="flex justify-between items-center p-2 rounded bg-slate-800/50">
                        <span className="text-slate-400 text-sm">الدولة</span>
                        <span className="text-white">{company.country_code}</span>
                      </div>
                      <div className="flex justify-between items-center p-2 rounded bg-slate-800/50">
                        <span className="text-slate-400 text-sm">البوت</span>
                        <span className="text-white">{company.telegram_bot_username || 'غير متصل'}</span>
                      </div>
                      <div className="flex justify-between items-center p-2 rounded bg-slate-800/50">
                        <span className="text-slate-400 text-sm">تاريخ الإنشاء</span>
                        <span className="text-white">{new Date(company.created_at).toLocaleDateString('ar-SA')}</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Subscription Info */}
                  <Card className="bg-slate-900 border-slate-800">
                    <CardHeader>
                      <CardTitle className="text-white text-base flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-primary" />
                        الاشتراك
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {subscription ? (
                        <>
                          <div className="flex justify-between items-center p-2 rounded bg-slate-800/50">
                            <span className="text-slate-400 text-sm">الباقة</span>
                            <span className="text-white">{subscription.plan_name}</span>
                          </div>
                          <div className="flex justify-between items-center p-2 rounded bg-slate-800/50">
                            <span className="text-slate-400 text-sm">الحالة</span>
                            <Badge className={subscription.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}>
                              {subscription.status === 'active' ? 'نشط' : subscription.status}
                            </Badge>
                          </div>
                          <div className="flex justify-between items-center p-2 rounded bg-slate-800/50">
                            <span className="text-slate-400 text-sm">تنتهي في</span>
                            <span className="text-white">{new Date(subscription.current_period_end).toLocaleDateString('ar-SA')}</span>
                          </div>
                          <div className="flex justify-between items-center p-2 rounded bg-slate-800/50">
                            <span className="text-slate-400 text-sm">الحد الأقصى للموظفين</span>
                            <span className="text-white">{subscription.max_employees || 'غير محدود'}</span>
                          </div>
                        </>
                      ) : (
                        <p className="text-slate-400 text-center py-4">لا يوجد اشتراك</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Employees Tab */}
              <TabsContent value="employees" className="m-0 h-full">
                <Card className="bg-slate-900 border-slate-800 h-full">
                  <CardContent className="p-0 h-full">
                    <ScrollArea className="h-full">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-slate-800">
                            <TableHead className="text-slate-400">الموظف</TableHead>
                            <TableHead className="text-slate-400">البريد</TableHead>
                            <TableHead className="text-slate-400">القسم</TableHead>
                            <TableHead className="text-slate-400">الراتب</TableHead>
                            <TableHead className="text-slate-400">تيليجرام</TableHead>
                            <TableHead className="text-slate-400">الحالة</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {employees.map((emp) => (
                            <TableRow key={emp.id} className="border-slate-800">
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm">
                                    {emp.full_name.charAt(0)}
                                  </div>
                                  <span className="text-white">{emp.full_name}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-slate-300">{emp.email}</TableCell>
                              <TableCell className="text-slate-300">{emp.department || '-'}</TableCell>
                              <TableCell className="text-slate-300">{emp.base_salary?.toLocaleString() || '-'}</TableCell>
                              <TableCell>
                                <Badge className={emp.telegram_chat_id ? 'bg-green-500/20 text-green-400' : 'bg-slate-500/20 text-slate-400'}>
                                  {emp.telegram_chat_id ? 'متصل' : 'غير متصل'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge className={emp.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
                                  {emp.is_active ? 'نشط' : 'معطل'}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Attendance Tab */}
              <TabsContent value="attendance" className="m-0 h-full">
                <Card className="bg-slate-900 border-slate-800 h-full">
                  <CardHeader>
                    <CardTitle className="text-white text-base">
                      حضور اليوم - {new Date().toLocaleDateString('ar-SA')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px]">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-slate-800">
                            <TableHead className="text-slate-400">الموظف</TableHead>
                            <TableHead className="text-slate-400">الحالة</TableHead>
                            <TableHead className="text-slate-400">وقت الحضور</TableHead>
                            <TableHead className="text-slate-400">وقت الانصراف</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {attendanceToday.map((att) => {
                            const emp = employees.find(e => e.id === att.employee_id);
                            return (
                              <TableRow key={att.id} className="border-slate-800">
                                <TableCell className="text-white">{emp?.full_name || 'غير معروف'}</TableCell>
                                <TableCell>
                                  <Badge className={
                                    att.status === 'checked_out' ? 'bg-green-500/20 text-green-400' :
                                    att.status === 'checked_in' ? 'bg-blue-500/20 text-blue-400' :
                                    'bg-slate-500/20 text-slate-400'
                                  }>
                                    {att.status === 'checked_out' ? 'انصرف' : att.status === 'checked_in' ? 'حاضر' : att.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-slate-300">{att.check_in_time || '-'}</TableCell>
                                <TableCell className="text-slate-300">{att.check_out_time || '-'}</TableCell>
                              </TableRow>
                            );
                          })}
                          {attendanceToday.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center text-slate-400 py-8">
                                لا توجد سجلات حضور لليوم
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Subscription Tab */}
              <TabsContent value="subscription" className="m-0 h-full">
                <Card className="bg-slate-900 border-slate-800">
                  <CardContent className="p-6">
                    {subscription ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 rounded-xl bg-slate-800">
                            <p className="text-slate-400 text-sm">الباقة الحالية</p>
                            <p className="text-white text-2xl font-bold mt-1">{subscription.plan_name}</p>
                          </div>
                          <div className="p-4 rounded-xl bg-slate-800">
                            <p className="text-slate-400 text-sm">الحالة</p>
                            <Badge className={`mt-2 ${subscription.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}`}>
                              {subscription.status === 'active' ? 'نشط' : subscription.status}
                            </Badge>
                          </div>
                          <div className="p-4 rounded-xl bg-slate-800">
                            <p className="text-slate-400 text-sm">بداية الفترة</p>
                            <p className="text-white text-lg mt-1">{new Date(subscription.current_period_start).toLocaleDateString('ar-SA')}</p>
                          </div>
                          <div className="p-4 rounded-xl bg-slate-800">
                            <p className="text-slate-400 text-sm">نهاية الفترة</p>
                            <p className="text-white text-lg mt-1">{new Date(subscription.current_period_end).toLocaleDateString('ar-SA')}</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <CreditCard className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                        <p className="text-slate-400">لا يوجد اشتراك لهذه الشركة</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Audit Tab */}
              <TabsContent value="audit" className="m-0 h-full">
                <Card className="bg-slate-900 border-slate-800 h-full">
                  <CardContent className="p-0">
                    <ScrollArea className="h-[500px]">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-slate-800">
                            <TableHead className="text-slate-400">الإجراء</TableHead>
                            <TableHead className="text-slate-400">الجدول</TableHead>
                            <TableHead className="text-slate-400">الوصف</TableHead>
                            <TableHead className="text-slate-400">المستخدم</TableHead>
                            <TableHead className="text-slate-400">التاريخ</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {recentActivity.map((log) => (
                            <TableRow key={log.id} className="border-slate-800">
                              <TableCell>
                                <Badge className="bg-blue-500/20 text-blue-400">{log.action}</Badge>
                              </TableCell>
                              <TableCell className="text-slate-300">{log.table_name}</TableCell>
                              <TableCell className="text-slate-300 max-w-[200px] truncate">{log.description || '-'}</TableCell>
                              <TableCell className="text-slate-300">{log.user_email || '-'}</TableCell>
                              <TableCell className="text-slate-300">{new Date(log.created_at).toLocaleString('ar-SA')}</TableCell>
                            </TableRow>
                          ))}
                          {recentActivity.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center text-slate-400 py-8">
                                لا توجد سجلات نشاط
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};
