import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Building2, 
  Users, 
  Clock, 
  CreditCard,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface DashboardStats {
  totalCompanies: number;
  totalEmployees: number;
  activeSubscriptions: number;
  trialSubscriptions: number;
  expiredSubscriptions: number;
  todayAttendance: {
    present: number;
    absent: number;
    late: number;
  };
  recentCompanies: Array<{
    id: string;
    name: string;
    created_at: string;
    employee_count: number;
  }>;
}

const SuperAdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalCompanies: 0,
    totalEmployees: 0,
    activeSubscriptions: 0,
    trialSubscriptions: 0,
    expiredSubscriptions: 0,
    todayAttendance: { present: 0, absent: 0, late: 0 },
    recentCompanies: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch companies
        const { data: companies, error: companiesError } = await supabase
          .from('companies')
          .select('id, name, created_at');

        if (companiesError) throw companiesError;

        // Fetch employees
        const { data: employees, error: employeesError } = await supabase
          .from('employees')
          .select('id, company_id');

        if (employeesError) throw employeesError;

        // Fetch subscriptions
        const { data: subscriptions, error: subsError } = await supabase
          .from('subscriptions')
          .select('status');

        if (subsError) throw subsError;

        // Fetch today's attendance
        const today = new Date().toISOString().split('T')[0];
        const { data: attendance, error: attError } = await supabase
          .from('attendance_logs')
          .select('status, check_in_time')
          .eq('date', today);

        if (attError) throw attError;

        // Calculate stats
        const companyEmployeeCounts = (companies || []).map(company => ({
          ...company,
          employee_count: (employees || []).filter(e => e.company_id === company.id).length
        }));

        const activeCount = (subscriptions || []).filter(s => s.status === 'active').length;
        const trialCount = (subscriptions || []).filter(s => s.status === 'trial').length;
        const expiredCount = (subscriptions || []).filter(s => s.status === 'cancelled' || s.status === 'inactive').length;

        const presentCount = (attendance || []).filter(a => a.status === 'checked_in' || a.status === 'checked_out').length;
        const absentCount = (employees || []).length - presentCount;

        setStats({
          totalCompanies: (companies || []).length,
          totalEmployees: (employees || []).length,
          activeSubscriptions: activeCount,
          trialSubscriptions: trialCount,
          expiredSubscriptions: expiredCount,
          todayAttendance: {
            present: presentCount,
            absent: Math.max(0, absentCount),
            late: 0,
          },
          recentCompanies: companyEmployeeCounts
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 5),
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    { 
      icon: Building2, 
      label: 'إجمالي الشركات', 
      value: stats.totalCompanies,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10'
    },
    { 
      icon: Users, 
      label: 'إجمالي الموظفين', 
      value: stats.totalEmployees,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10'
    },
    { 
      icon: CheckCircle, 
      label: 'اشتراكات نشطة', 
      value: stats.activeSubscriptions,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10'
    },
    { 
      icon: Clock, 
      label: 'فترة تجريبية', 
      value: stats.trialSubscriptions,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10'
    },
    { 
      icon: XCircle, 
      label: 'اشتراكات منتهية', 
      value: stats.expiredSubscriptions,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10'
    },
  ];

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">لوحة التحكم</h1>
          <p className="text-slate-400 mt-1">نظرة عامة على النظام</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {statCards.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="bg-slate-900 border-slate-800">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                      <stat.icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{loading ? '...' : stat.value}</p>
                      <p className="text-slate-400 text-sm">{stat.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Today's Attendance */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                حضور اليوم
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 rounded-xl bg-green-500/10">
                  <p className="text-3xl font-bold text-green-400">{stats.todayAttendance.present}</p>
                  <p className="text-slate-400 text-sm mt-1">حاضرين</p>
                </div>
                <div className="text-center p-4 rounded-xl bg-amber-500/10">
                  <p className="text-3xl font-bold text-amber-400">{stats.todayAttendance.late}</p>
                  <p className="text-slate-400 text-sm mt-1">متأخرين</p>
                </div>
                <div className="text-center p-4 rounded-xl bg-red-500/10">
                  <p className="text-3xl font-bold text-red-400">{stats.todayAttendance.absent}</p>
                  <p className="text-slate-400 text-sm mt-1">غائبين</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Companies */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                أحدث الشركات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.recentCompanies.map((company) => (
                  <div 
                    key={company.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-white font-medium">{company.name}</p>
                        <p className="text-slate-400 text-xs">
                          {new Date(company.created_at).toLocaleDateString('ar-SA')}
                        </p>
                      </div>
                    </div>
                    <div className="text-end">
                      <p className="text-white font-medium">{company.employee_count}</p>
                      <p className="text-slate-400 text-xs">موظف</p>
                    </div>
                  </div>
                ))}
                {stats.recentCompanies.length === 0 && !loading && (
                  <p className="text-slate-400 text-center py-4">لا توجد شركات بعد</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </SuperAdminLayout>
  );
};

export default SuperAdminDashboard;
