import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSuperAdmin } from '@/contexts/SuperAdminContext';
import { useViewAsCompany } from '@/contexts/ViewAsCompanyContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { isSuperAdmin, loading: superAdminLoading, teamMember } = useSuperAdmin();
  const { isViewingAsCompany } = useViewAsCompany();
  const location = useLocation();

  const loading = authLoading || superAdminLoading;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Allow Super Admin viewing a company to access company routes
  if (isSuperAdmin && isViewingAsCompany && teamMember) {
    return <>{children}</>;
  }

  // Regular user authentication check
  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
