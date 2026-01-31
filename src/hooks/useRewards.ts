import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSuperAdminCompanyAccess } from '@/hooks/useSuperAdminCompanyAccess';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type RewardRulesInsert = Database['public']['Tables']['reward_rules']['Insert'];
type RewardLevelsInsert = Database['public']['Tables']['reward_levels']['Insert'];
type BadgesInsert = Database['public']['Tables']['badges']['Insert'];

// Types
export interface RewardRule {
  id: string;
  company_id: string;
  event_type: string;
  event_name: string;
  event_name_ar?: string;
  points_value: number;
  is_enabled: boolean;
  daily_limit?: number;
  weekly_limit?: number;
  monthly_limit?: number;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface EmployeeWallet {
  id: string;
  employee_id: string;
  company_id: string;
  total_points: number;
  earned_points: number;
  spent_points: number;
  current_level_id?: string;
  created_at: string;
  updated_at: string;
  current_level?: RewardLevel;
}

export interface PointsHistory {
  id: string;
  employee_id: string;
  company_id: string;
  points: number;
  event_type: string;
  source: string;
  description?: string;
  reference_id?: string;
  added_by?: string;
  added_by_name?: string;
  created_at: string;
}

export interface RewardLevel {
  id: string;
  company_id: string;
  level_order: number;
  name: string;
  name_ar?: string;
  min_points: number;
  icon?: string;
  color?: string;
  perks?: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Badge {
  id: string;
  company_id: string;
  name: string;
  name_ar?: string;
  description?: string;
  description_ar?: string;
  icon?: string;
  condition_type: string;
  condition_value: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmployeeBadge {
  id: string;
  employee_id: string;
  badge_id: string;
  company_id: string;
  earned_at: string;
  badge?: Badge;
}

export interface MarketplaceCategory {
  id: string;
  company_id: string;
  name: string;
  name_ar?: string;
  icon?: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface MarketplaceItem {
  id: string;
  company_id: string;
  category_id?: string;
  name: string;
  name_ar?: string;
  description?: string;
  description_ar?: string;
  points_price: number;
  approval_required: boolean;
  usage_limit_type?: string;
  usage_limit_value?: number;
  stock_quantity?: number;
  is_premium: boolean;
  is_active: boolean;
  item_type: string;
  effect_type?: string;
  effect_value?: Record<string, any>;
  created_at: string;
  updated_at: string;
  category?: MarketplaceCategory;
}

export interface MarketplaceOrder {
  id: string;
  employee_id: string;
  company_id: string;
  item_id: string;
  points_spent: number;
  status: 'pending' | 'approved' | 'rejected' | 'consumed';
  order_data?: Record<string, any>;
  reviewed_by?: string;
  reviewed_by_name?: string;
  reviewed_at?: string;
  rejection_reason?: string;
  consumed_at?: string;
  created_at: string;
  updated_at: string;
  item?: MarketplaceItem;
  employee?: { id: string; full_name: string; email: string };
}

// Default reward events
export const DEFAULT_REWARD_EVENTS = [
  { event_type: 'check_in_on_time', event_name: 'On-Time Check-in', event_name_ar: 'حضور في الموعد', points_value: 50, daily_limit: 1 },
  { event_type: 'first_employee_checkin', event_name: 'First to Check-in', event_name_ar: 'أول حضور', points_value: 100, daily_limit: 1 },
  { event_type: 'early_checkin', event_name: 'Early Check-in', event_name_ar: 'حضور مبكر', points_value: 20, daily_limit: 1 },
  { event_type: 'late_checkin', event_name: 'Late Check-in', event_name_ar: 'تأخير', points_value: -10, daily_limit: 1 },
  { event_type: 'checkout_on_time', event_name: 'On-Time Checkout', event_name_ar: 'انصراف في الموعد', points_value: 30, daily_limit: 1 },
  { event_type: 'early_checkout', event_name: 'Early Checkout', event_name_ar: 'انصراف مبكر', points_value: -20, daily_limit: 1 },
  { event_type: 'absence', event_name: 'Absence', event_name_ar: 'غياب', points_value: -50, daily_limit: 1 },
  { event_type: 'weekly_full_attendance', event_name: 'Full Week Attendance', event_name_ar: 'حضور أسبوع كامل', points_value: 200, weekly_limit: 1 },
  { event_type: 'monthly_full_attendance', event_name: 'Full Month Attendance', event_name_ar: 'حضور شهر كامل', points_value: 500, monthly_limit: 1 },
];

// Hook: Reward Rules
export const useRewardRules = () => {
  const { profile } = useAuth();
  const { effectiveCompanyId, isSuperAdminAccess } = useSuperAdminCompanyAccess();
  
  return useQuery({
    queryKey: ['reward-rules', effectiveCompanyId, isSuperAdminAccess],
    queryFn: async () => {
      if (!effectiveCompanyId) return [];
      
      const { data, error } = await supabase
        .from('reward_rules')
        .select('*')
        .eq('company_id', effectiveCompanyId)
        .order('event_type');
      
      if (error) throw error;
      return data as RewardRule[];
    },
    enabled: !!effectiveCompanyId,
  });
};

// Hook: Initialize Reward Rules
export const useInitializeRewardRules = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      if (!profile?.company_id) throw new Error('No company');
      
      const rules = DEFAULT_REWARD_EVENTS.map(event => ({
        company_id: profile.company_id,
        ...event,
        is_enabled: true,
      }));
      
      const { error } = await supabase
        .from('reward_rules')
        .upsert(rules, { onConflict: 'company_id,event_type' });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reward-rules'] });
      toast.success('تم تهيئة قواعد النقاط');
    },
    onError: (error: any) => {
      toast.error('فشل في التهيئة: ' + error.message);
    },
  });
};

// Hook: Create Reward Rule
export const useCreateRewardRule = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (rule: {
      event_type: string;
      event_name: string;
      event_name_ar?: string;
      points_value: number;
      daily_limit?: number;
      weekly_limit?: number;
      monthly_limit?: number;
      description?: string;
    }) => {
      if (!profile?.company_id) throw new Error('No company');
      
      const insertData: RewardRulesInsert = {
        company_id: profile.company_id,
        event_type: rule.event_type,
        event_name: rule.event_name,
        event_name_ar: rule.event_name_ar,
        points_value: rule.points_value,
        daily_limit: rule.daily_limit || null,
        weekly_limit: rule.weekly_limit || null,
        monthly_limit: rule.monthly_limit || null,
        description: rule.description,
        is_enabled: true,
      };
      
      const { error } = await supabase
        .from('reward_rules')
        .insert(insertData);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reward-rules'] });
      toast.success('تم إضافة القاعدة بنجاح');
    },
    onError: (error: any) => {
      toast.error('فشل في الإضافة: ' + error.message);
    },
  });
};

// Hook: Update Reward Rule
export const useUpdateRewardRule = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (rule: Partial<RewardRule> & { id: string }) => {
      const { error } = await supabase
        .from('reward_rules')
        .update({
          ...rule,
          updated_at: new Date().toISOString(),
        })
        .eq('id', rule.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reward-rules'] });
      toast.success('تم تحديث القاعدة');
    },
    onError: (error: any) => {
      toast.error('فشل في التحديث: ' + error.message);
    },
  });
};

// Hook: Delete Reward Rule
export const useDeleteRewardRule = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (ruleId: string) => {
      const { error } = await supabase
        .from('reward_rules')
        .delete()
        .eq('id', ruleId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reward-rules'] });
      toast.success('تم حذف القاعدة');
    },
    onError: (error: any) => {
      toast.error('فشل في الحذف: ' + error.message);
    },
  });
};

// Hook: Employee Wallets
export const useEmployeeWallets = () => {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['employee-wallets', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      
      const { data, error } = await supabase
        .from('employee_wallets')
        .select(`
          *,
          current_level:reward_levels(*)
        `)
        .eq('company_id', profile.company_id)
        .order('total_points', { ascending: false });
      
      if (error) throw error;
      return data as EmployeeWallet[];
    },
    enabled: !!profile?.company_id,
  });
};

// Hook: Single Employee Wallet
export const useEmployeeWallet = (employeeId?: string) => {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['employee-wallet', employeeId],
    queryFn: async () => {
      if (!employeeId) return null;
      
      const { data, error } = await supabase
        .from('employee_wallets')
        .select(`
          *,
          current_level:reward_levels(*)
        `)
        .eq('employee_id', employeeId)
        .maybeSingle();
      
      if (error) throw error;
      return data as EmployeeWallet | null;
    },
    enabled: !!employeeId,
  });
};

// Hook: Points History
export const usePointsHistory = (employeeId?: string, limit = 50) => {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['points-history', employeeId, limit],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      
      let query = supabase
        .from('points_history')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (employeeId) {
        query = query.eq('employee_id', employeeId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as PointsHistory[];
    },
    enabled: !!profile?.company_id,
  });
};

// Hook: Add Manual Points
export const useAddManualPoints = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      employeeId, 
      points, 
      description 
    }: { 
      employeeId: string; 
      points: number; 
      description: string;
    }) => {
      if (!profile?.company_id) throw new Error('No company');
      
      const { data, error } = await supabase.rpc('award_points', {
        p_employee_id: employeeId,
        p_company_id: profile.company_id,
        p_points: points,
        p_event_type: 'manual_adjustment',
        p_source: 'admin',
        p_description: description,
        p_added_by: profile.user_id,
        p_added_by_name: profile.full_name,
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-wallets'] });
      queryClient.invalidateQueries({ queryKey: ['employee-wallet'] });
      queryClient.invalidateQueries({ queryKey: ['points-history'] });
      toast.success('تم إضافة النقاط');
    },
    onError: (error: any) => {
      toast.error('فشل في إضافة النقاط: ' + error.message);
    },
  });
};

// Hook: Reward Levels
export const useRewardLevels = () => {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['reward-levels', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      
      const { data, error } = await supabase
        .from('reward_levels')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('level_order');
      
      if (error) throw error;
      return data as RewardLevel[];
    },
    enabled: !!profile?.company_id,
  });
};

// Hook: Create/Update Level
export const useSaveRewardLevel = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (level: Partial<RewardLevel>) => {
      if (!profile?.company_id) throw new Error('No company');
      
      if (level.id) {
        const { error } = await supabase
          .from('reward_levels')
          .update({
            name: level.name,
            name_ar: level.name_ar,
            min_points: level.min_points,
            level_order: level.level_order,
            icon: level.icon,
            color: level.color,
            perks: level.perks,
            is_active: level.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq('id', level.id);
        
        if (error) throw error;
      } else {
        const insertData: RewardLevelsInsert = {
          company_id: profile.company_id,
          name: level.name || '',
          name_ar: level.name_ar,
          min_points: level.min_points || 0,
          level_order: level.level_order || 1,
          icon: level.icon,
          color: level.color,
          perks: level.perks,
          is_active: level.is_active ?? true,
        };
        const { error } = await supabase
          .from('reward_levels')
          .insert(insertData);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reward-levels'] });
      toast.success('تم حفظ المستوى');
    },
    onError: (error: any) => {
      toast.error('فشل في الحفظ: ' + error.message);
    },
  });
};

// Hook: Delete Level
export const useDeleteRewardLevel = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (levelId: string) => {
      const { error } = await supabase
        .from('reward_levels')
        .delete()
        .eq('id', levelId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reward-levels'] });
      toast.success('تم حذف المستوى');
    },
    onError: (error: any) => {
      toast.error('فشل في الحذف: ' + error.message);
    },
  });
};

// Hook: Badges
export const useBadges = () => {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['badges', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      
      const { data, error } = await supabase
        .from('badges')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Badge[];
    },
    enabled: !!profile?.company_id,
  });
};

// Hook: Employee Badges
export const useEmployeeBadges = (employeeId?: string) => {
  return useQuery({
    queryKey: ['employee-badges', employeeId],
    queryFn: async () => {
      if (!employeeId) return [];
      
      const { data, error } = await supabase
        .from('employee_badges')
        .select(`
          *,
          badge:badges(*)
        `)
        .eq('employee_id', employeeId)
        .order('earned_at', { ascending: false });
      
      if (error) throw error;
      return data as EmployeeBadge[];
    },
    enabled: !!employeeId,
  });
};

// Hook: Save Badge
export const useSaveBadge = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (badge: Partial<Badge>) => {
      if (!profile?.company_id) throw new Error('No company');
      
      if (badge.id) {
        const { error } = await supabase
          .from('badges')
          .update({
            name: badge.name,
            name_ar: badge.name_ar,
            description: badge.description,
            description_ar: badge.description_ar,
            icon: badge.icon,
            condition_type: badge.condition_type,
            condition_value: badge.condition_value,
            is_active: badge.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq('id', badge.id);
        
        if (error) throw error;
      } else {
        const insertData: BadgesInsert = {
          company_id: profile.company_id,
          name: badge.name || '',
          name_ar: badge.name_ar,
          description: badge.description,
          description_ar: badge.description_ar,
          icon: badge.icon,
          condition_type: badge.condition_type || 'points_milestone',
          condition_value: badge.condition_value || 0,
          is_active: badge.is_active ?? true,
        };
        const { error } = await supabase
          .from('badges')
          .insert(insertData);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['badges'] });
      toast.success('تم حفظ الشارة');
    },
    onError: (error: any) => {
      toast.error('فشل في الحفظ: ' + error.message);
    },
  });
};

// Hook: Delete Badge
export const useDeleteBadge = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (badgeId: string) => {
      const { error } = await supabase
        .from('badges')
        .delete()
        .eq('id', badgeId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['badges'] });
      toast.success('تم حذف الشارة');
    },
    onError: (error: any) => {
      toast.error('فشل في الحذف: ' + error.message);
    },
  });
};
