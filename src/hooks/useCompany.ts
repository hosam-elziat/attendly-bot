import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const useCompany = () => {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['company', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return null;
      
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', profile.company_id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.company_id,
  });
};

export const useToggleRewardsSystem = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!profile?.company_id) throw new Error('No company');

      const { error } = await supabase
        .from('companies')
        .update({ rewards_enabled: enabled })
        .eq('id', profile.company_id);

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
