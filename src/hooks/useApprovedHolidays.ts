import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface ApprovedHoliday {
  id: string;
  company_id: string;
  holiday_date: string;
  holiday_name: string;
  holiday_name_local: string | null;
  days_count: number;
  is_approved: boolean;
  approved_at: string | null;
  approved_by: string | null;
  notified_employees: boolean;
  notified_at: string | null;
  year: number;
  month: number;
  created_at: string;
  updated_at: string;
}

export const useApprovedHolidays = (year?: number, month?: number) => {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['approved-holidays', profile?.company_id, year, month],
    queryFn: async (): Promise<ApprovedHoliday[]> => {
      if (!profile?.company_id) return [];

      let query = supabase
        .from('approved_holidays')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('holiday_date', { ascending: true });

      if (year) {
        query = query.eq('year', year);
      }
      if (month !== undefined) {
        query = query.eq('month', month);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching approved holidays:', error);
        return [];
      }

      return (data || []) as ApprovedHoliday[];
    },
    enabled: !!profile?.company_id,
  });
};

export const useApproveHoliday = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({ holidayId, daysCount }: { holidayId: string; daysCount: number }) => {
      const { error } = await supabase
        .from('approved_holidays')
        .update({
          is_approved: true,
          approved_at: new Date().toISOString(),
          approved_by: profile?.user_id,
          days_count: daysCount,
        })
        .eq('id', holidayId);

      if (error) throw error;

      // Trigger notification to employees
      const { error: notifyError } = await supabase.functions.invoke('notify-holiday-approval', {
        body: { holidayId },
      });

      if (notifyError) {
        console.error('Failed to notify employees:', notifyError);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approved-holidays'] });
      toast({
        title: 'تم اعتماد الإجازة',
        description: 'سيتم إشعار جميع الموظفين بهذه الإجازة',
      });
    },
    onError: (error) => {
      console.error('Error approving holiday:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في اعتماد الإجازة',
        variant: 'destructive',
      });
    },
  });
};

export const useRejectHoliday = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (holidayId: string) => {
      const { error } = await supabase
        .from('approved_holidays')
        .update({
          is_approved: false,
          approved_at: null,
          approved_by: null,
        })
        .eq('id', holidayId);

      if (error) throw error;

      // Notify employees about cancellation
      const { error: notifyError } = await supabase.functions.invoke('notify-holiday-approval', {
        body: { holidayId, isCancellation: true },
      });

      if (notifyError) {
        console.error('Failed to notify employees:', notifyError);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approved-holidays'] });
      toast({
        title: 'تم إلغاء الإجازة',
        description: 'تم إبلاغ جميع الموظفين بإلغاء هذه الإجازة',
      });
    },
    onError: (error) => {
      console.error('Error rejecting holiday:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في إلغاء الإجازة',
        variant: 'destructive',
      });
    },
  });
};

export const useSyncPublicHolidays = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (holidays: { date: string; name: string; localName: string }[]) => {
      if (!profile?.company_id) throw new Error('No company ID');

      const year = new Date().getFullYear();
      const month = new Date().getMonth();

      const holidaysToInsert = holidays.map((h) => ({
        company_id: profile.company_id,
        holiday_date: h.date,
        holiday_name: h.name,
        holiday_name_local: h.localName,
        year,
        month,
        is_approved: false,
        days_count: 1,
      }));

      // Upsert holidays (insert or ignore if exists)
      for (const holiday of holidaysToInsert) {
        const { error } = await supabase
          .from('approved_holidays')
          .upsert(holiday, {
            onConflict: 'company_id,holiday_date,year',
            ignoreDuplicates: true,
          });

        if (error) {
          console.error('Error syncing holiday:', error);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approved-holidays'] });
    },
  });
};
