import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Employee {
  id: string;
  user_id: string | null;
  company_id: string;
  full_name: string;
  email: string;
  department: string | null;
  salary_type: 'monthly' | 'daily';
  base_salary: number;
  is_active: boolean;
  telegram_chat_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateEmployeeData {
  full_name: string;
  email: string;
  department?: string;
  salary_type?: 'monthly' | 'daily';
  base_salary?: number;
}

export const useEmployees = () => {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['employees', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Employee[];
    },
    enabled: !!profile?.company_id,
  });
};

export const useCreateEmployee = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (employeeData: CreateEmployeeData) => {
      if (!profile?.company_id) throw new Error('No company found');

      const { data, error } = await supabase
        .from('employees')
        .insert({
          ...employeeData,
          company_id: profile.company_id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Employee added successfully');
    },
    onError: (error) => {
      toast.error('Failed to add employee: ' + error.message);
    },
  });
};

export const useUpdateEmployee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Employee> & { id: string }) => {
      const { data: result, error } = await supabase
        .from('employees')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Employee updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update employee: ' + error.message);
    },
  });
};

export const useDeleteEmployee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Employee deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete employee: ' + error.message);
    },
  });
};
