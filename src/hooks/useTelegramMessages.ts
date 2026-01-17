import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

export interface TelegramMessage {
  id: string;
  company_id: string;
  employee_id: string;
  telegram_chat_id: string;
  message_text: string;
  direction: 'incoming' | 'outgoing';
  message_type: string;
  metadata: Record<string, unknown>;
  telegram_message_id: number | null;
  created_at: string;
}

export interface EmployeeWithLastMessage {
  id: string;
  full_name: string;
  telegram_chat_id: string | null;
  department: string | null;
  position_id: string | null;
  last_message?: TelegramMessage;
  unread_count?: number;
}

export const useTelegramMessages = (employeeId?: string) => {
  const { profile } = useAuth();

  const messagesQuery = useQuery({
    queryKey: ['telegram-messages', employeeId],
    queryFn: async () => {
      if (!employeeId) return [];
      
      const { data, error } = await supabase
        .from('telegram_messages')
        .select('*')
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as TelegramMessage[];
    },
    enabled: !!employeeId && !!profile?.company_id,
  });

  // Subscribe to realtime updates
  useEffect(() => {
    if (!employeeId || !profile?.company_id) return;

    const channel = supabase
      .channel(`telegram-messages-${employeeId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'telegram_messages',
          filter: `employee_id=eq.${employeeId}`,
        },
        () => {
          messagesQuery.refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [employeeId, profile?.company_id]);

  return messagesQuery;
};

export const useEmployeesWithMessages = () => {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['employees-with-messages', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];

      // Get all employees with telegram_chat_id
      const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('id, full_name, telegram_chat_id, department, position_id')
        .eq('company_id', profile.company_id)
        .not('telegram_chat_id', 'is', null)
        .eq('is_active', true);

      if (empError) throw empError;

      // Get last message for each employee
      const employeesWithMessages: EmployeeWithLastMessage[] = await Promise.all(
        (employees || []).map(async (emp) => {
          const { data: messages } = await supabase
            .from('telegram_messages')
            .select('*')
            .eq('employee_id', emp.id)
            .order('created_at', { ascending: false })
            .limit(1);

          return {
            ...emp,
            last_message: messages?.[0] as TelegramMessage | undefined,
          };
        })
      );

      // Sort by last message date
      return employeesWithMessages.sort((a, b) => {
        if (!a.last_message && !b.last_message) return 0;
        if (!a.last_message) return 1;
        if (!b.last_message) return -1;
        return new Date(b.last_message.created_at).getTime() - new Date(a.last_message.created_at).getTime();
      });
    },
    enabled: !!profile?.company_id,
  });
};
