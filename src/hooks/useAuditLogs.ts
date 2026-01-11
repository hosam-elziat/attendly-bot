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

// Field name translations
const fieldNameTranslations: Record<string, string> = {
  full_name: 'الاسم',
  email: 'البريد الإلكتروني',
  department: 'القسم',
  base_salary: 'الراتب الأساسي',
  salary_type: 'نوع الراتب',
  is_active: 'الحالة',
  phone: 'الهاتف',
  address: 'العنوان',
  hire_date: 'تاريخ التعيين',
  national_id: 'رقم الهوية',
  work_start_time: 'وقت بداية العمل',
  work_end_time: 'وقت نهاية العمل',
  break_duration_minutes: 'مدة الاستراحة',
  weekend_days: 'أيام العطلة',
  check_in_time: 'وقت الحضور',
  check_out_time: 'وقت الانصراف',
  status: 'الحالة',
  date: 'التاريخ',
  bonus: 'المكافأة',
  deduction: 'الخصم',
  description: 'الوصف',
  month: 'الشهر',
  leave_type: 'نوع الإجازة',
  start_date: 'تاريخ البداية',
  end_date: 'تاريخ النهاية',
  days: 'عدد الأيام',
  reason: 'السبب',
  notes: 'ملاحظات',
  currency: 'العملة',
  telegram_chat_id: 'معرف التليجرام',
};

// Get human-readable field name
export const getFieldNameArabic = (fieldName: string): string => {
  return fieldNameTranslations[fieldName] || fieldName;
};

// Generate detailed change description
export const generateChangeDescription = (
  action: 'insert' | 'update' | 'delete' | 'restore',
  tableName: string,
  oldData?: Record<string, unknown> | null,
  newData?: Record<string, unknown> | null,
  recordName?: string
): string => {
  const tableArabic = getTableNameArabic(tableName);
  const name = recordName || (newData?.full_name as string) || (oldData?.full_name as string) || '';

  if (action === 'insert') {
    if (tableName === 'salary_adjustments') {
      const bonus = newData?.bonus as number;
      const deduction = newData?.deduction as number;
      if (bonus && bonus > 0) {
        return `إضافة مكافأة ${bonus} لـ${name}`;
      }
      if (deduction && deduction > 0) {
        return `إضافة خصم ${deduction} لـ${name}`;
      }
      return `إضافة تعديل راتب لـ${name}`;
    }
    if (tableName === 'attendance_logs') {
      return `تسجيل حضور ${name}`;
    }
    if (tableName === 'leave_requests') {
      const leaveTypes: Record<string, string> = {
        vacation: 'إجازة سنوية',
        sick: 'إجازة مرضية',
        personal: 'إجازة شخصية',
      };
      const leaveType = leaveTypes[newData?.leave_type as string] || 'إجازة';
      return `طلب ${leaveType} لـ${name}`;
    }
    return `إضافة ${name} إلى ${tableArabic}`;
  }

  if (action === 'delete') {
    return `حذف ${name} من ${tableArabic}`;
  }

  if (action === 'restore') {
    return `استعادة ${name} إلى ${tableArabic}`;
  }

  // For update action, list what changed
  if (action === 'update' && oldData && newData) {
    const changes: string[] = [];
    
    // Fields to ignore in change detection
    const ignoreFields = ['updated_at', 'created_at', 'id', 'company_id', 'user_id', 'employee_id'];
    
    for (const key of Object.keys(newData)) {
      if (ignoreFields.includes(key)) continue;
      
      const oldValue = oldData[key];
      const newValue = newData[key];
      
      // Skip if values are the same
      if (JSON.stringify(oldValue) === JSON.stringify(newValue)) continue;
      
      const fieldName = getFieldNameArabic(key);
      
      // Format the change based on field type
      if (key === 'status') {
        const statusNames: Record<string, string> = {
          checked_in: 'حاضر',
          checked_out: 'انصرف',
          on_break: 'استراحة',
          pending: 'قيد الانتظار',
          approved: 'موافق عليه',
          rejected: 'مرفوض',
        };
        changes.push(`${fieldName}: ${statusNames[oldValue as string] || oldValue} ← ${statusNames[newValue as string] || newValue}`);
      } else if (key === 'is_active') {
        changes.push(`${fieldName}: ${oldValue ? 'نشط' : 'غير نشط'} ← ${newValue ? 'نشط' : 'غير نشط'}`);
      } else if (typeof newValue === 'number') {
        changes.push(`${fieldName}: ${oldValue || 0} ← ${newValue}`);
      } else if (key.includes('time') && typeof newValue === 'string') {
        // Extract time only
        const oldTime = typeof oldValue === 'string' ? oldValue.split('T')[1]?.slice(0, 5) || oldValue : oldValue;
        const newTime = typeof newValue === 'string' ? newValue.split('T')[1]?.slice(0, 5) || newValue : newValue;
        changes.push(`${fieldName}: ${oldTime || '-'} ← ${newTime}`);
      } else {
        changes.push(`${fieldName}: ${oldValue || '-'} ← ${newValue || '-'}`);
      }
    }
    
    if (changes.length === 0) {
      return `تعديل بيانات ${name}`;
    }
    
    return `تعديل ${name}: ${changes.join(' | ')}`;
  }

  return `${getActionArabic(action)} في ${tableArabic}`;
};

export const useAuditLogs = () => {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['audit-logs', profile?.company_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

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

      // Auto-generate description if not provided
      const autoDescription = description || generateChangeDescription(action, tableName, oldData, newData);

      const { error } = await supabase.from('audit_logs').insert({
        company_id: profile.company_id,
        user_id: user.id,
        user_email: user.email || null,
        table_name: tableName,
        record_id: recordId,
        action,
        old_data: (oldData as Json) || null,
        new_data: (newData as Json) || null,
        description: autoDescription,
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
