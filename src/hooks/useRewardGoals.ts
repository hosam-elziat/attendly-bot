import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSuperAdminCompanyAccess } from './useSuperAdminCompanyAccess';
import { toast } from 'sonner';

export interface RewardGoal {
  id: string;
  company_id: string;
  name: string;
  name_ar: string | null;
  description: string | null;
  description_ar: string | null;
  goal_type: 'first_to_reach' | 'everyone_reaches';
  duration_type: 'daily' | 'weekly' | 'monthly' | 'custom';
  start_date: string | null;
  end_date: string | null;
  points_threshold: number;
  reward_type: 'points' | 'item' | 'custom';
  reward_points: number | null;
  reward_item_id: string | null;
  reward_description: string | null;
  reward_description_ar: string | null;
  is_active: boolean;
  is_announced: boolean;
  announced_at: string | null;
  winner_id: string | null;
  winner_announced_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // Joined data
  winner?: {
    id: string;
    full_name: string;
  };
  reward_item?: {
    id: string;
    name: string;
    name_ar: string | null;
  };
}

export interface GoalAchievement {
  id: string;
  goal_id: string;
  employee_id: string;
  company_id: string;
  achieved_at: string;
  points_at_achievement: number | null;
  reward_given: boolean;
  reward_given_at: string | null;
  notified: boolean;
  notified_at: string | null;
  employee?: {
    id: string;
    full_name: string;
  };
}

export const useRewardGoals = () => {
  const { effectiveCompanyId } = useSuperAdminCompanyAccess();

  return useQuery({
    queryKey: ['reward-goals', effectiveCompanyId],
    queryFn: async () => {
      if (!effectiveCompanyId) return [];

      const { data, error } = await supabase
        .from('reward_goals')
        .select(`
          *,
          winner:employees!reward_goals_winner_id_fkey(id, full_name),
          reward_item:marketplace_items(id, name, name_ar)
        `)
        .eq('company_id', effectiveCompanyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as RewardGoal[];
    },
    enabled: !!effectiveCompanyId,
  });
};

export const useActiveGoals = () => {
  const { effectiveCompanyId } = useSuperAdminCompanyAccess();

  return useQuery({
    queryKey: ['active-goals', effectiveCompanyId],
    queryFn: async () => {
      if (!effectiveCompanyId) return [];

      const { data, error } = await supabase
        .from('reward_goals')
        .select(`
          *,
          winner:employees!reward_goals_winner_id_fkey(id, full_name),
          reward_item:marketplace_items(id, name, name_ar)
        `)
        .eq('company_id', effectiveCompanyId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as RewardGoal[];
    },
    enabled: !!effectiveCompanyId,
  });
};

export const useGoalAchievements = (goalId?: string) => {
  const { effectiveCompanyId } = useSuperAdminCompanyAccess();

  return useQuery({
    queryKey: ['goal-achievements', goalId],
    queryFn: async () => {
      if (!effectiveCompanyId || !goalId) return [];

      const { data, error } = await supabase
        .from('goal_achievements')
        .select(`
          *,
          employee:employees(id, full_name)
        `)
        .eq('goal_id', goalId)
        .order('achieved_at', { ascending: true });

      if (error) throw error;
      return data as GoalAchievement[];
    },
    enabled: !!effectiveCompanyId && !!goalId,
  });
};

export const useCreateGoal = () => {
  const { profile } = useAuth();
  const { effectiveCompanyId } = useSuperAdminCompanyAccess();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (goal: Partial<RewardGoal>) => {
      if (!effectiveCompanyId) throw new Error('No company');

      const insertData = {
        name: goal.name || '',
        name_ar: goal.name_ar,
        description: goal.description,
        description_ar: goal.description_ar,
        goal_type: goal.goal_type || 'everyone_reaches',
        duration_type: goal.duration_type || 'monthly',
        start_date: goal.start_date,
        end_date: goal.end_date,
        points_threshold: goal.points_threshold || 100,
        reward_type: goal.reward_type || 'points',
        reward_points: goal.reward_points,
        reward_item_id: goal.reward_item_id,
        reward_description: goal.reward_description,
        reward_description_ar: goal.reward_description_ar,
        is_active: goal.is_active ?? true,
        company_id: effectiveCompanyId,
        created_by: profile?.user_id,
      };

      const { data, error } = await supabase
        .from('reward_goals')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reward-goals'] });
      queryClient.invalidateQueries({ queryKey: ['active-goals'] });
      toast.success('تم إنشاء الهدف بنجاح');
    },
    onError: (error: any) => {
      toast.error('فشل في إنشاء الهدف: ' + error.message);
    },
  });
};

export const useUpdateGoal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<RewardGoal> & { id: string }) => {
      const { data, error } = await supabase
        .from('reward_goals')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reward-goals'] });
      queryClient.invalidateQueries({ queryKey: ['active-goals'] });
      toast.success('تم تحديث الهدف بنجاح');
    },
    onError: (error: any) => {
      toast.error('فشل في تحديث الهدف: ' + error.message);
    },
  });
};

export const useDeleteGoal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (goalId: string) => {
      const { error } = await supabase
        .from('reward_goals')
        .delete()
        .eq('id', goalId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reward-goals'] });
      queryClient.invalidateQueries({ queryKey: ['active-goals'] });
      toast.success('تم حذف الهدف بنجاح');
    },
    onError: (error: any) => {
      toast.error('فشل في حذف الهدف: ' + error.message);
    },
  });
};

export const useAnnounceGoal = () => {
  const { effectiveCompanyId } = useSuperAdminCompanyAccess();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (goalId: string) => {
      if (!effectiveCompanyId) throw new Error('No company');

      // First update the goal as announced
      const { data: goal, error: updateError } = await supabase
        .from('reward_goals')
        .update({
          is_announced: true,
          announced_at: new Date().toISOString(),
        })
        .eq('id', goalId)
        .select()
        .single();

      if (updateError) throw updateError;

      // Call edge function to announce via Telegram
      const { error: announceError } = await supabase.functions.invoke('announce-goal', {
        body: { goal_id: goalId, company_id: effectiveCompanyId }
      });

      if (announceError) {
        console.error('Announce error:', announceError);
        // Don't throw, just log - the goal is marked as announced
      }

      return goal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reward-goals'] });
      queryClient.invalidateQueries({ queryKey: ['active-goals'] });
      toast.success('تم إعلان الهدف لجميع الموظفين');
    },
    onError: (error: any) => {
      toast.error('فشل في إعلان الهدف: ' + error.message);
    },
  });
};
