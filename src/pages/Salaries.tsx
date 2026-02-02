import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSuperAdminCompanyAccess } from '@/hooks/useSuperAdminCompanyAccess';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, Download, TrendingUp, TrendingDown, Minus, Edit, Loader2, ListOrdered, FileSpreadsheet } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth } from 'date-fns';
import EditDeductionDialog from '@/components/salaries/EditDeductionDialog';
import AdjustmentsList from '@/components/salaries/AdjustmentsList';
import { useSalaryAdjustments } from '@/hooks/useSalaryAdjustments';
import { exportSalaryReport } from '@/lib/exportUtils';
import { toast } from 'sonner';

interface EmployeeWithSalary {
  id: string;
  full_name: string;
  base_salary: number | null;
  currency: string | null;
  total_bonus: number;
  total_deduction: number;
  work_days: number;
  is_freelancer: boolean;
  hourly_rate: number | null;
  // For freelancers: calculated from attendance hours
  worked_hours: number;
  hourly_earnings: number;
  // Manual bonuses only (excluding auto-generated)
  manual_bonus: number;
}

const Salaries = () => {
  const { t, language, direction } = useLanguage();
  const { effectiveCompanyId } = useSuperAdminCompanyAccess();
  const [employees, setEmployees] = useState<EmployeeWithSalary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<{ id: string; name: string } | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Use the adjustments hook
  const { data: adjustments = [], isLoading: adjustmentsLoading, refetch: refetchAdjustments } = useSalaryAdjustments(selectedMonth);

  const fetchSalaryData = async () => {
    if (!effectiveCompanyId) return;

    setLoading(true);
    try {
      const monthStart = startOfMonth(new Date(selectedMonth + '-01'));
      const monthStr = format(monthStart, 'yyyy-MM-dd');

      // Fetch employees
      const { data: employeesData, error: empError } = await supabase
        .from('employees')
        .select('id, full_name, base_salary, currency, is_freelancer, hourly_rate')
        .eq('company_id', effectiveCompanyId)
        .eq('is_active', true);

      if (empError) throw empError;

      // Fetch salary adjustments for the month (including is_auto_generated flag)
      const { data: adjustmentsData, error: adjError } = await supabase
        .from('salary_adjustments')
        .select('employee_id, bonus, deduction, is_auto_generated')
        .eq('company_id', effectiveCompanyId)
        .gte('month', monthStr)
        .lt('month', format(new Date(new Date(monthStr).setMonth(new Date(monthStr).getMonth() + 1)), 'yyyy-MM-dd'));

      if (adjError) throw adjError;

      // Fetch attendance for work days count AND hours calculation
      const { data: attendance, error: attError } = await supabase
        .from('attendance_logs')
        .select('employee_id, date, check_in_time, check_out_time')
        .eq('company_id', effectiveCompanyId)
        .gte('date', monthStr)
        .lt('date', format(new Date(new Date(monthStr).setMonth(new Date(monthStr).getMonth() + 1)), 'yyyy-MM-dd'));

      if (attError) throw attError;

      // Aggregate data per employee
      const employeeSalaries = (employeesData || []).map(emp => {
        const empAdjustments = (adjustmentsData || []).filter(a => a.employee_id === emp.id);
        const isFreelancer = (emp as any).is_freelancer === true;
        const hourlyRate = (emp as any).hourly_rate || 0;
        
        // For freelancers: separate manual bonuses from auto-generated
        // Manual bonuses = bonuses that are NOT auto-generated
        const manualBonus = empAdjustments
          .filter(a => !a.is_auto_generated && (a.bonus || 0) > 0)
          .reduce((sum, a) => sum + (a.bonus || 0), 0);
        
        // Total bonus still includes everything for display purposes
        const totalBonus = empAdjustments.reduce((sum, a) => sum + (a.bonus || 0), 0);
        const totalDeduction = empAdjustments.reduce((sum, a) => sum + (a.deduction || 0), 0);
        
        // Calculate worked hours from attendance
        let workedMinutes = 0;
        const empAttendance = (attendance || []).filter(a => a.employee_id === emp.id);
        for (const log of empAttendance) {
          if (log.check_in_time && log.check_out_time) {
            const checkIn = new Date(log.check_in_time);
            const checkOut = new Date(log.check_out_time);
            const mins = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60) - 60; // subtract 1hr break
            workedMinutes += Math.max(0, mins);
          }
        }
        const workedHours = workedMinutes / 60;
        const hourlyEarnings = workedHours * hourlyRate;
        
        const workDays = new Set(empAttendance.map(a => a.date)).size;

        return {
          id: emp.id,
          full_name: emp.full_name,
          base_salary: emp.base_salary,
          currency: emp.currency,
          total_bonus: totalBonus,
          total_deduction: totalDeduction,
          work_days: workDays,
          is_freelancer: isFreelancer,
          hourly_rate: hourlyRate,
          worked_hours: Math.round(workedHours * 10) / 10,
          hourly_earnings: Math.round(hourlyEarnings * 100) / 100,
          manual_bonus: manualBonus,
        };
      });

      setEmployees(employeeSalaries);
    } catch (error) {
      console.error('Error fetching salary data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalaryData();
    refetchAdjustments();
  }, [effectiveCompanyId, selectedMonth]);

  // For freelancers: net salary = hourly_earnings + manual_bonus - deductions
  // For regular: net salary = base_salary + total_bonus - total_deduction
  const totalPayroll = employees.reduce((sum, e) => {
    if (e.is_freelancer) {
      // Freelancer: hourly earnings (from attendance) + manual bonuses - deductions
      return sum + (e.hourly_earnings + e.manual_bonus - e.total_deduction);
    }
    return sum + ((e.base_salary || 0) + e.total_bonus - e.total_deduction);
  }, 0);
  // For stats: show manual bonuses for freelancers, total for regular
  const totalBonuses = employees.reduce((sum, e) => {
    if (e.is_freelancer) {
      return sum + e.manual_bonus;
    }
    return sum + e.total_bonus;
  }, 0);
  const totalDeductions = employees.reduce((sum, e) => sum + e.total_deduction, 0);

  const handleEditClick = (employee: EmployeeWithSalary) => {
    setSelectedEmployee({ id: employee.id, name: employee.full_name });
    setEditDialogOpen(true);
  };

  const handleAdjustmentRefresh = () => {
    refetchAdjustments();
    fetchSalaryData();
  };

  const getStatusBadge = (workDays: number) => {
    if (workDays >= 20) {
      return <Badge className="bg-success hover:bg-success/90">{t('salaries.paid') || 'مكتمل'}</Badge>;
    } else if (workDays >= 10) {
      return <Badge className="bg-warning hover:bg-warning/90">{t('salaries.processing') || 'جاري'}</Badge>;
    }
    return <Badge variant="outline">{t('salaries.pending') || 'معلق'}</Badge>;
  };

  const months = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    return {
      value: format(date, 'yyyy-MM'),
      label: format(date, 'MMMM yyyy'),
    };
  });

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
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t('nav.salaries')}</h1>
            <p className="text-muted-foreground mt-1">
              {t('salaries.manage')}
            </p>
          </div>
          <Button 
            variant="outline"
            onClick={() => {
              if (employees.length === 0) {
                toast.error(language === 'ar' ? 'لا توجد بيانات للتصدير' : 'No data to export');
                return;
              }
              exportSalaryReport(employees, selectedMonth, direction === 'rtl');
              toast.success(language === 'ar' ? 'تم تصدير التقرير بنجاح' : 'Report exported successfully');
            }}
          >
            <FileSpreadsheet className="w-4 h-4 me-2" />
            {t('salaries.exportReport')}
          </Button>
        </motion.div>

        {/* Stats */}
        <div className="grid gap-3 grid-cols-3">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <Card className="card-hover">
              <CardContent className="p-3 sm:pt-6 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <DollarSign className="w-4 h-4 sm:w-6 sm:h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] sm:text-sm text-muted-foreground">{t('salaries.totalPayroll')}</p>
                    <p className="text-sm sm:text-2xl font-bold text-foreground">{totalPayroll.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <Card className="card-hover">
              <CardContent className="p-3 sm:pt-6 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg bg-success/10 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 sm:w-6 sm:h-6 text-success" />
                  </div>
                  <div>
                    <p className="text-[10px] sm:text-sm text-muted-foreground">{t('salaries.totalBonuses')}</p>
                    <p className="text-sm sm:text-2xl font-bold text-success">+{totalBonuses.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <Card className="card-hover">
              <CardContent className="p-3 sm:pt-6 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg bg-destructive/10 flex items-center justify-center">
                    <TrendingDown className="w-4 h-4 sm:w-6 sm:h-6 text-destructive" />
                  </div>
                  <div>
                    <p className="text-[10px] sm:text-sm text-muted-foreground">{t('salaries.totalDeductions')}</p>
                    <p className="text-sm sm:text-2xl font-bold text-destructive">-{totalDeductions.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Month Filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder={t('salaries.selectMonth')} />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month) => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tabs for Overview and Adjustments List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                {language === 'ar' ? 'ملخص الرواتب' : 'Salary Overview'}
              </TabsTrigger>
              <TabsTrigger value="adjustments" className="flex items-center gap-2">
                <ListOrdered className="w-4 h-4" />
                {language === 'ar' ? 'سجل التعديلات' : 'Adjustments Log'}
                {adjustments.length > 0 && (
                  <Badge variant="secondary" className="ms-1">{adjustments.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <Card>
                <CardHeader>
                  <CardTitle className={`flex items-center gap-2 ${direction === 'rtl' ? 'flex-row-reverse justify-end' : ''}`}>
                    <DollarSign className="w-5 h-5 text-primary" />
                    {language === 'ar' ? 'تفاصيل المرتبات' : t('salaries.breakdown')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                  ) : employees.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                      <DollarSign className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground/50 mb-4" />
                      <h3 className="text-base sm:text-lg font-medium text-foreground mb-1">
                        {language === 'ar' ? 'لا توجد بيانات رواتب' : 'No salary data'}
                      </h3>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {language === 'ar' ? 'قم بإضافة موظفين لعرض بيانات الرواتب' : 'Add employees to view salary data'}
                      </p>
                    </div>
                  ) : (
                    <>
                    {/* Mobile Cards View */}
                    <div className="block sm:hidden p-3 space-y-3">
                      {employees.map((employee) => {
                        // Freelancer: net = hourly_earnings + manual_bonus - deduction
                        const netSalary = employee.is_freelancer 
                          ? (employee.hourly_earnings + employee.manual_bonus - employee.total_deduction)
                          : ((employee.base_salary || 0) + employee.total_bonus - employee.total_deduction);
                        return (
                          <Card key={employee.id}>
                            <CardContent className="p-3">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center">
                                    <span className="text-xs font-medium text-accent-foreground">
                                      {employee.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                    </span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="font-medium text-foreground text-sm">{employee.full_name}</span>
                                    {employee.is_freelancer && (
                                      <Badge variant="outline" className="text-[10px] w-fit mt-0.5">
                                        {language === 'ar' ? 'عمالة غير منتظمة' : 'Freelancer'}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditClick(employee)}
                                  className="text-primary hover:text-primary/80 h-8 w-8 p-0"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <p className="text-muted-foreground">{t('salaries.workDays')}</p>
                                  <p className="font-medium">{employee.work_days}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">
                                    {employee.is_freelancer 
                                      ? (language === 'ar' ? 'ساعات العمل' : 'Hours')
                                      : t('salaries.baseSalary')}
                                  </p>
                                  <p className="font-medium">
                                    {employee.is_freelancer 
                                      ? `${employee.worked_hours} ${language === 'ar' ? 'ساعة' : 'hrs'}`
                                      : `${(employee.base_salary || 0).toLocaleString()}`}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">
                                    {employee.is_freelancer 
                                      ? (language === 'ar' ? 'المرتب' : 'Earnings')
                                      : t('salaries.bonus')}
                                  </p>
                                  <p className={employee.is_freelancer ? 'font-medium' : (employee.total_bonus > 0 ? 'text-success font-medium' : 'text-muted-foreground')}>
                                    {employee.is_freelancer 
                                      ? `${employee.hourly_earnings.toLocaleString()}`
                                      : (employee.total_bonus > 0 ? `+${employee.total_bonus.toFixed(2)}` : '0')}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">
                                    {employee.is_freelancer 
                                      ? (language === 'ar' ? 'مكافآت' : 'Bonus')
                                      : t('salaries.deductions')}
                                  </p>
                                  <p className={employee.is_freelancer 
                                    ? (employee.manual_bonus > 0 ? 'text-success font-medium' : 'text-muted-foreground')
                                    : (employee.total_deduction > 0 ? 'text-destructive font-medium' : 'text-muted-foreground')}>
                                    {employee.is_freelancer 
                                      ? (employee.manual_bonus > 0 ? `+${employee.manual_bonus}` : '0')
                                      : (employee.total_deduction > 0 ? `-${employee.total_deduction}` : '0')}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">{t('salaries.deductions')}</p>
                                  <p className={employee.total_deduction > 0 ? 'text-destructive font-medium' : 'text-muted-foreground'}>
                                    {employee.total_deduction > 0 ? `-${employee.total_deduction}` : '0'}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center justify-between mt-3 pt-2 border-t">
                                <span className="text-xs text-muted-foreground">{t('salaries.netSalary')}</span>
                                <span className="font-bold text-foreground">{netSalary.toLocaleString()} {employee.currency || 'EGP'}</span>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                    
                    {/* Desktop Table View */}
                    <Table className="hidden sm:table" dir={direction}>
                      <TableHeader>
                        <TableRow>
                          {direction === 'rtl' ? (
                            <>
                              <TableHead className="text-right">{t('salaries.employee')}</TableHead>
                              <TableHead className="text-right">{t('salaries.workDays')}</TableHead>
                              <TableHead className="text-right">{t('salaries.baseSalary')}</TableHead>
                              <TableHead className="text-right">{t('salaries.bonus')}</TableHead>
                              <TableHead className="text-right">{t('salaries.deductions')}</TableHead>
                              <TableHead className="text-right">{t('salaries.netSalary')}</TableHead>
                              <TableHead className="text-right">{t('employees.status')}</TableHead>
                              <TableHead className="text-right">{t('common.actions')}</TableHead>
                            </>
                          ) : (
                            <>
                              <TableHead>{t('salaries.employee')}</TableHead>
                              <TableHead>{t('salaries.workDays')}</TableHead>
                              <TableHead>{t('salaries.baseSalary')}</TableHead>
                              <TableHead>{t('salaries.bonus')}</TableHead>
                              <TableHead>{t('salaries.deductions')}</TableHead>
                              <TableHead>{t('salaries.netSalary')}</TableHead>
                              <TableHead>{t('employees.status')}</TableHead>
                              <TableHead>{t('common.actions')}</TableHead>
                            </>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {employees.map((employee) => {
                          // Freelancer: net = hourly_earnings + manual_bonus - deduction
                          const netSalary = employee.is_freelancer 
                            ? (employee.hourly_earnings + employee.manual_bonus - employee.total_deduction)
                            : ((employee.base_salary || 0) + employee.total_bonus - employee.total_deduction);
                          return (
                            <TableRow key={employee.id}>
                              {direction === 'rtl' ? (
                                <>
                                  <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-3">
                                      <div className="flex flex-col items-end">
                                        <span className="font-medium text-foreground">{employee.full_name}</span>
                                        {employee.is_freelancer && (
                                          <Badge variant="outline" className="text-[10px] mt-0.5">
                                            {language === 'ar' ? 'عمالة غير منتظمة' : 'Freelancer'}
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center">
                                        <span className="text-xs font-medium text-accent-foreground">
                                          {employee.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                        </span>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right text-muted-foreground">
                                    {employee.work_days}
                                  </TableCell>
                                  <TableCell className="text-right text-muted-foreground">
                                    {employee.is_freelancer 
                                      ? `${employee.worked_hours} ساعة = ${employee.hourly_earnings.toLocaleString()} ${employee.currency || 'EGP'}`
                                      : `${(employee.base_salary || 0).toLocaleString()} ${employee.currency || 'EGP'}`}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {employee.is_freelancer ? (
                                      employee.manual_bonus > 0 ? (
                                        <span className="text-success flex items-center justify-end gap-1">
                                          <TrendingUp className="w-3 h-3" />
                                          +{employee.manual_bonus.toFixed(2)}
                                        </span>
                                      ) : (
                                        <span className="text-muted-foreground flex items-center justify-end gap-1">
                                          <Minus className="w-3 h-3" />
                                          0
                                        </span>
                                      )
                                    ) : (
                                      employee.total_bonus > 0 ? (
                                        <span className="text-success flex items-center justify-end gap-1">
                                          <TrendingUp className="w-3 h-3" />
                                          +{employee.total_bonus.toFixed(2)}
                                        </span>
                                      ) : (
                                        <span className="text-muted-foreground flex items-center justify-end gap-1">
                                          <Minus className="w-3 h-3" />
                                          0
                                        </span>
                                      )
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {employee.total_deduction > 0 ? (
                                      <span className="text-destructive flex items-center justify-end gap-1">
                                        <TrendingDown className="w-3 h-3" />
                                        -{employee.total_deduction.toFixed(2)}
                                      </span>
                                    ) : (
                                      <span className="text-muted-foreground flex items-center justify-end gap-1">
                                        <Minus className="w-3 h-3" />
                                        0
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right font-bold text-foreground">
                                    {netSalary.toLocaleString()} {employee.currency || 'EGP'}
                                  </TableCell>
                                  <TableCell className="text-right">{getStatusBadge(employee.work_days)}</TableCell>
                                  <TableCell className="text-right">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleEditClick(employee)}
                                      className="text-primary hover:text-primary/80"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                  </TableCell>
                                </>
                              ) : (
                                <>
                                  <TableCell>
                                    <div className="flex items-center gap-3">
                                      <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center">
                                        <span className="text-xs font-medium text-accent-foreground">
                                          {employee.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                        </span>
                                      </div>
                                      <div className="flex flex-col">
                                        <span className="font-medium text-foreground">{employee.full_name}</span>
                                        {employee.is_freelancer && (
                                          <Badge variant="outline" className="text-[10px] w-fit mt-0.5">
                                            Freelancer
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-muted-foreground">
                                    {employee.work_days}
                                  </TableCell>
                                  <TableCell className="text-muted-foreground">
                                    {employee.is_freelancer 
                                      ? `${employee.worked_hours} hrs = ${employee.hourly_earnings.toLocaleString()} ${employee.currency || 'EGP'}`
                                      : `${(employee.base_salary || 0).toLocaleString()} ${employee.currency || 'EGP'}`}
                                  </TableCell>
                                  <TableCell>
                                    {employee.is_freelancer ? (
                                      employee.manual_bonus > 0 ? (
                                        <span className="text-success flex items-center gap-1">
                                          <TrendingUp className="w-3 h-3" />
                                          +{employee.manual_bonus.toFixed(2)}
                                        </span>
                                      ) : (
                                        <span className="text-muted-foreground flex items-center gap-1">
                                          <Minus className="w-3 h-3" />
                                          0
                                        </span>
                                      )
                                    ) : (
                                      employee.total_bonus > 0 ? (
                                        <span className="text-success flex items-center gap-1">
                                          <TrendingUp className="w-3 h-3" />
                                          +{employee.total_bonus.toFixed(2)}
                                        </span>
                                      ) : (
                                        <span className="text-muted-foreground flex items-center gap-1">
                                          <Minus className="w-3 h-3" />
                                          0
                                        </span>
                                      )
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {employee.total_deduction > 0 ? (
                                      <span className="text-destructive flex items-center gap-1">
                                        <TrendingDown className="w-3 h-3" />
                                        -{employee.total_deduction.toFixed(2)}
                                      </span>
                                    ) : (
                                      <span className="text-muted-foreground flex items-center gap-1">
                                        <Minus className="w-3 h-3" />
                                        0
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell className="font-bold text-foreground">
                                    {netSalary.toLocaleString()} {employee.currency || 'EGP'}
                                  </TableCell>
                                  <TableCell>{getStatusBadge(employee.work_days)}</TableCell>
                                  <TableCell>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleEditClick(employee)}
                                      className="text-primary hover:text-primary/80"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                  </TableCell>
                                </>
                              )}
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="adjustments">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ListOrdered className="w-5 h-5 text-primary" />
                    {language === 'ar' ? 'سجل المكافآت والخصومات' : 'Bonuses & Deductions Log'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <AdjustmentsList
                    adjustments={adjustments}
                    loading={adjustmentsLoading}
                    onRefresh={handleAdjustmentRefresh}
                    showEmployeeName={true}
                    emptyMessage={language === 'ar' ? 'لا توجد تعديلات لهذا الشهر' : 'No adjustments for this month'}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>

      <EditDeductionDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        employeeId={selectedEmployee?.id || ''}
        employeeName={selectedEmployee?.name || ''}
        month={selectedMonth}
        baseSalary={employees.find(e => e.id === selectedEmployee?.id)?.base_salary || 0}
        onSuccess={handleAdjustmentRefresh}
      />
    </DashboardLayout>
  );
};

export default Salaries;
