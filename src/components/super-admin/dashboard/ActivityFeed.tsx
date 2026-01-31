import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Activity,
  Building2,
  UserPlus,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Bot,
  Settings,
  Clock
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

interface ActivityItem {
  id: string;
  event_type: string;
  event_category: string;
  title: string;
  description: string | null;
  company_id: string | null;
  company_name: string | null;
  user_email: string | null;
  severity: string;
  created_at: string;
}

interface ActivityFeedProps {
  activities: ActivityItem[];
  loading: boolean;
}

const getEventIcon = (eventType: string, category: string) => {
  switch (category) {
    case 'company':
      return Building2;
    case 'subscription':
      return CreditCard;
    case 'employee':
      return UserPlus;
    case 'bot':
      return Bot;
    case 'settings':
      return Settings;
    case 'error':
      return AlertTriangle;
    default:
      return Activity;
  }
};

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'error':
      return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'warning':
      return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    case 'success':
      return 'bg-green-500/20 text-green-400 border-green-500/30';
    default:
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
  }
};

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'company':
      return { icon: Building2, color: 'text-blue-400', bg: 'bg-blue-500/10' };
    case 'subscription':
      return { icon: CreditCard, color: 'text-green-400', bg: 'bg-green-500/10' };
    case 'employee':
      return { icon: UserPlus, color: 'text-purple-400', bg: 'bg-purple-500/10' };
    case 'bot':
      return { icon: Bot, color: 'text-cyan-400', bg: 'bg-cyan-500/10' };
    case 'error':
      return { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10' };
    default:
      return { icon: Activity, color: 'text-slate-400', bg: 'bg-slate-500/10' };
  }
};

export const ActivityFeed = ({ activities, loading }: ActivityFeedProps) => {
  if (loading) {
    return (
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            سجل الأحداث
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          سجل الأحداث المباشر
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
            Live
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          <div className="space-y-1 p-4">
            {activities.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>لا توجد أحداث حديثة</p>
              </div>
            ) : (
              activities.map((activity, index) => {
                const categoryInfo = getCategoryIcon(activity.event_category);
                const Icon = categoryInfo.icon;
                
                return (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-800/50 transition-colors"
                  >
                    <div className={`w-9 h-9 rounded-lg ${categoryInfo.bg} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-4 h-4 ${categoryInfo.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-white text-sm font-medium truncate">
                          {activity.title}
                        </p>
                        <Badge className={`${getSeverityColor(activity.severity)} text-xs py-0`}>
                          {activity.event_category}
                        </Badge>
                      </div>
                      {activity.description && (
                        <p className="text-slate-400 text-xs mt-0.5 truncate">
                          {activity.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                        <Clock className="w-3 h-3" />
                        <span>
                          {formatDistanceToNow(new Date(activity.created_at), { 
                            addSuffix: true, 
                            locale: ar 
                          })}
                        </span>
                        {activity.company_name && (
                          <>
                            <span>•</span>
                            <span className="text-slate-400">{activity.company_name}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
