import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface JoinRequestReviewer {
  id: string;
  company_id: string;
  reviewer_type: 'position' | 'employee';
  reviewer_id: string;
  created_at: string;
}

export const useJoinRequestReviewers = () => {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['join-request-reviewers', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      
      const { data, error } = await supabase
        .from('join_request_reviewers')
        .select('*')
        .eq('company_id', profile.company_id);

      if (error) throw error;
      return data as JoinRequestReviewer[];
    },
    enabled: !!profile?.company_id,
  });
};

export const useAddJoinRequestReviewer = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      reviewerType, 
      reviewerId 
    }: { 
      reviewerType: 'position' | 'employee'; 
      reviewerId: string;
    }) => {
      if (!profile?.company_id) throw new Error('No company ID');

      const { data, error } = await supabase
        .from('join_request_reviewers')
        .insert({
          company_id: profile.company_id,
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
