import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { z } from 'zod';
import { useLogAction } from './useAuditLogs';

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

// Validation schema for status update
const LeaveStatusUpdateSchema = z.object({
  id: z.string().uuid('Invalid leave request ID'),
  status: z.enum(['approved', 'rejected'], {
    errorMap: () => ({ message: 'Status must be approved or rejected' }),
  }),
});

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
  const logAction = useLogAction();

  return useMutation({
    mutationFn: async ({ id, status, oldData }: { id: string; status: 'approved' | 'rejected'; oldData?: LeaveRequest }) => {
      // Validate input
      const validationResult = LeaveStatusUpdateSchema.safeParse({ id, status });
      
      if (!validationResult.success) {
        const firstError = validationResult.error.errors[0];
        throw new Error(firstError.message);
      }

      const { data, error } = await supabase
        .from('leave_requests')
        .update({
          status: validationResult.data.status,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', validationResult.data.id)
        .select(`
          *,
          employees (
            full_name,
            email,
            leave_balance
          )
        `)
        .single();

      if (error) throw error;

      // If approved, deduct from employee's leave balance
      if (status === 'approved' && data.employee_id) {
        const currentBalance = (data.employees as any)?.leave_balance || 21;
        const newBalance = Math.max(0, currentBalance - data.days);
        
        await supabase
          .from('employees')
          .update({ leave_balance: newBalance })
          .eq('id', data.employee_id);
      }

      // Log the action
      const statusArabic = status === 'approved' ? 'موافق عليه' : 'مرفوض';
      await logAction.mutateAsync({
        tableName: 'leave_requests',
        recordId: id,
        action: 'update',
        oldData: oldData ? JSON.parse(JSON.stringify(oldData)) : null,
        newData: JSON.parse(JSON.stringify(data)),
        description: `تغيير حالة طلب إجازة ${data.employees?.full_name} إلى ${statusArabic}`,
      });

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
