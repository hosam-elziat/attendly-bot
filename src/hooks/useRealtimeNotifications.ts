import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

// Notification sound URL (simple beep)
const NOTIFICATION_SOUND_URL = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleS0DDH+21u2rXxkLM4zL8N+OJwAAaLbW9aSEIQAAdKjB4seKKQAAeJuq2seVOwAAg4+Z0MykcAAAi4GL0NSxgAAAk3qB0Ni/kAAAm3N50eHLnwAAomp1zeXSpgAAqGJxzejXrQAArFltzOncswAAslNpyurgtQAAt0xly+vkvQAAu0ZiyOzowQAAvkBfxuzsxAAAwDpbxO7wyAAAwy5WwfDyzAAAxi1TvvH2zwAAySZQu/L6zwAAzSFNufT9zwAAzx1LtvX+zgAA0RpJs/b+zQAA0xhHsfb+ywAA1RZFr/b9yQAA1hVDrfb8xgAA1xRBq/b6xAAA2BM/qfb4wQAA2RI9p/b2vgAA2RA7pvb0uwAA2g86pPbysAAA2w44ovbwrAAA2ww2oPbupwAA3As1nvbspAAA3Ao0nPbqoAAA3Qkzmfbonw';

export function useRealtimeNotifications() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playNotificationSound = useCallback(() => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
        audioRef.current.volume = 0.5;
      }
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(console.error);
    } catch (error) {
      console.error('Failed to play notification sound:', error);
    }
  }, []);

  useEffect(() => {
    if (!profile?.company_id) return;

    // Subscribe to join requests
    const joinRequestsChannel = supabase
      .channel('join-requests-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'join_requests',
          filter: `company_id=eq.${profile.company_id}`,
        },
        (payload) => {
          playNotificationSound();
          toast.info(
            `🔔 طلب انضمام جديد من ${(payload.new as any).full_name}`,
            {
              action: {
                label: 'عرض',
                onClick: () => window.location.href = '/dashboard/join-requests',
              },
            }
          );
          queryClient.invalidateQueries({ queryKey: ['join-requests'] });
          queryClient.invalidateQueries({ queryKey: ['pending-counts'] });
        }
      )
      .subscribe();

    // Subscribe to leave requests
    const leaveRequestsChannel = supabase
      .channel('leave-requests-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'leave_requests',
          filter: `company_id=eq.${profile.company_id}`,
        },
        (payload) => {
          playNotificationSound();
          toast.info(
            `🔔 طلب إجازة جديد`,
            {
              action: {
                label: 'عرض',
                onClick: () => window.location.href = '/dashboard/leaves',
              },
            }
          );
          queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
          queryClient.invalidateQueries({ queryKey: ['pending-counts'] });
        }
      )
      .subscribe();

    // Subscribe to attendance logs
    const attendanceChannel = supabase
      .channel('attendance-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'attendance_logs',
          filter: `company_id=eq.${profile.company_id}`,
        },
        (payload) => {
          playNotificationSound();
          queryClient.invalidateQueries({ queryKey: ['attendance'] });
          queryClient.invalidateQueries({ queryKey: ['attendance-stats'] });
          queryClient.invalidateQueries({ queryKey: ['attendance-all'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'attendance_logs',
          filter: `company_id=eq.${profile.company_id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['attendance'] });
          queryClient.invalidateQueries({ queryKey: ['attendance-stats'] });
          queryClient.invalidateQueries({ queryKey: ['attendance-all'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(joinRequestsChannel);
      supabase.removeChannel(leaveRequestsChannel);
      supabase.removeChannel(attendanceChannel);
    };
  }, [profile?.company_id, playNotificationSound, queryClient]);
}

// Hook to get pending counts for dashboard
export function usePendingCounts() {
  const { profile } = useAuth();

  return {
    queryKey: ['pending-counts', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return { joinRequests: 0, leaveRequests: 0 };

      const [joinRes, leaveRes] = await Promise.all([
        supabase
          .from('join_requests')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', profile.company_id)
          .eq('status', 'pending'),
        supabase
          .from('leave_requests')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', profile.company_id)
          .eq('status', 'pending'),
      ]);

      return {
        joinRequests: joinRes.count || 0,
        leaveRequests: leaveRes.count || 0,
      };
    },
    enabled: !!profile?.company_id,
  };
}
