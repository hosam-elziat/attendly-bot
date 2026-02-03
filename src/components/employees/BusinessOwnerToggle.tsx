import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Crown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface BusinessOwnerToggleProps {
  employeeId: string;
  employeeUserId: string | null;
  companyId: string;
}

const BusinessOwnerToggle = ({ employeeId, employeeUserId, companyId }: BusinessOwnerToggleProps) => {
  const queryClient = useQueryClient();

  // Get all business owners for this company
  const { data: businessOwners, isLoading } = useQuery({
    queryKey: ['business-owners', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_owners')
        .select('id, employee_id')
        .eq('company_id', companyId);
      
      if (error) throw error;
      return data || [];
    },
  });

  const isCurrentOwner = businessOwners?.some(bo => bo.employee_id === employeeId) || false;
  const ownersCount = businessOwners?.length || 0;

  // Add business owner mutation
  const addBusinessOwner = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('business_owners')
        .insert({
          company_id: companyId,
          employee_id: employeeId,
        });

      if (error) throw error;

      // Also update legacy field if this is the first owner
      if (ownersCount === 0 && employeeUserId) {
        await supabase
          .from('companies')
          .update({ business_owner_id: employeeUserId })
          .eq('id', companyId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-owners', companyId] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('تم تعيين مسؤول الأعمال بنجاح');
    },
    onError: (error) => {
      console.error('Error adding business owner:', error);
      toast.error('فشل في تعيين مسؤول الأعمال');
    },
  });

  // Remove business owner mutation
  const removeBusinessOwner = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('business_owners')
        .delete()
        .eq('company_id', companyId)
        .eq('employee_id', employeeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-owners', companyId] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('تم إزالة مسؤول الأعمال');
    },
    onError: (error) => {
      console.error('Error removing business owner:', error);
      toast.error('فشل في إزالة مسؤول الأعمال');
    },
  });

  const handleToggle = (checked: boolean) => {
    if (!checked) {
      // Cannot remove if only one owner
      if (ownersCount <= 1) {
        toast.error('لا يمكن إزالة آخر مسؤول أعمال. يجب أن يكون هناك مسؤول واحد على الأقل');
        return;
      }
      removeBusinessOwner.mutate();
    } else {
      addBusinessOwner.mutate();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">جاري التحميل...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className={`flex items-center gap-3 p-4 rounded-lg border ${
        isCurrentOwner 
          ? 'bg-yellow-500/10 border-yellow-500/30' 
          : 'bg-muted/50 border-border'
      }`}>
        <Crown className={`w-5 h-5 ${isCurrentOwner ? 'text-yellow-500' : 'text-muted-foreground'}`} />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Label htmlFor="business-owner-toggle" className="font-medium">
              مسؤول الأعمال (Business Owner)
            </Label>
            {isCurrentOwner && (
              <Badge className="bg-yellow-500 text-yellow-950 hover:bg-yellow-500">
                <Crown className="w-3 h-3 me-1" />
                مسؤول أعمال
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            سيستلم إشعارات التحديثات والتذكير بالاشتراك عبر التيليجرام
          </p>
        </div>
        <Switch
          id="business-owner-toggle"
          checked={isCurrentOwner}
          onCheckedChange={handleToggle}
          disabled={addBusinessOwner.isPending || removeBusinessOwner.isPending}
        />
      </div>

      {ownersCount > 0 && (
        <p className="text-xs text-muted-foreground">
          عدد مسؤولي الأعمال الحاليين: {ownersCount}
        </p>
      )}
    </div>
  );
};

export default BusinessOwnerToggle;
