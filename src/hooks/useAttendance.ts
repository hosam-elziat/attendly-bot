import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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
  const today = date || new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: ['attendance', profile?.company_id, today],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      
      const { data, error } = await supabase
        .from('attendance_logs')
        .select(`
          *,
          employees (
            full_name,
            email
          )
        `)
        .eq('company_id', profile.company_id)
        .eq('date', today)
        .order('check_in_time', { ascending: false });

      if (error) throw error;
      return data as AttendanceLog[];
    },
    enabled: !!profile?.company_id,
  });
};

export const useAttendanceStats = () => {
  const { profile } = useAuth();
  const today = new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: ['attendance-stats', profile?.company_id, today],
    queryFn: async () => {
      if (!profile?.company_id) return null;
      
      // Get total employees
      const { count: totalEmployees } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', profile.company_id)
        .eq('is_active', true);

      // Get today's attendance
      const { data: attendance } = await supabase
        .from('attendance_logs')
        .select('status')
        .eq('company_id', profile.company_id)
        .eq('date', today);

      const checkedIn = attendance?.filter(a => a.status === 'checked_in').length || 0;
      const onBreak = attendance?.filter(a => a.status === 'on_break').length || 0;
      const checkedOut = attendance?.filter(a => a.status === 'checked_out').length || 0;
      const present = checkedIn + onBreak;
      const absent = (totalEmployees || 0) - present - checkedOut;

      // Get pending leave requests
      const { count: pendingLeaves } = await supabase
        .from('leave_requests')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', profile.company_id)
        .eq('status', 'pending');

      return {
        totalEmployees: totalEmployees || 0,
        present,
        absent: absent < 0 ? 0 : absent,
        onBreak,
        checkedOut,
        pendingLeaves: pendingLeaves || 0,
      };
    },
    enabled: !!profile?.company_id,
  });
};
