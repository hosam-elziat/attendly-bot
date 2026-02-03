import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Crown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface BusinessOwnerToggleProps {
  employeeId: string;
  employeeUserId: string | null;
  companyId: string;
}

const BusinessOwnerToggle = ({ employeeId, employeeUserId, companyId }: BusinessOwnerToggleProps) => {
  const queryClient = useQueryClient();
  const [showWarning, setShowWarning] = useState(false);

  // Get current business owner
  const { data: company, isLoading } = useQuery({
    queryKey: ['company-business-owner', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('business_owner_id')
        .eq('id', companyId)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  // Get business owner employee info if exists
  const { data: currentOwnerEmployee } = useQuery({
    queryKey: ['business-owner-employee', companyId, company?.business_owner_id],
    queryFn: async () => {
      if (!company?.business_owner_id) return null;
      
      const { data, error } = await supabase
        .from('employees')
        .select('id, full_name')
        .eq('company_id', companyId)
        .eq('user_id', company.business_owner_id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!company?.business_owner_id,
  });

  const isCurrentOwner = employeeUserId && company?.business_owner_id === employeeUserId;

  // Set business owner mutation
  const setBusinessOwner = useMutation({
    mutationFn: async () => {
      if (!employeeUserId) {
        throw new Error('هذا الموظف ليس لديه حساب مستخدم');
      }

      const { error } = await supabase
        .from('companies')
        .update({ business_owner_id: employeeUserId })
        .eq('id', companyId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-business-owner', companyId] });
      queryClient.invalidateQueries({ queryKey: ['business-owner-employee', companyId] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('تم تعيين مسؤول الأعمال بنجاح');
    },
    onError: (error) => {
      console.error('Error setting business owner:', error);
      toast.error(error instanceof Error ? error.message : 'فشل في تعيين مسؤول الأعمال');
    },
  });

  const handleToggle = (checked: boolean) => {
    if (!checked) {
      // Can't uncheck - must have at least one owner
      toast.error('لا يمكن إزالة مسؤول الأعمال. يجب تعيين شخص آخر أولاً');
      return;
    }

    if (!employeeUserId) {
      toast.error('هذا الموظف ليس لديه حساب مستخدم. يجب أن يسجل دخوله أولاً');
      return;
    }

    if (company?.business_owner_id && company.business_owner_id !== employeeUserId) {
      // There's already another owner, show warning
      setShowWarning(true);
    } else {
      setBusinessOwner.mutate();
    }
  };

  const confirmChange = () => {
    setShowWarning(false);
    setBusinessOwner.mutate();
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
    <>
      <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 border">
        <Crown className={`w-5 h-5 ${isCurrentOwner ? 'text-yellow-500' : 'text-muted-foreground'}`} />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Label htmlFor="business-owner-toggle" className="font-medium">
              مسؤول الأعمال (Business Owner)
            </Label>
            {isCurrentOwner && (
              <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30">
                المسؤول الحالي
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            سيستلم إشعارات التحديثات والتذكير بالاشتراك عبر التيليجرام
          </p>
        </div>
        <Switch
          id="business-owner-toggle"
          checked={isCurrentOwner || false}
          onCheckedChange={handleToggle}
          disabled={setBusinessOwner.isPending || !employeeUserId}
        />
      </div>

      {!employeeUserId && (
        <p className="text-xs text-destructive mt-1">
          ⚠️ هذا الموظف ليس لديه حساب مستخدم. لتعيينه كمسؤول أعمال، يجب أن يسجل دخوله أولاً.
        </p>
      )}

      <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تغيير مسؤول الأعمال؟</AlertDialogTitle>
            <AlertDialogDescription>
              {currentOwnerEmployee ? (
                <>
                  المسؤول الحالي هو <strong>{currentOwnerEmployee.full_name}</strong>.
                  <br />
                  هل تريد تغييره إلى هذا الموظف؟ سيتم نقل جميع إشعارات الاشتراك والتحديثات إليه.
                </>
              ) : (
                'هل أنت متأكد من تعيين هذا الموظف كمسؤول أعمال؟'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={confirmChange}>
              تأكيد التغيير
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default BusinessOwnerToggle;
