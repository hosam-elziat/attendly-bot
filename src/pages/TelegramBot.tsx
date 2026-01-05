import { useState } from 'react';
import { motion } from 'framer-motion';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Send, Link2, CheckCircle, AlertCircle, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

const TelegramBot = () => {
  const { t } = useLanguage();
  const [isConnected, setIsConnected] = useState(false);
  const [botToken, setBotToken] = useState('');

  const handleConnect = () => {
    if (botToken.length > 10) {
      setIsConnected(true);
      toast.success('Telegram bot connected successfully!');
    } else {
      toast.error('Please enter a valid bot token');
    }
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setBotToken('');
    toast.success('Telegram bot disconnected');
  };

  const copyBotLink = () => {
    navigator.clipboard.writeText('https://t.me/AttendEaseBot');
    toast.success('Bot link copied to clipboard!');
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
            Connect your Telegram bot to enable employee check-ins via Telegram
          </p>
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
                    <CardTitle>Telegram Bot</CardTitle>
                    <CardDescription>
                      Your company's dedicated attendance bot
                    </CardDescription>
                  </div>
                </div>
                <Badge 
                  variant={isConnected ? 'default' : 'secondary'}
                  className={isConnected ? 'bg-success hover:bg-success/90' : ''}
                >
                  {isConnected ? (
                    <><CheckCircle className="w-3 h-3 me-1" /> Connected</>
                  ) : (
                    <><AlertCircle className="w-3 h-3 me-1" /> Not Connected</>
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
                      <span className="font-medium">Bot is active and ready!</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Your employees can now check in/out, start/end breaks, and request leave via Telegram.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label className="text-muted-foreground text-sm">Bot Link</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 p-3 rounded-lg bg-muted font-mono text-sm">
                          https://t.me/AttendEaseBot
                        </div>
                        <Button variant="outline" size="icon" onClick={copyBotLink}>
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="icon" asChild>
                          <a href="https://t.me/AttendEaseBot" target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </Button>
                      </div>
                    </div>

                    <Button variant="destructive" onClick={handleDisconnect}>
                      Disconnect Bot
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="bot-token">Bot Token</Label>
                      <Input
                        id="bot-token"
                        type="password"
                        placeholder="Enter your Telegram bot token"
                        value={botToken}
                        onChange={(e) => setBotToken(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Get your bot token from <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">@BotFather</a> on Telegram
                      </p>
                    </div>

                    <Button 
                      onClick={handleConnect} 
                      className="btn-primary-gradient"
                      disabled={!botToken}
                    >
                      <Link2 className="w-4 h-4 me-2" />
                      Connect Bot
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
              <CardTitle>How it works</CardTitle>
              <CardDescription>
                Simple button-based interactions for your employees
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <FeatureItem 
                  title="Check In / Out"
                  description="Employees tap a button to clock in or out"
                />
                <FeatureItem 
                  title="Break Management"
                  description="Start and end breaks with a single tap"
                />
                <FeatureItem 
                  title="Leave Requests"
                  description="Request time off directly through the bot"
                />
                <FeatureItem 
                  title="Admin Notifications"
                  description="Get notified of attendance events instantly"
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
              <CardTitle>Employee Bot Preview</CardTitle>
              <CardDescription>
                What your employees will see in Telegram
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
                      <p className="text-xs text-white/60">Online</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3 mb-4">
                    <div className="bg-[#0088cc] rounded-lg rounded-bl-none p-3 max-w-[80%]">
                      <p className="text-sm">👋 Good morning! Ready to start your day?</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <BotButton>✅ Check In</BotButton>
                    <BotButton>🚪 Check Out</BotButton>
                    <BotButton>☕ Start Break</BotButton>
                    <BotButton>💼 End Break</BotButton>
                    <BotButton className="col-span-2">📅 Request Leave</BotButton>
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
