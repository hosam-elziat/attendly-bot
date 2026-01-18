import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCompany } from '@/hooks/useCompany';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Send, CheckCircle, AlertCircle, ExternalLink, Shield, Copy, Loader2, Link2, RefreshCw, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const TelegramBot = () => {
  const { t } = useLanguage();
  const { data: company, refetch } = useCompany();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [isSettingWebhook, setIsSettingWebhook] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const NAME_COOLDOWN_STORAGE_KEY = 'telegram_bot_name_cooldown_until';
  const PHOTO_COOLDOWN_STORAGE_KEY = 'telegram_bot_photo_cooldown_until';

  const [nameCooldownUntil, setNameCooldownUntil] = useState<number | null>(() => {
    try {
      const raw = localStorage.getItem(NAME_COOLDOWN_STORAGE_KEY);
      const n = raw ? Number(raw) : NaN;
      return Number.isFinite(n) ? n : null;
    } catch {
      return null;
    }
  });

  const [photoCooldownUntil, setPhotoCooldownUntil] = useState<number | null>(() => {
    try {
      const raw = localStorage.getItem(PHOTO_COOLDOWN_STORAGE_KEY);
      const n = raw ? Number(raw) : NaN;
      return Number.isFinite(n) ? n : null;
    } catch {
      return null;
    }
  });

  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    // Check if any cooldown is active
    const hasActiveCooldown = 
      (nameCooldownUntil && nameCooldownUntil > Date.now()) ||
      (photoCooldownUntil && photoCooldownUntil > Date.now());
    
    if (!hasActiveCooldown) return;

    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [nameCooldownUntil, photoCooldownUntil]);

  const nameCooldownSecondsLeft =
    nameCooldownUntil && nameCooldownUntil > nowMs
      ? Math.ceil((nameCooldownUntil - nowMs) / 1000)
      : 0;

  const photoCooldownSecondsLeft =
    photoCooldownUntil && photoCooldownUntil > nowMs
      ? Math.ceil((photoCooldownUntil - nowMs) / 1000)
      : 0;

  const isNameCooldownActive = nameCooldownSecondsLeft > 0;
  const isPhotoCooldownActive = photoCooldownSecondsLeft > 0;

  const formatCooldown = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h} س ${m} د`;
    if (m > 0) return `${m} د`;
    return `${seconds} ث`;
  };
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
    if (isNameCooldownActive) {
      toast.info(`محاولة تغيير الاسم متاحة بعد ${formatCooldown(nameCooldownSecondsLeft)}`);
      return;
    }

    setIsUpdatingName(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        toast.error('يجب تسجيل الدخول أولاً');
        return;
      }

      const { data, error } = await supabase.functions.invoke('update-telegram-bot', {
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: { action: 'update_name' },
      });

      if (error) {
        console.error('Update name error:', error);
        toast.error('فشل في التحديث');
        return;
      }

      // Telegram rate limit info
      if (data?.retry_after_seconds) {
        const seconds = Number(data.retry_after_seconds);
        if (Number.isFinite(seconds) && seconds > 0) {
          const until = Date.now() + seconds * 1000;
          setNameCooldownUntil(until);
          localStorage.setItem(NAME_COOLDOWN_STORAGE_KEY, String(until));
        }
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      // Success → clear cooldown
      setNameCooldownUntil(null);
      localStorage.removeItem(NAME_COOLDOWN_STORAGE_KEY);

      toast.success(data?.message || 'تم تحديث اسم البوت بنجاح!');

    } catch (error: any) {
      console.error('Update name error:', error);
      toast.error('فشل في التحديث: ' + error.message);
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleSetWebhook = async () => {
    setIsSettingWebhook(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        toast.error('يجب تسجيل الدخول أولاً');
        return;
      }

      const { data, error } = await supabase.functions.invoke('update-telegram-bot', {
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: { action: 'set_webhook' },
      });

      if (error) {
        console.error('Webhook setup error:', error);
        toast.error('فشل في إعداد الـ Webhook');
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      toast.success(data?.message || 'تم إعداد الـ Webhook بنجاح!');

    } catch (error: any) {
      console.error('Webhook setup error:', error);
      toast.error('فشل في الإعداد: ' + error.message);
    } finally {
      setIsSettingWebhook(false);
    }
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input to allow re-selecting the same file
    if (fileInputRef.current) fileInputRef.current.value = '';

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      toast.error('يرجى اختيار صورة بصيغة JPG أو PNG فقط');
      return;
    }

    // Validate file size (5 MB max for Telegram)
    const maxSizeBytes = 5 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      toast.error('حجم الصورة يجب أن يكون أقل من 5 ميجابايت');
      return;
    }

    // Check dimensions (recommended: square, min 160x160, max 512x512)
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    
    img.onload = async () => {
      URL.revokeObjectURL(objectUrl);
      
      // Telegram recommends square photos, but doesn't strictly require it
      if (img.width < 160 || img.height < 160) {
        toast.error('يجب أن تكون أبعاد الصورة على الأقل 160×160 بكسل');
        return;
      }

      // Check cooldown
      if (isPhotoCooldownActive) {
        toast.info(`يمكنك تغيير الصورة بعد ${formatCooldown(photoCooldownSecondsLeft)}`);
        return;
      }

      setIsUploadingPhoto(true);

      try {
        const { data: sessionData } = await supabase.auth.getSession();

        if (!sessionData.session) {
          toast.error('يجب تسجيل الدخول أولاً');
          return;
        }

        const formData = new FormData();
        formData.append('action', 'update_photo');
        formData.append('photo', file);

        const { data, error } = await supabase.functions.invoke('update-telegram-bot', {
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
          body: formData,
        });

        if (error) {
          console.error('Photo upload error:', error);
          toast.error('فشل في رفع الصورة');
          return;
        }

        // Handle rate limit
        if (data?.retry_after_seconds) {
          const seconds = Number(data.retry_after_seconds);
          if (Number.isFinite(seconds) && seconds > 0) {
            const until = Date.now() + seconds * 1000;
            setPhotoCooldownUntil(until);
            localStorage.setItem(PHOTO_COOLDOWN_STORAGE_KEY, String(until));
          }
        }

        if (data?.error) {
          toast.error(data.error);
          return;
        }

        // Success → clear cooldown
        setPhotoCooldownUntil(null);
        localStorage.removeItem(PHOTO_COOLDOWN_STORAGE_KEY);

        toast.success(data?.message || 'تم تحديث صورة البوت بنجاح! 🎉');

      } catch (error: any) {
        console.error('Photo upload error:', error);
        toast.error('فشل في رفع الصورة: ' + error.message);
      } finally {
        setIsUploadingPhoto(false);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      toast.error('الملف المحدد ليس صورة صالحة');
    };

    img.src = objectUrl;
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
          data-tour="telegram-connect"
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
                        disabled={isUpdatingName || isNameCooldownActive}
                      >
                        {isUpdatingName ? (
                          <>
                            <Loader2 className="w-4 h-4 me-2 animate-spin" />
                            جاري التحديث...
                          </>
                        ) : isNameCooldownActive ? (
                          <>
                            <RefreshCw className="w-4 h-4 me-2" />
                            متاح بعد {formatCooldown(nameCooldownSecondsLeft)}
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-4 h-4 me-2" />
                            تحديث اسم البوت
                          </>
                        )}
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={handleSetWebhook}
                        disabled={isSettingWebhook}
                      >
                        {isSettingWebhook ? (
                          <>
                            <Loader2 className="w-4 h-4 me-2 animate-spin" />
                            جاري الإعداد...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4 me-2" />
                            تفعيل البوت
                          </>
                        )}
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingPhoto || isPhotoCooldownActive}
                      >
                        {isUploadingPhoto ? (
                          <>
                            <Loader2 className="w-4 h-4 me-2 animate-spin" />
                            جاري الرفع...
                          </>
                        ) : isPhotoCooldownActive ? (
                          <>
                            <ImageIcon className="w-4 h-4 me-2" />
                            متاح بعد {formatCooldown(photoCooldownSecondsLeft)}
                          </>
                        ) : (
                          <>
                            <ImageIcon className="w-4 h-4 me-2" />
                            تغيير صورة البوت
                          </>
                        )}
                      </Button>
                      {/* Hidden file input */}
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        accept="image/jpeg,image/png,image/jpg"
                        className="hidden"
                        onChange={handlePhotoSelect}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">
                      اضغط "تفعيل البوت" إذا لم يستجب البوت للرسائل • الصورة يُفضل أن تكون مربعة (512×512 بكسل)
                    </p>
                  </div>

                  {/* Bot Link Section */}
                  {botLink && (
                    <div className="p-4 rounded-lg bg-primary/5 border border-primary/20" data-tour="bot-link">
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
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => window.open(botLink, '_blank')}
                        >
                          <ExternalLink className="w-4 h-4" />
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
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
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
  <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 rounded-lg bg-muted/50">
    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
      <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
    </div>
    <div>
      <p className="font-medium text-foreground text-sm sm:text-base">{title}</p>
      <p className="text-xs sm:text-sm text-muted-foreground">{description}</p>
    </div>
  </div>
);

const BotButton = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <button className={`bg-white/10 hover:bg-white/20 transition-colors rounded-lg py-2 px-3 text-sm font-medium ${className}`}>
    {children}
  </button>
);

export default TelegramBot;
