import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSuperAdminCompanyAccess } from './useSuperAdminCompanyAccess';

export interface PublicHoliday {
  date: string;
  localName: string;
  name: string;
  countryCode: string;
  fixed: boolean;
  global: boolean;
  types: string[];
}

export const usePublicHolidays = () => {
  const { effectiveCompanyId } = useSuperAdminCompanyAccess();

  // First get the company's country code
  const { data: company } = useQuery({
    queryKey: ['company-country', effectiveCompanyId],
    queryFn: async () => {
      if (!effectiveCompanyId) return null;
      const { data } = await supabase
        .from('companies')
        .select('country_code')
        .eq('id', effectiveCompanyId)
        .single();
      return data;
    },
    enabled: !!effectiveCompanyId,
  });

  return useQuery({
    queryKey: ['public-holidays', company?.country_code],
    queryFn: async (): Promise<PublicHoliday[]> => {
      if (!company?.country_code) return [];

      const { data, error } = await supabase.functions.invoke('get-public-holidays', {
        body: { 
          countryCode: company.country_code,
          year: new Date().getFullYear()
        },
      });

      if (error) {
        console.error('Error fetching holidays:', error);
        return [];
      }

      return data || [];
    },
    enabled: !!company?.country_code,
  });
};
