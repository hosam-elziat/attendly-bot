import { motion } from 'framer-motion';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Clock, Calendar, AlertCircle } from 'lucide-react';

const Dashboard = () => {
  const { t } = useLanguage();

  const stats = [
    { 
      icon: Users, 
      label: t('dashboard.present'), 
      value: '24', 
      change: '+2 from yesterday',
      color: 'text-success' 
    },
    { 
      icon: Users, 
      label: t('dashboard.absent'), 
      value: '3', 
      change: 'Same as yesterday',
      color: 'text-destructive' 
    },
    { 
      icon: Calendar, 
      label: t('dashboard.on_leave'), 
      value: '5', 
      change: '2 ending today',
      color: 'text-warning' 
    },
    { 
      icon: AlertCircle, 
      label: t('dashboard.pending'), 
      value: '7', 
      change: 'Needs attention',
      color: 'text-primary' 
    },
  ];

  const recentActivity = [
    { name: 'Sarah Johnson', action: 'Checked in', time: '08:32 AM', status: 'success' },
    { name: 'Ahmed Hassan', action: 'Started break', time: '10:15 AM', status: 'warning' },
    { name: 'Emily Chen', action: 'Requested leave', time: '09:45 AM', status: 'info' },
    { name: 'Michael Brown', action: 'Checked out', time: '05:00 PM', status: 'muted' },
    { name: 'Fatima Al-Rashid', action: 'Checked in', time: '08:45 AM', status: 'success' },
  ];

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
            {t('dashboard.welcome')}, John 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's what's happening with your team today.
          </p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => (
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

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  {t('dashboard.today')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.map((activity, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-3 border-b border-border last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center">
                          <span className="text-xs font-medium text-accent-foreground">
                            {activity.name.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{activity.name}</p>
                          <p className="text-xs text-muted-foreground">{activity.action}</p>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">{activity.time}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <QuickActionCard 
                  title="Pending Leave Requests" 
                  count={3}
                  description="Review and approve leave requests"
                  actionLabel="Review"
                />
                <QuickActionCard 
                  title="Late Arrivals Today" 
                  count={2}
                  description="Employees who arrived after 9:00 AM"
                  actionLabel="View"
                />
                <QuickActionCard 
                  title="Telegram Bot Status" 
                  count={0}
                  description="Connected and active"
                  actionLabel="Settings"
                  isSuccess
                />
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
};

interface QuickActionCardProps {
  title: string;
  count: number;
  description: string;
  actionLabel: string;
  isSuccess?: boolean;
}

const QuickActionCard = ({ title, count, description, actionLabel, isSuccess }: QuickActionCardProps) => (
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
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
    <button className="text-sm text-primary hover:underline font-medium">
      {actionLabel}
    </button>
  </div>
);

export default Dashboard;
