import { useState } from 'react';
import { motion } from 'framer-motion';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCompany } from '@/hooks/useCompany';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Send, CheckCircle, AlertCircle, ExternalLink, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const TelegramBot = () => {
  const { t } = useLanguage();
  const { data: company, refetch } = useCompany();
  const [isConnecting, setIsConnecting] = useState(false);

  const isConnected = company?.telegram_bot_connected || false;

  const handleConnect = async () => {
    setIsConnecting(true);
    toast.info('تكامل بوت تيليجرام يتطلب إعداد الخادم. تواصل مع الدعم للمساعدة.');
    setIsConnecting(false);
  };

  const handleDisconnect = async () => {
    if (!company?.id) return;
    
    try {
      const { error } = await supabase
        .from('companies')
        .update({ telegram_bot_connected: false })
        .eq('id', company.id);

      if (error) throw error;
      
      await refetch();
      toast.success('تم فصل بوت تيليجرام');
    } catch (error: any) {
      toast.error('فشل في الفصل: ' + error.message);
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

                  <Button variant="destructive" onClick={handleDisconnect}>
                    {t('telegram.disconnect')}
                  </Button>
                </>
              ) : (
                <>
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-muted">
                      <h4 className="font-medium text-foreground mb-2">{t('telegram.setupTitle')}</h4>
                      <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                        <li>{t('telegram.step1')} <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">@BotFather</a></li>
                        <li>{t('telegram.step2')}</li>
                        <li>{t('telegram.step3')}</li>
                        <li>{t('telegram.step4')}</li>
                      </ol>
                    </div>

                    <Button 
                      onClick={handleConnect} 
                      className="btn-primary-gradient"
                      disabled={isConnecting}
                    >
                      <ExternalLink className="w-4 h-4 me-2" />
                      {t('telegram.requestSetup')}
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
                      <p className="font-medium">AttendEase Bot</p>
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
