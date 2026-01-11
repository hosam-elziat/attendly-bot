import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface JoinRequest {
  id: string;
  company_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  telegram_chat_id: string;
  telegram_username: string | null;
  national_id: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export function useJoinRequests() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['join-requests', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];

      const { data, error } = await supabase
        .from('join_requests')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as JoinRequest[];
    },
    enabled: !!profile?.company_id,
  });
}

export function useApproveJoinRequest() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async ({ requestId, employeeData }: { 
      requestId: string; 
      employeeData: {
        full_name: string;
        email: string;
        phone?: string;
        telegram_chat_id: string;
        national_id?: string;
        department?: string;
        base_salary?: number;
      }
    }) => {
      if (!profile?.company_id) throw new Error('No company found');

      // Create employee
      const { error: employeeError } = await supabase
        .from('employees')
        .insert({
          company_id: profile.company_id,
          full_name: employeeData.full_name,
          email: employeeData.email,
          phone: employeeData.phone || null,
          telegram_chat_id: employeeData.telegram_chat_id,
          national_id: employeeData.national_id || null,
          department: employeeData.department || null,
          base_salary: employeeData.base_salary || 0,
        });

      if (employeeError) throw employeeError;

      // Update request status
      const { error: updateError } = await supabase
        .from('join_requests')
        .update({
          status: 'approved',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['join-requests'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('تم قبول الطلب وإضافة الموظف بنجاح');
    },
    onError: (error) => {
      console.error('Error approving request:', error);
      toast.error('حدث خطأ أثناء قبول الطلب');
    },
  });
}

export function useRejectJoinRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ requestId, reason }: { requestId: string; reason?: string }) => {
      const { error } = await supabase
        .from('join_requests')
        .update({
          status: 'rejected',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: reason || null,
        })
        .eq('id', requestId);

      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['join-requests'] });
      toast.success('تم رفض الطلب');
    },
    onError: (error) => {
      console.error('Error rejecting request:', error);
      toast.error('حدث خطأ أثناء رفض الطلب');
    },
  });
}
