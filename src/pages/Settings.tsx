import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/hooks/useCompany';
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
import { Globe, Moon, Sun, Clock, Building, Loader2, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const WEEKDAYS = [
  { id: 'sunday', label: 'Sunday' },
  { id: 'monday', label: 'Monday' },
  { id: 'tuesday', label: 'Tuesday' },
  { id: 'wednesday', label: 'Wednesday' },
  { id: 'thursday', label: 'Thursday' },
  { id: 'friday', label: 'Friday' },
  { id: 'saturday', label: 'Saturday' },
];

const Settings = () => {
  const { t, language, setLanguage, direction } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { profile } = useAuth();
  const { data: company, isLoading, refetch } = useCompany();
  const queryClient = useQueryClient();
  
  const [saving, setSaving] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [timezone, setTimezone] = useState('UTC+0');
  const [workStart, setWorkStart] = useState('09:00');
  const [workEnd, setWorkEnd] = useState('17:00');
  const [breakDuration, setBreakDuration] = useState(60);
  const [weekendDays, setWeekendDays] = useState<string[]>(['friday', 'saturday']);

  // Update form when company data loads
  useEffect(() => {
    if (company) {
      setCompanyName(company.name || '');
      setTimezone(company.timezone || 'UTC+0');
      setWorkStart(company.work_start_time?.slice(0, 5) || '09:00');
      setWorkEnd(company.work_end_time?.slice(0, 5) || '17:00');
      setBreakDuration(company.break_duration_minutes || 60);
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
      toast.error('No company found');
      return;
    }

    setSaving(true);
    
    try {
      const { error } = await supabase
        .from('companies')
        .update({
          name: companyName,
          timezone: timezone,
        })
        .eq('id', company.id);

      if (error) throw error;
      
      await refetch();
      toast.success('Company settings saved');
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error('Failed to save: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveWorkHours = async () => {
    if (!company?.id) {
      toast.error('No company found');
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
      toast.success('Working hours saved');
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error('Failed to save: ' + error.message);
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
            Manage your workspace preferences
          </p>
        </motion.div>

        {/* Language Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" />
                {t('settings.language')}
              </CardTitle>
              <CardDescription>
                Choose your preferred language. Arabic will enable RTL layout.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <Label className="text-foreground">Display Language</Label>
                  <p className="text-sm text-muted-foreground">
                    Current direction: {direction.toUpperCase()}
                  </p>
                </div>
                <Select value={language} onValueChange={(value: 'en' | 'ar') => setLanguage(value)}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">🇬🇧 English</SelectItem>
                    <SelectItem value="ar">🇸🇦 العربية (Arabic)</SelectItem>
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
                Customize the appearance of the application
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <Label className="text-foreground">Dark Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Switch between light and dark themes
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
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="w-5 h-5 text-primary" />
                Company Information
              </CardTitle>
              <CardDescription>
                Update your company details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="company-name">Company Name</Label>
                  <Input 
                    id="company-name" 
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger id="timezone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC+0">UTC +0 (London)</SelectItem>
                      <SelectItem value="UTC+2">UTC +2 (Cairo)</SelectItem>
                      <SelectItem value="UTC+3">UTC +3 (Riyadh, Kuwait)</SelectItem>
                      <SelectItem value="UTC+4">UTC +4 (Dubai)</SelectItem>
                      <SelectItem value="UTC+5">UTC +5 (Karachi)</SelectItem>
                      <SelectItem value="UTC+5.5">UTC +5:30 (Mumbai)</SelectItem>
                      <SelectItem value="UTC+8">UTC +8 (Singapore)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Default Working Hours
              </CardTitle>
              <CardDescription>
                Set default working hours for all employees. You can override these for individual employees.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="work-start">Work Start</Label>
                  <Input 
                    id="work-start" 
                    type="time" 
                    value={workStart}
                    onChange={(e) => setWorkStart(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="work-end">Work End</Label>
                  <Input 
                    id="work-end" 
                    type="time" 
                    value={workEnd}
                    onChange={(e) => setWorkEnd(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="break-duration">Break Duration (min)</Label>
                  <Input 
                    id="break-duration" 
                    type="number" 
                    value={breakDuration}
                    onChange={(e) => setBreakDuration(parseInt(e.target.value) || 0)}
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
                Default Weekend Days
              </CardTitle>
              <CardDescription>
                Select which days are considered weekends. These can be customized per employee.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {WEEKDAYS.map((day) => (
                  <div key={day.id} className="flex items-center space-x-2">
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
                Note: Weekend settings are saved per employee when you edit them individually.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
