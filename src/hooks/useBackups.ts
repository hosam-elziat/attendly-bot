import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Backup {
  id: string;
  company_id: string;
  backup_type: 'automatic' | 'manual';
  backup_data: any;
  tables_included: string[];
  created_at: string;
  created_by: string | null;
  size_bytes: number | null;
  status: 'completed' | 'failed' | 'restoring' | 'in_progress';
  email_sent: boolean;
  email_sent_at: string | null;
  notes: string | null;
  companies?: {
    name: string;
  };
}

export interface BackupSettings {
  id: string;
  company_id: string;
  email_enabled: boolean;
  email_address: string | null;
  frequency: 'daily' | 'weekly' | 'monthly';
  retention_days: number;
  last_backup_at: string | null;
  next_backup_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useBackups = (companyId?: string) => {
  return useQuery({
    queryKey: ['backups', companyId],
    queryFn: async () => {
      let query = supabase
        .from('backups')
        .select(`
          *,
          companies (name)
        `)
        .order('created_at', { ascending: false });

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Backup[];
    },
  });
};

export const useBackupSettings = (companyId?: string) => {
  return useQuery({
    queryKey: ['backup_settings', companyId],
    queryFn: async () => {
      let query = supabase
        .from('backup_settings')
        .select('*');

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as BackupSettings[];
    },
  });
};

export const useCreateBackup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      companyId, 
      backupAll = false,
      createdBy 
    }: { 
      companyId?: string; 
      backupAll?: boolean;
      createdBy?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('create-backup', {
        body: {
          company_id: companyId,
          backup_all: backupAll,
          backup_type: 'manual',
          created_by: createdBy
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backups'] });
      toast.success('تم إنشاء النسخة الاحتياطية بنجاح');
    },
    onError: (error: any) => {
      console.error('Error creating backup:', error);
      toast.error('حدث خطأ أثناء إنشاء النسخة الاحتياطية');
    },
  });
};

export const useSendBackupEmail = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      backupId, 
      sendAllPending = false 
    }: { 
      backupId?: string; 
      sendAllPending?: boolean;
    }) => {
      const { data, error } = await supabase.functions.invoke('send-backup-email', {
        body: {
          backup_id: backupId,
          send_all_pending: sendAllPending
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backups'] });
      toast.success('تم إرسال الإيميلات بنجاح');
    },
    onError: (error: any) => {
      console.error('Error sending backup email:', error);
      toast.error('حدث خطأ أثناء إرسال الإيميلات');
    },
  });
};

export const useRestoreBackup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      backupId, 
      backupData,
      companyId,
      tablesToRestore,
      restoredBy
    }: { 
      backupId?: string; 
      backupData?: any;
      companyId: string;
      tablesToRestore?: string[];
      restoredBy?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('restore-backup', {
        body: {
          backup_id: backupId,
          backup_data: backupData,
          company_id: companyId,
          tables_to_restore: tablesToRestore,
          restored_by: restoredBy
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backups'] });
      toast.success('تم استعادة البيانات بنجاح');
    },
    onError: (error: any) => {
      console.error('Error restoring backup:', error);
      toast.error('حدث خطأ أثناء استعادة البيانات');
    },
  });
};

export const useDeleteBackup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (backupId: string) => {
      const { error } = await supabase
        .from('backups')
        .delete()
        .eq('id', backupId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backups'] });
      toast.success('تم حذف النسخة الاحتياطية');
    },
    onError: (error: any) => {
      console.error('Error deleting backup:', error);
      toast.error('حدث خطأ أثناء حذف النسخة الاحتياطية');
    },
  });
};

export const useUpdateBackupSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      companyId, 
      settings 
    }: { 
      companyId: string; 
      settings: Partial<BackupSettings>;
    }) => {
      const { data, error } = await supabase
        .from('backup_settings')
        .upsert({
          company_id: companyId,
          ...settings,
          updated_at: new Date().toISOString()
        }, { onConflict: 'company_id' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backup_settings'] });
      toast.success('تم تحديث إعدادات النسخ الاحتياطي');
    },
    onError: (error: any) => {
      console.error('Error updating backup settings:', error);
      toast.error('حدث خطأ أثناء تحديث الإعدادات');
    },
  });
};

export const useBackupStats = () => {
  return useQuery({
    queryKey: ['backup_stats'],
    queryFn: async () => {
      const { data: backups, error } = await supabase
        .from('backups')
        .select('id, size_bytes, created_at, email_sent, status');

      if (error) throw error;

      const totalBackups = backups?.length || 0;
      const totalSize = backups?.reduce((sum, b) => sum + (b.size_bytes || 0), 0) || 0;
      const emailsSent = backups?.filter(b => b.email_sent).length || 0;
      const lastBackup = backups?.[0]?.created_at || null;

      return {
        totalBackups,
        totalSize,
        emailsSent,
        lastBackup
      };
    },
  });
};
