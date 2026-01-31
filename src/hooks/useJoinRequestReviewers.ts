import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSuperAdminCompanyAccess } from './useSuperAdminCompanyAccess';
import { toast } from 'sonner';

export interface JoinRequestReviewer {
  id: string;
  company_id: string;
  reviewer_type: 'position' | 'employee';
  reviewer_id: string;
  created_at: string;
}

export const useJoinRequestReviewers = () => {
  const { effectiveCompanyId } = useSuperAdminCompanyAccess();

  return useQuery({
    queryKey: ['join-request-reviewers', effectiveCompanyId],
    queryFn: async () => {
      if (!effectiveCompanyId) return [];
      
      const { data, error } = await supabase
        .from('join_request_reviewers')
        .select('*')
        .eq('company_id', effectiveCompanyId);

      if (error) throw error;
      return data as JoinRequestReviewer[];
    },
    enabled: !!effectiveCompanyId,
  });
};

export const useAddJoinRequestReviewer = () => {
  const queryClient = useQueryClient();
  const { effectiveCompanyId } = useSuperAdminCompanyAccess();

  return useMutation({
    mutationFn: async ({ 
      reviewerType, 
      reviewerId 
    }: { 
      reviewerType: 'position' | 'employee'; 
      reviewerId: string;
    }) => {
      if (!effectiveCompanyId) throw new Error('No company ID');

      const { data, error } = await supabase
        .from('join_request_reviewers')
        .insert({
          company_id: effectiveCompanyId,
          reviewer_type: reviewerType,
          reviewer_id: reviewerId,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('هذا المراجع مضاف بالفعل');
        }
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['join-request-reviewers'] });
      toast.success('تمت إضافة المراجع');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};

export const useRemoveJoinRequestReviewer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reviewerId: string) => {
      const { error } = await supabase
        .from('join_request_reviewers')
        .delete()
        .eq('id', reviewerId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['join-request-reviewers'] });
      toast.success('تم حذف المراجع');
    },
    onError: (error: Error) => {
      toast.error('فشل في حذف المراجع: ' + error.message);
    },
  });
};
