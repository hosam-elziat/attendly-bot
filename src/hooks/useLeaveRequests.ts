import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface LeaveRequest {
  id: string;
  employee_id: string;
  company_id: string;
  leave_type: 'vacation' | 'sick' | 'personal';
  start_date: string;
  end_date: string;
  days: number;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  employees?: {
    full_name: string;
    email: string;
  };
}

export const useLeaveRequests = () => {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['leave-requests', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      
      const { data, error } = await supabase
        .from('leave_requests')
        .select(`
          *,
          employees (
            full_name,
            email
          )
        `)
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as LeaveRequest[];
    },
    enabled: !!profile?.company_id,
  });
};

export const useUpdateLeaveRequest = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => {
      const { data, error } = await supabase
        .from('leave_requests')
        .update({
          status,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      toast.success(`Leave request ${variables.status}`);
    },
    onError: (error) => {
      toast.error('Failed to update leave request: ' + error.message);
    },
  });
};
