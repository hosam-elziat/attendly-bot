import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSuperAdmin } from '@/contexts/SuperAdminContext';
import { useViewAsCompany } from '@/contexts/ViewAsCompanyContext';

/**
 * Hook that provides unified company access for both regular users and Super Admins
 * 
 * When Super Admin is viewing a company:
 * - Returns the viewed company's ID instead of the user's company
 * - Provides isSuperAdminAccess flag for permission checks
 * - Allows bypassing normal RLS restrictions
 */
export const useSuperAdminCompanyAccess = () => {
  const { profile, userRole, isAdmin: isCompanyAdmin } = useAuth();
  const { isSuperAdmin, teamMember } = useSuperAdmin();
  const { isViewingAsCompany, viewingCompany, getEffectiveCompanyId } = useViewAsCompany();

  const effectiveCompanyId = useMemo(() => {
    // If Super Admin is viewing a company, use that company's ID
    if (isSuperAdmin && isViewingAsCompany && viewingCompany) {
      return viewingCompany.id;
    }
    // Otherwise use the user's actual company
    return profile?.company_id || null;
  }, [isSuperAdmin, isViewingAsCompany, viewingCompany, profile?.company_id]);

  const effectiveRole = useMemo(() => {
    // Super Admin viewing a company has owner-level access
    if (isSuperAdmin && isViewingAsCompany) {
      return 'super_admin' as const;
    }
    return userRole?.role || null;
  }, [isSuperAdmin, isViewingAsCompany, userRole?.role]);

  const canAccessCompany = useMemo(() => {
    // Super Admin can access any company they're viewing
    if (isSuperAdmin && isViewingAsCompany) {
      return true;
    }
    // Regular users can only access their own company
    return !!profile?.company_id;
  }, [isSuperAdmin, isViewingAsCompany, profile?.company_id]);

  const hasAdminAccess = useMemo(() => {
    // Super Admin always has admin access when viewing a company
    if (isSuperAdmin && isViewingAsCompany) {
      return true;
    }
    // Regular admin check
    return isCompanyAdmin;
  }, [isSuperAdmin, isViewingAsCompany, isCompanyAdmin]);

  const hasOwnerAccess = useMemo(() => {
    // Super Admin has owner access when viewing a company
    if (isSuperAdmin && isViewingAsCompany) {
      return true;
    }
    // Regular owner check
    return userRole?.role === 'owner';
  }, [isSuperAdmin, isViewingAsCompany, userRole?.role]);

  return {
    // Company access
    effectiveCompanyId,
    effectiveRole,
    canAccessCompany,
    
    // Permission checks
    hasAdminAccess,
    hasOwnerAccess,
    
    // Super Admin specific
    isSuperAdminAccess: isSuperAdmin && isViewingAsCompany,
    superAdminInfo: isSuperAdmin && isViewingAsCompany ? {
      adminName: teamMember?.full_name,
      adminEmail: teamMember?.email,
      viewingCompanyName: viewingCompany?.name,
    } : null,
    
    // Original data for reference
    originalCompanyId: profile?.company_id,
    originalRole: userRole?.role,
  };
};
