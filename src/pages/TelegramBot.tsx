import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCompany } from '@/hooks/useCompany';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Send, CheckCircle, AlertCircle, ExternalLink, Shield, Copy, Loader2, Link2, RefreshCw, ImagePlus } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const TelegramBot = () => {
  const { t } = useLanguage();
  const { data: company, refetch } = useCompany();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [isUpdatingPhoto, setIsUpdatingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isConnected = company?.telegram_bot_connected || false;
  const botUsername = company?.telegram_bot_username;
  const botLink = botUsername ? `https://t.me/${botUsername}` : null;

  const handleConnect = async () => {
    setIsConnecting(true);
    
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (!sessionData.session) {
        toast.error('يجب تسجيل الدخول أولاً');
        return;
      }

      const { data, error } = await supabase.functions.invoke('assign-telegram-bot', {
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`
        }
      });

      if (error) {
        console.error('Error connecting bot:', error);
        toast.error('حدث خطأ أثناء الربط');
        return;
      }

      if (data.error) {
        if (data.no_bots_available) {
          toast.error('لا توجد بوتات متاحة حالياً. سيتم توفير بوت قريباً.');
        } else {
          toast.error(data.error);
        }
        return;
      }

      if (data.already_connected) {
        toast.info('البوت مربوط بالفعل!');
      } else {
        toast.success('تم ربط البوت بنجاح! 🎉');
      }

      await refetch();

    } catch (error: any) {
      console.error('Connection error:', error);
      toast.error('فشل في الربط: ' + error.message);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleUpdateName = async () => {
    setIsUpdatingName(true);
    
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (!sessionData.session) {
        toast.error('يجب تسجيل الدخول أولاً');
        return;
      }

      const formData = new FormData();
      formData.append('action', 'update_name');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-telegram-bot`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`
        },
        body: formData
      });

      const data = await response.json();

      if (data.error) {
        toast.error(data.error);
        return;
      }

      toast.success('تم تحديث اسم البوت بنجاح!');

    } catch (error: any) {
      console.error('Update name error:', error);
      toast.error('فشل في التحديث: ' + error.message);
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleUpdatePhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUpdatingPhoto(true);
    
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (!sessionData.session) {
        toast.error('يجب تسجيل الدخول أولاً');
        return;
      }

      const formData = new FormData();
      formData.append('action', 'update_photo');
      formData.append('photo', file);

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-telegram-bot`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`
        },
        body: formData
      });

      const data = await response.json();

      if (data.error) {
        toast.error(data.error);
        return;
      }

      toast.success('تم تحديث صورة البوت بنجاح!');

    } catch (error: any) {
      console.error('Update photo error:', error);
      toast.error('فشل في التحديث: ' + error.message);
    } finally {
      setIsUpdatingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const copyBotLink = () => {
    if (botLink) {
      navigator.clipboard.writeText(botLink);
      toast.success('تم نسخ الرابط!');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-2xl font-bold text-foreground">{t('nav.telegram')}</h1>
          <p className="text-muted-foreground mt-1">
            {t('telegram.description')}
          </p>
        </motion.div>

        {/* Security Notice */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
        >
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">{t('telegram.secureStorage')}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('telegram.secureDesc')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Connection Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[#0088cc]/10 flex items-center justify-center">
                    <Send className="w-6 h-6 text-[#0088cc]" />
                  </div>
                  <div>
                    <CardTitle>{t('telegram.botTitle')}</CardTitle>
                    <CardDescription>
                      {t('telegram.botDesc')}
                    </CardDescription>
                  </div>
                </div>
                <Badge 
                  variant={isConnected ? 'default' : 'secondary'}
                  className={isConnected ? 'bg-success hover:bg-success/90' : ''}
                >
                  {isConnected ? (
                    <><CheckCircle className="w-3 h-3 me-1" /> {t('telegram.connected')}</>
                  ) : (
                    <><AlertCircle className="w-3 h-3 me-1" /> {t('telegram.notConnected')}</>
                  )}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {isConnected ? (
                <>
                  <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                    <div className="flex items-center gap-2 text-success mb-2">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-medium">{t('telegram.active')}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t('telegram.activeDesc')}
                    </p>
                  </div>

                  {/* Bot Settings Section */}
                  <div className="p-4 rounded-lg bg-muted border">
                    <h4 className="font-medium text-foreground mb-4">إعدادات البوت</h4>
                    <div className="flex flex-wrap gap-3">
                      <Button 
                        variant="outline" 
                        onClick={handleUpdateName}
                        disabled={isUpdatingName}
                      >
                        {isUpdatingName ? (
                          <>
                            <Loader2 className="w-4 h-4 me-2 animate-spin" />
                            جاري التحديث...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-4 h-4 me-2" />
                            تحديث اسم البوت
                          </>
                        )}
                      </Button>
                      
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        className="hidden"
                        onChange={handleUpdatePhoto}
                      />
                      <Button 
                        variant="outline" 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUpdatingPhoto}
                      >
                        {isUpdatingPhoto ? (
                          <>
                            <Loader2 className="w-4 h-4 me-2 animate-spin" />
                            جاري الرفع...
                          </>
                        ) : (
                          <>
                            <ImagePlus className="w-4 h-4 me-2" />
                            تحديث صورة البوت
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">
                      سيتم تحديث اسم البوت إلى "{company?.name} - حضور وانصراف"
                    </p>
                  </div>

                  {/* Bot Link Section */}
                  {botLink && (
                    <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                      <div className="flex items-center gap-2 text-primary mb-3">
                        <Link2 className="w-5 h-5" />
                        <span className="font-medium">رابط البوت</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 bg-background px-3 py-2 rounded-lg text-sm border">
                          {botLink}
                        </code>
                        <Button size="sm" variant="outline" onClick={copyBotLink}>
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" asChild>
                          <a href={botLink} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground mt-3">
                        شارك هذا الرابط مع موظفيك للتسجيل في البوت
                      </p>
                    </div>
                  )}

                </>
              ) : (
                <>
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-muted">
                      <h4 className="font-medium text-foreground mb-2">كيف يعمل الربط التلقائي؟</h4>
                      <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                        <li>اضغط على زر "ربط ببوت تيليجرام" أدناه</li>
                        <li>سيتم تخصيص بوت جاهز لشركتك تلقائياً</li>
                        <li>سيتغير اسم البوت ليصبح "{company?.name} - حضور وانصراف"</li>
                        <li>ستحصل على رابط البوت لمشاركته مع الموظفين</li>
                      </ol>
                    </div>

                    <Button 
                      onClick={handleConnect} 
                      className="btn-primary-gradient w-full sm:w-auto"
                      disabled={isConnecting}
                    >
                      {isConnecting ? (
                        <>
                          <Loader2 className="w-4 h-4 me-2 animate-spin" />
                          جاري الربط...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 me-2" />
                          ربط ببوت تيليجرام
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* How it works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>{t('telegram.howItWorks')}</CardTitle>
              <CardDescription>
                {t('telegram.howItWorksDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <FeatureItem 
                  title={t('telegram.checkInOut')}
                  description={t('telegram.checkInOutDesc')}
                />
                <FeatureItem 
                  title={t('telegram.breakManagement')}
                  description={t('telegram.breakManagementDesc')}
                />
                <FeatureItem 
                  title={t('telegram.leaveRequests')}
                  description={t('telegram.leaveRequestsDesc')}
                />
                <FeatureItem 
                  title={t('telegram.adminNotifications')}
                  description={t('telegram.adminNotificationsDesc')}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Employee Preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>{t('telegram.preview')}</CardTitle>
              <CardDescription>
                {t('telegram.previewDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-w-sm mx-auto">
                <div className="bg-[#1a1a2e] rounded-2xl p-4 text-white">
                  <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/10">
                    <div className="w-10 h-10 rounded-full bg-[#0088cc] flex items-center justify-center">
                      <Send className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium">{company?.name || 'شركتك'} - حضور وانصراف</p>
                      <p className="text-xs text-white/60">متصل</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3 mb-4">
                    <div className="bg-[#0088cc] rounded-lg rounded-bl-none p-3 max-w-[80%]">
                      <p className="text-sm">👋 {t('telegram.greeting')}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <BotButton>{t('telegram.btnCheckIn')}</BotButton>
                    <BotButton>{t('telegram.btnCheckOut')}</BotButton>
                    <BotButton>{t('telegram.btnStartBreak')}</BotButton>
                    <BotButton>{t('telegram.btnEndBreak')}</BotButton>
                    <BotButton className="col-span-2">{t('telegram.btnRequestLeave')}</BotButton>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

const FeatureItem = ({ title, description }: { title: string; description: string }) => (
  <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
      <CheckCircle className="w-4 h-4 text-primary" />
    </div>
    <div>
      <p className="font-medium text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  </div>
);

const BotButton = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <button className={`bg-white/10 hover:bg-white/20 transition-colors rounded-lg py-2 px-3 text-sm font-medium ${className}`}>
    {children}
  </button>
);

export default TelegramBot;
