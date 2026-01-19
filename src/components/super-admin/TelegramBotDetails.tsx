import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Bot,
  Users,
  MessageSquare,
  AlertTriangle,
  RefreshCw,
  Unlink,
} from 'lucide-react';

interface TelegramBotDetailsProps {
  companyId: string;
  companyName: string;
  botUsername: string | null;
  botConnected: boolean;
}

const TelegramBotDetails = ({ companyId, companyName, botUsername, botConnected }: TelegramBotDetailsProps) => {
  const [stats, setStats] = useState({
    connectedUsers: 0,
    todayMessages: 0,
    errorCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];

        const [employeesRes, messagesRes] = await Promise.all([
          supabase
            .from('employees')
            .select('telegram_chat_id')
            .eq('company_id', companyId)
            .not('telegram_chat_id', 'is', null),
          supabase
            .from('telegram_messages')
            .select('id')
            .eq('company_id', companyId)
            .gte('created_at', `${today}T00:00:00`),
        ]);

        setStats({
          connectedUsers: employeesRes.data?.length || 0,
          todayMessages: messagesRes.data?.length || 0,
          errorCount: 0,
        });
      } catch (error) {
        console.error('Error fetching telegram stats:', error);
      } finally {
        setLoading(false);
      }
    };

    if (botConnected) {
      fetchStats();
    } else {
      setLoading(false);
    }
  }, [companyId, botConnected]);

  if (!botConnected) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="py-12 text-center">
          <Bot className="w-16 h-16 mx-auto text-slate-500 mb-4" />
          <p className="text-slate-400 text-lg">لم يتم ربط بوت Telegram</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bot Info */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-blue-400" />
              حالة البوت
            </div>
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
              متصل
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-slate-300">
            <span className="text-slate-400">اسم البوت:</span>
            <span className="font-mono">@{botUsername}</span>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4 text-center">
            <Users className="w-8 h-8 mx-auto text-blue-400 mb-2" />
            <p className="text-2xl font-bold text-white">
              {loading ? '...' : stats.connectedUsers}
            </p>
            <p className="text-slate-400 text-sm">مستخدم متصل</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4 text-center">
            <MessageSquare className="w-8 h-8 mx-auto text-green-400 mb-2" />
            <p className="text-2xl font-bold text-white">
              {loading ? '...' : stats.todayMessages}
            </p>
            <p className="text-slate-400 text-sm">رسالة اليوم</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4 text-center">
            <AlertTriangle className="w-8 h-8 mx-auto text-amber-400 mb-2" />
            <p className="text-2xl font-bold text-white">
              {loading ? '...' : stats.errorCount}
            </p>
            <p className="text-slate-400 text-sm">أخطاء</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TelegramBotDetails;
