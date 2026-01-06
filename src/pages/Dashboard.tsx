import { motion } from 'framer-motion';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useAttendanceStats } from '@/hooks/useAttendance';
import { useAdvancedStats, COUNTRIES } from '@/hooks/useAdvancedStats';
import { usePublicHolidays } from '@/hooks/usePublicHolidays';
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
  Flag
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

const Dashboard = () => {
  const { t, language } = useLanguage();
  const { profile } = useAuth();
  const { data: stats, isLoading } = useAttendanceStats();
  const { data: advancedStats, isLoading: advancedLoading } = useAdvancedStats();
  const { data: holidays, isLoading: holidaysLoading } = usePublicHolidays();

  const firstName = profile?.full_name?.split(' ')[0] || 'هناك';

  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours} ${language === 'ar' ? 'ساعة' : 'h'} ${mins > 0 ? `${mins} ${language === 'ar' ? 'د' : 'm'}` : ''}`;
    }
    return `${mins} ${language === 'ar' ? 'دقيقة' : 'min'}`;
  };

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

        {/* Today's Stats */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Basic Stats Row */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                icon={Users}
                label={t('dashboard.present')}
                value={stats?.present ?? 0}
                subtitle={`${stats?.totalEmployees ?? 0} ${t('dashboard.totalEmployees')}`}
                color="text-success"
                delay={0}
              />
              <StatCard
                icon={Users}
                label={t('dashboard.absent')}
                value={stats?.absent ?? 0}
                subtitle={t('dashboard.notCheckedIn')}
                color="text-destructive"
                delay={0.1}
              />
              <StatCard
                icon={Coffee}
                label={t('dashboard.on_leave')}
                value={stats?.onBreak ?? 0}
                subtitle={t('dashboard.currentlyOnBreak')}
                color="text-warning"
                delay={0.2}
              />
              <StatCard
                icon={AlertCircle}
                label={t('dashboard.pending')}
                value={stats?.pendingLeaves ?? 0}
                subtitle={t('dashboard.leaveRequests')}
                color="text-primary"
                delay={0.3}
              />
            </div>

            {/* Advanced Stats Section */}
            {!advancedLoading && advancedStats && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.4 }}
              >
                <h2 className="text-lg font-semibold text-foreground mb-4">
                  {language === 'ar' ? 'إحصائيات الشهر' : 'Monthly Statistics'}
                </h2>
                
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {/* Team Commitment Rate */}
                  <Card className="card-hover">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Percent className="w-4 h-4" />
                        {language === 'ar' ? 'نسبة التزام الفريق' : 'Team Commitment'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-3xl font-bold text-foreground">
                          {advancedStats.teamCommitmentRate}%
                        </span>
                        <TrendingUp className="w-5 h-5 text-success" />
                      </div>
                      <Progress value={advancedStats.teamCommitmentRate} className="h-2" />
                    </CardContent>
                  </Card>

                  {/* Absence Rate */}
                  <Card className="card-hover">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <TrendingDown className="w-4 h-4" />
                        {language === 'ar' ? 'نسبة الغيابات' : 'Absence Rate'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-3xl font-bold text-foreground">
                          {advancedStats.absenceRate}%
                        </span>
                        <TrendingDown className={`w-5 h-5 ${advancedStats.absenceRate > 10 ? 'text-destructive' : 'text-success'}`} />
                      </div>
                      <Progress value={advancedStats.absenceRate} className="h-2 [&>div]:bg-destructive" />
                    </CardContent>
                  </Card>

                  {/* Monthly Late Count */}
                  <Card className="card-hover">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {language === 'ar' ? 'عدد التأخيرات' : 'Late Arrivals'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-foreground">
                        {advancedStats.monthlyLateCount}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {language === 'ar' ? 'هذا الشهر' : 'This month'}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Total Break Time */}
                  <Card className="card-hover">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Coffee className="w-4 h-4" />
                        {language === 'ar' ? 'إجمالي الاستراحات' : 'Total Breaks'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-foreground">
                        {formatMinutes(advancedStats.totalBreakMinutes)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {language === 'ar' ? 'لجميع الموظفين' : 'All employees'}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Total Overtime */}
                  <Card className="card-hover">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Timer className="w-4 h-4" />
                        {language === 'ar' ? 'إجمالي الوقت الإضافي' : 'Total Overtime'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-foreground">
                        {formatMinutes(advancedStats.totalOvertimeMinutes)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {language === 'ar' ? `× ${advancedStats.overtimeMultiplier} معدل الحساب` : `× ${advancedStats.overtimeMultiplier} multiplier`}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Average Overtime */}
                  <Card className="card-hover">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Timer className="w-4 h-4" />
                        {language === 'ar' ? 'متوسط الوقت الإضافي' : 'Avg Overtime/Employee'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-foreground">
                        {formatMinutes(advancedStats.avgOvertimePerEmployee)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {language === 'ar' ? 'لكل موظف' : 'Per employee'}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Top Performers */}
                <div className="grid gap-4 sm:grid-cols-2 mt-4">
                  {advancedStats.mostCommittedEmployee && (
                    <Card className="border-success/30 bg-success/5">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                          <Trophy className="w-4 h-4 text-success" />
                          {language === 'ar' ? 'أكثر موظف ملتزم' : 'Most Committed'}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-xl font-bold text-foreground">
                          {advancedStats.mostCommittedEmployee.name}
                        </div>
                        <p className="text-sm text-success mt-1">
                          {advancedStats.mostCommittedEmployee.rate.toFixed(0)}% {language === 'ar' ? 'نسبة الالتزام' : 'commitment'}
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {advancedStats.mostAbsentEmployee && advancedStats.mostAbsentEmployee.count > 0 && (
                    <Card className="border-destructive/30 bg-destructive/5">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-destructive" />
                          {language === 'ar' ? 'أكثر موظف غياباً' : 'Most Absent'}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-xl font-bold text-foreground">
                          {advancedStats.mostAbsentEmployee.name}
                        </div>
                        <p className="text-sm text-destructive mt-1">
                          {advancedStats.mostAbsentEmployee.count} {language === 'ar' ? 'يوم غياب' : 'days absent'}
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Public Holidays */}
                {!holidaysLoading && holidays && holidays.length > 0 && (
                  <Card className="mt-4 border-primary/30 bg-primary/5">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Flag className="w-4 h-4 text-primary" />
                        {language === 'ar' ? 'الإجازات الرسمية هذا الشهر' : 'Public Holidays This Month'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {holidays.map((holiday, index) => (
                          <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-background/50">
                            <div>
                              <p className="font-medium text-foreground">
                                {language === 'ar' ? holiday.localName : holiday.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(holiday.date), 'EEEE, d MMMM', { locale: language === 'ar' ? ar : undefined })}
                              </p>
                            </div>
                            <Calendar className="w-4 h-4 text-primary" />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            )}
          </>
        )}

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
}

const StatCard = ({ icon: Icon, label, value, subtitle, color, delay }: StatCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay }}
  >
    <Card className="card-hover">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        <Icon className={`w-5 h-5 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-foreground">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
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
