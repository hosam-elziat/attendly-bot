import { motion } from 'framer-motion';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import { useSuperAdminStats } from '@/hooks/useSuperAdminStats';
import { StatsCards } from '@/components/super-admin/dashboard/StatsCards';
import { ActivityFeed } from '@/components/super-admin/dashboard/ActivityFeed';
import { TopCompaniesCharts } from '@/components/super-admin/dashboard/TopCompaniesCharts';
import { AttendanceOverview } from '@/components/super-admin/dashboard/AttendanceOverview';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

const SuperAdminDashboard = () => {
  const { stats, activityFeed, loading, refetch } = useSuperAdminStats();

  const defaultStats = {
    companies: { total: 0, active: 0, trial: 0, suspended: 0, deleted: 0 },
    employees: { total: 0, activeToday: 0 },
    attendance: { todayPresent: 0, todayAbsent: 0, todayLate: 0, averageComplianceRate: 0 },
    subscriptions: { active: 0, expiringSoon: 0, expired: 0 },
    revenue: { today: 0, thisMonth: 0, thisYear: 0, currency: 'EGP' },
    bots: { total: 0, available: 0, assigned: 0 },
    topCompanies: { byCompliance: [], byAbsence: [], byUsage: [] },
    churnRate: 0,
    conversionRate: 0,
  };

  const currentStats = stats || defaultStats;

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">لوحة التحكم الرئيسية</h1>
            <p className="text-slate-400 mt-1">نظرة شاملة على النظام بالكامل</p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refetch}
            className="gap-2 border-slate-700 text-slate-300 hover:text-white"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </Button>
        </div>

        {/* Stats Cards */}
        <StatsCards stats={currentStats} loading={loading} />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Activity Feed - Takes 1 column */}
          <div className="lg:col-span-1">
            <ActivityFeed activities={activityFeed} loading={loading} />
          </div>

          {/* Right Side - Takes 2 columns */}
          <div className="lg:col-span-2 space-y-6">
            {/* Attendance Overview */}
            <AttendanceOverview 
              attendance={currentStats.attendance}
              employeesTotal={currentStats.employees.total}
              loading={loading}
            />
          </div>
        </div>

        {/* Top Companies Charts */}
        <TopCompaniesCharts 
          topCompanies={currentStats.topCompanies}
          loading={loading}
        />
      </div>
    </SuperAdminLayout>
  );
};

export default SuperAdminDashboard;
