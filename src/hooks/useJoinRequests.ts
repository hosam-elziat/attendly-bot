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
