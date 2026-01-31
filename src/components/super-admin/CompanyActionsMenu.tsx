import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useSuperAdmin } from '@/contexts/SuperAdminContext';
import { useViewAsCompany } from '@/contexts/ViewAsCompanyContext';
import { useSuperAdminActivityLog } from '@/hooks/useSuperAdminActivityLog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  MoreHorizontal,
  Eye,
  Ban,
  CheckCircle,
  Trash2,
  RotateCcw,
  LogIn,
  Building2,
} from 'lucide-react';

interface Company {
  id: string;
  name: string;
  owner_id: string;
  is_suspended?: boolean;
  is_deleted?: boolean;
}

interface CompanyActionsMenuProps {
  company: Company;
  onViewDetails: () => void;
  onRefresh: () => void;
}

const CompanyActionsMenu = ({ company, onViewDetails, onRefresh }: CompanyActionsMenuProps) => {
  const navigate = useNavigate();
  const { isSuperAdmin, teamMember } = useSuperAdmin();
  const { enterCompanyMode } = useViewAsCompany();
  const { logActivity } = useSuperAdminActivityLog();
  
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEnterCompany = async () => {
    if (!isSuperAdmin) return;
    
    try {
      await enterCompanyMode(company.id);
      toast.success(`تم الدخول إلى شركة ${company.name}`);
      navigate('/dashboard');
    } catch (error) {
      console.error('Error entering company mode:', error);
      toast.error('فشل في الدخول إلى الشركة');
    }
  };

  const handleSuspend = async () => {
    if (!isSuperAdmin) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('companies')
        .update({
          is_suspended: true,
          suspended_at: new Date().toISOString(),
          suspended_by: teamMember?.user_id,
          suspended_reason: suspendReason,
        })
        .eq('id', company.id);

      if (error) throw error;

      // Update subscription status
      await supabase
        .from('subscriptions')
        .update({ status: 'inactive' })
        .eq('company_id', company.id);

      await logActivity({
        action: `تم إيقاف الشركة: ${company.name}`,
        actionType: 'suspend',
        targetType: 'company',
        targetId: company.id,
        targetName: company.name,
        companyId: company.id,
        companyName: company.name,
        details: { reason: suspendReason },
      });

      toast.success('تم إيقاف الشركة بنجاح');
      setSuspendDialogOpen(false);
      setSuspendReason('');
      onRefresh();
    } catch (error) {
      console.error('Error suspending company:', error);
      toast.error('فشل في إيقاف الشركة');
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async () => {
    if (!isSuperAdmin) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('companies')
        .update({
          is_suspended: false,
          suspended_at: null,
          suspended_by: null,
          suspended_reason: null,
        })
        .eq('id', company.id);

      if (error) throw error;

      // Reactivate subscription
      await supabase
        .from('subscriptions')
        .update({ status: 'active' })
        .eq('company_id', company.id);

      await logActivity({
        action: `تم تفعيل الشركة: ${company.name}`,
        actionType: 'activate',
        targetType: 'company',
        targetId: company.id,
        targetName: company.name,
        companyId: company.id,
        companyName: company.name,
      });

      toast.success('تم تفعيل الشركة بنجاح');
      onRefresh();
    } catch (error) {
      console.error('Error activating company:', error);
      toast.error('فشل في تفعيل الشركة');
    } finally {
      setLoading(false);
    }
  };

  const handleSoftDelete = async () => {
    if (!isSuperAdmin) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('companies')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          deleted_by: teamMember?.user_id,
        })
        .eq('id', company.id);

      if (error) throw error;

      // Deactivate subscription
      await supabase
        .from('subscriptions')
        .update({ status: 'cancelled' })
        .eq('company_id', company.id);

      await logActivity({
        action: `تم حذف الشركة: ${company.name}`,
        actionType: 'delete',
        targetType: 'company',
        targetId: company.id,
        targetName: company.name,
        companyId: company.id,
        companyName: company.name,
      });

      toast.success('تم حذف الشركة بنجاح');
      setDeleteDialogOpen(false);
      onRefresh();
    } catch (error) {
      console.error('Error deleting company:', error);
      toast.error('فشل في حذف الشركة');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!isSuperAdmin) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('companies')
        .update({
          is_deleted: false,
          deleted_at: null,
          deleted_by: null,
        })
        .eq('id', company.id);

      if (error) throw error;

      await logActivity({
        action: `تم استعادة الشركة: ${company.name}`,
        actionType: 'activate',
        targetType: 'company',
        targetId: company.id,
        targetName: company.name,
        companyId: company.id,
        companyName: company.name,
      });

      toast.success('تم استعادة الشركة بنجاح');
      setRestoreDialogOpen(false);
      onRefresh();
    } catch (error) {
      console.error('Error restoring company:', error);
      toast.error('فشل في استعادة الشركة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-slate-900 border-slate-700">
          {/* Enter Company Mode - Primary Action */}
          {isSuperAdmin && !company.is_deleted && (
            <>
              <DropdownMenuItem 
                onClick={handleEnterCompany} 
                className="text-primary hover:bg-slate-800 gap-2 font-medium"
              >
                <LogIn className="w-4 h-4" />
                دخول الشركة
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-slate-700" />
            </>
          )}

          <DropdownMenuItem onClick={onViewDetails} className="text-white hover:bg-slate-800 gap-2">
            <Eye className="w-4 h-4" />
            عرض التفاصيل
          </DropdownMenuItem>
          
          {isSuperAdmin && (
            <>
              <DropdownMenuSeparator className="bg-slate-700" />
              
              {company.is_deleted ? (
                <DropdownMenuItem 
                  onClick={() => setRestoreDialogOpen(true)} 
                  className="text-green-400 hover:bg-slate-800 gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  استعادة الشركة
                </DropdownMenuItem>
              ) : (
                <>
                  {company.is_suspended ? (
                    <DropdownMenuItem 
                      onClick={handleActivate} 
                      className="text-green-400 hover:bg-slate-800 gap-2"
                      disabled={loading}
                    >
                      <CheckCircle className="w-4 h-4" />
                      تفعيل الشركة
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem 
                      onClick={() => setSuspendDialogOpen(true)} 
                      className="text-amber-400 hover:bg-slate-800 gap-2"
                    >
                      <Ban className="w-4 h-4" />
                      إيقاف مؤقت
                    </DropdownMenuItem>
                  )}
                  
                  <DropdownMenuSeparator className="bg-slate-700" />
                  
                  <DropdownMenuItem 
                    onClick={() => setDeleteDialogOpen(true)} 
                    className="text-red-400 hover:bg-slate-800 gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    حذف الشركة
                  </DropdownMenuItem>
                </>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Suspend Dialog */}
      <AlertDialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <AlertDialogContent className="bg-slate-900 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">إيقاف الشركة مؤقتاً</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              هل أنت متأكد من إيقاف شركة "{company.name}" مؤقتاً؟
              سيتم تعطيل جميع الموظفين وإيقاف الاشتراك.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="سبب الإيقاف (اختياري)"
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 text-white hover:bg-slate-700">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSuspend}
              disabled={loading}
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              {loading ? 'جاري الإيقاف...' : 'إيقاف الشركة'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-slate-900 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">حذف الشركة</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              هل أنت متأكد من حذف شركة "{company.name}"؟
              سيتم إخفاء الشركة من النظام ويمكن استعادتها لاحقاً.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 text-white hover:bg-slate-700">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSoftDelete}
              disabled={loading}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {loading ? 'جاري الحذف...' : 'حذف الشركة'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore Dialog */}
      <AlertDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <AlertDialogContent className="bg-slate-900 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">استعادة الشركة</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              هل تريد استعادة شركة "{company.name}"؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 text-white hover:bg-slate-700">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestore}
              disabled={loading}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              {loading ? 'جاري الاستعادة...' : 'استعادة الشركة'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default CompanyActionsMenu;
