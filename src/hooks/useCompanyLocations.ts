import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface CompanyLocation {
  id: string;
  company_id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateLocationData {
  name: string;
  latitude: number;
  longitude: number;
  radius_meters?: number;
}

export const useCompanyLocations = () => {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['company-locations', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];

      const { data, error } = await (supabase as any)
        .from('company_locations')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as CompanyLocation[];
    },
    enabled: !!profile?.company_id,
  });
};

export const useCreateLocation = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateLocationData) => {
      if (!profile?.company_id) throw new Error('No company ID');

      // Check max 5 locations
      const { count } = await (supabase as any)
        .from('company_locations')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', profile.company_id);

      if (count && count >= 5) {
        throw new Error('لا يمكن إضافة أكثر من 5 مواقع');
      }

      const { data: result, error } = await (supabase as any)
        .from('company_locations')
        .insert({
          company_id: profile.company_id,
          name: data.name,
          latitude: data.latitude,
          longitude: data.longitude,
          radius_meters: data.radius_meters || 100,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-locations'] });
      toast.success('تم إضافة الموقع بنجاح');
    },
    onError: (error: any) => {
      toast.error(error.message || 'فشل في إضافة الموقع');
    },
  });
};

export const useUpdateLocation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<CompanyLocation> & { id: string }) => {
      const { error } = await (supabase as any)
        .from('company_locations')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-locations'] });
      toast.success('تم تحديث الموقع بنجاح');
    },
    onError: (error: any) => {
      toast.error(error.message || 'فشل في تحديث الموقع');
    },
  });
};

export const useDeleteLocation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('company_locations')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-locations'] });
      toast.success('تم حذف الموقع بنجاح');
    },
    onError: (error: any) => {
      toast.error(error.message || 'فشل في حذف الموقع');
    },
  });
};

// Employee Locations
export interface EmployeeLocation {
  id: string;
  employee_id: string;
  location_id: string;
  created_at: string;
}

export const useEmployeeLocations = (employeeId?: string) => {
  return useQuery({
    queryKey: ['employee-locations', employeeId],
    queryFn: async () => {
      if (!employeeId) return [];

      const { data, error } = await (supabase as any)
        .from('employee_locations')
        .select('*')
        .eq('employee_id', employeeId);

      if (error) throw error;
      return data as EmployeeLocation[];
    },
    enabled: !!employeeId,
  });
};

export const useUpdateEmployeeLocations = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ employeeId, locationIds }: { employeeId: string; locationIds: string[] }) => {
      // Delete existing assignments
      await (supabase as any)
        .from('employee_locations')
        .delete()
        .eq('employee_id', employeeId);

      // Insert new assignments
      if (locationIds.length > 0) {
        const { error } = await (supabase as any)
          .from('employee_locations')
          .insert(
            locationIds.map(locationId => ({
              employee_id: employeeId,
              location_id: locationId,
            }))
          );

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-locations'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'فشل في تحديث مواقع الموظف');
    },
  });
};
