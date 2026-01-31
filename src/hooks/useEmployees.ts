import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSuperAdminCompanyAccess } from '@/hooks/useSuperAdminCompanyAccess';
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
  monthly_late_balance_minutes: number | null;
  leave_balance: number | null;
  emergency_leave_balance: number | null;
  position_id: string | null;
  is_freelancer: boolean;
  hourly_rate: number | null;
  biometric_verification_enabled: boolean | null;
  biometric_credential_id: string | null;
  biometric_registered_at: string | null;
  attendance_verification_level: number | null;
  attendance_approver_type: string | null;
  attendance_approver_id: string | null;
  level3_verification_mode: string | null;
  allowed_wifi_ips: string[] | null;
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
  position_id?: string;
  is_freelancer?: boolean;
  hourly_rate?: number;
}

export const useEmployees = () => {
  const { profile } = useAuth();
  const { effectiveCompanyId, isSuperAdminAccess } = useSuperAdminCompanyAccess();

  return useQuery({
    queryKey: ['employees', effectiveCompanyId, isSuperAdminAccess],
    queryFn: async () => {
      if (!effectiveCompanyId) return [];
      
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('company_id', effectiveCompanyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Employee[];
    },
    enabled: !!effectiveCompanyId,
  });
};

export const useCreateEmployee = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const { effectiveCompanyId, isSuperAdminAccess } = useSuperAdminCompanyAccess();
  const logAction = useLogAction();

  return useMutation({
    mutationFn: async (employeeData: CreateEmployeeData) => {
      if (!effectiveCompanyId) throw new Error('No company found');

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

      // Check for duplicate email in same company
      if (validatedData.email) {
        const { data: existingEmail } = await supabase
          .from('employees')
          .select('id')
          .eq('company_id', effectiveCompanyId)
          .eq('email', validatedData.email)
          .maybeSingle();

        if (existingEmail) {
          throw new Error('موظف بنفس البريد الإلكتروني موجود بالفعل في هذه الشركة');
        }
      }

      // Check for duplicate phone in same company
      if (employeeData.phone) {
        const { data: existingPhone } = await supabase
          .from('employees')
          .select('id')
          .eq('company_id', effectiveCompanyId)
          .eq('phone', employeeData.phone)
          .maybeSingle();

        if (existingPhone) {
          throw new Error('موظف بنفس رقم الهاتف موجود بالفعل في هذه الشركة');
        }
      }

      // Check for duplicate national_id in same company
      if (employeeData.national_id) {
        const { data: existingNationalId } = await supabase
          .from('employees')
          .select('id')
          .eq('company_id', effectiveCompanyId)
          .eq('national_id', employeeData.national_id)
          .maybeSingle();

        if (existingNationalId) {
          throw new Error('موظف بنفس الرقم القومي موجود بالفعل في هذه الشركة');
        }
      }

      // Format time fields
      const formattedData = {
        full_name: validatedData.full_name,
        email: validatedData.email,
        department: validatedData.department || null,
        salary_type: validatedData.salary_type,
        base_salary: validatedData.base_salary,
        company_id: effectiveCompanyId,
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
        position_id: employeeData.position_id || null,
        is_freelancer: employeeData.is_freelancer || false,
        hourly_rate: employeeData.is_freelancer ? (employeeData.hourly_rate || null) : null,
      };

      const { data, error } = await supabase
        .from('employees')
        .insert(formattedData)
        .select()
        .single();

      if (error) throw error;

      // Log the action (only for regular users, not Super Admin viewing)
      if (!isSuperAdminAccess) {
        await logAction.mutateAsync({
          tableName: 'employees',
          recordId: data.id,
          action: 'insert',
          newData: data,
        });
      }

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
  const { effectiveCompanyId, isSuperAdminAccess } = useSuperAdminCompanyAccess();
  
  return useMutation({
    mutationFn: async ({ id, oldData, ...data }: Partial<Employee> & { id: string; oldData?: Employee }) => {
      // Validate partial data
      const partialSchema = EmployeeSchema.partial();
      const validationResult = partialSchema.safeParse(data);

      if (!validationResult.success) {
        const firstError = validationResult.error.errors[0];
        throw new Error(firstError.message);
      }

      // Check for duplicate email when updating
      if (data.email && effectiveCompanyId) {
        const { data: existingEmail } = await supabase
          .from('employees')
          .select('id')
          .eq('company_id', effectiveCompanyId)
          .eq('email', data.email)
          .neq('id', id)
          .maybeSingle();

        if (existingEmail) {
          throw new Error('موظف بنفس البريد الإلكتروني موجود بالفعل في هذه الشركة');
        }
      }

      // Check for duplicate phone when updating
      if (data.phone && effectiveCompanyId) {
        const { data: existingPhone } = await supabase
          .from('employees')
          .select('id')
          .eq('company_id', effectiveCompanyId)
          .eq('phone', data.phone)
          .neq('id', id)
          .maybeSingle();

        if (existingPhone) {
          throw new Error('موظف بنفس رقم الهاتف موجود بالفعل في هذه الشركة');
        }
      }

      // Check for duplicate national_id when updating
      if (data.national_id && effectiveCompanyId) {
        const { data: existingNationalId } = await supabase
          .from('employees')
          .select('id')
          .eq('company_id', effectiveCompanyId)
          .eq('national_id', data.national_id)
          .neq('id', id)
          .maybeSingle();

        if (existingNationalId) {
          throw new Error('موظف بنفس الرقم القومي موجود بالفعل في هذه الشركة');
        }
      }

      const { data: result, error } = await supabase
        .from('employees')
        .update(validationResult.data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Log the action with old and new data (only for regular users)
      if (!isSuperAdminAccess) {
        await logAction.mutateAsync({
          tableName: 'employees',
          recordId: id,
          action: 'update',
          oldData: oldData ? JSON.parse(JSON.stringify(oldData)) : null,
          newData: JSON.parse(JSON.stringify(result)),
        });
      }

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
