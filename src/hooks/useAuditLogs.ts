import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

export interface AuditLog {
  id: string;
  company_id: string;
  user_id: string;
  user_email: string | null;
  table_name: string;
  record_id: string;
  action: 'insert' | 'update' | 'delete' | 'restore';
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  description: string | null;
  created_at: string;
}

export interface DeletedRecord {
  id: string;
  company_id: string;
  deleted_by: string;
  table_name: string;
  record_id: string;
  record_data: Record<string, unknown>;
  deleted_at: string;
  restored_at: string | null;
  is_restored: boolean;
}

export const useAuditLogs = () => {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['audit-logs', profile?.company_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as AuditLog[];
    },
    enabled: !!profile?.company_id,
  });
};

export const useDeletedRecords = () => {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['deleted-records', profile?.company_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deleted_records')
        .select('*')
        .eq('is_restored', false)
        .order('deleted_at', { ascending: false });

      if (error) throw error;
      return data as DeletedRecord[];
    },
    enabled: !!profile?.company_id,
  });
};

export const useLogAction = () => {
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tableName,
      recordId,
      action,
      oldData,
      newData,
      description,
    }: {
      tableName: string;
      recordId: string;
      action: 'insert' | 'update' | 'delete' | 'restore';
      oldData?: Record<string, unknown> | null;
      newData?: Record<string, unknown> | null;
      description?: string;
    }) => {
      if (!profile?.company_id || !user?.id) throw new Error('Not authenticated');

      const { error } = await supabase.from('audit_logs').insert({
        company_id: profile.company_id,
        user_id: user.id,
        user_email: user.email || null,
        table_name: tableName,
        record_id: recordId,
        action,
        old_data: (oldData as Json) || null,
        new_data: (newData as Json) || null,
        description: description || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
  });
};

export const useRestoreRecord = () => {
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();
  const logAction = useLogAction();

  return useMutation({
    mutationFn: async (deletedRecord: DeletedRecord) => {
      if (!profile?.company_id || !user?.id) throw new Error('Not authenticated');

      const { table_name, record_data, record_id } = deletedRecord;

      // Restore the record to its original table using raw SQL via RPC or direct insert
      // We need to use a workaround since dynamic table names aren't supported
      let insertError: Error | null = null;

      if (table_name === 'employees') {
        const { error } = await supabase.from('employees').insert(record_data as any);
        insertError = error;
      } else if (table_name === 'attendance_logs') {
        const { error } = await supabase.from('attendance_logs').insert(record_data as any);
        insertError = error;
      } else if (table_name === 'leave_requests') {
        const { error } = await supabase.from('leave_requests').insert(record_data as any);
        insertError = error;
      } else if (table_name === 'salary_adjustments') {
        const { error } = await supabase.from('salary_adjustments').insert(record_data as any);
        insertError = error;
      } else if (table_name === 'salary_records') {
        const { error } = await supabase.from('salary_records').insert(record_data as any);
        insertError = error;
      }

      if (insertError) throw insertError;

      // Mark as restored
      const { error: updateError } = await supabase
        .from('deleted_records')
        .update({
          is_restored: true,
          restored_at: new Date().toISOString(),
        })
        .eq('id', deletedRecord.id);

      if (updateError) throw updateError;

      // Log the restore action
      await logAction.mutateAsync({
        tableName: table_name,
        recordId: record_id,
        action: 'restore',
        newData: record_data,
        description: `تم استعادة السجل من ${getTableNameArabic(table_name)}`,
      });

      return record_data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deleted-records'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['salary-adjustments'] });
      toast.success('تم استعادة السجل بنجاح');
    },
    onError: (error) => {
      console.error('Restore error:', error);
      toast.error('فشل في استعادة السجل');
    },
  });
};

export const useSoftDelete = () => {
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();
  const logAction = useLogAction();

  return useMutation({
    mutationFn: async ({
      tableName,
      recordId,
      recordData,
    }: {
      tableName: string;
      recordId: string;
      recordData: Record<string, unknown>;
    }) => {
      if (!profile?.company_id || !user?.id) throw new Error('Not authenticated');

      // Save to deleted_records
      const { error: saveError } = await supabase.from('deleted_records').insert({
        company_id: profile.company_id,
        deleted_by: user.id,
        table_name: tableName,
        record_id: recordId,
        record_data: recordData as Json,
      });

      if (saveError) throw saveError;

      // Delete from original table based on table name
      let deleteError: Error | null = null;

      if (tableName === 'employees') {
        const { error } = await supabase.from('employees').delete().eq('id', recordId);
        deleteError = error;
      } else if (tableName === 'attendance_logs') {
        const { error } = await supabase.from('attendance_logs').delete().eq('id', recordId);
        deleteError = error;
      } else if (tableName === 'leave_requests') {
        const { error } = await supabase.from('leave_requests').delete().eq('id', recordId);
        deleteError = error;
      } else if (tableName === 'salary_adjustments') {
        const { error } = await supabase.from('salary_adjustments').delete().eq('id', recordId);
        deleteError = error;
      } else if (tableName === 'salary_records') {
        const { error } = await supabase.from('salary_records').delete().eq('id', recordId);
        deleteError = error;
      }

      if (deleteError) throw deleteError;

      // Log the delete action
      await logAction.mutateAsync({
        tableName,
        recordId,
        action: 'delete',
        oldData: recordData,
        description: `تم حذف سجل من ${getTableNameArabic(tableName)}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deleted-records'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['salary-adjustments'] });
      toast.success('تم الحذف بنجاح - يمكنك استعادته من سجل التعديلات');
    },
    onError: (error) => {
      console.error('Delete error:', error);
      toast.error('فشل في الحذف');
    },
  });
};

export const getTableNameArabic = (tableName: string): string => {
  const names: Record<string, string> = {
    employees: 'الموظفين',
    attendance_logs: 'سجلات الحضور',
    leave_requests: 'طلبات الإجازات',
    salary_adjustments: 'تعديلات الرواتب',
    salary_records: 'سجلات الرواتب',
    companies: 'الشركات',
  };
  return names[tableName] || tableName;
};

export const getActionArabic = (action: string): string => {
  const actions: Record<string, string> = {
    insert: 'إضافة',
    update: 'تعديل',
    delete: 'حذف',
    restore: 'استعادة',
  };
  return actions[action] || action;
};
