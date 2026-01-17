import { useState } from 'react';
import { motion } from 'framer-motion';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useAttendanceStats } from '@/hooks/useAttendance';
import { useAdvancedStats, COUNTRIES } from '@/hooks/useAdvancedStats';
import { useRealtimeNotifications, usePendingCounts } from '@/hooks/useRealtimeNotifications';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Users, 
  Clock, 
  Calendar, 
  AlertCircle, 
  Loader2, 
  TrendingUp, 
  TrendingDown,
  Trophy,
  AlertTriangle,
  Coffee,
  Timer,
  Percent,
  Flag,
  UserPlus,
  CalendarCheck
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import SubscriptionCard from '@/components/dashboard/SubscriptionCard';
import AbsentEmployeesDialog from '@/components/dashboard/AbsentEmployeesDialog';
import HolidayApprovalCard from '@/components/dashboard/HolidayApprovalCard';

const Dashboard = () => {
  const { t, language } = useLanguage();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { data: stats, isLoading } = useAttendanceStats();
  const { data: advancedStats, isLoading: advancedLoading } = useAdvancedStats();
  const [absentDialogOpen, setAbsentDialogOpen] = useState(false);
  
  // Enable realtime notifications
  useRealtimeNotifications();

  // Get pending counts for quick actions
  const { data: pendingCounts } = useQuery(usePendingCounts());

  const firstName = profile?.full_name?.split(' ')[0] || 'هناك';

  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours} ${language === 'ar' ? 'ساعة' : 'h'} ${mins > 0 ? `${mins} ${language === 'ar' ? 'د' : 'm'}` : ''}`;
    }
    return `${mins} ${language === 'ar' ? 'دقيقة' : 'min'}`;
  };

  // Navigation handlers for stat cards
  const handleStatClick = (type: string) => {
    switch (type) {
      case 'checkedInToday':
      case 'present':
      case 'onBreak':
        navigate('/dashboard/attendance');
        break;
      case 'absent':
        setAbsentDialogOpen(true);
        break;
      case 'pending':
        // Go to leaves if there are pending leave requests, otherwise go to join requests
        if ((pendingCounts?.leaveRequests || 0) > 0) {
          navigate('/dashboard/leaves');
        } else if ((pendingCounts?.joinRequests || 0) > 0) {
          navigate('/dashboard/join-requests');
        } else {
          navigate('/dashboard/leaves');
        }
        break;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-8">
        {/* Header - Mobile optimized */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">
            {t('dashboard.welcome')}, {firstName} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5 sm:mt-1">
            {t('dashboard.whatsHappening')}
          </p>
        </motion.div>

        {/* Today's Stats */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Basic Stats Row - Mobile optimized */}
            <div className="grid gap-2 sm:gap-4 grid-cols-2 lg:grid-cols-5">
              <StatCard
                icon={Users}
                label={language === 'ar' ? 'سجلوا حضور اليوم' : 'Checked In Today'}
                value={stats?.totalCheckedInToday ?? 0}
                subtitle={`${stats?.totalEmployees ?? 0} ${t('dashboard.totalEmployees')}`}
                color="text-primary"
                delay={0}
                onClick={() => handleStatClick('checkedInToday')}
              />
              <StatCard
                icon={Users}
                label={t('dashboard.present')}
                value={stats?.present ?? 0}
                subtitle={t('dashboard.currentlyPresent') || 'Currently Present'}
                color="text-success"
                delay={0.1}
                onClick={() => handleStatClick('present')}
              />
              <StatCard
                icon={Users}
                label={t('dashboard.absent')}
                value={stats?.absent ?? 0}
                subtitle={t('dashboard.notCheckedIn')}
                color="text-destructive"
                delay={0.2}
                onClick={() => handleStatClick('absent')}
              />
              <StatCard
                icon={Coffee}
                label={t('dashboard.on_leave')}
                value={stats?.onBreak ?? 0}
                subtitle={t('dashboard.currentlyOnBreak')}
                color="text-warning"
                delay={0.3}
                onClick={() => handleStatClick('onBreak')}
              />
              <StatCard
                icon={AlertCircle}
                label={t('dashboard.pending')}
                value={stats?.pendingLeaves ?? 0}
                subtitle={t('dashboard.leaveRequests')}
                color="text-primary"
                delay={0.4}
                onClick={() => handleStatClick('pending')}
              />
            </div>

            {/* Advanced Stats Section */}
            {!advancedLoading && advancedStats && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.4 }}
              >
                <h2 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4">
                  {language === 'ar' ? 'إحصائيات الشهر' : 'Monthly Statistics'}
                </h2>
                
                <div className="grid gap-3 grid-cols-2 sm:grid-cols-2 lg:grid-cols-3">
                  {/* Team Commitment Rate */}
                  <Card className="card-hover">
                    <CardHeader className="pb-1 sm:pb-2 p-3 sm:p-6">
                      <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-1 sm:gap-2">
                        <Percent className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="truncate">{language === 'ar' ? 'نسبة الالتزام' : 'Commitment'}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-6 pt-0">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xl sm:text-3xl font-bold text-foreground">
                          {advancedStats.teamCommitmentRate}%
                        </span>
                        <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-success" />
                      </div>
                      <Progress value={advancedStats.teamCommitmentRate} className="h-1.5 sm:h-2" />
                    </CardContent>
                  </Card>

                  {/* Absence Rate */}
                  <Card className="card-hover">
                    <CardHeader className="pb-1 sm:pb-2 p-3 sm:p-6">
                      <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-1 sm:gap-2">
                        <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="truncate">{language === 'ar' ? 'نسبة الغياب' : 'Absence'}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-6 pt-0">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xl sm:text-3xl font-bold text-foreground">
                          {advancedStats.absenceRate}%
                        </span>
                        <TrendingDown className={`w-4 h-4 sm:w-5 sm:h-5 ${advancedStats.absenceRate > 10 ? 'text-destructive' : 'text-success'}`} />
                      </div>
                      <Progress value={advancedStats.absenceRate} className="h-1.5 sm:h-2 [&>div]:bg-destructive" />
                    </CardContent>
                  </Card>

                  {/* Monthly Late Count */}
                  <Card className="card-hover">
                    <CardHeader className="pb-1 sm:pb-2 p-3 sm:p-6">
                      <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-1 sm:gap-2">
                        <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="truncate">{language === 'ar' ? 'التأخيرات' : 'Late'}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-6 pt-0">
                      <div className="text-xl sm:text-3xl font-bold text-foreground">
                        {advancedStats.monthlyLateCount}
                      </div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                        {language === 'ar' ? 'هذا الشهر' : 'This month'}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Total Break Time */}
                  <Card className="card-hover">
                    <CardHeader className="pb-1 sm:pb-2 p-3 sm:p-6">
                      <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-1 sm:gap-2">
                        <Coffee className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="truncate">{language === 'ar' ? 'الاستراحات' : 'Breaks'}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-6 pt-0">
                      <div className="text-xl sm:text-3xl font-bold text-foreground">
                        {formatMinutes(advancedStats.totalBreakMinutes)}
                      </div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                        {language === 'ar' ? 'الإجمالي' : 'Total'}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Total Overtime */}
                  <Card className="card-hover">
                    <CardHeader className="pb-1 sm:pb-2 p-3 sm:p-6">
                      <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-1 sm:gap-2">
                        <Timer className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="truncate">{language === 'ar' ? 'الوقت الإضافي' : 'Overtime'}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-6 pt-0">
                      <div className="text-xl sm:text-3xl font-bold text-foreground">
                        {formatMinutes(advancedStats.totalOvertimeMinutes)}
                      </div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                        {language === 'ar' ? `× ${advancedStats.overtimeMultiplier}` : `× ${advancedStats.overtimeMultiplier}`}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Average Overtime */}
                  <Card className="card-hover">
                    <CardHeader className="pb-1 sm:pb-2 p-3 sm:p-6">
                      <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-1 sm:gap-2">
                        <Timer className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="truncate">{language === 'ar' ? 'المتوسط' : 'Avg'}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-6 pt-0">
                      <div className="text-xl sm:text-3xl font-bold text-foreground">
                        {formatMinutes(advancedStats.avgOvertimePerEmployee)}
                      </div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                        {language === 'ar' ? 'لكل موظف' : 'Per employee'}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Top Performers */}
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 mt-3 sm:mt-4">
                  {advancedStats.mostCommittedEmployee && (
                    <Card className="border-success/30 bg-success/5">
                      <CardHeader className="pb-1 sm:pb-2 p-3 sm:p-6">
                        <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-1 sm:gap-2">
                          <Trophy className="w-3 h-3 sm:w-4 sm:h-4 text-success" />
                          {language === 'ar' ? 'الأكثر التزاماً' : 'Most Committed'}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-3 sm:p-6 pt-0">
                        <div className="text-base sm:text-xl font-bold text-foreground truncate">
                          {advancedStats.mostCommittedEmployee.name}
                        </div>
                        <p className="text-xs sm:text-sm text-success mt-1">
                          {advancedStats.mostCommittedEmployee.rate.toFixed(0)}%
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {advancedStats.mostAbsentEmployee && advancedStats.mostAbsentEmployee.count > 0 && (
                    <Card className="border-destructive/30 bg-destructive/5">
                      <CardHeader className="pb-1 sm:pb-2 p-3 sm:p-6">
                        <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-1 sm:gap-2">
                          <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4 text-destructive" />
                          {language === 'ar' ? 'الأكثر غياباً' : 'Most Absent'}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-3 sm:p-6 pt-0">
                        <div className="text-base sm:text-xl font-bold text-foreground truncate">
                          {advancedStats.mostAbsentEmployee.name}
                        </div>
                        <p className="text-xs sm:text-sm text-destructive mt-1">
                          {advancedStats.mostAbsentEmployee.count} {language === 'ar' ? 'يوم' : 'days'}
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Public Holidays with Approval */}
                <HolidayApprovalCard />
              </motion.div>
            )}
          </>
        )}

        {/* Two Column Layout: Quick Actions & Subscription */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
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
                  icon={Users}
                />
                <QuickActionCard 
                  title={language === 'ar' ? 'طلبات الانضمام' : 'Join Requests'}
                  count={pendingCounts?.joinRequests ?? 0}
                  description={language === 'ar' ? 'طلبات انضمام جديدة عبر تيليجرام' : 'New join requests via Telegram'}
                  actionLabel={t('dashboard.review')}
                  link="/dashboard/join-requests"
                  icon={UserPlus}
                  isWarning={(pendingCounts?.joinRequests ?? 0) > 0}
                />
                <QuickActionCard 
                  title={t('dashboard.pendingLeaves')}
                  count={pendingCounts?.leaveRequests ?? 0}
                  description={t('dashboard.pendingLeavesDesc')}
                  actionLabel={t('dashboard.review')}
                  link="/dashboard/leaves"
                  icon={CalendarCheck}
                  isWarning={(pendingCounts?.leaveRequests ?? 0) > 0}
                />
                <QuickActionCard 
                  title={t('dashboard.viewAttendance')}
                  count={stats?.present ?? 0}
                  description={t('dashboard.viewAttendanceDesc')}
                  actionLabel={t('dashboard.view')}
                  link="/dashboard/attendance"
                  icon={Clock}
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

          {/* Subscription Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.6 }}
          >
            <SubscriptionCard />
          </motion.div>
        </div>

        {/* Getting Started */}
        {(stats?.totalEmployees ?? 0) === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.6 }}
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

      {/* Absent Employees Dialog */}
      <AbsentEmployeesDialog 
        open={absentDialogOpen} 
        onOpenChange={setAbsentDialogOpen} 
      />
    </DashboardLayout>
  );
};

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: number;
  subtitle: string;
  color: string;
  delay: number;
  onClick?: () => void;
}

const StatCard = ({ icon: Icon, label, value, subtitle, color, delay, onClick }: StatCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay }}
  >
    <Card 
      className={`card-hover ${onClick ? 'cursor-pointer hover:ring-2 hover:ring-primary/20' : ''}`}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 pt-3 sm:pt-4 px-3 sm:px-6">
        <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground line-clamp-1">
          {label}
        </CardTitle>
        <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${color} flex-shrink-0`} />
      </CardHeader>
      <CardContent className="pt-0 pb-3 sm:pb-4 px-3 sm:px-6">
        <div className="text-2xl sm:text-3xl font-bold text-foreground">{value}</div>
        <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 line-clamp-1">{subtitle}</p>
      </CardContent>
    </Card>
  </motion.div>
);

interface QuickActionCardProps {
  title: string;
  count: number;
  description: string;
  actionLabel: string;
  link: string;
  icon?: React.ElementType;
  isSuccess?: boolean;
  isWarning?: boolean;
}

const QuickActionCard = ({ title, count, description, actionLabel, link, icon: Icon, isSuccess, isWarning }: QuickActionCardProps) => (
  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
    <div className="flex items-center gap-3">
      {isWarning && count > 0 && (
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-warning text-warning-foreground text-xs font-bold animate-pulse">
          {count}
        </span>
      )}
      {!isWarning && !isSuccess && count > 0 && (
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold">
          {count}
        </span>
      )}
      {isSuccess && (
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-success text-success-foreground text-xs">
          ✓
        </span>
      )}
      {!isSuccess && !isWarning && count === 0 && (
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-muted-foreground/20 text-muted-foreground text-xs">
          {Icon ? <Icon className="w-3 h-3" /> : '0'}
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
