import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { EmployeeSchema } from '@/lib/validations';
import { z } from 'zod';
import { useLogAction } from './useAuditLogs';

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
  work_start_time: string | null;
  work_end_time: string | null;
  break_duration_minutes: number | null;
  weekend_days: string[] | null;
  phone: string | null;
  national_id: string | null;
  address: string | null;
  hire_date: string | null;
  currency: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateEmployeeData {
  full_name: string;
  email: string;
  department?: string;
  salary_type?: 'monthly' | 'daily';
  base_salary?: number;
  work_start_time?: string;
  work_end_time?: string;
  break_duration_minutes?: number;
  weekend_days?: string[];
  phone?: string;
  national_id?: string;
  address?: string;
  hire_date?: string;
  currency?: string;
  notes?: string;
  telegram_chat_id?: string;
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
  const logAction = useLogAction();

  return useMutation({
    mutationFn: async (employeeData: CreateEmployeeData) => {
      if (!profile?.company_id) throw new Error('No company found');

      // Validate input with zod
      const validationResult = EmployeeSchema.safeParse({
        ...employeeData,
        base_salary: employeeData.base_salary || 0,
      });

      if (!validationResult.success) {
        const firstError = validationResult.error.errors[0];
        throw new Error(firstError.message);
      }

      const validatedData = validationResult.data;

      // Format time fields
      const formattedData = {
        full_name: validatedData.full_name,
        email: validatedData.email,
        department: validatedData.department || null,
        salary_type: validatedData.salary_type,
        base_salary: validatedData.base_salary,
        company_id: profile.company_id,
        work_start_time: validatedData.work_start_time 
          ? (validatedData.work_start_time.length === 5 ? validatedData.work_start_time + ':00' : validatedData.work_start_time)
          : '09:00:00',
        work_end_time: validatedData.work_end_time 
          ? (validatedData.work_end_time.length === 5 ? validatedData.work_end_time + ':00' : validatedData.work_end_time)
          : '17:00:00',
        break_duration_minutes: validatedData.break_duration_minutes ?? 60,
        weekend_days: validatedData.weekend_days ?? ['friday', 'saturday'],
        phone: employeeData.phone || null,
        national_id: employeeData.national_id || null,
        address: employeeData.address || null,
        hire_date: employeeData.hire_date || null,
        currency: employeeData.currency || null,
        notes: employeeData.notes || null,
        telegram_chat_id: employeeData.telegram_chat_id || null,
      };

      const { data, error } = await supabase
        .from('employees')
        .insert(formattedData)
        .select()
        .single();

      if (error) throw error;

      // Log the action
      await logAction.mutateAsync({
        tableName: 'employees',
        recordId: data.id,
        action: 'insert',
        newData: data,
      });

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
  const logAction = useLogAction();

  return useMutation({
    mutationFn: async ({ id, oldData, ...data }: Partial<Employee> & { id: string; oldData?: Employee }) => {
      // Validate partial data
      const partialSchema = EmployeeSchema.partial();
      const validationResult = partialSchema.safeParse(data);

      if (!validationResult.success) {
        const firstError = validationResult.error.errors[0];
        throw new Error(firstError.message);
      }

      const { data: result, error } = await supabase
        .from('employees')
        .update(validationResult.data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Log the action with old and new data
      await logAction.mutateAsync({
        tableName: 'employees',
        recordId: id,
        action: 'update',
        oldData: oldData ? JSON.parse(JSON.stringify(oldData)) : null,
        newData: JSON.parse(JSON.stringify(result)),
      });

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
      // Validate ID is a valid UUID
      const uuidSchema = z.string().uuid('Invalid employee ID');
      uuidSchema.parse(id);

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
