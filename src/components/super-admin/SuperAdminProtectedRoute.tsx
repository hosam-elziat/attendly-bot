import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useSuperAdmin } from '@/contexts/SuperAdminContext';
import { Loader2 } from 'lucide-react';

interface SuperAdminProtectedRouteProps {
  children: ReactNode;
}

const SuperAdminProtectedRoute = ({ children }: SuperAdminProtectedRouteProps) => {
  const { teamMember, loading } = useSuperAdmin();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!teamMember) {
    return <Navigate to="/super-admin" replace />;
  }

  return <>{children}</>;
};

export default SuperAdminProtectedRoute;
