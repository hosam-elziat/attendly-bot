import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSuperAdminCompanyAccess } from './useSuperAdminCompanyAccess';
import { toast } from 'sonner';

export interface PendingAttendance {
  id: string;
  company_id: string;
  employee_id: string;
  request_type: 'check_in' | 'check_out' | 'break_start' | 'break_end';
  requested_at: string;
  requested_time: string;
  latitude: number | null;
  longitude: number | null;
  ip_address: string | null;
  selfie_url: string | null;
  location_verified: boolean;
  ip_verified: boolean;
  selfie_verified: boolean;
  vpn_detected: boolean;
  location_spoofing_suspected: boolean;
  approver_id: string | null;
  approver_type: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'auto_rejected';
  approved_time: string | null;
  rejection_reason: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  notes: string | null;
  telegram_message_id: number | null;
  created_at: string;
  updated_at: string;
  employees?: {
    full_name: string;
    email: string;
  };
}

export const usePendingAttendance = (status?: string) => {
  const { effectiveCompanyId } = useSuperAdminCompanyAccess();

  return useQuery({
    queryKey: ['pending-attendance', effectiveCompanyId, status],
    queryFn: async () => {
      if (!effectiveCompanyId) return [];
      
      let query = supabase
        .from('pending_attendance')
        .select(`
          *,
          employees (
            full_name,
            email
          )
        `)
        .eq('company_id', effectiveCompanyId)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as PendingAttendance[];
    },
    enabled: !!effectiveCompanyId,
  });
};

export const usePendingAttendanceCount = () => {
  const { effectiveCompanyId } = useSuperAdminCompanyAccess();

  return useQuery({
    queryKey: ['pending-attendance-count', effectiveCompanyId],
    queryFn: async () => {
      if (!effectiveCompanyId) return 0;
      
      const { count, error } = await supabase
        .from('pending_attendance')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', effectiveCompanyId)
        .eq('status', 'pending');

      if (error) throw error;
      return count || 0;
    },
    enabled: !!effectiveCompanyId,
  });
};

export const useApprovePendingAttendance = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      id, 
      approved_time,
      notes 
    }: { 
      id: string; 
      approved_time?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('pending_attendance')
        .update({
          status: 'approved',
          approved_time: approved_time || new Date().toISOString(),
          reviewed_at: new Date().toISOString(),
          reviewed_by: (profile as any)?.user_id,
          notes,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['pending-attendance-count'] });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast.success('تم قبول طلب الحضور');
    },
    onError: (error) => {
      toast.error('فشل في قبول الطلب: ' + error.message);
    },
  });
};

export const useRejectPendingAttendance = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      id, 
      rejection_reason 
    }: { 
      id: string; 
      rejection_reason: string;
    }) => {
      const { data, error } = await supabase
        .from('pending_attendance')
        .update({
          status: 'rejected',
          rejection_reason,
          reviewed_at: new Date().toISOString(),
          reviewed_by: (profile as any)?.user_id,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['pending-attendance-count'] });
      toast.success('تم رفض طلب الحضور');
    },
    onError: (error) => {
      toast.error('فشل في رفض الطلب: ' + error.message);
    },
  });
};
