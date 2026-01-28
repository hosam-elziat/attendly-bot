import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type MarketplaceCategoriesInsert = Database['public']['Tables']['marketplace_categories']['Insert'];
type MarketplaceItemsInsert = Database['public']['Tables']['marketplace_items']['Insert'];

// Re-export types
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

// Hook: Marketplace Categories
export const useMarketplaceCategories = () => {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['marketplace-categories', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      
      const { data, error } = await supabase
        .from('marketplace_categories')
        .select('*')
        .eq('company_id', profile.company_id)
        .eq('is_active', true)
        .order('sort_order');
      
      if (error) throw error;
      return data as MarketplaceCategory[];
    },
    enabled: !!profile?.company_id,
  });
};

// Hook: Save Category
export const useSaveMarketplaceCategory = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (category: Partial<MarketplaceCategory>) => {
      if (!profile?.company_id) throw new Error('No company');
      
      if (category.id) {
        const { error } = await supabase
          .from('marketplace_categories')
          .update({
            name: category.name,
            name_ar: category.name_ar,
            icon: category.icon,
            sort_order: category.sort_order,
            is_active: category.is_active,
          })
          .eq('id', category.id);
        
        if (error) throw error;
      } else {
        const insertData: MarketplaceCategoriesInsert = {
          company_id: profile.company_id,
          name: category.name || '',
          name_ar: category.name_ar,
          icon: category.icon,
          sort_order: category.sort_order || 0,
          is_active: category.is_active ?? true,
        };
        const { error } = await supabase
          .from('marketplace_categories')
          .insert(insertData);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-categories'] });
      toast.success('تم حفظ الفئة');
    },
    onError: (error: any) => {
      toast.error('فشل في الحفظ: ' + error.message);
    },
  });
};

// Hook: Delete Category
export const useDeleteMarketplaceCategory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (categoryId: string) => {
      const { error } = await supabase
        .from('marketplace_categories')
        .update({ is_active: false })
        .eq('id', categoryId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-categories'] });
      toast.success('تم حذف الفئة');
    },
    onError: (error: any) => {
      toast.error('فشل في الحذف: ' + error.message);
    },
  });
};

// Hook: Marketplace Items
export const useMarketplaceItems = (categoryId?: string) => {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['marketplace-items', profile?.company_id, categoryId],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      
      let query = supabase
        .from('marketplace_items')
        .select(`
          *,
          category:marketplace_categories(*)
        `)
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false });
      
      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as MarketplaceItem[];
    },
    enabled: !!profile?.company_id,
  });
};

// Hook: Active Marketplace Items (for employees)
export const useActiveMarketplaceItems = () => {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['active-marketplace-items', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      
      const { data, error } = await supabase
        .from('marketplace_items')
        .select(`
          *,
          category:marketplace_categories(*)
        `)
        .eq('company_id', profile.company_id)
        .eq('is_active', true)
        .order('points_price');
      
      if (error) throw error;
      return data as MarketplaceItem[];
    },
    enabled: !!profile?.company_id,
  });
};

// Hook: Save Item
export const useSaveMarketplaceItem = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (item: Partial<MarketplaceItem>) => {
      if (!profile?.company_id) throw new Error('No company');
      
      if (item.id) {
        const { error } = await supabase
          .from('marketplace_items')
          .update({
            ...item,
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.id);
        
        if (error) throw error;
      } else {
        const insertData: MarketplaceItemsInsert = {
          company_id: profile.company_id,
          name: item.name || '',
          name_ar: item.name_ar,
          description: item.description,
          description_ar: item.description_ar,
          category_id: item.category_id,
          points_price: item.points_price || 0,
          approval_required: item.approval_required ?? false,
          usage_limit_type: item.usage_limit_type,
          usage_limit_value: item.usage_limit_value,
          stock_quantity: item.stock_quantity,
          is_premium: item.is_premium ?? false,
          is_active: item.is_active ?? true,
          item_type: item.item_type || 'benefit',
          effect_type: item.effect_type,
          effect_value: item.effect_value,
        };
        const { error } = await supabase
          .from('marketplace_items')
          .insert(insertData);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-items'] });
      queryClient.invalidateQueries({ queryKey: ['active-marketplace-items'] });
      toast.success('تم حفظ العنصر');
    },
    onError: (error: any) => {
      toast.error('فشل في الحفظ: ' + error.message);
    },
  });
};

// Hook: Delete Item
export const useDeleteMarketplaceItem = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from('marketplace_items')
        .update({ is_active: false })
        .eq('id', itemId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-items'] });
      queryClient.invalidateQueries({ queryKey: ['active-marketplace-items'] });
      toast.success('تم حذف العنصر');
    },
    onError: (error: any) => {
      toast.error('فشل في الحذف: ' + error.message);
    },
  });
};

// Hook: Marketplace Orders
export const useMarketplaceOrders = (status?: string) => {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['marketplace-orders', profile?.company_id, status],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      
      let query = supabase
        .from('marketplace_orders')
        .select(`
          *,
          item:marketplace_items(*),
          employee:employees(id, full_name, email)
        `)
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false });
      
      if (status) {
        query = query.eq('status', status);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as MarketplaceOrder[];
    },
    enabled: !!profile?.company_id,
  });
};

// Hook: Employee Orders
export const useEmployeeOrders = (employeeId?: string) => {
  return useQuery({
    queryKey: ['employee-orders', employeeId],
    queryFn: async () => {
      if (!employeeId) return [];
      
      const { data, error } = await supabase
        .from('marketplace_orders')
        .select(`
          *,
          item:marketplace_items(*)
        `)
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as MarketplaceOrder[];
    },
    enabled: !!employeeId,
  });
};

// Hook: Create Order (Purchase)
export const useCreateOrder = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      itemId, 
      employeeId,
      orderData 
    }: { 
      itemId: string; 
      employeeId: string;
      orderData?: Record<string, any>;
    }) => {
      if (!profile?.company_id) throw new Error('No company');
      
      // Get item details
      const { data: item, error: itemError } = await supabase
        .from('marketplace_items')
        .select('*')
        .eq('id', itemId)
        .single();
      
      if (itemError) throw itemError;
      if (!item) throw new Error('Item not found');
      
      // Check wallet balance
      const { data: wallet, error: walletError } = await supabase
        .from('employee_wallets')
        .select('total_points')
        .eq('employee_id', employeeId)
        .maybeSingle();
      
      if (walletError) throw walletError;
      
      const currentPoints = wallet?.total_points || 0;
      if (currentPoints < item.points_price) {
        throw new Error('رصيد النقاط غير كافٍ');
      }
      
      // Create order
      const { error: orderError } = await supabase
        .from('marketplace_orders')
        .insert({
          employee_id: employeeId,
          company_id: profile.company_id,
          item_id: itemId,
          points_spent: item.points_price,
          status: item.approval_required ? 'pending' : 'approved',
          order_data: orderData,
        });
      
      if (orderError) throw orderError;
      
      // Deduct points
      await supabase.rpc('award_points', {
        p_employee_id: employeeId,
        p_company_id: profile.company_id,
        p_points: -item.points_price,
        p_event_type: 'marketplace_purchase',
        p_source: 'marketplace',
        p_description: `شراء: ${item.name}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-orders'] });
      queryClient.invalidateQueries({ queryKey: ['employee-orders'] });
      queryClient.invalidateQueries({ queryKey: ['employee-wallets'] });
      queryClient.invalidateQueries({ queryKey: ['employee-wallet'] });
      queryClient.invalidateQueries({ queryKey: ['points-history'] });
      toast.success('تم الشراء بنجاح');
    },
    onError: (error: any) => {
      toast.error(error.message || 'فشل في الشراء');
    },
  });
};

// Hook: Review Order (Approve/Reject)
export const useReviewOrder = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      orderId, 
      status, 
      rejectionReason 
    }: { 
      orderId: string; 
      status: 'approved' | 'rejected'; 
      rejectionReason?: string;
    }) => {
      const updateData: any = {
        status,
        reviewed_by: profile?.user_id,
        reviewed_by_name: profile?.full_name,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      if (status === 'rejected' && rejectionReason) {
        updateData.rejection_reason = rejectionReason;
        
        // Refund points if rejected
        const { data: order } = await supabase
          .from('marketplace_orders')
          .select('employee_id, company_id, points_spent')
          .eq('id', orderId)
          .single();
        
        if (order) {
          await supabase.rpc('award_points', {
            p_employee_id: order.employee_id,
            p_company_id: order.company_id,
            p_points: order.points_spent,
            p_event_type: 'order_refund',
            p_source: 'marketplace',
            p_description: 'استرجاع نقاط - طلب مرفوض',
          });
        }
      }
      
      const { error } = await supabase
        .from('marketplace_orders')
        .update(updateData)
        .eq('id', orderId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-orders'] });
      queryClient.invalidateQueries({ queryKey: ['employee-orders'] });
      queryClient.invalidateQueries({ queryKey: ['employee-wallets'] });
      queryClient.invalidateQueries({ queryKey: ['employee-wallet'] });
      queryClient.invalidateQueries({ queryKey: ['points-history'] });
      toast.success('تم معالجة الطلب');
    },
    onError: (error: any) => {
      toast.error('فشل في معالجة الطلب: ' + error.message);
    },
  });
};

// Hook: Consume Order
export const useConsumeOrder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase
        .from('marketplace_orders')
        .update({
          status: 'consumed',
          consumed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-orders'] });
      queryClient.invalidateQueries({ queryKey: ['employee-orders'] });
      toast.success('تم استهلاك الطلب');
    },
    onError: (error: any) => {
      toast.error('فشل: ' + error.message);
    },
  });
};

// Hook: Rewards Leaderboard
export const useRewardsLeaderboard = (periodType: 'daily' | 'weekly' | 'monthly' | 'all_time' = 'monthly', limit = 10) => {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['rewards-leaderboard', profile?.company_id, periodType, limit],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      
      // For simplicity, we'll query wallets directly ordered by points
      // In production, you'd use the leaderboard cache table
      const { data, error } = await supabase
        .from('employee_wallets')
        .select(`
          *,
          employee:employees(id, full_name, email, department),
          current_level:reward_levels(*)
        `)
        .eq('company_id', profile.company_id)
        .order('total_points', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.company_id,
  });
};

// Hook: Rewards Stats
export const useRewardsStats = () => {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['rewards-stats', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return null;
      
      // Get total points issued
      const { data: pointsData } = await supabase
        .from('points_history')
        .select('points')
        .eq('company_id', profile.company_id)
        .gt('points', 0);
      
      const totalPointsIssued = pointsData?.reduce((sum, p) => sum + p.points, 0) || 0;
      
      // Get pending orders count
      const { count: pendingOrders } = await supabase
        .from('marketplace_orders')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', profile.company_id)
        .eq('status', 'pending');
      
      // Get total orders
      const { count: totalOrders } = await supabase
        .from('marketplace_orders')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', profile.company_id);
      
      // Get active employees with wallets
      const { count: activeWallets } = await supabase
        .from('employee_wallets')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', profile.company_id);
      
      return {
        totalPointsIssued,
        pendingOrders: pendingOrders || 0,
        totalOrders: totalOrders || 0,
        activeWallets: activeWallets || 0,
      };
    },
    enabled: !!profile?.company_id,
  });
};
