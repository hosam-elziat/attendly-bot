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
  work_start_time: string | null;
  work_end_time: string | null;
  weekend_days: string[] | null;
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
        work_start_time?: string | null;
        work_end_time?: string | null;
        weekend_days?: string[] | null;
      }
    }) => {
      if (!profile?.company_id) throw new Error('No company found');

      // Get company default settings
      const { data: company } = await supabase
        .from('companies')
        .select('default_currency, default_weekend_days, work_start_time, work_end_time')
        .eq('id', profile.company_id)
        .single();

      // Create employee with work schedule and default currency
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
          work_start_time: employeeData.work_start_time || (company as any)?.work_start_time || '09:00:00',
          work_end_time: employeeData.work_end_time || (company as any)?.work_end_time || '17:00:00',
          weekend_days: employeeData.weekend_days || (company as any)?.default_weekend_days || ['friday'],
          currency: (company as any)?.default_currency || 'SAR',
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

      // Send Telegram notification to employee
      try {
        const { data: company } = await supabase
          .from('companies')
          .select('telegram_bot_username')
          .eq('id', profile.company_id)
          .single();

        if (company?.telegram_bot_username) {
          const { data: bot } = await supabase
            .from('telegram_bots')
            .select('bot_token')
            .eq('bot_username', company.telegram_bot_username)
            .single();

          if (bot?.bot_token) {
            await fetch(`https://api.telegram.org/bot${bot.bot_token}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: employeeData.telegram_chat_id,
                text: `🎉 مرحباً ${employeeData.full_name}!\n\nتم قبول طلب انضمامك بنجاح!\nيمكنك الآن استخدام البوت لتسجيل الحضور والانصراف.\n\nأرسل /start للبدء.`,
                reply_markup: {
                  inline_keyboard: [
                    [
                      { text: '✅ تسجيل حضور', callback_data: 'check_in' },
                      { text: '🔴 تسجيل انصراف', callback_data: 'check_out' }
                    ]
                  ]
                }
              })
            });
          }
        }
      } catch (notifyError) {
        console.error('Failed to send Telegram notification:', notifyError);
        // Don't throw - the main operation succeeded
      }

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
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async ({ requestId, reason, telegram_chat_id }: { 
      requestId: string; 
      reason?: string;
      telegram_chat_id?: string;
    }) => {
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

      // Send Telegram notification to the rejected user
      if (telegram_chat_id && profile?.company_id) {
        try {
          const { data: company } = await supabase
            .from('companies')
            .select('telegram_bot_username')
            .eq('id', profile.company_id)
            .single();

          if (company?.telegram_bot_username) {
            const { data: bot } = await supabase
              .from('telegram_bots')
              .select('bot_token')
              .eq('bot_username', company.telegram_bot_username)
              .single();

            if (bot?.bot_token) {
              const message = reason 
                ? `❌ عذراً، تم رفض طلب انضمامك.\n\nالسبب: ${reason}`
                : '❌ عذراً، تم رفض طلب انضمامك.';
              
              await fetch(`https://api.telegram.org/bot${bot.bot_token}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: telegram_chat_id,
                  text: message
                })
              });
            }
          }
        } catch (notifyError) {
          console.error('Failed to send rejection notification:', notifyError);
        }
      }

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

// Hook to check for deleted employee when processing join request
export function useCheckDeletedEmployee() {
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (telegram_chat_id: string) => {
      if (!profile?.company_id) throw new Error('No company found');

      // Get all deleted employees and filter client-side for JSON field match
      const { data, error } = await supabase
        .from('deleted_records')
        .select('id, record_id, record_data, deleted_at')
        .eq('table_name', 'employees')
        .eq('company_id', profile.company_id)
        .eq('is_restored', false)
        .order('deleted_at', { ascending: false });

      if (error) throw error;
      
      // Find the most recent deleted employee with matching telegram_chat_id
      const deletedEmployee = data?.find((record) => {
        const recordData = record.record_data as Record<string, unknown>;
        return recordData?.telegram_chat_id === telegram_chat_id;
      });
      
      return deletedEmployee || null;
    },
  });
}

// Hook to check for inactive employee when processing join request
export function useCheckInactiveEmployee() {
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (telegram_chat_id: string) => {
      if (!profile?.company_id) throw new Error('No company found');

      const { data, error } = await supabase
        .from('employees')
        .select('id, full_name, email, phone, department, telegram_chat_id, is_active')
        .eq('telegram_chat_id', telegram_chat_id)
        .eq('company_id', profile.company_id)
        .eq('is_active', false)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      return data || null;
    },
  });
}

// Hook to reactivate an inactive employee
export function useReactivateEmployee() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      employeeId, 
      joinRequestId,
      telegram_chat_id 
    }: { 
      employeeId: string; 
      joinRequestId: string;
      telegram_chat_id: string;
    }) => {
      if (!profile?.company_id) throw new Error('No company found');

      // Reactivate the employee
      const { data: employee, error: updateError } = await supabase
        .from('employees')
        .update({ 
          is_active: true, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', employeeId)
        .select('full_name')
        .single();

      if (updateError) throw updateError;

      // Update join request status to approved
      const { error: jrError } = await supabase
        .from('join_requests')
        .update({
          status: 'approved',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', joinRequestId);

      if (jrError) throw jrError;

      // Send Telegram notification
      try {
        const { data: company } = await supabase
          .from('companies')
          .select('telegram_bot_username')
          .eq('id', profile.company_id)
          .single();

        if (company?.telegram_bot_username) {
          const { data: bot } = await supabase
            .from('telegram_bots')
            .select('bot_token')
            .eq('bot_username', company.telegram_bot_username)
            .single();

          if (bot?.bot_token) {
            await fetch(`https://api.telegram.org/bot${bot.bot_token}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: telegram_chat_id,
                text: `🎉 مرحباً بعودتك ${employee?.full_name}!\n\nتم إعادة تفعيل حسابك بنجاح!\nيمكنك الآن استخدام البوت لتسجيل الحضور والانصراف.\n\nأرسل /start للبدء.`,
                reply_markup: {
                  inline_keyboard: [
                    [
                      { text: '✅ تسجيل حضور', callback_data: 'check_in' },
                      { text: '🔴 تسجيل انصراف', callback_data: 'check_out' }
                    ]
                  ]
                }
              })
            });
          }
        }
      } catch (notifyError) {
        console.error('Failed to send Telegram notification:', notifyError);
      }

      return { success: true, employeeName: employee?.full_name };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['join-requests'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success(`تم إعادة تفعيل الموظف ${data.employeeName} بنجاح`);
    },
    onError: (error) => {
      console.error('Error reactivating employee:', error);
      toast.error('حدث خطأ أثناء إعادة تفعيل الموظف');
    },
  });
}

// Hook to restore a deleted employee
export function useRestoreDeletedEmployee() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      deletedRecordId, 
      joinRequestId,
      telegram_chat_id 
    }: { 
      deletedRecordId: string; 
      joinRequestId: string;
      telegram_chat_id: string;
    }) => {
      if (!profile?.company_id) throw new Error('No company found');

      // Get the deleted record
      const { data: deletedRecord, error: fetchError } = await supabase
        .from('deleted_records')
        .select('*')
        .eq('id', deletedRecordId)
        .eq('is_restored', false)
        .single();

      if (fetchError || !deletedRecord) {
        throw new Error('Deleted record not found or already restored');
      }

      const employeeData = deletedRecord.record_data as Record<string, unknown>;
      
      // Prepare employee data for insertion with proper typing (without id for insert)
      const insertData = {
        company_id: employeeData.company_id as string,
        full_name: employeeData.full_name as string,
        email: employeeData.email as string,
        phone: employeeData.phone as string | null,
        department: employeeData.department as string | null,
        base_salary: employeeData.base_salary as number | null,
        telegram_chat_id: employeeData.telegram_chat_id as string | null,
        national_id: employeeData.national_id as string | null,
        work_start_time: employeeData.work_start_time as string | null,
        work_end_time: employeeData.work_end_time as string | null,
        weekend_days: employeeData.weekend_days as string[] | null,
        position_id: employeeData.position_id as string | null,
        hire_date: employeeData.hire_date as string | null,
        leave_balance: employeeData.leave_balance as number | null,
        emergency_leave_balance: employeeData.emergency_leave_balance as number | null,
        notes: employeeData.notes as string | null,
        is_active: true,
        updated_at: new Date().toISOString()
      };

      // Re-insert the employee (new ID will be generated)
      const { error: insertError } = await supabase
        .from('employees')
        .insert(insertData);

      if (insertError) throw insertError;

      // Mark as restored
      const { error: updateError } = await supabase
        .from('deleted_records')
        .update({ is_restored: true, restored_at: new Date().toISOString() })
        .eq('id', deletedRecordId);

      if (updateError) throw updateError;

      // Update join request status to approved
      const { error: jrError } = await supabase
        .from('join_requests')
        .update({
          status: 'approved',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', joinRequestId);

      if (jrError) throw jrError;

      // Send Telegram notification
      try {
        const { data: company } = await supabase
          .from('companies')
          .select('telegram_bot_username')
          .eq('id', profile.company_id)
          .single();

        if (company?.telegram_bot_username) {
          const { data: bot } = await supabase
            .from('telegram_bots')
            .select('bot_token')
            .eq('bot_username', company.telegram_bot_username)
            .single();

          if (bot?.bot_token) {
            const employeeName = (employeeData as any)?.full_name || 'الموظف';
            await fetch(`https://api.telegram.org/bot${bot.bot_token}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: telegram_chat_id,
                text: `🎉 مرحباً بعودتك ${employeeName}!\n\nتم استعادة حسابك بنجاح!\nجميع بياناتك السابقة متاحة الآن.\n\nأرسل /start للبدء.`,
                reply_markup: {
                  inline_keyboard: [
                    [
                      { text: '✅ تسجيل حضور', callback_data: 'check_in' },
                      { text: '🔴 تسجيل انصراف', callback_data: 'check_out' }
                    ]
                  ]
                }
              })
            });
          }
        }
      } catch (notifyError) {
        console.error('Failed to send Telegram notification:', notifyError);
      }

      return { success: true, employeeName: (employeeData as any)?.full_name };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['join-requests'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['deleted-records'] });
      toast.success(`تم استعادة الموظف ${data.employeeName} بنجاح`);
    },
    onError: (error) => {
      console.error('Error restoring employee:', error);
      toast.error('حدث خطأ أثناء استعادة الموظف');
    },
  });
}
