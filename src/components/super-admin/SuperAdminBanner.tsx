import { useNavigate } from 'react-router-dom';
import { useViewAsCompany } from '@/contexts/ViewAsCompanyContext';
import { useSuperAdmin } from '@/contexts/SuperAdminContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, LogOut, Building2, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SuperAdminBannerProps {
  className?: string;
}

const SuperAdminBanner = ({ className }: SuperAdminBannerProps) => {
  const { viewingCompany, exitCompanyMode, isViewingAsCompany } = useViewAsCompany();
  const { teamMember, isSuperAdmin } = useSuperAdmin();
  const navigate = useNavigate();

  if (!isSuperAdmin || !isViewingAsCompany || !viewingCompany) {
    return null;
  }

  const handleExit = () => {
    exitCompanyMode();
    navigate('/super-admin/companies');
  };

  const handleOpenInSuperAdmin = () => {
    navigate('/super-admin/companies');
  };

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-[100] bg-gradient-to-r from-amber-600 via-amber-500 to-orange-500 text-white shadow-lg",
        className
      )}
      dir="rtl"
    >
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Left side - Info */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white/20 rounded-lg px-3 py-1.5">
              <Shield className="w-5 h-5" />
              <span className="font-bold text-sm">Super Admin Mode</span>
            </div>
            
            <div className="hidden sm:flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              <span className="text-sm">أنت الآن داخل شركة:</span>
              <Badge className="bg-white/30 text-white border-0 font-bold">
                {viewingCompany.name}
              </Badge>
            </div>

            {/* Mobile view */}
            <div className="flex sm:hidden items-center gap-2">
              <Badge className="bg-white/30 text-white border-0 font-bold text-xs">
                {viewingCompany.name}
              </Badge>
            </div>
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center gap-2">
            <span className="hidden md:inline text-xs text-white/80">
              مسجل كـ: {teamMember?.full_name}
            </span>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={handleOpenInSuperAdmin}
              className="text-white hover:bg-white/20 gap-1.5 text-xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">لوحة السوبر أدمن</span>
            </Button>

            <Button
              size="sm"
              onClick={handleExit}
              className="bg-white/20 hover:bg-white/30 text-white gap-1.5 text-xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>خروج من الشركة</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminBanner;
