import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSuperAdminCompanyAccess } from '@/hooks/useSuperAdminCompanyAccess';
import { toast } from 'sonner';
import { z } from 'zod';
import { useLogAction } from './useAuditLogs';

export interface LeaveRequest {
  id: string;
  employee_id: string;
  company_id: string;
  leave_type: 'vacation' | 'sick' | 'personal' | 'emergency' | 'regular';
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
    leave_balance?: number;
    emergency_leave_balance?: number;
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
  const { effectiveCompanyId, isSuperAdminAccess } = useSuperAdminCompanyAccess();

  return useQuery({
    queryKey: ['leave-requests', effectiveCompanyId, isSuperAdminAccess],
    queryFn: async () => {
      if (!effectiveCompanyId) return [];
      
      const { data, error } = await supabase
        .from('leave_requests')
        .select(`
          *,
          employees (
            full_name,
            email
          )
        `)
        .eq('company_id', effectiveCompanyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as LeaveRequest[];
    },
    enabled: !!effectiveCompanyId,
  });
};

export const useUpdateLeaveRequest = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const logAction = useLogAction();

  return useMutation({
    mutationFn: async ({ id, status, oldData, previousStatus }: { 
      id: string; 
      status: 'approved' | 'rejected'; 
      oldData?: LeaveRequest;
      previousStatus?: 'pending' | 'approved' | 'rejected';
    }) => {
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
            leave_balance,
            emergency_leave_balance
          )
        `)
        .single();

      if (error) throw error;

      const isEmergency = data.leave_type === 'emergency';
      const balanceField = isEmergency ? 'emergency_leave_balance' : 'leave_balance';
      const currentBalance = isEmergency 
        ? ((data.employees as any)?.emergency_leave_balance || 7)
        : ((data.employees as any)?.leave_balance || 21);

      // Handle balance changes based on status transitions
      if (status === 'approved' && previousStatus !== 'approved') {
        // Deduct from balance when approving (from pending or rejected)
        const newBalance = Math.max(0, currentBalance - data.days);
        await supabase
          .from('employees')
          .update({ [balanceField]: newBalance })
          .eq('id', data.employee_id);
      } else if (status === 'rejected' && previousStatus === 'approved') {
        // Restore balance when changing from approved to rejected
        const newBalance = currentBalance + data.days;
        await supabase
          .from('employees')
          .update({ [balanceField]: newBalance })
          .eq('id', data.employee_id);
      }

      // Send Telegram notification to employee
      console.log('Sending leave notification to employee:', { leave_request_id: id, status });
      try {
        const notifyResult = await supabase.functions.invoke('notify-leave-status', {
          body: { leave_request_id: id, status }
        });
        console.log('Notification result:', notifyResult);
        if (notifyResult.error) {
          console.error('Notification error:', notifyResult.error);
        }
      } catch (notifyError) {
        console.error('Failed to send notification:', notifyError);
        // Don't fail the whole operation if notification fails
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
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success(`Leave request ${variables.status}`);
    },
    onError: (error) => {
      toast.error('Failed to update leave request: ' + error.message);
    },
  });
};

export const useDeleteLeaveRequest = () => {
  const queryClient = useQueryClient();
  const logAction = useLogAction();

  return useMutation({
    mutationFn: async ({ id, leaveData }: { id: string; leaveData: LeaveRequest }) => {
      // If the leave was approved, restore the balance first
      if (leaveData.status === 'approved') {
        const { data: employee } = await supabase
          .from('employees')
          .select('leave_balance, emergency_leave_balance')
          .eq('id', leaveData.employee_id)
          .single();

        if (employee) {
          const isEmergency = leaveData.leave_type === 'emergency';
          const balanceField = isEmergency ? 'emergency_leave_balance' : 'leave_balance';
          const currentBalance = isEmergency 
            ? (employee.emergency_leave_balance || 7)
            : (employee.leave_balance || 21);
          
          const newBalance = currentBalance + leaveData.days;
          await supabase
            .from('employees')
            .update({ [balanceField]: newBalance })
            .eq('id', leaveData.employee_id);
        }
      }

      const { error } = await supabase
        .from('leave_requests')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Log the action
      await logAction.mutateAsync({
        tableName: 'leave_requests',
        recordId: id,
        action: 'delete',
        oldData: JSON.parse(JSON.stringify(leaveData)),
        newData: null,
        description: `حذف طلب إجازة ${leaveData.employees?.full_name}`,
      });

      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('تم حذف طلب الإجازة');
    },
    onError: (error) => {
      toast.error('فشل حذف طلب الإجازة: ' + error.message);
    },
  });
};

// Hook to notify managers when emergency leave is created
export const useNotifyEmergencyLeave = () => {
  return useMutation({
    mutationFn: async (leaveRequestId: string) => {
      console.log('Notifying managers about emergency leave:', leaveRequestId);
      const { error } = await supabase.functions.invoke('notify-emergency-leave', {
        body: { leave_request_id: leaveRequestId }
      });
      
      if (error) {
        console.error('Failed to notify managers:', error);
        throw error;
      }
    },
    onError: (error) => {
      console.error('Emergency leave notification failed:', error);
    },
  });
};
