import { motion } from 'framer-motion';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useAttendanceStats } from '@/hooks/useAttendance';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Clock, Calendar, AlertCircle, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const { data: stats, isLoading } = useAttendanceStats();

  const statCards = [
    { 
      icon: Users, 
      label: t('dashboard.present'), 
      value: stats?.present ?? 0, 
      change: `${stats?.totalEmployees ?? 0} ${t('dashboard.totalEmployees')}`,
      color: 'text-success' 
    },
    { 
      icon: Users, 
      label: t('dashboard.absent'), 
      value: stats?.absent ?? 0, 
      change: t('dashboard.notCheckedIn'),
      color: 'text-destructive' 
    },
    { 
      icon: Calendar, 
      label: t('dashboard.on_leave'), 
      value: stats?.onBreak ?? 0, 
      change: t('dashboard.currentlyOnBreak'),
      color: 'text-warning' 
    },
    { 
      icon: AlertCircle, 
      label: t('dashboard.pending'), 
      value: stats?.pendingLeaves ?? 0, 
      change: t('dashboard.leaveRequests'),
      color: 'text-primary' 
    },
  ];

  const firstName = profile?.full_name?.split(' ')[0] || 'هناك';

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-2xl font-bold text-foreground">
            {t('dashboard.welcome')}, {firstName} 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('dashboard.whatsHappening')}
          </p>
        </motion.div>

        {/* Stats Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {statCards.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <Card className="card-hover">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {stat.label}
                    </CardTitle>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-foreground">{stat.value}</div>
                    <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.quickActions')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <QuickActionCard 
                title={t('dashboard.manageEmployees')}
                count={stats?.totalEmployees ?? 0}
                description={t('dashboard.manageEmployeesDesc')}
                actionLabel={t('dashboard.view')}
                link="/dashboard/employees"
              />
              <QuickActionCard 
                title={t('dashboard.pendingLeaves')}
                count={stats?.pendingLeaves ?? 0}
                description={t('dashboard.pendingLeavesDesc')}
                actionLabel={t('dashboard.review')}
                link="/dashboard/leaves"
              />
              <QuickActionCard 
                title={t('dashboard.viewAttendance')}
                count={stats?.present ?? 0}
                description={t('dashboard.viewAttendanceDesc')}
                actionLabel={t('dashboard.view')}
                link="/dashboard/attendance"
              />
              <QuickActionCard 
                title={t('dashboard.telegramBot')}
                count={0}
                description={t('dashboard.telegramBotDesc')}
                actionLabel={t('dashboard.setup')}
                link="/dashboard/telegram"
                isSuccess
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* Getting Started */}
        {(stats?.totalEmployees ?? 0) === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
          >
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  🚀 {t('dashboard.gettingStarted')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  {t('dashboard.welcomeMessage')}
                </p>
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                  <li>
                    <Link to="/dashboard/employees" className="text-primary hover:underline">
                      {t('dashboard.step1')}
                    </Link>
                  </li>
                  <li>
                    <Link to="/dashboard/telegram" className="text-primary hover:underline">
                      {t('dashboard.step2')}
                    </Link>
                  </li>
                  <li>{t('dashboard.step3')}</li>
                  <li>{t('dashboard.step4')}</li>
                </ol>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
};

interface QuickActionCardProps {
  title: string;
  count: number;
  description: string;
  actionLabel: string;
  link: string;
  isSuccess?: boolean;
}

const QuickActionCard = ({ title, count, description, actionLabel, link, isSuccess }: QuickActionCardProps) => (
  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
    <div className="flex items-center gap-3">
      {!isSuccess && count > 0 && (
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-warning text-warning-foreground text-xs font-bold">
          {count}
        </span>
      )}
      {isSuccess && (
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-success text-success-foreground text-xs">
          ✓
        </span>
      )}
      {!isSuccess && count === 0 && (
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-muted-foreground/20 text-muted-foreground text-xs">
          0
        </span>
      )}
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
    <Link to={link} className="text-sm text-primary hover:underline font-medium">
      {actionLabel}
    </Link>
  </div>
);

export default Dashboard;
