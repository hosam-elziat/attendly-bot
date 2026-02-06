import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/hooks/useCompany';
import { usePositions } from '@/hooks/usePositions';
import { useEmployees } from '@/hooks/useEmployees';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Globe, Moon, Sun, Clock, Building, Loader2, Calendar, Banknote, Scale, AlertTriangle, Timer, MapPin, UserPlus, ShieldCheck, Bell, BellRing, UserX, LogOut } from 'lucide-react';
import AttendanceVerificationSettings from '@/components/settings/AttendanceVerificationSettings';
import CompanyLocationsManager from '@/components/settings/CompanyLocationsManager';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { CompanySchema } from '@/lib/validations';
import { CURRENCIES, ARAB_COUNTRIES } from './EmployeeDetails';
import { COUNTRIES } from '@/hooks/useAdvancedStats';

const Settings = () => {
  const { t, language, setLanguage, direction } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { profile } = useAuth();
  const { data: company, isLoading, refetch } = useCompany();
  const { data: positions = [] } = usePositions();
  const { data: employees = [] } = useEmployees();
  const queryClient = useQueryClient();
  
  const [saving, setSaving] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [timezone, setTimezone] = useState('Africa/Cairo');
  const [defaultCurrency, setDefaultCurrency] = useState('EGP');
  const [workStart, setWorkStart] = useState('09:00');
  const [workEnd, setWorkEnd] = useState('17:00');
  const [breakDuration, setBreakDuration] = useState(60);
  const [weekendDays, setWeekendDays] = useState<string[]>(['friday']);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Attendance policy states
  const [dailyLateAllowance, setDailyLateAllowance] = useState(15);
  const [monthlyLateAllowance, setMonthlyLateAllowance] = useState(60);
  const [defaultMonthlyPermissionHours, setDefaultMonthlyPermissionHours] = useState(4);
  const [lateUnder15Deduction, setLateUnder15Deduction] = useState(0.25);
  const [late15To30Deduction, setLate15To30Deduction] = useState(0.5);
  const [lateOver30Deduction, setLateOver30Deduction] = useState(1);
  const [absenceWithoutPermissionDeduction, setAbsenceWithoutPermissionDeduction] = useState(2);
  const [maxExcusedAbsenceDays, setMaxExcusedAbsenceDays] = useState(2);
  const [overtimeMultiplier, setOvertimeMultiplier] = useState(2);
  const [countryCode, setCountryCode] = useState('EG');
  
  // Leave policy states
  const [annualLeaveDays, setAnnualLeaveDays] = useState(21);
  const [emergencyLeaveDays, setEmergencyLeaveDays] = useState(7);

  // Reminder and auto-absence states
  const [autoAbsentAfterHours, setAutoAbsentAfterHours] = useState(2);
  const [checkinReminderCount, setCheckinReminderCount] = useState(3);
  const [checkinReminderInterval, setCheckinReminderInterval] = useState(10);
  const [checkoutReminderCount, setCheckoutReminderCount] = useState(2);
  const [checkoutReminderInterval, setCheckoutReminderInterval] = useState(10);
  
  // Early departure settings
  const [earlyDepartureThreshold, setEarlyDepartureThreshold] = useState(30);
  const [earlyDepartureDeduction, setEarlyDepartureDeduction] = useState(0.5);
  const [earlyDepartureGrace, setEarlyDepartureGrace] = useState(5);

  // Join request reviewer states
  const [joinRequestReviewerType, setJoinRequestReviewerType] = useState<string | null>(null);
  const [joinRequestReviewerId, setJoinRequestReviewerId] = useState<string | null>(null);

  const WEEKDAYS = [
    { id: 'sunday', label: t('common.sunday') },
    { id: 'monday', label: t('common.monday') },
    { id: 'tuesday', label: t('common.tuesday') },
    { id: 'wednesday', label: t('common.wednesday') },
    { id: 'thursday', label: t('common.thursday') },
    { id: 'friday', label: t('common.friday') },
    { id: 'saturday', label: t('common.saturday') },
  ];

  // Update form when company data loads
  useEffect(() => {
    if (company) {
      setCompanyName(company.name || '');
      setTimezone(company.timezone || 'Africa/Cairo');
      setDefaultCurrency((company as any).default_currency || 'EGP');
      setWorkStart(company.work_start_time?.slice(0, 5) || '09:00');
      setWorkEnd(company.work_end_time?.slice(0, 5) || '17:00');
      setBreakDuration(company.break_duration_minutes || 60);
      
      // Attendance policy
      setDailyLateAllowance((company as any).daily_late_allowance_minutes || 15);
      setMonthlyLateAllowance((company as any).monthly_late_allowance_minutes || 60);
      setDefaultMonthlyPermissionHours((company as any).default_monthly_permission_hours || 4);
      setLateUnder15Deduction((company as any).late_under_15_deduction || 0.25);
      setLate15To30Deduction((company as any).late_15_to_30_deduction || 0.5);
      setLateOver30Deduction((company as any).late_over_30_deduction || 1);
      setAbsenceWithoutPermissionDeduction((company as any).absence_without_permission_deduction || 2);
      setMaxExcusedAbsenceDays((company as any).max_excused_absence_days || 2);
      setOvertimeMultiplier((company as any).overtime_multiplier || 2);
      setCountryCode((company as any).country_code || 'EG');
      
      // Leave policy
      setAnnualLeaveDays((company as any).annual_leave_days || 21);
      setEmergencyLeaveDays((company as any).emergency_leave_days || 7);
      
      // Reminder and auto-absence settings
      setAutoAbsentAfterHours((company as any).auto_absent_after_hours || 2);
      setCheckinReminderCount((company as any).checkin_reminder_count || 3);
      setCheckinReminderInterval((company as any).checkin_reminder_interval_minutes || 10);
      setCheckoutReminderCount((company as any).checkout_reminder_count || 2);
      setCheckoutReminderInterval((company as any).checkout_reminder_interval_minutes || 10);
      
      // Early departure settings
      setEarlyDepartureThreshold((company as any).early_departure_threshold_minutes || 30);
      setEarlyDepartureDeduction((company as any).early_departure_deduction || 0.5);
      setEarlyDepartureGrace((company as any).early_departure_grace_minutes || 5);
      
      // Default weekend days
      setWeekendDays((company as any).default_weekend_days || ['friday']);
      
      // Join request reviewer
      setJoinRequestReviewerType((company as any).join_request_reviewer_type || null);
      setJoinRequestReviewerId((company as any).join_request_reviewer_id || null);
    }
  }, [company]);

  const handleWeekendToggle = (day: string) => {
    setWeekendDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const handleSaveCompany = async () => {
    if (!company?.id) {
      toast.error('لم يتم العثور على الشركة');
      return;
    }

    // Validate input
    const validationResult = CompanySchema.safeParse({
      name: companyName,
      timezone: timezone,
    });

    if (!validationResult.success) {
      const newErrors: Record<string, string> = {};
      validationResult.error.errors.forEach((err) => {
        newErrors[err.path.join('.')] = err.message;
      });
      setErrors(newErrors);
      toast.error(validationResult.error.errors[0].message);
      return;
    }

    setSaving(true);
    setErrors({});
    
    try {
      const { error } = await supabase
        .from('companies')
        .update({
          name: validationResult.data.name,
          timezone: validationResult.data.timezone,
          default_currency: defaultCurrency,
        })
        .eq('id', company.id);

      if (error) throw error;
      
      await refetch();
      toast.success('تم حفظ إعدادات الشركة');
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error('فشل في الحفظ: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveWeekendDays = async () => {
    if (!company?.id) {
      toast.error('لم يتم العثور على الشركة');
      return;
    }

    if (weekendDays.length === 0) {
      toast.error('يجب اختيار يوم عطلة واحد على الأقل');
      return;
    }

    setSaving(true);
    
    try {
      const { error } = await supabase
        .from('companies')
        .update({
          default_weekend_days: weekendDays,
        } as any)
        .eq('id', company.id);

      if (error) throw error;
      
      await refetch();
      toast.success('تم حفظ أيام العطلة الافتراضية');
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error('فشل في الحفظ: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveWorkHours = async () => {
    if (!company?.id) {
      toast.error('لم يتم العثور على الشركة');
      return;
    }

    // Validate input
    const validationResult = CompanySchema.safeParse({
      name: company.name,
      work_start_time: workStart + ':00',
      work_end_time: workEnd + ':00',
      break_duration_minutes: breakDuration,
    });

    if (!validationResult.success) {
      toast.error(validationResult.error.errors[0].message);
      return;
    }

    setSaving(true);
    
    try {
      const { error } = await supabase
        .from('companies')
        .update({
          work_start_time: workStart + ':00',
          work_end_time: workEnd + ':00',
          break_duration_minutes: breakDuration,
        })
        .eq('id', company.id);

      if (error) throw error;
      
      await refetch();
      toast.success('تم حفظ ساعات العمل');
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error('فشل في الحفظ: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAttendancePolicy = async () => {
    if (!company?.id) {
      toast.error('لم يتم العثور على الشركة');
      return;
    }

    // Validate values
    if (dailyLateAllowance < 0 || dailyLateAllowance > 60) {
      toast.error('السماحية اليومية يجب أن تكون بين 0 و 60 دقيقة');
      return;
    }
    if (monthlyLateAllowance < 0 || monthlyLateAllowance > 300) {
      toast.error('السماحية الشهرية يجب أن تكون بين 0 و 300 دقيقة');
      return;
    }

    setSaving(true);
    
    try {
      const { error } = await supabase
        .from('companies')
        .update({
          daily_late_allowance_minutes: dailyLateAllowance,
          monthly_late_allowance_minutes: monthlyLateAllowance,
          default_monthly_permission_hours: defaultMonthlyPermissionHours,
          late_under_15_deduction: lateUnder15Deduction,
          late_15_to_30_deduction: late15To30Deduction,
          late_over_30_deduction: lateOver30Deduction,
          absence_without_permission_deduction: absenceWithoutPermissionDeduction,
          max_excused_absence_days: maxExcusedAbsenceDays,
          overtime_multiplier: overtimeMultiplier,
          country_code: countryCode,
          annual_leave_days: annualLeaveDays,
          emergency_leave_days: emergencyLeaveDays,
          auto_absent_after_hours: autoAbsentAfterHours,
          checkin_reminder_count: checkinReminderCount,
          checkin_reminder_interval_minutes: checkinReminderInterval,
          checkout_reminder_count: checkoutReminderCount,
          checkout_reminder_interval_minutes: checkoutReminderInterval,
          early_departure_threshold_minutes: earlyDepartureThreshold,
          early_departure_deduction: earlyDepartureDeduction,
          early_departure_grace_minutes: earlyDepartureGrace,
        } as any)
        .eq('id', company.id);

      if (error) throw error;
      
      await refetch();
      toast.success('تم حفظ قوانين الحضور والانصراف');
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error('فشل في الحفظ: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveJoinRequestReviewer = async () => {
    if (!company?.id) {
      toast.error('لم يتم العثور على الشركة');
      return;
    }

    setSaving(true);
    
    try {
      const { error } = await supabase
        .from('companies')
        .update({
          join_request_reviewer_type: joinRequestReviewerType,
          join_request_reviewer_id: joinRequestReviewerId,
        } as any)
        .eq('id', company.id);

      if (error) throw error;
      
      await refetch();
      toast.success('تم حفظ إعدادات مراجعة طلبات الانضمام');
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error('فشل في الحفظ: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-2xl font-bold text-foreground">{t('settings.title')}</h1>
          <p className="text-muted-foreground mt-1">
            {t('settings.managePreferences')}
          </p>
        </motion.div>

        {/* Language Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          data-tour="language-select"
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" />
                {t('settings.language')}
              </CardTitle>
              <CardDescription>
                {t('settings.languageDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <Label className="text-foreground">{t('settings.displayLanguage')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.currentDirection')}: {direction.toUpperCase()}
                  </p>
                </div>
                <Select value={language} onValueChange={(value: 'en' | 'ar') => setLanguage(value)}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">🇬🇧 English</SelectItem>
                    <SelectItem value="ar">🇸🇦 العربية</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Theme Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          data-tour="theme-select"
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {theme === 'light' ? (
                  <Sun className="w-5 h-5 text-primary" />
                ) : (
                  <Moon className="w-5 h-5 text-primary" />
                )}
                {t('settings.theme')}
              </CardTitle>
              <CardDescription>
                {t('settings.themeDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <Label className="text-foreground">{t('settings.darkMode')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.switchTheme')}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Sun className="w-4 h-4 text-muted-foreground" />
                  <Switch
                    checked={theme === 'dark'}
                    onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                  />
                  <Moon className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Company Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          data-tour="company-info"
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="w-5 h-5 text-primary" />
                {t('settings.companyInfo')}
              </CardTitle>
              <CardDescription>
                {t('settings.updateCompany')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-6">
              <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="company-name">{t('settings.companyName')}</Label>
                  <Input 
                    id="company-name" 
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    maxLength={100}
                    className={errors.name ? 'border-destructive' : ''}
                  />
                  {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">{t('settings.timezone')}</Label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger id="timezone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ARAB_COUNTRIES.map((country) => (
                        <SelectItem key={country.code} value={country.timezone}>
                          {country.name} ({country.offset})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="default-currency">{t('settings.defaultCurrency')}</Label>
                <Select value={defaultCurrency} onValueChange={setDefaultCurrency}>
                  <SelectTrigger id="default-currency" className="w-full sm:w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((curr) => (
                      <SelectItem key={curr.code} value={curr.code}>
                        {curr.symbol} - {curr.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">{t('settings.defaultCurrencyDesc')}</p>
              </div>
              <Button onClick={handleSaveCompany} className="btn-primary-gradient" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                {t('common.save')}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Default Working Hours */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          data-tour="work-hours"
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                {t('settings.workingHours')}
              </CardTitle>
              <CardDescription>
                {t('settings.workingHoursDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-6">
              <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="work-start">{t('settings.workStart')}</Label>
                  <Input 
                    id="work-start" 
                    type="time" 
                    value={workStart}
                    onChange={(e) => setWorkStart(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="work-end">{t('settings.workEnd')}</Label>
                  <Input 
                    id="work-end" 
                    type="time" 
                    value={workEnd}
                    onChange={(e) => setWorkEnd(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="break-duration">{t('settings.breakDuration')}</Label>
                  <NumberInput 
                    id="break-duration" 
                    min={0}
                    max={480}
                    value={breakDuration}
                    onChange={setBreakDuration}
                  />
                </div>
              </div>
              <Button onClick={handleSaveWorkHours} className="btn-primary-gradient" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                {t('common.save')}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Default Weekend Days */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                {t('settings.weekendDays')}
              </CardTitle>
              <CardDescription>
                {t('settings.weekendDaysDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {WEEKDAYS.map((day) => (
                  <div key={day.id} className="flex items-center space-x-2 rtl:space-x-reverse">
                    <Checkbox 
                      id={day.id}
                      checked={weekendDays.includes(day.id)}
                      onCheckedChange={() => handleWeekendToggle(day.id)}
                    />
                    <Label htmlFor={day.id} className="text-sm font-normal cursor-pointer">
                      {day.label}
                    </Label>
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                {t('settings.weekendNote')}
              </p>
              <Button 
                onClick={handleSaveWeekendDays} 
                className="btn-primary-gradient mt-4" 
                disabled={saving}
              >
                {saving && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                {t('common.save')}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Join Request Reviewer Settings - Simplified */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.55 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primary" />
                مراجعو طلبات الانضمام
              </CardTitle>
              <CardDescription>
                تحديد المسؤولين عن مراجعة طلبات انضمام الموظفين الجدد عبر تليجرام
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">كيف يعمل هذا؟</h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>يمكنك تحديد عدة مناصب وموظفين للمراجعة</li>
                  <li>عند تقديم طلب انضمام جديد، يتلقى جميع المراجعين إشعاراً</li>
                  <li>أول مراجع يتخذ قراراً (قبول/رفض) ينهي الطلب</li>
                </ul>
              </div>
              <p className="text-sm text-muted-foreground">
                لإدارة المراجعين، انتقل إلى صفحة <a href="/dashboard/join-requests" className="text-primary hover:underline">طلبات الانضمام</a> واضغط على زر "إعدادات المراجعين"
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Attendance Policies */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.6 }}
          data-tour="deductions-section"
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-primary" />
                قوانين الحضور والانصراف
              </CardTitle>
              <CardDescription>
                تحديد قوانين التأخير والغياب والخصومات
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Late Allowance */}
              <div className="space-y-4">
                <h3 className="font-medium text-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  سماحية التأخير
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="daily-late">السماحية اليومية (بالدقائق)</Label>
                    <NumberInput 
                      id="daily-late" 
                      min={0}
                      max={60}
                      value={dailyLateAllowance}
                      onChange={setDailyLateAllowance}
                    />
                    <p className="text-xs text-muted-foreground">الحد الأقصى للتأخير اليومي بدون خصم</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="monthly-late">السماحية الشهرية (بالدقائق)</Label>
                    <NumberInput 
                      id="monthly-late" 
                      min={0}
                      max={300}
                      value={monthlyLateAllowance}
                      onChange={setMonthlyLateAllowance}
                    />
                    <p className="text-xs text-muted-foreground">رصيد التأخيرات الشهري للموظف</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="monthly-permission-hours">ساعات الإذن الشهرية المسموحة</Label>
                    <NumberInput 
                      id="monthly-permission-hours" 
                      min={0}
                      max={24}
                      value={defaultMonthlyPermissionHours}
                      onChange={setDefaultMonthlyPermissionHours}
                    />
                    <p className="text-xs text-muted-foreground">الحد الأقصى لساعات الإذن (تأخير/انصراف مبكر) شهرياً للموظف</p>
                  </div>
                </div>
              </div>

              {/* Auto Absence & Reminders */}
              <div className="space-y-4">
                <h3 className="font-medium text-foreground flex items-center gap-2">
                  <BellRing className="w-4 h-4" />
                  الغياب التلقائي والتذكيرات
                </h3>
                
                {/* Auto Absence */}
                <div className="p-4 border rounded-lg bg-destructive/5 border-destructive/30 space-y-3">
                  <div className="flex items-center gap-2">
                    <UserX className="w-4 h-4 text-destructive" />
                    <Label className="font-medium text-destructive">الغياب التلقائي</Label>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="auto-absent-hours">يتم احتساب الموظف غائب بعد (ساعة)</Label>
                      <NumberInput 
                        id="auto-absent-hours" 
                        min={1}
                        max={8}
                        value={autoAbsentAfterHours}
                        onChange={setAutoAbsentAfterHours}
                      />
                      <p className="text-xs text-muted-foreground">
                        إذا لم يسجل الموظف حضوره خلال {autoAbsentAfterHours} ساعة من موعد بدء العمل، يُحتسب غائباً تلقائياً
                      </p>
                    </div>
                  </div>
                </div>

                {/* Check-in Reminders */}
                <div className="p-4 border rounded-lg bg-primary/5 border-primary/20 space-y-3">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-primary" />
                    <Label className="font-medium text-primary">تذكيرات الحضور</Label>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="checkin-reminder-count">عدد التذكيرات</Label>
                      <NumberInput 
                        id="checkin-reminder-count" 
                        min={0}
                        max={10}
                        value={checkinReminderCount}
                        onChange={setCheckinReminderCount}
                      />
                      <p className="text-xs text-muted-foreground">
                        عدد مرات إرسال تذكير الحضور للموظف (0 = بدون تذكيرات)
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="checkin-reminder-interval">الفترة بين كل تذكير (دقيقة)</Label>
                      <NumberInput 
                        id="checkin-reminder-interval" 
                        min={5}
                        max={60}
                        value={checkinReminderInterval}
                        onChange={setCheckinReminderInterval}
                      />
                      <p className="text-xs text-muted-foreground">
                        يبدأ التذكير من موعد الحضور ثم كل {checkinReminderInterval} دقيقة
                      </p>
                    </div>
                  </div>
                </div>

                {/* Check-out Reminders */}
                <div className="p-4 border rounded-lg bg-amber-500/10 border-amber-500/30 space-y-3">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-amber-600" />
                    <Label className="font-medium text-amber-600">تذكيرات الانصراف</Label>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="checkout-reminder-count">عدد التذكيرات</Label>
                      <NumberInput 
                        id="checkout-reminder-count" 
                        min={0}
                        max={10}
                        value={checkoutReminderCount}
                        onChange={setCheckoutReminderCount}
                      />
                      <p className="text-xs text-muted-foreground">
                        عدد مرات إرسال تذكير الانصراف للموظف (0 = بدون تذكيرات)
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="checkout-reminder-interval">الفترة بين كل تذكير (دقيقة)</Label>
                      <NumberInput 
                        id="checkout-reminder-interval" 
                        min={5}
                        max={60}
                        value={checkoutReminderInterval}
                        onChange={setCheckoutReminderInterval}
                      />
                      <p className="text-xs text-muted-foreground">
                        يبدأ التذكير بعد موعد الانصراف ثم كل {checkoutReminderInterval} دقيقة
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Deduction Rules */}
              <div className="space-y-4">
                <h3 className="font-medium text-foreground flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  قوانين الخصم (بالأيام)
                </h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-2 p-3 border rounded-lg bg-muted/30">
                    <Label htmlFor="late-under-15">تأخير أقل من 15 دقيقة</Label>
                    <NumberInput 
                      id="late-under-15" 
                      step={0.25}
                      min={0}
                      max={2}
                      value={lateUnder15Deduction}
                      onChange={setLateUnder15Deduction}
                    />
                    <p className="text-xs text-muted-foreground">خصم {lateUnder15Deduction === 0.25 ? 'ربع' : lateUnder15Deduction === 0.5 ? 'نصف' : lateUnder15Deduction} يوم</p>
                  </div>
                  <div className="space-y-2 p-3 border rounded-lg bg-muted/30">
                    <Label htmlFor="late-15-30">تأخير 15-30 دقيقة</Label>
                    <NumberInput 
                      id="late-15-30" 
                      step={0.25}
                      min={0}
                      max={2}
                      value={late15To30Deduction}
                      onChange={setLate15To30Deduction}
                    />
                    <p className="text-xs text-muted-foreground">خصم {late15To30Deduction === 0.5 ? 'نصف' : late15To30Deduction} يوم</p>
                  </div>
                  <div className="space-y-2 p-3 border rounded-lg bg-muted/30">
                    <Label htmlFor="late-over-30">تأخير أكثر من 30 دقيقة</Label>
                    <NumberInput 
                      id="late-over-30" 
                      step={0.5}
                      min={0}
                      max={3}
                      value={lateOver30Deduction}
                      onChange={setLateOver30Deduction}
                    />
                    <p className="text-xs text-muted-foreground">خصم {lateOver30Deduction} يوم</p>
                  </div>
                  <div className="space-y-2 p-3 border rounded-lg bg-destructive/10 border-destructive/30">
                    <Label htmlFor="absence-no-permission">غياب بدون إذن</Label>
                    <NumberInput 
                      id="absence-no-permission" 
                      step={0.5}
                      min={0}
                      max={5}
                      value={absenceWithoutPermissionDeduction}
                      onChange={setAbsenceWithoutPermissionDeduction}
                    />
                    <p className="text-xs text-muted-foreground">خصم {absenceWithoutPermissionDeduction} يوم</p>
                  </div>
                  <div className="space-y-2 p-3 border rounded-lg bg-muted/30">
                    <Label htmlFor="max-excused">أقصى غياب بإذن (أيام/شهر)</Label>
                    <NumberInput 
                      id="max-excused" 
                      min={0}
                      max={10}
                      value={maxExcusedAbsenceDays}
                      onChange={setMaxExcusedAbsenceDays}
                    />
                    <p className="text-xs text-muted-foreground">الحد الأقصى للغياب المسموح بإذن شهرياً</p>
                  </div>
                </div>
              </div>

              {/* Early Departure Settings */}
              <div className="space-y-4">
                <h3 className="font-medium text-foreground flex items-center gap-2">
                  <LogOut className="w-4 h-4" />
                  قوانين الانصراف المبكر
                </h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-2 p-3 border rounded-lg bg-amber-500/10 border-amber-500/30">
                    <Label htmlFor="early-departure-threshold">الحد الأدنى للانصراف المبكر (دقيقة)</Label>
                    <NumberInput 
                      id="early-departure-threshold" 
                      min={5}
                      max={120}
                      value={earlyDepartureThreshold}
                      onChange={setEarlyDepartureThreshold}
                    />
                    <p className="text-xs text-muted-foreground">
                      إذا انصرف الموظف قبل الموعد بـ {earlyDepartureThreshold} دقيقة أو أكثر، يتم الخصم
                    </p>
                  </div>
                  <div className="space-y-2 p-3 border rounded-lg bg-destructive/10 border-destructive/30">
                    <Label htmlFor="early-departure-deduction">قيمة خصم الانصراف المبكر (بالأيام)</Label>
                    <NumberInput 
                      id="early-departure-deduction" 
                      step={0.25}
                      min={0}
                      max={2}
                      value={earlyDepartureDeduction}
                      onChange={setEarlyDepartureDeduction}
                    />
                    <p className="text-xs text-muted-foreground">
                      خصم {earlyDepartureDeduction === 0.25 ? 'ربع' : earlyDepartureDeduction === 0.5 ? 'نصف' : earlyDepartureDeduction} يوم
                    </p>
                  </div>
                  <div className="space-y-2 p-3 border rounded-lg bg-muted/30">
                    <Label htmlFor="early-departure-grace">فترة السماح (دقيقة)</Label>
                    <NumberInput 
                      id="early-departure-grace" 
                      min={0}
                      max={30}
                      value={earlyDepartureGrace}
                      onChange={setEarlyDepartureGrace}
                    />
                    <p className="text-xs text-muted-foreground">
                      يُخصم من رصيد التأخيرات إذا كان الانصراف المبكر أقل من {earlyDepartureGrace} دقيقة
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-medium text-foreground flex items-center gap-2">
                  <Timer className="w-4 h-4" />
                  إعدادات الوقت الإضافي والدولة
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 p-3 border rounded-lg bg-primary/5 border-primary/20">
                    <Label htmlFor="overtime-multiplier">معدل حساب الوقت الإضافي</Label>
                    <Input 
                      id="overtime-multiplier" 
                      type="number" 
                      step="0.5"
                      min={1}
                      max={5}
                      value={overtimeMultiplier}
                      onChange={(e) => setOvertimeMultiplier(Math.min(5, Math.max(1, parseFloat(e.target.value) || 2)))}
                    />
                    <p className="text-xs text-muted-foreground">
                      ساعة الأوفرتايم = {overtimeMultiplier} × الساعة العادية
                    </p>
                  </div>
                  <div className="space-y-2 p-3 border rounded-lg bg-muted/30">
                    <Label htmlFor="country-code" className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      دولة الشركة
                    </Label>
                    <Select value={countryCode} onValueChange={setCountryCode}>
                      <SelectTrigger id="country-code">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRIES.map((c) => (
                          <SelectItem key={c.code} value={c.code}>
                            {c.flag} {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">لتحديد الإجازات الرسمية</p>
                  </div>
                </div>
              </div>

              {/* Leave Policy Settings */}
              <div className="space-y-4">
                <h3 className="font-medium text-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  إعدادات الإجازات
                </h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-2 p-3 border rounded-lg bg-primary/5 border-primary/20">
                    <Label htmlFor="annual-leave">إجمالي الإجازات السنوية (أيام)</Label>
                    <NumberInput 
                      id="annual-leave" 
                      min={0}
                      max={60}
                      value={annualLeaveDays}
                      onChange={setAnnualLeaveDays}
                    />
                    <p className="text-xs text-muted-foreground">العدد الإجمالي لأيام الإجازة السنوية</p>
                  </div>
                  <div className="space-y-2 p-3 border rounded-lg bg-amber-500/10 border-amber-500/30">
                    <Label htmlFor="emergency-leave">الإجازات الطارئة (من الإجمالي)</Label>
                    <NumberInput 
                      id="emergency-leave" 
                      min={0}
                      max={annualLeaveDays}
                      value={emergencyLeaveDays}
                      onChange={setEmergencyLeaveDays}
                    />
                    <p className="text-xs text-muted-foreground">
                      إجازات تُوافق تلقائياً - المتبقي اعتيادية: {annualLeaveDays - emergencyLeaveDays} يوم
                    </p>
                  </div>
                  <div className="space-y-2 p-3 border rounded-lg bg-muted/30">
                    <Label>الإجازات الاعتيادية</Label>
                    <div className="text-2xl font-bold text-primary">{annualLeaveDays - emergencyLeaveDays} يوم</div>
                    <p className="text-xs text-muted-foreground">تحتاج موافقة مسبقة قبل 48 ساعة</p>
                  </div>
                </div>
              </div>

              {/* Policy Summary */}
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <h4 className="font-medium text-foreground mb-2">ملخص القوانين</h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>السماحية اليومية: {dailyLateAllowance} دقيقة</li>
                  <li>رصيد التأخيرات الشهري: {monthlyLateAllowance} دقيقة</li>
                  <li className="text-destructive">الغياب التلقائي: بعد {autoAbsentAfterHours} ساعة من موعد الحضور</li>
                  <li className="text-primary">تذكيرات الحضور: {checkinReminderCount} مرات، كل {checkinReminderInterval} دقيقة</li>
                  <li className="text-amber-600">تذكيرات الانصراف: {checkoutReminderCount} مرات، كل {checkoutReminderInterval} دقيقة</li>
                  <li>تأخير أقل من 15 دقيقة (بعد انتهاء الرصيد): خصم {lateUnder15Deduction} يوم</li>
                  <li>تأخير 15-30 دقيقة: خصم {late15To30Deduction} يوم</li>
                  <li>تأخير أكثر من 30 دقيقة: خصم {lateOver30Deduction} يوم</li>
                  <li>غياب بدون إذن: خصم {absenceWithoutPermissionDeduction} يوم</li>
                  <li>أقصى غياب مسموح بإذن: {maxExcusedAbsenceDays} أيام شهرياً</li>
                  <li>معدل الوقت الإضافي: × {overtimeMultiplier}</li>
                  <li>دولة الشركة: {COUNTRIES.find(c => c.code === countryCode)?.name || countryCode}</li>
                  <li className="text-primary font-medium">إجازات سنوية: {annualLeaveDays} يوم ({emergencyLeaveDays} طارئة + {annualLeaveDays - emergencyLeaveDays} اعتيادية)</li>
                </ul>
              </div>

              <Button onClick={handleSaveAttendancePolicy} className="btn-primary-gradient" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                حفظ قوانين الحضور
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Attendance Verification Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.7 }}
        >
          <AttendanceVerificationSettings company={company} onRefetch={refetch} />
        </motion.div>

        {/* Company Locations Manager */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.8 }}
        >
          <CompanyLocationsManager />
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
