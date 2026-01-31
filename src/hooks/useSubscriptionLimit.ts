import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSuperAdminCompanyAccess } from './useSuperAdminCompanyAccess';
import { useEmployees } from './useEmployees';

interface SubscriptionPlan {
  id: string;
  name: string;
  name_ar: string | null;
  min_employees: number;
  max_employees: number | null;
  is_unlimited: boolean;
  price_monthly: number;
  price_quarterly: number | null;
  price_yearly: number | null;
  currency: string;
}

interface SubscriptionData {
  id: string;
  company_id: string;
  plan_id: string | null;
  plan_name: string | null;
  max_employees: number | null;
  status: string;
  current_period_end: string | null;
}

export const useSubscriptionLimit = () => {
  const { effectiveCompanyId } = useSuperAdminCompanyAccess();
  const { data: employees = [] } = useEmployees();

  const { data: subscription } = useQuery({
    queryKey: ['subscription', effectiveCompanyId],
    queryFn: async () => {
      if (!effectiveCompanyId) return null;
      
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('company_id', effectiveCompanyId)
        .single();

      if (error) return null;
      return data as SubscriptionData;
    },
    enabled: !!effectiveCompanyId,
  });

  const { data: plans = [] } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('min_employees', { ascending: true });

      if (error) return [];
      return data as SubscriptionPlan[];
    },
  });

  const activeEmployeeCount = employees.filter(e => e.is_active).length;
  const maxEmployees = subscription?.max_employees || 10;
  const GRACE_EMPLOYEES = 3; // Allow 3 extra employees with warning

  const isUnlimited = plans.find(p => p.id === subscription?.plan_id)?.is_unlimited || false;
  
  const canAddEmployee = isUnlimited || activeEmployeeCount < maxEmployees + GRACE_EMPLOYEES;
  const isOverLimit = !isUnlimited && activeEmployeeCount >= maxEmployees;
  const employeesOverLimit = Math.max(0, activeEmployeeCount - maxEmployees);

  // Find the next plan to upgrade to
  const getNextPlan = () => {
    if (isUnlimited) return null;
    
    const nextPlan = plans.find(p => 
      !p.is_unlimited && 
      p.min_employees > maxEmployees
    );
    
    // If no specific plan, return enterprise (unlimited)
    if (!nextPlan) {
      return plans.find(p => p.is_unlimited);
    }
    
    return nextPlan;
  };

  const nextPlan = getNextPlan();

  return {
    activeEmployeeCount,
    maxEmployees,
    canAddEmployee,
    isOverLimit,
    employeesOverLimit,
    isUnlimited,
    subscription,
    plans,
    nextPlan,
    GRACE_EMPLOYEES,
  };
};
