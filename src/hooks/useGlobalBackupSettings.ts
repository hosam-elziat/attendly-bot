import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface GlobalBackupSettings {
  id: string;
  auto_backup_enabled: boolean;
  backup_hour: number;
  backup_minute: number;
  backup_frequency_hours: number;
  auto_email_enabled: boolean;
  last_auto_backup_at: string | null;
  next_auto_backup_at: string | null;
  created_at: string;
  updated_at: string;
}

export const useGlobalBackupSettings = () => {
  return useQuery({
    queryKey: ['global-backup-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('global_backup_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as GlobalBackupSettings | null;
    },
  });
};

export const useUpdateGlobalBackupSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: Partial<GlobalBackupSettings>) => {
      // First check if settings exist
      const { data: existing } = await supabase
        .from('global_backup_settings')
        .select('id')
        .limit(1)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from('global_backup_settings')
          .update({
            ...settings,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('global_backup_settings')
          .insert(settings)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global-backup-settings'] });
      toast.success('تم حفظ إعدادات الجدولة بنجاح');
    },
    onError: (error) => {
      console.error('Error updating global backup settings:', error);
      toast.error('حدث خطأ أثناء حفظ الإعدادات');
    },
  });
};
