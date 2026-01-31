import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Building2, 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock, 
  CreditCard,
  Bot,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  DollarSign
} from 'lucide-react';

interface StatsCardsProps {
  stats: {
    companies: {
      total: number;
      active: number;
      trial: number;
      suspended: number;
    };
    employees: {
      total: number;
      activeToday: number;
    };
    attendance: {
      todayPresent: number;
      todayAbsent: number;
      todayLate: number;
      averageComplianceRate: number;
    };
    subscriptions: {
      active: number;
      expiringSoon: number;
      expired: number;
    };
    revenue: {
      today: number;
      thisMonth: number;
      currency: string;
    };
    bots: {
      total: number;
      available: number;
      assigned: number;
    };
    churnRate: number;
    conversionRate: number;
  };
  loading: boolean;
}

export const StatsCards = ({ stats, loading }: StatsCardsProps) => {
  const primaryStats = [
    { 
      icon: Building2, 
      label: 'الشركات النشطة', 
      value: stats.companies.active,
      subValue: `من ${stats.companies.total}`,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10'
    },
    { 
      icon: Users, 
      label: 'الموظفين الحاضرين', 
      value: stats.employees.activeToday,
      subValue: `من ${stats.employees.total}`,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10'
    },
    { 
      icon: CheckCircle, 
      label: 'اشتراكات نشطة', 
      value: stats.subscriptions.active,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10'
    },
    { 
      icon: Clock, 
      label: 'تجريبي', 
      value: stats.companies.trial,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10'
    },
    { 
      icon: AlertTriangle, 
      label: 'ينتهي قريباً', 
      value: stats.subscriptions.expiringSoon,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10'
    },
    { 
      icon: XCircle, 
      label: 'منتهي', 
      value: stats.subscriptions.expired,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10'
    },
  ];

  const secondaryStats = [
    { 
      icon: DollarSign, 
      label: 'إيرادات اليوم', 
      value: `${stats.revenue.today.toLocaleString()} ${stats.revenue.currency}`,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10'
    },
    { 
      icon: DollarSign, 
      label: 'إيرادات الشهر', 
      value: `${stats.revenue.thisMonth.toLocaleString()} ${stats.revenue.currency}`,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10'
    },
    { 
      icon: TrendingUp, 
      label: 'معدل التحويل', 
      value: `${stats.conversionRate}%`,
      subValue: 'Trial → Paid',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10'
    },
    { 
      icon: TrendingDown, 
      label: 'معدل Churn', 
      value: `${stats.churnRate}%`,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10'
    },
    { 
      icon: Bot, 
      label: 'بوتات متاحة', 
      value: stats.bots.available,
      subValue: `من ${stats.bots.total}`,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10'
    },
    { 
      icon: CheckCircle, 
      label: 'معدل الالتزام', 
      value: `${stats.attendance.averageComplianceRate}%`,
      color: 'text-teal-400',
      bgColor: 'bg-teal-500/10'
    },
  ];

  return (
    <div className="space-y-6">
      {/* Primary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {primaryStats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${stat.bgColor} flex items-center justify-center flex-shrink-0`}>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xl font-bold text-white truncate">
                      {loading ? '...' : stat.value}
                    </p>
                    <p className="text-slate-400 text-xs truncate">{stat.label}</p>
                    {stat.subValue && (
                      <p className="text-slate-500 text-xs">{stat.subValue}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {secondaryStats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + index * 0.05 }}
          >
            <Card className="bg-slate-900/50 border-slate-800">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg ${stat.bgColor} flex items-center justify-center flex-shrink-0`}>
                    <stat.icon className={`w-4 h-4 ${stat.color}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">
                      {loading ? '...' : stat.value}
                    </p>
                    <p className="text-slate-400 text-xs truncate">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
