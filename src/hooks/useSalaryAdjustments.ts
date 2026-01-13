import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, startOfMonth, endOfMonth } from 'date-fns';

export interface SalaryAdjustment {
  id: string;
  employee_id: string;
  company_id: string;
  month: string;
  bonus: number;
  deduction: number;
  adjustment_days: number | null;
  description: string | null;
  added_by: string | null;
  added_by_name: string | null;
  created_at: string;
  updated_at?: string;
  attendance_log_id: string | null;
  is_auto_generated: boolean;
  employees?: {
    full_name: string;
  };
}

// Hook to get all adjustments for a company in a specific month
export function useSalaryAdjustments(month?: string) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['salary-adjustments', profile?.company_id, month],
    queryFn: async () => {
      if (!profile?.company_id) return [];

      let query = supabase
        .from('salary_adjustments')
        .select(`
          id,
          employee_id,
          company_id,
          month,
          bonus,
          deduction,
          adjustment_days,
          description,
          added_by,
          added_by_name,
          created_at,
          attendance_log_id,
          is_auto_generated,
          employees (
            full_name
          )
        `)
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false });

      if (month) {
        // Normalize month to YYYY-MM-01 format
        const monthPrefix = month.slice(0, 7);
        const monthKey = `${monthPrefix}-01`;
        
        // Use gte/lte range filter to get all records for the month
        query = query.gte('month', monthKey).lte('month', monthKey);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching salary adjustments:', error);
        throw error;
      }

      return (data || []) as SalaryAdjustment[];
    },
    enabled: !!profile?.company_id,
  });
}

// Hook to get adjustments for a specific employee
export function useEmployeeAdjustments(employeeId?: string, month?: string) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['employee-adjustments', employeeId, month],
    queryFn: async () => {
      if (!profile?.company_id || !employeeId) return [];

      let query = supabase
        .from('salary_adjustments')
        .select(`
          id,
          employee_id,
          company_id,
          month,
          bonus,
          deduction,
          adjustment_days,
          description,
          added_by,
          added_by_name,
          created_at,
          attendance_log_id,
          is_auto_generated
        `)
        .eq('company_id', profile.company_id)
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false });

      if (month) {
        // Normalize month to YYYY-MM-01 format
        const monthPrefix = month.slice(0, 7);
        const monthKey = `${monthPrefix}-01`;
        
        // Use gte/lte range filter to get all records for the month
        query = query.gte('month', monthKey).lte('month', monthKey);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching employee adjustments:', error);
        throw error;
      }

      return (data || []) as SalaryAdjustment[];
    },
    enabled: !!profile?.company_id && !!employeeId,
  });
}
