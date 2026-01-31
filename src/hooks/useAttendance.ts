import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSuperAdminCompanyAccess } from '@/hooks/useSuperAdminCompanyAccess';

export interface AttendanceLog {
  id: string;
  employee_id: string;
  company_id: string;
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  status: 'checked_in' | 'on_break' | 'checked_out';
  notes: string | null;
  created_at: string;
  employees?: {
    full_name: string;
    email: string;
  };
}

export const useAttendance = (date?: string) => {
  const { profile } = useAuth();
  const { effectiveCompanyId, isSuperAdminAccess } = useSuperAdminCompanyAccess();
  const today = date || new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: ['attendance', effectiveCompanyId, today, isSuperAdminAccess],
    queryFn: async () => {
      if (!effectiveCompanyId) return [];
      
      const { data, error } = await supabase
        .from('attendance_logs')
        .select(`
          *,
          employees (
            full_name,
            email
          )
        `)
        .eq('company_id', effectiveCompanyId)
        .eq('date', today)
        .order('check_in_time', { ascending: false });

      if (error) throw error;
      return data as AttendanceLog[];
    },
    enabled: !!effectiveCompanyId,
  });
};

export const useAttendanceStats = () => {
  const { profile } = useAuth();
  const { effectiveCompanyId, isSuperAdminAccess } = useSuperAdminCompanyAccess();
  const today = new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: ['attendance-stats', effectiveCompanyId, today, isSuperAdminAccess],
    queryFn: async () => {
      if (!effectiveCompanyId) return null;
      
      // Get total employees
      const { count: totalEmployees } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', effectiveCompanyId)
        .eq('is_active', true);

      // Get today's attendance - count all who checked in today (excluding absent)
      const { data: attendance } = await supabase
        .from('attendance_logs')
        .select('status')
        .eq('company_id', effectiveCompanyId)
        .eq('date', today);

      // Filter out absent employees from the count
      const nonAbsentAttendance = attendance?.filter(a => a.status !== 'absent') || [];
      const totalCheckedInToday = nonAbsentAttendance.length; // Total people who checked in today (excluding absent)
      const checkedIn = nonAbsentAttendance.filter(a => a.status === 'checked_in').length;
      const onBreak = nonAbsentAttendance.filter(a => a.status === 'on_break').length;
      const checkedOut = nonAbsentAttendance.filter(a => a.status === 'checked_out').length;
      const markedAbsent = attendance?.filter(a => a.status === 'absent').length || 0;
      const present = checkedIn + onBreak;
      const absent = (totalEmployees || 0) - totalCheckedInToday;

      // Get pending leave requests
      const { count: pendingLeaves } = await supabase
        .from('leave_requests')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', effectiveCompanyId)
        .eq('status', 'pending');

      return {
        totalEmployees: totalEmployees || 0,
        present,
        absent: absent < 0 ? 0 : absent,
        onBreak,
        checkedOut,
        pendingLeaves: pendingLeaves || 0,
        totalCheckedInToday, // New field: total who checked in today (doesn't decrease on checkout)
      };
    },
    enabled: !!effectiveCompanyId,
  });
};
