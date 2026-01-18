import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

export interface ScheduledLeave {
  id: string;
  company_id: string;
  leave_name: string;
  leave_date: string;
  end_date: string | null;
  leave_type: string;
  target_type: 'company' | 'position' | 'employee';
  target_id: string | null;
  reason: string | null;
  created_by: string | null;
  created_by_name: string | null;
  notified_at: string | null;
  created_at: string;
  updated_at: string;
}

export const useScheduledLeaves = (date?: string) => {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['scheduled-leaves', profile?.company_id, date],
    queryFn: async () => {
      if (!profile?.company_id) return [];

      let query = supabase
        .from('scheduled_leaves')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('leave_date', { ascending: false });

      if (date) {
        query = query.lte('leave_date', date).gte('end_date', date);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as ScheduledLeave[];
    },
    enabled: !!profile?.company_id,
  });
};

export const useDeleteScheduledLeave = () => {
  const { language } = useLanguage();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, leaveData }: { id: string; leaveData: ScheduledLeave }) => {
      // Delete the leave first
      const { error } = await supabase
        .from('scheduled_leaves')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Send notification about deletion
      try {
        await supabase.functions.invoke('notify-scheduled-leave-update', {
          body: { 
            scheduled_leave_id: id,
            action: 'delete',
            old_data: leaveData
          }
        });
      } catch (notifyError) {
        console.error('Failed to send deletion notifications:', notifyError);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-leaves'] });
      toast.success(language === 'ar' ? 'تم حذف الإجازة بنجاح' : 'Leave deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting scheduled leave:', error);
      toast.error(language === 'ar' ? 'فشل في حذف الإجازة' : 'Failed to delete leave');
    },
  });
};

// Check if an employee has a scheduled leave for a specific date
export const useCheckScheduledLeave = (employeeId: string, positionId: string | null, date: string) => {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['check-scheduled-leave', profile?.company_id, employeeId, positionId, date],
    queryFn: async () => {
      if (!profile?.company_id) return null;

      // Check for company-wide leaves
      const { data: companyLeaves } = await supabase
        .from('scheduled_leaves')
        .select('*')
        .eq('company_id', profile.company_id)
        .eq('target_type', 'company')
        .lte('leave_date', date)
        .or(`end_date.gte.${date},end_date.is.null`);

      if (companyLeaves && companyLeaves.length > 0) {
        return companyLeaves[0] as ScheduledLeave;
      }

      // Check for position-specific leaves
      if (positionId) {
        const { data: positionLeaves } = await supabase
          .from('scheduled_leaves')
          .select('*')
          .eq('company_id', profile.company_id)
          .eq('target_type', 'position')
          .eq('target_id', positionId)
          .lte('leave_date', date)
          .or(`end_date.gte.${date},end_date.is.null`);

        if (positionLeaves && positionLeaves.length > 0) {
          return positionLeaves[0] as ScheduledLeave;
        }
      }

      // Check for employee-specific leaves
      const { data: employeeLeaves } = await supabase
        .from('scheduled_leaves')
        .select('*')
        .eq('company_id', profile.company_id)
        .eq('target_type', 'employee')
        .eq('target_id', employeeId)
        .lte('leave_date', date)
        .or(`end_date.gte.${date},end_date.is.null`);

      if (employeeLeaves && employeeLeaves.length > 0) {
        return employeeLeaves[0] as ScheduledLeave;
      }

      return null;
    },
    enabled: !!profile?.company_id && !!employeeId && !!date,
  });
};
