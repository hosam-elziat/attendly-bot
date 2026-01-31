import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSuperAdminCompanyAccess } from '@/hooks/useSuperAdminCompanyAccess';
import { toast } from 'sonner';

export const useCompany = () => {
  const { profile } = useAuth();
  const { effectiveCompanyId, isSuperAdminAccess } = useSuperAdminCompanyAccess();

  return useQuery({
    queryKey: ['company', effectiveCompanyId, isSuperAdminAccess],
    queryFn: async () => {
      if (!effectiveCompanyId) return null;
      
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', effectiveCompanyId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!effectiveCompanyId,
  });
};

export const useToggleRewardsSystem = () => {
  const { profile } = useAuth();
  const { effectiveCompanyId, isSuperAdminAccess } = useSuperAdminCompanyAccess();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!effectiveCompanyId) throw new Error('No company');

      const { error } = await supabase
        .from('companies')
        .update({ rewards_enabled: enabled })
        .eq('id', effectiveCompanyId);

      if (error) throw error;
      return enabled;
    },
    onSuccess: (enabled) => {
      queryClient.invalidateQueries({ queryKey: ['company'] });
      toast.success(enabled ? 'تم تفعيل نظام المكافآت' : 'تم إيقاف نظام المكافآت');
    },
    onError: (error: any) => {
      toast.error('فشل في تحديث الإعدادات: ' + error.message);
    },
  });
};
