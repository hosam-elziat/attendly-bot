import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DashboardStats {
  companies: {
    total: number;
    active: number;
    trial: number;
    suspended: number;
    deleted: number;
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
    thisYear: number;
    currency: string;
  };
  bots: {
    total: number;
    available: number;
    assigned: number;
  };
  topCompanies: {
    byCompliance: Array<{ id: string; name: string; rate: number }>;
    byAbsence: Array<{ id: string; name: string; count: number }>;
    byUsage: Array<{ id: string; name: string; activity: number }>;
  };
  churnRate: number;
  conversionRate: number;
}

interface ActivityFeedItem {
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
  metadata: Record<string, unknown>;
}

export const useSuperAdminStats = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activityFeed, setActivityFeed] = useState<ActivityFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const thisMonth = new Date().toISOString().slice(0, 7);
      const thisYear = new Date().getFullYear().toString();
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

      // Fetch all data in parallel
      const [
        companiesRes,
        employeesRes,
        subscriptionsRes,
        attendanceRes,
        botsRes,
        activityRes,
        revenueRes,
      ] = await Promise.all([
        supabase.from('companies').select('id, name, is_suspended, is_deleted, last_activity_at'),
        supabase.from('employees').select('id, company_id, is_active'),
        supabase.from('subscriptions').select('id, company_id, status, current_period_end'),
        supabase.from('attendance_logs').select('id, company_id, employee_id, status, date').eq('date', today),
        supabase.from('telegram_bots').select('id, is_available'),
        supabase.from('system_activity_feed').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('revenue_transactions').select('amount, currency, created_at'),
      ]);

      const companies = companiesRes.data || [];
      const employees = employeesRes.data || [];
      const subscriptions = subscriptionsRes.data || [];
      const attendance = attendanceRes.data || [];
      const bots = botsRes.data || [];
      const activities = activityRes.data || [];
      const revenue = revenueRes.data || [];

      // Calculate company stats
      const activeCompanies = companies.filter(c => !c.is_suspended && !c.is_deleted);
      const trialSubs = subscriptions.filter(s => s.status === 'trial');
      const activeSubs = subscriptions.filter(s => s.status === 'active');
      const expiredSubs = subscriptions.filter(s => ['cancelled', 'inactive', 'expired'].includes(s.status));
      const expiringSoon = subscriptions.filter(s => {
        if (s.status !== 'active') return false;
        const endDate = new Date(s.current_period_end);
        return endDate <= sevenDaysFromNow && endDate >= new Date();
      });

      // Calculate attendance stats
      const presentToday = attendance.filter(a => a.status === 'checked_in' || a.status === 'checked_out').length;
      const activeEmployees = employees.filter(e => e.is_active);
      const absentToday = Math.max(0, activeEmployees.length - presentToday);
      // Late employees are those who checked in after their start time - we'll count based on late status or absence
      const lateToday = 0; // Will be calculated from attendance_logs with late deductions

      // Calculate average compliance
      const complianceRate = activeEmployees.length > 0 
        ? Math.round((presentToday / activeEmployees.length) * 100) 
        : 0;

      // Calculate revenue
      const todayRevenue = revenue
        .filter(r => r.created_at?.startsWith(today))
        .reduce((sum, r) => sum + (r.amount || 0), 0);
      const monthRevenue = revenue
        .filter(r => r.created_at?.startsWith(thisMonth))
        .reduce((sum, r) => sum + (r.amount || 0), 0);
      const yearRevenue = revenue
        .filter(r => r.created_at?.startsWith(thisYear))
        .reduce((sum, r) => sum + (r.amount || 0), 0);

      // Calculate top companies by compliance
      const companyAttendance: Record<string, { present: number; total: number; name: string }> = {};
      companies.forEach(c => {
        const companyEmployees = employees.filter(e => e.company_id === c.id && e.is_active);
        const companyPresent = attendance.filter(a => a.company_id === c.id && (a.status === 'checked_in' || a.status === 'checked_out')).length;
        companyAttendance[c.id] = { present: companyPresent, total: companyEmployees.length, name: c.name };
      });

      const topByCompliance = Object.entries(companyAttendance)
        .filter(([_, data]) => data.total > 0)
        .map(([id, data]) => ({ id, name: data.name, rate: Math.round((data.present / data.total) * 100) }))
        .sort((a, b) => b.rate - a.rate)
        .slice(0, 5);

      const topByAbsence = Object.entries(companyAttendance)
        .map(([id, data]) => ({ id, name: data.name, count: Math.max(0, data.total - data.present) }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Calculate usage by last activity
      const topByUsage = companies
        .filter(c => c.last_activity_at && !c.is_deleted)
        .map(c => ({
          id: c.id,
          name: c.name,
          activity: new Date(c.last_activity_at!).getTime()
        }))
        .sort((a, b) => b.activity - a.activity)
        .slice(0, 5);

      // Calculate churn and conversion rates
      const totalHistoricalSubs = subscriptions.length;
      const churnRate = totalHistoricalSubs > 0 
        ? Math.round((expiredSubs.length / totalHistoricalSubs) * 100) 
        : 0;
      
      const trialConversions = subscriptions.filter(s => s.status === 'active').length;
      const totalTrials = trialSubs.length + trialConversions;
      const conversionRate = totalTrials > 0 
        ? Math.round((trialConversions / totalTrials) * 100) 
        : 0;

      setStats({
        companies: {
          total: companies.length,
          active: activeCompanies.length,
          trial: trialSubs.length,
          suspended: companies.filter(c => c.is_suspended).length,
          deleted: companies.filter(c => c.is_deleted).length,
        },
        employees: {
          total: employees.length,
          activeToday: presentToday,
        },
        attendance: {
          todayPresent: presentToday,
          todayAbsent: absentToday,
          todayLate: lateToday,
          averageComplianceRate: complianceRate,
        },
        subscriptions: {
          active: activeSubs.length,
          expiringSoon: expiringSoon.length,
          expired: expiredSubs.length,
        },
        revenue: {
          today: todayRevenue,
          thisMonth: monthRevenue,
          thisYear: yearRevenue,
          currency: 'EGP',
        },
        bots: {
          total: bots.length,
          available: bots.filter(b => b.is_available).length,
          assigned: bots.filter(b => !b.is_available).length,
        },
        topCompanies: {
          byCompliance: topByCompliance,
          byAbsence: topByAbsence,
          byUsage: topByUsage,
        },
        churnRate,
        conversionRate,
      });

      setActivityFeed(activities as ActivityFeedItem[]);
      setError(null);
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError('فشل في تحميل الإحصائيات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  return { stats, activityFeed, loading, error, refetch: fetchStats };
};
