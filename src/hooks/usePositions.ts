import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Position {
  id: string;
  company_id: string;
  title: string;
  title_ar: string | null;
  description: string | null;
  reports_to: string | null;
  level: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PositionPermissions {
  id: string;
  position_id: string;
  can_manage_attendance: boolean;
  can_approve_leaves: boolean;
  can_make_deductions: boolean;
  can_add_bonuses: boolean;
  can_view_salaries: boolean;
  can_manage_subordinates: boolean;
  can_view_reports: boolean;
  created_at: string;
  updated_at: string;
}

export interface PositionWithPermissions extends Position {
  position_permissions: PositionPermissions | null;
  reports_to_position?: Position | null;
  employees_count?: number;
}

export interface CreatePositionData {
  title: string;
  title_ar?: string;
  description?: string;
  reports_to?: string | null;
  level?: number;
  permissions?: Partial<Omit<PositionPermissions, 'id' | 'position_id' | 'created_at' | 'updated_at'>>;
}

export const usePositions = () => {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['positions', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];

      const { data, error } = await supabase
        .from('positions')
        .select(`
          *,
          position_permissions (*)
        `)
        .eq('company_id', profile.company_id)
        .order('level', { ascending: true });

      if (error) throw error;

      // Get employee counts for each position
      const { data: employees } = await supabase
        .from('employees')
        .select('position_id')
        .eq('company_id', profile.company_id)
        .not('position_id', 'is', null);

      const positionCounts: Record<string, number> = {};
      employees?.forEach(emp => {
        if (emp.position_id) {
          positionCounts[emp.position_id] = (positionCounts[emp.position_id] || 0) + 1;
        }
      });

      return (data || []).map(pos => ({
        ...pos,
        employees_count: positionCounts[pos.id] || 0
      })) as PositionWithPermissions[];
    },
    enabled: !!profile?.company_id
  });
};

export const useCreatePosition = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (data: CreatePositionData) => {
      if (!profile?.company_id) throw new Error('No company ID');

      // Create position
      const { data: position, error: posError } = await supabase
        .from('positions')
        .insert({
          company_id: profile.company_id,
          title: data.title,
          title_ar: data.title_ar,
          description: data.description,
          reports_to: data.reports_to,
          level: data.level ?? 0
        })
        .select()
        .single();

      if (posError) throw posError;

      // Create permissions
      if (data.permissions) {
        const { error: permError } = await supabase
          .from('position_permissions')
          .insert({
            position_id: position.id,
            ...data.permissions
          });

        if (permError) throw permError;
      } else {
        // Create default permissions (all false)
        const { error: permError } = await supabase
          .from('position_permissions')
          .insert({
            position_id: position.id
          });

        if (permError) throw permError;
      }

      return position;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positions'] });
      toast.success('تم إنشاء المنصب بنجاح');
    },
    onError: (error: Error) => {
      toast.error('فشل في إنشاء المنصب: ' + error.message);
    }
  });
};

export const useUpdatePosition = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      data, 
      permissions 
    }: { 
      id: string; 
      data: Partial<Omit<Position, 'id' | 'company_id' | 'created_at' | 'updated_at'>>;
      permissions?: Partial<Omit<PositionPermissions, 'id' | 'position_id' | 'created_at' | 'updated_at'>>;
    }) => {
      // Update position
      const { error: posError } = await supabase
        .from('positions')
        .update(data)
        .eq('id', id);

      if (posError) throw posError;

      // Update permissions if provided
      if (permissions) {
        const { error: permError } = await supabase
          .from('position_permissions')
          .upsert({
            position_id: id,
            ...permissions
          }, { onConflict: 'position_id' });

        if (permError) throw permError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positions'] });
      toast.success('تم تحديث المنصب بنجاح');
    },
    onError: (error: Error) => {
      toast.error('فشل في تحديث المنصب: ' + error.message);
    }
  });
};

export const useDeletePosition = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('positions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positions'] });
      toast.success('تم حذف المنصب بنجاح');
    },
    onError: (error: Error) => {
      toast.error('فشل في حذف المنصب: ' + error.message);
    }
  });
};

export const useAssignPosition = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ employeeId, positionId }: { employeeId: string; positionId: string | null }) => {
      const { error } = await supabase
        .from('employees')
        .update({ position_id: positionId })
        .eq('id', employeeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positions'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('تم تعيين المنصب بنجاح');
    },
    onError: (error: Error) => {
      toast.error('فشل في تعيين المنصب: ' + error.message);
    }
  });
};
