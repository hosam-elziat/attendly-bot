import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSuperAdmin } from '@/contexts/SuperAdminContext';
import { supabase } from '@/integrations/supabase/client';

interface ViewAsCompany {
  id: string;
  name: string;
  owner_id: string;
  telegram_bot_connected: boolean;
  telegram_bot_username: string | null;
  work_start_time: string;
  work_end_time: string;
  country_code: string;
  timezone: string;
  default_currency: string;
  is_suspended: boolean;
}

interface ViewAsCompanyContextType {
  // State
  isViewingAsCompany: boolean;
  viewingCompany: ViewAsCompany | null;
  
  // Actions
  enterCompanyMode: (companyId: string) => Promise<void>;
  exitCompanyMode: () => void;
  
  // Helpers
  getEffectiveCompanyId: (originalCompanyId: string | null) => string | null;
  isSuperAdminMode: boolean;
}

const ViewAsCompanyContext = createContext<ViewAsCompanyContextType | undefined>(undefined);

const STORAGE_KEY = 'super_admin_view_as_company';

export const ViewAsCompanyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { teamMember, isSuperAdmin } = useSuperAdmin();
  const [viewingCompany, setViewingCompany] = useState<ViewAsCompany | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const restoreSession = async () => {
      if (!teamMember || !isSuperAdmin) {
        setViewingCompany(null);
        setIsLoading(false);
        return;
      }

      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const { companyId } = JSON.parse(stored);
          if (companyId) {
            // Verify company still exists
            const { data: company, error } = await supabase
              .from('companies')
              .select('id, name, owner_id, telegram_bot_connected, telegram_bot_username, work_start_time, work_end_time, country_code, timezone, default_currency, is_suspended')
              .eq('id', companyId)
              .maybeSingle();

            if (!error && company) {
              setViewingCompany(company as ViewAsCompany);
            } else {
              localStorage.removeItem(STORAGE_KEY);
            }
          }
        } catch (e) {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
      setIsLoading(false);
    };

    restoreSession();
  }, [teamMember, isSuperAdmin]);

  const enterCompanyMode = async (companyId: string) => {
    if (!teamMember || !isSuperAdmin) {
      throw new Error('Only Super Admin can enter company mode');
    }

    const { data: company, error } = await supabase
      .from('companies')
      .select('id, name, owner_id, telegram_bot_connected, telegram_bot_username, work_start_time, work_end_time, country_code, timezone, default_currency, is_suspended')
      .eq('id', companyId)
      .single();

    if (error || !company) {
      throw new Error('Company not found');
    }

    // Log activity
    await supabase.from('super_admin_activity_logs').insert({
      admin_id: teamMember.user_id,
      admin_email: teamMember.email,
      admin_name: teamMember.full_name,
      action: `دخول وضع الشركة: ${company.name}`,
      action_type: 'view',
      target_type: 'company',
      target_id: company.id,
      target_name: company.name,
      company_id: company.id,
      company_name: company.name,
      user_agent: navigator.userAgent,
    } as never);

    setViewingCompany(company as ViewAsCompany);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ companyId: company.id }));
  };

  const exitCompanyMode = () => {
    if (viewingCompany && teamMember) {
      // Log exit
      supabase.from('super_admin_activity_logs').insert({
        admin_id: teamMember.user_id,
        admin_email: teamMember.email,
        admin_name: teamMember.full_name,
        action: `خروج من وضع الشركة: ${viewingCompany.name}`,
        action_type: 'view',
        target_type: 'company',
        target_id: viewingCompany.id,
        target_name: viewingCompany.name,
        company_id: viewingCompany.id,
        company_name: viewingCompany.name,
        user_agent: navigator.userAgent,
      } as never);
    }

    setViewingCompany(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const getEffectiveCompanyId = (originalCompanyId: string | null): string | null => {
    if (viewingCompany) {
      return viewingCompany.id;
    }
    return originalCompanyId;
  };

  const isViewingAsCompany = !!viewingCompany;
  const isSuperAdminMode = isSuperAdmin && isViewingAsCompany;

  return (
    <ViewAsCompanyContext.Provider
      value={{
        isViewingAsCompany,
        viewingCompany,
        enterCompanyMode,
        exitCompanyMode,
        getEffectiveCompanyId,
        isSuperAdminMode,
      }}
    >
      {children}
    </ViewAsCompanyContext.Provider>
  );
};

export const useViewAsCompany = () => {
  const context = useContext(ViewAsCompanyContext);
  if (!context) {
    throw new Error('useViewAsCompany must be used within a ViewAsCompanyProvider');
  }
  return context;
};
