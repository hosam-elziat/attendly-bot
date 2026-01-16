import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEmployees, Employee, useUpdateEmployee } from '@/hooks/useEmployees';
import { useAttendance } from '@/hooks/useAttendance';
import { useEmployeeSalaryStats, SalaryFilterPeriod } from '@/hooks/useEmployeeSalaryStats';
import { useEmployeeAdjustments } from '@/hooks/useSalaryAdjustments';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  ArrowRight, 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  Building, 
  Calendar,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Banknote,
  FileText,
  MapPin,
  CreditCard,
  Gift,
  Minus,
  Timer,
  MessageCircle,
  ListOrdered,
  Edit,
  Save,
  Hourglass
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, endOfYear, differenceInMinutes, parseISO, isWithinInterval } from 'date-fns';
import { ar } from 'date-fns/locale';
import AdjustmentsList from '@/components/salaries/AdjustmentsList';
import EditDeductionDialog from '@/components/salaries/EditDeductionDialog';

import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';

// Arab countries with timezones
export const ARAB_COUNTRIES = [
  { code: 'SA', name: 'السعودية', timezone: 'Asia/Riyadh', offset: 'UTC+3' },
  { code: 'AE', name: 'الإمارات', timezone: 'Asia/Dubai', offset: 'UTC+4' },
  { code: 'EG', name: 'مصر', timezone: 'Africa/Cairo', offset: 'UTC+2' },
  { code: 'JO', name: 'الأردن', timezone: 'Asia/Amman', offset: 'UTC+3' },
  { code: 'LB', name: 'لبنان', timezone: 'Asia/Beirut', offset: 'UTC+2' },
  { code: 'SY', name: 'سوريا', timezone: 'Asia/Damascus', offset: 'UTC+3' },
  { code: 'IQ', name: 'العراق', timezone: 'Asia/Baghdad', offset: 'UTC+3' },
  { code: 'KW', name: 'الكويت', timezone: 'Asia/Kuwait', offset: 'UTC+3' },
  { code: 'BH', name: 'البحرين', timezone: 'Asia/Bahrain', offset: 'UTC+3' },
  { code: 'QA', name: 'قطر', timezone: 'Asia/Qatar', offset: 'UTC+3' },
  { code: 'OM', name: 'عمان', timezone: 'Asia/Muscat', offset: 'UTC+4' },
  { code: 'YE', name: 'اليمن', timezone: 'Asia/Aden', offset: 'UTC+3' },
  { code: 'LY', name: 'ليبيا', timezone: 'Africa/Tripoli', offset: 'UTC+2' },
  { code: 'TN', name: 'تونس', timezone: 'Africa/Tunis', offset: 'UTC+1' },
  { code: 'DZ', name: 'الجزائر', timezone: 'Africa/Algiers', offset: 'UTC+1' },
  { code: 'MA', name: 'المغرب', timezone: 'Africa/Casablanca', offset: 'UTC+1' },
  { code: 'SD', name: 'السودان', timezone: 'Africa/Khartoum', offset: 'UTC+2' },
  { code: 'SO', name: 'الصومال', timezone: 'Africa/Mogadishu', offset: 'UTC+3' },
  { code: 'DJ', name: 'جيبوتي', timezone: 'Africa/Djibouti', offset: 'UTC+3' },
  { code: 'MR', name: 'موريتانيا', timezone: 'Africa/Nouakchott', offset: 'UTC+0' },
  { code: 'KM', name: 'جزر القمر', timezone: 'Indian/Comoro', offset: 'UTC+3' },
  { code: 'PS', name: 'فلسطين', timezone: 'Asia/Gaza', offset: 'UTC+2' },
];

// Currencies
export const CURRENCIES = [
  { code: 'SAR', name: 'ريال سعودي', symbol: 'ر.س' },
  { code: 'AED', name: 'درهم إماراتي', symbol: 'د.إ' },
  { code: 'EGP', name: 'جنيه مصري', symbol: 'ج.م' },
  { code: 'JOD', name: 'دينار أردني', symbol: 'د.أ' },
  { code: 'LBP', name: 'ليرة لبنانية', symbol: 'ل.ل' },
  { code: 'SYP', name: 'ليرة سورية', symbol: 'ل.س' },
  { code: 'IQD', name: 'دينار عراقي', symbol: 'د.ع' },
  { code: 'KWD', name: 'دينار كويتي', symbol: 'د.ك' },
  { code: 'BHD', name: 'دينار بحريني', symbol: 'د.ب' },
  { code: 'QAR', name: 'ريال قطري', symbol: 'ر.ق' },
  { code: 'OMR', name: 'ريال عماني', symbol: 'ر.ع' },
  { code: 'YER', name: 'ريال يمني', symbol: 'ر.ي' },
  { code: 'LYD', name: 'دينار ليبي', symbol: 'د.ل' },
  { code: 'TND', name: 'دينار تونسي', symbol: 'د.ت' },
  { code: 'DZD', name: 'دينار جزائري', symbol: 'د.ج' },
  { code: 'MAD', name: 'درهم مغربي', symbol: 'د.م' },
  { code: 'SDG', name: 'جنيه سوداني', symbol: 'ج.س' },
  { code: 'USD', name: 'دولار أمريكي', symbol: '$' },
  { code: 'EUR', name: 'يورو', symbol: '€' },
];

type FilterPeriod = 'week' | 'month' | 'year';

const EmployeeDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, direction } = useLanguage();
  const { data: employees = [], refetch: refetchEmployees } = useEmployees();
  const { data: attendanceLogs = [] } = useAttendance();
  const { data: company } = useCompany();
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('month');
  const [salaryPeriod, setSalaryPeriod] = useState<SalaryFilterPeriod>('this_month');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingLateBalance, setEditingLateBalance] = useState(false);
  const [lateBalanceValue, setLateBalanceValue] = useState<number>(0);
  const updateEmployee = useUpdateEmployee();

  // Get adjustments for this employee
  const currentMonth = format(new Date(), 'yyyy-MM');
  const { data: employeeAdjustments = [], refetch: refetchAdjustments } = useEmployeeAdjustments(id, currentMonth);

  const employee = employees.find(e => e.id === id) as Employee & {
    phone?: string;
    national_id?: string;
    address?: string;
    hire_date?: string;
    currency?: string;
    notes?: string;
    monthly_late_balance_minutes?: number;
  };

  // Use salary stats hook
  const salaryStats = useEmployeeSalaryStats(id, salaryPeriod, employee ? {
    base_salary: employee.base_salary,
    salary_type: employee.salary_type,
    work_start_time: employee.work_start_time,
    work_end_time: employee.work_end_time,
    weekend_days: employee.weekend_days,
    break_duration_minutes: employee.break_duration_minutes,
  } : undefined);

  const currency = CURRENCIES.find(c => c.code === (employee?.currency || 'SAR')) || CURRENCIES[0];

  // Calculate date range based on filter
  const dateRange = useMemo(() => {
    const now = new Date();
    switch (filterPeriod) {
      case 'week':
        return { start: startOfWeek(now, { weekStartsOn: 0 }), end: endOfWeek(now, { weekStartsOn: 0 }) };
      case 'month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'year':
        return { start: startOfYear(now), end: endOfYear(now) };
    }
  }, [filterPeriod]);

  // Filter attendance logs for this employee within date range
  const employeeAttendance = useMemo(() => {
    if (!employee) return [];
    return attendanceLogs.filter(log => {
      if (log.employee_id !== employee.id) return false;
      const logDate = parseISO(log.date);
      return isWithinInterval(logDate, { start: dateRange.start, end: dateRange.end });
    });
  }, [attendanceLogs, employee, dateRange]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalDays = employeeAttendance.length;
    const presentDays = employeeAttendance.filter(log => log.status === 'checked_out' || log.status === 'checked_in').length;
    const absentDays = Math.max(0, getExpectedWorkDays(dateRange.start, dateRange.end, employee?.weekend_days || []) - presentDays);
    
    // Calculate total hours
    let totalMinutes = 0;
    employeeAttendance.forEach(log => {
      if (log.check_in_time && log.check_out_time) {
        const checkIn = parseISO(log.check_in_time);
        const checkOut = parseISO(log.check_out_time);
        totalMinutes += differenceInMinutes(checkOut, checkIn);
      }
    });
    const totalHours = Math.round(totalMinutes / 60 * 10) / 10;

    // Calculate commitment rate
    const expectedDays = getExpectedWorkDays(dateRange.start, dateRange.end, employee?.weekend_days || []);
    const commitmentRate = expectedDays > 0 ? Math.round((presentDays / expectedDays) * 100) : 100;

    // Calculate late arrivals
    const lateArrivals = employeeAttendance.filter(log => {
      if (!log.check_in_time || !employee?.work_start_time) return false;
      const checkInTime = parseISO(log.check_in_time);
      const [hours, minutes] = employee.work_start_time.split(':').map(Number);
      const expectedStart = new Date(checkInTime);
      expectedStart.setHours(hours, minutes, 0, 0);
      return checkInTime > expectedStart;
    }).length;

    return {
      totalDays,
      presentDays,
      absentDays,
      totalHours,
      commitmentRate,
      lateArrivals,
      expectedDays,
    };
  }, [employeeAttendance, dateRange, employee]);

  if (!employee) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <AlertTriangle className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">{t('employeeDetails.notFound')}</h3>
          <Button onClick={() => navigate('/dashboard/employees')} className="mt-4">
            {t('employeeDetails.backToList')}
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const BackIcon = direction === 'rtl' ? ArrowRight : ArrowLeft;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/employees')}>
              <BackIcon className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-lg font-bold text-primary">
                  {employee.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{employee.full_name}</h1>
                <p className="text-muted-foreground">{employee.department || t('employees.department')}</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge variant={employee.is_active ? 'default' : 'secondary'} className={employee.is_active ? 'bg-success' : ''}>
              {employee.is_active ? t('common.active') : t('common.inactive')}
            </Badge>
            <Select value={filterPeriod} onValueChange={(v: FilterPeriod) => setFilterPeriod(v)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">{t('employeeDetails.thisWeek')}</SelectItem>
                <SelectItem value="month">{t('employeeDetails.thisMonth')}</SelectItem>
                <SelectItem value="year">{t('employeeDetails.thisYear')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
        >
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('employeeDetails.attendanceDays')}</p>
                  <p className="text-2xl font-bold">{stats.presentDays} / {stats.expectedDays}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('employeeDetails.absentDays')}</p>
                  <p className="text-2xl font-bold">{stats.absentDays}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                  <XCircle className="w-6 h-6 text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('employeeDetails.totalHours')}</p>
                  <p className="text-2xl font-bold">{stats.totalHours} {t('employeeDetails.hours')}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('employeeDetails.commitmentRate')}</p>
                  <p className="text-2xl font-bold">{stats.commitmentRate}%</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-warning" />
                </div>
              </div>
              <Progress value={stats.commitmentRate} className="mt-3" />
            </CardContent>
          </Card>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Tabs defaultValue="info" className="space-y-4">
            <TabsList className="flex-wrap">
              <TabsTrigger value="info">{t('employeeDetails.personalInfo')}</TabsTrigger>
              <TabsTrigger value="attendance">{t('employeeDetails.attendanceLog')}</TabsTrigger>
              <TabsTrigger value="salary">{t('employeeDetails.salaryInfo')}</TabsTrigger>
            </TabsList>

            <TabsContent value="info">
              <Card>
                <CardHeader>
                  <CardTitle className={direction === 'rtl' ? 'text-right w-full' : ''}>{t('employeeDetails.personalInfo')}</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-6 md:grid-cols-2">
                  {/* Column 1: Name, Email, Phone, National ID */}
                  <div className={`space-y-4 ${direction === 'rtl' ? 'md:order-2' : 'md:order-1'}`}>
                    <div className={`flex items-center gap-3 ${direction === 'rtl' ? 'flex-row-reverse' : ''}`}>
                      <User className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      <div className={direction === 'rtl' ? 'text-right' : ''}>
                        <p className="text-sm text-muted-foreground">{t('employees.fullName')}</p>
                        <p className="font-medium">{employee.full_name}</p>
                      </div>
                    </div>
                    <div className={`flex items-center gap-3 ${direction === 'rtl' ? 'flex-row-reverse' : ''}`}>
                      <Mail className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      <div className={direction === 'rtl' ? 'text-right' : ''}>
                        <p className="text-sm text-muted-foreground">{t('employees.email')}</p>
                        <p className="font-medium">{employee.email}</p>
                      </div>
                    </div>
                    <div className={`flex items-center gap-3 ${direction === 'rtl' ? 'flex-row-reverse' : ''}`}>
                      <Phone className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      <div className={direction === 'rtl' ? 'text-right' : ''}>
                        <p className="text-sm text-muted-foreground">{t('employeeDetails.phone')}</p>
                        <p className="font-medium">{employee.phone || '—'}</p>
                      </div>
                    </div>
                    <div className={`flex items-center gap-3 ${direction === 'rtl' ? 'flex-row-reverse' : ''}`}>
                      <CreditCard className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      <div className={direction === 'rtl' ? 'text-right' : ''}>
                        <p className="text-sm text-muted-foreground">{t('employeeDetails.nationalId')}</p>
                        <p className="font-medium">{employee.national_id || '—'}</p>
                      </div>
                    </div>
                  </div>
                  {/* Column 2: Department, Hire Date, Work Hours, Telegram ID */}
                  <div className={`space-y-4 ${direction === 'rtl' ? 'md:order-1' : 'md:order-2'}`}>
                    <div className={`flex items-center gap-3 ${direction === 'rtl' ? 'flex-row-reverse' : ''}`}>
                      <Building className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      <div className={direction === 'rtl' ? 'text-right' : ''}>
                        <p className="text-sm text-muted-foreground">{t('employees.department')}</p>
                        <p className="font-medium">{employee.department || '—'}</p>
                      </div>
                    </div>
                    <div className={`flex items-center gap-3 ${direction === 'rtl' ? 'flex-row-reverse' : ''}`}>
                      <Calendar className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      <div className={direction === 'rtl' ? 'text-right' : ''}>
                        <p className="text-sm text-muted-foreground">{t('employeeDetails.hireDate')}</p>
                        <p className="font-medium">
                          {employee.hire_date ? format(parseISO(employee.hire_date), 'PPP', { locale: ar }) : '—'}
                        </p>
                      </div>
                    </div>
                    <div className={`flex items-center gap-3 ${direction === 'rtl' ? 'flex-row-reverse' : ''}`}>
                      <Clock className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      <div className={direction === 'rtl' ? 'text-right' : ''}>
                        <p className="text-sm text-muted-foreground">{t('employees.workHours')}</p>
                        <p className="font-medium">
                          {employee.work_start_time?.slice(0, 5) || '09:00'} - {employee.work_end_time?.slice(0, 5) || '17:00'}
                        </p>
                      </div>
                    </div>
                    <div className={`flex items-center gap-3 ${direction === 'rtl' ? 'flex-row-reverse' : ''}`}>
                      <MessageCircle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      <div className={direction === 'rtl' ? 'text-right' : ''}>
                        <p className="text-sm text-muted-foreground">Telegram ID</p>
                        <p className="font-medium font-mono">{employee.telegram_chat_id || '—'}</p>
                      </div>
                    </div>
                    <div className={`flex items-center gap-3 ${direction === 'rtl' ? 'flex-row-reverse' : ''}`}>
                      <MapPin className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      <div className={direction === 'rtl' ? 'text-right' : ''}>
                        <p className="text-sm text-muted-foreground">{t('employeeDetails.address')}</p>
                        <p className="font-medium">{employee.address || '—'}</p>
                      </div>
                    </div>
                  </div>
                  {employee.notes && (
                    <div className={`md:col-span-2 flex items-start gap-3 ${direction === 'rtl' ? 'flex-row-reverse' : ''}`}>
                      <FileText className="w-5 h-5 text-muted-foreground mt-1 flex-shrink-0" />
                      <div className={direction === 'rtl' ? 'text-right' : ''}>
                        <p className="text-sm text-muted-foreground">{t('employeeDetails.notes')}</p>
                        <p className="font-medium">{employee.notes}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="attendance">
              <Card>
                <CardHeader>
                  <CardTitle>{t('employeeDetails.attendanceLog')}</CardTitle>
                </CardHeader>
                <CardContent>
                  {employeeAttendance.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      {t('employeeDetails.noAttendance')}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {employeeAttendance.map((log) => (
                        <div key={log.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                          <div>
                            <p className="font-medium">{format(parseISO(log.date), 'EEEE، d MMMM', { locale: ar })}</p>
                            <p className="text-sm text-muted-foreground">
                              {log.check_in_time ? format(parseISO(log.check_in_time), 'HH:mm') : '—'} 
                              {' → '} 
                              {log.check_out_time ? format(parseISO(log.check_out_time), 'HH:mm') : '—'}
                            </p>
                          </div>
                          <Badge variant={log.status === 'checked_out' ? 'default' : 'secondary'}>
                            {log.status === 'checked_in' ? t('attendance.checkedIn') : 
                             log.status === 'checked_out' ? t('attendance.checkedOut') : 
                             log.status === 'on_break' ? t('attendance.onBreak') : log.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="salary">
              <Card>
                <CardHeader className={`flex flex-row items-center justify-between ${direction === 'rtl' ? 'flex-row-reverse' : ''}`}>
                  <CardTitle className={direction === 'rtl' ? 'text-right' : ''}>{t('employeeDetails.salaryInfo')}</CardTitle>
                  <Select value={salaryPeriod} onValueChange={(v: SalaryFilterPeriod) => setSalaryPeriod(v)}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="this_month">هذا الشهر</SelectItem>
                      <SelectItem value="last_month">الشهر الماضي</SelectItem>
                      <SelectItem value="this_year">هذا العام</SelectItem>
                      <SelectItem value="all_time">كل الوقت</SelectItem>
                    </SelectContent>
                  </Select>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Base Salary */}
                  <div className={`flex items-center gap-3 ${direction === 'rtl' ? 'flex-row-reverse' : ''}`}>
                    <Banknote className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    <div className={direction === 'rtl' ? 'text-right' : ''}>
                      <p className="text-sm text-muted-foreground">{t('employees.salaryAmount')}</p>
                      <p className="font-medium text-xl">
                        {direction === 'rtl' ? (
                          <>
                            {Number(employee.base_salary).toLocaleString()} {currency.symbol}
                            <span className="text-sm text-muted-foreground me-2">
                              /{employee.salary_type === 'monthly' ? t('employees.monthly') : t('employees.daily')}
                            </span>
                          </>
                        ) : (
                          <>
                            {Number(employee.base_salary).toLocaleString()} {currency.symbol}
                            <span className="text-sm text-muted-foreground ms-2">
                              / {employee.salary_type === 'monthly' ? t('employees.monthly') : t('employees.daily')}
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Salary Statistics Grid */}
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 pt-4 border-t">
                    <div className={`text-center p-4 rounded-lg bg-success/10 border border-success/20 ${direction === 'rtl' ? 'lg:order-4' : 'lg:order-1'}`}>
                      <p className="text-sm text-muted-foreground">المرتب المكتسب</p>
                      <p className="text-2xl font-bold text-success">
                        {salaryStats.earnedSalary.toLocaleString()} {currency.symbol}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {salaryStats.workDays} / {salaryStats.expectedWorkDays} يوم
                      </p>
                    </div>
                    <div className={`text-center p-4 rounded-lg bg-destructive/10 border border-destructive/20 ${direction === 'rtl' ? 'lg:order-3' : 'lg:order-2'}`}>
                      <p className="text-sm text-muted-foreground">إجمالي الخصومات</p>
                      <p className="text-2xl font-bold text-destructive">
                        -{salaryStats.totalDeductions.toLocaleString()} {currency.symbol}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {salaryStats.deductionPercentage}% من المرتب
                      </p>
                    </div>
                    <div className={`text-center p-4 rounded-lg bg-primary/10 border border-primary/20 ${direction === 'rtl' ? 'lg:order-2' : 'lg:order-3'}`}>
                      <p className="text-sm text-muted-foreground">المكافآت</p>
                      <p className="text-2xl font-bold text-primary">
                        +{salaryStats.totalBonuses.toLocaleString()} {currency.symbol}
                      </p>
                    </div>
                    <div className={`text-center p-4 rounded-lg bg-warning/10 border border-warning/20 ${direction === 'rtl' ? 'lg:order-1' : 'lg:order-4'}`}>
                      <p className="text-sm text-muted-foreground">صافي المرتب</p>
                      <p className="text-2xl font-bold text-warning">
                        {salaryStats.netSalary.toLocaleString()} {currency.symbol}
                      </p>
                    </div>
                  </div>

                  {/* Additional Details */}
                  <div className="grid gap-4 md:grid-cols-3 pt-4 border-t">
                    <div className={`flex items-center gap-3 p-3 rounded-lg bg-muted/50 ${direction === 'rtl' ? 'flex-row-reverse md:order-3' : 'md:order-1'}`}>
                      <Timer className="w-5 h-5 text-success flex-shrink-0" />
                      <div className={direction === 'rtl' ? 'text-right' : ''}>
                        <p className="text-sm text-muted-foreground">الأوفر تايم</p>
                        <p className="font-medium">{salaryStats.overtimeHours} ساعة</p>
                        <p className="text-xs text-success">+{salaryStats.overtimeAmount.toLocaleString()} {currency.symbol}</p>
                      </div>
                    </div>
                    <div className={`flex items-center gap-3 p-3 rounded-lg bg-muted/50 ${direction === 'rtl' ? 'flex-row-reverse md:order-2' : 'md:order-2'}`}>
                      <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0" />
                      <div className={direction === 'rtl' ? 'text-right' : ''}>
                        <p className="text-sm text-muted-foreground">دقائق التأخير</p>
                        <p className="font-medium">{salaryStats.lateMinutes} دقيقة</p>
                        <p className="text-xs text-destructive">-{salaryStats.lateDeductionAmount.toLocaleString()} {currency.symbol}</p>
                      </div>
                    </div>
                    <div className={`flex items-center gap-3 p-3 rounded-lg bg-muted/50 ${direction === 'rtl' ? 'flex-row-reverse md:order-1' : 'md:order-3'}`}>
                      <TrendingUp className="w-5 h-5 text-primary flex-shrink-0" />
                      <div className={direction === 'rtl' ? 'text-right' : ''}>
                        <p className="text-sm text-muted-foreground">{t('employeeDetails.commitmentRate')}</p>
                        <p className="font-medium">{stats.commitmentRate}%</p>
                      </div>
                    </div>
                  </div>

                  {/* Late Balance & Stats */}
                  <div className="grid gap-4 md:grid-cols-3 pt-4 border-t">
                    <div className={`text-center p-4 rounded-lg bg-muted/50 ${direction === 'rtl' ? 'md:order-3' : 'md:order-1'}`}>
                      <p className="text-sm text-muted-foreground">{t('employeeDetails.lateArrivals')}</p>
                      <p className="text-2xl font-bold text-warning">{stats.lateArrivals}</p>
                    </div>
                    <div className={`text-center p-4 rounded-lg bg-muted/50 ${direction === 'rtl' ? 'md:order-2' : 'md:order-2'}`}>
                      <p className="text-sm text-muted-foreground">{t('employeeDetails.absentDays')}</p>
                      <p className="text-2xl font-bold text-destructive">{stats.absentDays}</p>
                    </div>
                    <div className={`p-4 rounded-lg bg-primary/10 border border-primary/20 ${direction === 'rtl' ? 'md:order-1' : 'md:order-3'}`}>
                      <div className={`flex items-center justify-between mb-2 ${direction === 'rtl' ? 'flex-row-reverse' : ''}`}>
                        <div className={`flex items-center gap-2 ${direction === 'rtl' ? 'flex-row-reverse' : ''}`}>
                          <Hourglass className="w-4 h-4 text-primary" />
                          <p className="text-sm text-muted-foreground">
                            {direction === 'rtl' ? 'رصيد التأخيرات' : 'Late Balance'}
                          </p>
                        </div>
                        {!editingLateBalance ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => {
                              setLateBalanceValue(employee?.monthly_late_balance_minutes ?? 15);
                              setEditingLateBalance(true);
                            }}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={async () => {
                              if (!employee) return;
                              try {
                                await updateEmployee.mutateAsync({
                                  id: employee.id,
                                  monthly_late_balance_minutes: lateBalanceValue,
                                  oldData: employee,
                                });
                                setEditingLateBalance(false);
                                refetchEmployees();
                              } catch (error) {
                                toast.error(direction === 'rtl' ? 'فشل في التحديث' : 'Failed to update');
                              }
                            }}
                          >
                            <Save className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                      {editingLateBalance ? (
                        <div className={`flex items-center gap-2 ${direction === 'rtl' ? 'flex-row-reverse' : ''}`}>
                          <NumberInput
                            value={lateBalanceValue}
                            onChange={setLateBalanceValue}
                            className="h-8 text-center"
                            min={0}
                          />
                          <span className="text-sm">{direction === 'rtl' ? 'دقيقة' : 'min'}</span>
                        </div>
                      ) : (
                        <p className="text-2xl font-bold text-primary text-center">
                          {employee?.monthly_late_balance_minutes ?? 15}
                          <span className="text-sm font-normal text-muted-foreground ms-1">
                            {direction === 'rtl' ? 'دقيقة' : 'min'}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Adjustments List */}
                  <div className="pt-4 border-t">
                    <div className={`flex items-center justify-between mb-4 ${direction === 'rtl' ? 'flex-row-reverse' : ''}`}>
                      <h4 className={`font-medium flex items-center gap-2 ${direction === 'rtl' ? 'flex-row-reverse' : ''}`}>
                        <ListOrdered className="w-4 h-4" />
                        {direction === 'rtl' ? 'سجل المكافآت والخصومات' : 'Bonuses & Deductions Log'}
                      </h4>
                      <Button size="sm" onClick={() => setEditDialogOpen(true)}>
                        <Edit className="w-4 h-4 me-1" />
                        {direction === 'rtl' ? 'إضافة' : 'Add'}
                      </Button>
                    </div>
                    <AdjustmentsList
                      adjustments={employeeAdjustments}
                      onRefresh={() => refetchAdjustments()}
                      showEmployeeName={false}
                      emptyMessage={direction === 'rtl' ? 'لا توجد تعديلات لهذا الشهر' : 'No adjustments this month'}
                    />
                  </div>
                </CardContent>
              </Card>

              <EditDeductionDialog
                open={editDialogOpen}
                onOpenChange={setEditDialogOpen}
                employeeId={employee.id}
                employeeName={employee.full_name}
                month={currentMonth}
                baseSalary={employee.base_salary}
                onSuccess={() => refetchAdjustments()}
              />
            </TabsContent>

            {/* Verification Settings Tab */}
          </Tabs>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

// Helper function to calculate expected work days
function getExpectedWorkDays(start: Date, end: Date, weekendDays: string[]): number {
  let count = 0;
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const current = new Date(start);
  
  while (current <= end) {
    const dayName = dayNames[current.getDay()];
    if (!weekendDays.includes(dayName)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
}

export default EmployeeDetails;
