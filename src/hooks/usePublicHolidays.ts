import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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
  const { profile } = useAuth();

  // First get the company's country code
  const { data: company } = useQuery({
    queryKey: ['company-country', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return null;
      const { data } = await supabase
        .from('companies')
        .select('country_code')
        .eq('id', profile.company_id)
        .single();
      return data;
    },
    enabled: !!profile?.company_id,
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
