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
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Globe, Moon, Sun, Clock, Building, Loader2, Calendar, Banknote, Scale, AlertTriangle, Timer, MapPin, UserPlus } from 'lucide-react';
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
          late_under_15_deduction: lateUnder15Deduction,
          late_15_to_30_deduction: late15To30Deduction,
          late_over_30_deduction: lateOver30Deduction,
          absence_without_permission_deduction: absenceWithoutPermissionDeduction,
          max_excused_absence_days: maxExcusedAbsenceDays,
          overtime_multiplier: overtimeMultiplier,
          country_code: countryCode,
          annual_leave_days: annualLeaveDays,
          emergency_leave_days: emergencyLeaveDays,
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
                  <Input 
                    id="break-duration" 
                    type="number" 
                    min={0}
                    max={480}
                    value={breakDuration}
                    onChange={(e) => setBreakDuration(Math.min(480, Math.max(0, parseInt(e.target.value) || 0)))}
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

        {/* Join Request Reviewer Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.55 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primary" />
                مراجع طلبات الانضمام
              </CardTitle>
              <CardDescription>
                تحديد الشخص أو المنصب المسؤول عن مراجعة طلبات انضمام الموظفين الجدد عبر تليجرام
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>نوع المراجع</Label>
                  <Select 
                    value={joinRequestReviewerType || 'none'} 
                    onValueChange={(value) => {
                      if (value === 'none') {
                        setJoinRequestReviewerType(null);
                        setJoinRequestReviewerId(null);
                      } else {
                        setJoinRequestReviewerType(value);
                        setJoinRequestReviewerId(null);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر نوع المراجع" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">بدون مراجع (الموافقة من الويب)</SelectItem>
                      <SelectItem value="position">منصب معين</SelectItem>
                      <SelectItem value="employee">موظف معين</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {joinRequestReviewerType === 'position' && (
                  <div className="space-y-2">
                    <Label>اختر المنصب</Label>
                    <Select 
                      value={joinRequestReviewerId || ''} 
                      onValueChange={setJoinRequestReviewerId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر المنصب" />
                      </SelectTrigger>
                      <SelectContent>
                        {positions.map((position) => (
                          <SelectItem key={position.id} value={position.id}>
                            {language === 'ar' && position.title_ar ? position.title_ar : position.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      سيتم إرسال طلبات الانضمام لأول موظف لديه هذا المنصب ومتصل بتليجرام
                    </p>
                  </div>
                )}
                
                {joinRequestReviewerType === 'employee' && (
                  <div className="space-y-2">
                    <Label>اختر الموظف</Label>
                    <Select 
                      value={joinRequestReviewerId || ''} 
                      onValueChange={setJoinRequestReviewerId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الموظف" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.filter(e => e.telegram_chat_id).map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.full_name} {emp.department ? `(${emp.department})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      يظهر فقط الموظفون المتصلون بتليجرام
                    </p>
                  </div>
                )}
              </div>
              
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">كيف يعمل هذا؟</h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>عند تقديم موظف جديد لطلب انضمام من تليجرام</li>
                  <li>يُرسل الطلب للمراجع المحدد مع بيانات المتقدم الكاملة</li>
                  <li>يحدد المراجع الراتب والمنصب للموظف الجديد</li>
                  <li>يوافق أو يرفض الطلب مباشرة من تليجرام</li>
                </ul>
              </div>
              
              <Button 
                onClick={handleSaveJoinRequestReviewer} 
                className="btn-primary-gradient" 
                disabled={saving || (joinRequestReviewerType && !joinRequestReviewerId)}
              >
                {saving && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                حفظ إعدادات المراجعة
              </Button>
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
                    <Input 
                      id="daily-late" 
                      type="number" 
                      min={0}
                      max={60}
                      value={dailyLateAllowance}
                      onChange={(e) => setDailyLateAllowance(Math.min(60, Math.max(0, parseInt(e.target.value) || 0)))}
                    />
                    <p className="text-xs text-muted-foreground">الحد الأقصى للتأخير اليومي بدون خصم</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="monthly-late">السماحية الشهرية (بالدقائق)</Label>
                    <Input 
                      id="monthly-late" 
                      type="number" 
                      min={0}
                      max={300}
                      value={monthlyLateAllowance}
                      onChange={(e) => setMonthlyLateAllowance(Math.min(300, Math.max(0, parseInt(e.target.value) || 0)))}
                    />
                    <p className="text-xs text-muted-foreground">رصيد التأخيرات الشهري للموظف</p>
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
                    <Input 
                      id="late-under-15" 
                      type="number" 
                      step="0.25"
                      min={0}
                      max={2}
                      value={lateUnder15Deduction}
                      onChange={(e) => setLateUnder15Deduction(Math.min(2, Math.max(0, parseFloat(e.target.value) || 0)))}
                    />
                    <p className="text-xs text-muted-foreground">خصم {lateUnder15Deduction === 0.25 ? 'ربع' : lateUnder15Deduction === 0.5 ? 'نصف' : lateUnder15Deduction} يوم</p>
                  </div>
                  <div className="space-y-2 p-3 border rounded-lg bg-muted/30">
                    <Label htmlFor="late-15-30">تأخير 15-30 دقيقة</Label>
                    <Input 
                      id="late-15-30" 
                      type="number" 
                      step="0.25"
                      min={0}
                      max={2}
                      value={late15To30Deduction}
                      onChange={(e) => setLate15To30Deduction(Math.min(2, Math.max(0, parseFloat(e.target.value) || 0)))}
                    />
                    <p className="text-xs text-muted-foreground">خصم {late15To30Deduction === 0.5 ? 'نصف' : late15To30Deduction} يوم</p>
                  </div>
                  <div className="space-y-2 p-3 border rounded-lg bg-muted/30">
                    <Label htmlFor="late-over-30">تأخير أكثر من 30 دقيقة</Label>
                    <Input 
                      id="late-over-30" 
                      type="number" 
                      step="0.5"
                      min={0}
                      max={3}
                      value={lateOver30Deduction}
                      onChange={(e) => setLateOver30Deduction(Math.min(3, Math.max(0, parseFloat(e.target.value) || 0)))}
                    />
                    <p className="text-xs text-muted-foreground">خصم {lateOver30Deduction} يوم</p>
                  </div>
                  <div className="space-y-2 p-3 border rounded-lg bg-destructive/10 border-destructive/30">
                    <Label htmlFor="absence-no-permission">غياب بدون إذن</Label>
                    <Input 
                      id="absence-no-permission" 
                      type="number" 
                      step="0.5"
                      min={0}
                      max={5}
                      value={absenceWithoutPermissionDeduction}
                      onChange={(e) => setAbsenceWithoutPermissionDeduction(Math.min(5, Math.max(0, parseFloat(e.target.value) || 0)))}
                    />
                    <p className="text-xs text-muted-foreground">خصم {absenceWithoutPermissionDeduction} يوم</p>
                  </div>
                  <div className="space-y-2 p-3 border rounded-lg bg-muted/30">
                    <Label htmlFor="max-excused">أقصى غياب بإذن (أيام/شهر)</Label>
                    <Input 
                      id="max-excused" 
                      type="number" 
                      min={0}
                      max={10}
                      value={maxExcusedAbsenceDays}
                      onChange={(e) => setMaxExcusedAbsenceDays(Math.min(10, Math.max(0, parseInt(e.target.value) || 0)))}
                    />
                    <p className="text-xs text-muted-foreground">الحد الأقصى للغياب المسموح بإذن شهرياً</p>
                  </div>
                </div>
              </div>

              {/* Overtime & Country Settings */}
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
                    <Input 
                      id="annual-leave" 
                      type="number" 
                      min={0}
                      max={60}
                      value={annualLeaveDays}
                      onChange={(e) => setAnnualLeaveDays(Math.min(60, Math.max(0, parseInt(e.target.value) || 0)))}
                    />
                    <p className="text-xs text-muted-foreground">العدد الإجمالي لأيام الإجازة السنوية</p>
                  </div>
                  <div className="space-y-2 p-3 border rounded-lg bg-amber-500/10 border-amber-500/30">
                    <Label htmlFor="emergency-leave">الإجازات الطارئة (من الإجمالي)</Label>
                    <Input 
                      id="emergency-leave" 
                      type="number" 
                      min={0}
                      max={annualLeaveDays}
                      value={emergencyLeaveDays}
                      onChange={(e) => setEmergencyLeaveDays(Math.min(annualLeaveDays, Math.max(0, parseInt(e.target.value) || 0)))}
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
      </div>
    </DashboardLayout>
  );
};

export default Settings;
