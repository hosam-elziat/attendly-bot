import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface BackupEmailRecipient {
  id: string;
  email: string;
  name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useBackupEmailRecipients = () => {
  return useQuery({
    queryKey: ['backup-email-recipients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('backup_email_recipients')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as BackupEmailRecipient[];
    },
  });
};

export const useAddBackupEmailRecipient = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ email, name }: { email: string; name?: string }) => {
      const { data, error } = await supabase
        .from('backup_email_recipients')
        .insert({ email, name, is_active: true })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backup-email-recipients'] });
      toast.success('تمت إضافة الإيميل بنجاح');
    },
    onError: (error) => {
      toast.error(`فشل في إضافة الإيميل: ${error.message}`);
    },
  });
};

export const useUpdateBackupEmailRecipient = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, email, name, is_active }: { id: string; email?: string; name?: string; is_active?: boolean }) => {
      const updateData: Partial<BackupEmailRecipient> = {};
      if (email !== undefined) updateData.email = email;
      if (name !== undefined) updateData.name = name;
      if (is_active !== undefined) updateData.is_active = is_active;
      
      const { data, error } = await supabase
        .from('backup_email_recipients')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backup-email-recipients'] });
      toast.success('تم تحديث الإيميل بنجاح');
    },
    onError: (error) => {
      toast.error(`فشل في تحديث الإيميل: ${error.message}`);
    },
  });
};

export const useDeleteBackupEmailRecipient = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('backup_email_recipients')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backup-email-recipients'] });
      toast.success('تم حذف الإيميل بنجاح');
    },
    onError: (error) => {
      toast.error(`فشل في حذف الإيميل: ${error.message}`);
    },
  });
};
