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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Globe, Moon, Sun, Clock, Building, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useState } from 'react';

const Settings = () => {
  const { t, language, setLanguage, direction } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { profile } = useAuth();
  const { data: company, isLoading } = useCompany();
  const [saving, setSaving] = useState(false);

  const handleSaveCompany = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!company) return;

    setSaving(true);
    const formData = new FormData(e.currentTarget);
    
    try {
      const { error } = await supabase
        .from('companies')
        .update({
          name: formData.get('company-name') as string,
          timezone: formData.get('timezone') as string,
        })
        .eq('id', company.id);

      if (error) throw error;
      toast.success('Company settings saved');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveWorkHours = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!company) return;

    setSaving(true);
    const formData = new FormData(e.currentTarget);
    
    try {
      const { error } = await supabase
        .from('companies')
        .update({
          work_start_time: formData.get('work-start') as string,
          work_end_time: formData.get('work-end') as string,
          break_duration_minutes: parseInt(formData.get('break-duration') as string),
        })
        .eq('id', company.id);

      if (error) throw error;
      toast.success('Working hours saved');
    } catch (error) {
      toast.error('Failed to save settings');
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
            <CardContent>
              <form onSubmit={handleSaveCompany} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="company-name">Company Name</Label>
                    <Input 
                      id="company-name" 
                      name="company-name"
                      defaultValue={company?.name || ''} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select name="timezone" defaultValue={company?.timezone || 'UTC+0'}>
                      <SelectTrigger id="timezone">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UTC+0">UTC +0 (London)</SelectItem>
                        <SelectItem value="UTC+3">UTC +3 (Riyadh, Kuwait)</SelectItem>
                        <SelectItem value="UTC+4">UTC +4 (Dubai)</SelectItem>
                        <SelectItem value="UTC+5">UTC +5 (Karachi)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button type="submit" className="btn-primary-gradient" disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                  {t('common.save')}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        {/* Working Hours */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Working Hours
              </CardTitle>
              <CardDescription>
                Set default working hours and break duration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveWorkHours} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="work-start">Work Start</Label>
                    <Input 
                      id="work-start" 
                      name="work-start"
                      type="time" 
                      defaultValue={company?.work_start_time?.slice(0, 5) || '09:00'} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="work-end">Work End</Label>
                    <Input 
                      id="work-end" 
                      name="work-end"
                      type="time" 
                      defaultValue={company?.work_end_time?.slice(0, 5) || '17:00'} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="break-duration">Break Duration (min)</Label>
                    <Input 
                      id="break-duration" 
                      name="break-duration"
                      type="number" 
                      defaultValue={company?.break_duration_minutes || 60} 
                    />
                  </div>
                </div>
                <Button type="submit" className="btn-primary-gradient" disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                  {t('common.save')}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
