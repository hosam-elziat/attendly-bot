import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSuperAdminCompanyAccess } from '@/hooks/useSuperAdminCompanyAccess';
import { useAuth } from '@/contexts/AuthContext';

export interface SalaryPayment {
  id: string;
  employee_id: string;
  company_id: string;
  month: string;
  is_paid: boolean;
  paid_at: string | null;
  paid_by: string | null;
  paid_by_name: string | null;
}

export function useSalaryPayments(month: string) {
  const { effectiveCompanyId } = useSuperAdminCompanyAccess();
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: payments = [], ...query } = useQuery({
    queryKey: ['salary-payments', effectiveCompanyId, month],
    queryFn: async () => {
      if (!effectiveCompanyId) return [];
      const { data, error } = await supabase
        .from('salary_payments')
        .select('*')
        .eq('company_id', effectiveCompanyId)
        .eq('month', month);
      if (error) throw error;
      return (data || []) as SalaryPayment[];
    },
    enabled: !!effectiveCompanyId,
  });

  const togglePaid = useMutation({
    mutationFn: async ({ employeeId, isPaid }: { employeeId: string; isPaid: boolean }) => {
      if (!effectiveCompanyId || !profile) throw new Error('Missing context');

      if (isPaid) {
        // Upsert as paid
        const { error } = await supabase
          .from('salary_payments')
          .upsert({
            employee_id: employeeId,
            company_id: effectiveCompanyId,
            month,
            is_paid: true,
            paid_at: new Date().toISOString(),
            paid_by: profile.user_id,
            paid_by_name: profile.full_name,
          }, { onConflict: 'employee_id,company_id,month' });
        if (error) throw error;
      } else {
        // Delete the payment record
        const { error } = await supabase
          .from('salary_payments')
          .delete()
          .eq('employee_id', employeeId)
          .eq('company_id', effectiveCompanyId)
          .eq('month', month);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-payments', effectiveCompanyId, month] });
    },
  });

  const paidMap = new Map(payments.map(p => [p.employee_id, p.is_paid]));

  return {
    payments,
    paidMap,
    togglePaid,
    ...query,
  };
}
