import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCompany } from '@/hooks/useCompany';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Send, CheckCircle, AlertCircle, ExternalLink, Shield, Copy, Loader2, Link2, RefreshCw, ImageIcon, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

const TelegramBot = () => {
  const { t } = useLanguage();
  const { data: company, refetch } = useCompany();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [isSettingWebhook, setIsSettingWebhook] = useState(false);
  const [isRequestingPhoto, setIsRequestingPhoto] = useState(false);
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false);
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [pendingPhotoRequest, setPendingPhotoRequest] = useState<any>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const { profile } = useAuth();

  const NAME_COOLDOWN_STORAGE_KEY = 'telegram_bot_name_cooldown_until';

  const [nameCooldownUntil, setNameCooldownUntil] = useState<number | null>(() => {
    try {
      const raw = localStorage.getItem(NAME_COOLDOWN_STORAGE_KEY);
      const n = raw ? Number(raw) : NaN;
      return Number.isFinite(n) ? n : null;
    } catch {
      return null;
    }
  });

  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!nameCooldownUntil) return;
    if (nameCooldownUntil <= Date.now()) return;

    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [nameCooldownUntil]);

  const nameCooldownSecondsLeft =
    nameCooldownUntil && nameCooldownUntil > nowMs
      ? Math.ceil((nameCooldownUntil - nowMs) / 1000)
      : 0;

  const isNameCooldownActive = nameCooldownSecondsLeft > 0;

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

  // Check for pending photo request
  useEffect(() => {
    const checkPendingRequest = async () => {
      if (!company?.id) return;
      
      const { data } = await supabase
        .from('bot_photo_requests')
        .select('*')
        .eq('company_id', company.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      setPendingPhotoRequest(data);
    };
    
    checkPendingRequest();
  }, [company?.id]);

  const handlePhotoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('يرجى اختيار ملف صورة');
      return;
    }

    // Validate file size (5 MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('حجم الصورة يجب أن يكون أقل من 5 ميجابايت');
      return;
    }

    setSelectedPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmitPhotoRequest = async () => {
    if (!company?.id || !botUsername || !profile) {
      toast.error('بيانات غير مكتملة');
      return;
    }

    setIsRequestingPhoto(true);

    try {
      // Upload photo to storage if selected
      let photoUrl: string | null = null;
      
      if (selectedPhotoFile) {
        const fileExt = selectedPhotoFile.name.split('.').pop();
        const fileName = `${company.id}-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('bot-photos')
          .upload(fileName, selectedPhotoFile);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast.error('فشل في رفع الصورة: ' + uploadError.message);
          setIsRequestingPhoto(false);
          return;
        } else {
          const { data: urlData } = supabase.storage
            .from('bot-photos')
            .getPublicUrl(fileName);
          photoUrl = urlData.publicUrl;
        }
      }

      // Create the request
      const { error } = await supabase
        .from('bot_photo_requests')
        .insert({
          company_id: company.id,
          bot_username: botUsername,
          requested_by: profile.user_id,
          requested_by_name: profile.full_name,
          photo_url: photoUrl,
        });

      if (error) {
        console.error('Request error:', error);
        toast.error('فشل في إرسال الطلب');
        return;
      }

      toast.success('تم إرسال طلب تغيير الصورة بنجاح! سيتم مراجعته قريباً.');
      setPhotoDialogOpen(false);
      setSelectedPhotoFile(null);
      setPhotoPreview(null);
      
      // Refresh pending request status
      const { data: newRequest } = await supabase
        .from('bot_photo_requests')
        .select('*')
        .eq('company_id', company.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      setPendingPhotoRequest(newRequest);

    } catch (error: any) {
      console.error('Request error:', error);
      toast.error('حدث خطأ غير متوقع');
    } finally {
      setIsRequestingPhoto(false);
    }
  };

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
                      {/* Photo Change Request Button */}
                      <Dialog open={photoDialogOpen} onOpenChange={setPhotoDialogOpen}>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            disabled={!!pendingPhotoRequest}
                          >
                            {pendingPhotoRequest ? (
                              <>
                                <Loader2 className="w-4 h-4 me-2" />
                                طلب قيد المراجعة
                              </>
                            ) : (
                              <>
                                <ImageIcon className="w-4 h-4 me-2" />
                                طلب تغيير صورة البوت
                              </>
                            )}
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>طلب تغيير صورة البوت</DialogTitle>
                            <DialogDescription>
                              ارفع الصورة المطلوبة وسيقوم فريق الدعم بتحديثها لك
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label>اسم البوت</Label>
                              <Input value={`@${botUsername}`} disabled />
                            </div>
                            <div className="space-y-2">
                              <Label>الصورة الجديدة (يُفضل 512×512 بكسل)</Label>
                              <div 
                                className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
                                onClick={() => photoInputRef.current?.click()}
                              >
                                {photoPreview ? (
                                  <div className="space-y-2">
                                    <img 
                                      src={photoPreview} 
                                      alt="Preview" 
                                      className="w-24 h-24 rounded-full mx-auto object-cover"
                                    />
                                    <p className="text-sm text-muted-foreground">{selectedPhotoFile?.name}</p>
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    <Upload className="w-10 h-10 mx-auto text-muted-foreground" />
                                    <p className="text-sm text-muted-foreground">اضغط لاختيار صورة</p>
                                  </div>
                                )}
                              </div>
                              <input 
                                type="file" 
                                ref={photoInputRef}
                                accept="image/jpeg,image/png,image/jpg"
                                className="hidden"
                                onChange={handlePhotoFileSelect}
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setPhotoDialogOpen(false)}>
                              إلغاء
                            </Button>
                            <Button 
                              onClick={handleSubmitPhotoRequest}
                              disabled={isRequestingPhoto || !selectedPhotoFile}
                            >
                              {isRequestingPhoto ? (
                                <>
                                  <Loader2 className="w-4 h-4 me-2 animate-spin" />
                                  جاري الإرسال...
                                </>
                              ) : (
                                'إرسال الطلب'
                              )}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">
                      اضغط "تفعيل البوت" إذا لم يستجب البوت للرسائل
                    </p>
                    {pendingPhotoRequest && (
                      <div className="mt-3 p-3 rounded-lg bg-warning/10 border border-warning/20">
                        <p className="text-sm text-warning-foreground">
                          ⏳ لديك طلب تغيير صورة قيد المراجعة (تم الإرسال: {new Date(pendingPhotoRequest.created_at).toLocaleDateString('ar-EG')})
                        </p>
                      </div>
                    )}
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
