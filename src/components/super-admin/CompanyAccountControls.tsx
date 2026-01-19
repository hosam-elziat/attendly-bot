import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSuperAdmin } from '@/contexts/SuperAdminContext';
import { useSuperAdminActivityLog } from '@/hooks/useSuperAdminActivityLog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import { toast } from 'sonner';
import {
  Key,
  LogOut,
  Shield,
  Mail,
  Clock,
  Monitor,
  MapPin,
  AlertTriangle,
} from 'lucide-react';

interface LoginAttempt {
  id: string;
  email: string;
  success: boolean;
  ip_address: string | null;
  user_agent: string | null;
  failure_reason: string | null;
  created_at: string;
}

interface CompanyAccountControlsProps {
  company: {
    id: string;
    name: string;
    owner_id: string;
    owner_email?: string;
  };
  loginAttempts: LoginAttempt[];
  onRefresh: () => void;
}

const CompanyAccountControls = ({ company, loginAttempts, onRefresh }: CompanyAccountControlsProps) => {
  const { isSuperAdmin } = useSuperAdmin();
  const { logActivity } = useSuperAdminActivityLog();
  
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [forceLogoutDialogOpen, setForceLogoutDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const lastLogin = loginAttempts.find(a => a.success);
  const failedAttempts = loginAttempts.filter(a => !a.success).length;

  const handleResetPassword = async () => {
    if (!isSuperAdmin || !newPassword || newPassword.length < 8) {
      toast.error('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
      return;
    }

    setLoading(true);
    try {
      // Note: This requires admin API which should be done via edge function
      // For now, we'll send a password reset email
      const { error } = await supabase.auth.resetPasswordForEmail(
        company.owner_email || '',
        { redirectTo: `${window.location.origin}/reset-password` }
      );

      if (error) throw error;

      await logActivity({
        action: `تم إرسال رابط إعادة تعيين كلمة المرور للشركة: ${company.name}`,
        actionType: 'password_reset',
        targetType: 'user_account',
        targetId: company.owner_id,
        targetName: company.owner_email,
        companyId: company.id,
        companyName: company.name,
      });

      toast.success('تم إرسال رابط إعادة تعيين كلمة المرور');
      setResetPasswordDialogOpen(false);
      setNewPassword('');
    } catch (error) {
      console.error('Error resetting password:', error);
      toast.error('فشل في إرسال رابط إعادة التعيين');
    } finally {
      setLoading(false);
    }
  };

  const handleForceLogout = async () => {
    if (!isSuperAdmin) return;

    setLoading(true);
    try {
      // Mark all sessions as inactive
      await supabase
        .from('user_sessions')
        .update({ 
          is_active: false, 
          logged_out_at: new Date().toISOString() 
        })
        .eq('user_id', company.owner_id);

      await logActivity({
        action: `تم فرض تسجيل الخروج لمالك الشركة: ${company.name}`,
        actionType: 'force_logout',
        targetType: 'user_account',
        targetId: company.owner_id,
        targetName: company.owner_email,
        companyId: company.id,
        companyName: company.name,
      });

      toast.success('تم فرض تسجيل الخروج من جميع الأجهزة');
      setForceLogoutDialogOpen(false);
      onRefresh();
    } catch (error) {
      console.error('Error forcing logout:', error);
      toast.error('فشل في فرض تسجيل الخروج');
    } finally {
      setLoading(false);
    }
  };

  const getDeviceInfo = (userAgent: string | null) => {
    if (!userAgent) return 'غير معروف';
    if (userAgent.includes('Mobile')) return 'جوال';
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac')) return 'Mac';
    if (userAgent.includes('Linux')) return 'Linux';
    return 'متصفح';
  };

  return (
    <div className="space-y-6">
      {/* Account Actions */}
      {isSuperAdmin && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              إجراءات الحساب
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                onClick={() => setResetPasswordDialogOpen(true)}
                className="gap-2 border-slate-600 hover:bg-slate-700"
              >
                <Key className="w-4 h-4" />
                إعادة تعيين كلمة المرور
              </Button>
              <Button
                variant="outline"
                onClick={() => setForceLogoutDialogOpen(true)}
                className="gap-2 border-slate-600 hover:bg-slate-700"
              >
                <LogOut className="w-4 h-4" />
                تسجيل خروج إجباري
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Last Login Info */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-400" />
            آخر تسجيل دخول
          </CardTitle>
        </CardHeader>
        <CardContent>
          {lastLogin ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2 text-slate-300">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>{new Date(lastLogin.created_at).toLocaleString('ar-SA')}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span>{lastLogin.ip_address || 'غير معروف'}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Monitor className="w-4 h-4 text-slate-400" />
                <span>{getDeviceInfo(lastLogin.user_agent)}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Mail className="w-4 h-4 text-slate-400" />
                <span>{lastLogin.email}</span>
              </div>
            </div>
          ) : (
            <p className="text-slate-400 text-center py-4">لا توجد بيانات تسجيل دخول</p>
          )}
        </CardContent>
      </Card>

      {/* Failed Login Attempts */}
      {failedAttempts > 0 && (
        <Card className="bg-slate-800/50 border-slate-700 border-amber-500/50">
          <CardHeader>
            <CardTitle className="text-amber-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              محاولات دخول فاشلة ({failedAttempts})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-48 overflow-y-auto">
              {loginAttempts.filter(a => !a.success).slice(0, 5).map((attempt) => (
                <div
                  key={attempt.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-sm text-slate-400">
                      {new Date(attempt.created_at).toLocaleString('ar-SA')}
                    </div>
                    <Badge variant="outline" className="text-red-400 border-red-400/50">
                      فشل
                    </Badge>
                  </div>
                  <div className="text-sm text-slate-500">
                    {attempt.ip_address || 'IP غير معروف'}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reset Password Dialog */}
      <AlertDialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
        <AlertDialogContent className="bg-slate-900 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">إعادة تعيين كلمة المرور</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              سيتم إرسال رابط إعادة تعيين كلمة المرور إلى البريد الإلكتروني: {company.owner_email}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 text-white hover:bg-slate-700">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetPassword}
              disabled={loading}
              className="bg-primary text-primary-foreground"
            >
              {loading ? 'جاري الإرسال...' : 'إرسال الرابط'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Force Logout Dialog */}
      <AlertDialog open={forceLogoutDialogOpen} onOpenChange={setForceLogoutDialogOpen}>
        <AlertDialogContent className="bg-slate-900 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">تسجيل خروج إجباري</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              هل أنت متأكد من فرض تسجيل الخروج من جميع الأجهزة لمالك الشركة؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 text-white hover:bg-slate-700">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleForceLogout}
              disabled={loading}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {loading ? 'جاري التنفيذ...' : 'تأكيد'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CompanyAccountControls;
