import { supabase } from '@/integrations/supabase/client';
import { useSuperAdmin } from '@/contexts/SuperAdminContext';

type ActionType = 'view' | 'create' | 'update' | 'delete' | 'suspend' | 'activate' | 'password_reset' | 'force_logout' | 'subscription_change' | 'other';
type TargetType = 'company' | 'employee' | 'subscription' | 'telegram_bot' | 'backup' | 'system' | 'user_account' | 'other';

interface LogActivityParams {
  action: string;
  actionType: ActionType;
  targetType: TargetType;
  targetId?: string;
  targetName?: string;
  companyId?: string;
  companyName?: string;
  details?: Record<string, unknown>;
}

export const useSuperAdminActivityLog = () => {
  const { teamMember } = useSuperAdmin();

  const logActivity = async (params: LogActivityParams) => {
    if (!teamMember) return;

    try {
      await supabase.from('super_admin_activity_logs').insert({
        admin_id: teamMember.user_id,
        admin_email: teamMember.email,
        admin_name: teamMember.full_name,
        action: params.action,
        action_type: params.actionType,
        target_type: params.targetType,
        target_id: params.targetId,
        target_name: params.targetName,
        company_id: params.companyId,
        company_name: params.companyName,
        details: params.details as Record<string, unknown>,
        user_agent: navigator.userAgent,
      } as never);
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  };

  return { logActivity };
};
