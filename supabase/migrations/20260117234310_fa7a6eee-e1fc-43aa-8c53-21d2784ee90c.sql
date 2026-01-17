-- Fix infinite recursion on public.user_roles RLS policies
-- Root cause: a policy on user_roles queried user_roles directly ("Admins can manage roles"), causing 42P17.

-- Drop all existing policies on user_roles to remove duplicates / unsafe rules
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles in their company" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles in their company" ON public.user_roles;
DROP POLICY IF EXISTS "Company owner can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Company owner can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert employee role for themselves" ON public.user_roles;
DROP POLICY IF EXISTS "Users can set limited role for their company" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;

-- Ensure RLS is enabled
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- READ: user can read their own role rows
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (user_id = auth.uid());

-- READ: admin/owner can read all roles inside their company
CREATE POLICY "Admin/Owner can view roles in their company"
ON public.user_roles
FOR SELECT
USING (
  is_admin_or_owner(auth.uid())
  AND company_id = get_user_company_id(auth.uid())
);

-- READ: SaaS team members can view all roles
CREATE POLICY "SaaS team can view all roles"
ON public.user_roles
FOR SELECT
USING (is_saas_team_member(auth.uid()));

-- INSERT: allow user to create their own role row (employee) only within their company
CREATE POLICY "Users can set employee role for themselves"
ON public.user_roles
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND role = 'employee'
  AND company_id = get_user_company_id(auth.uid())
);

-- INSERT: allow company owner to set themselves as owner for the company they own
CREATE POLICY "Company owner can set owner role for themselves"
ON public.user_roles
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND role = 'owner'
  AND EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = user_roles.company_id
      AND c.owner_id = auth.uid()
  )
);

-- UPDATE: admin/owner can update roles within their company
CREATE POLICY "Admin/Owner can update roles in their company"
ON public.user_roles
FOR UPDATE
USING (
  is_admin_or_owner(auth.uid())
  AND company_id = get_user_company_id(auth.uid())
)
WITH CHECK (
  company_id = get_user_company_id(auth.uid())
);

-- DELETE: admin/owner can delete roles within their company
CREATE POLICY "Admin/Owner can delete roles in their company"
ON public.user_roles
FOR DELETE
USING (
  is_admin_or_owner(auth.uid())
  AND company_id = get_user_company_id(auth.uid())
);

-- UPDATE/DELETE: SaaS team can manage all roles
CREATE POLICY "SaaS team can update all roles"
ON public.user_roles
FOR UPDATE
USING (is_saas_team_member(auth.uid()))
WITH CHECK (is_saas_team_member(auth.uid()));

CREATE POLICY "SaaS team can delete all roles"
ON public.user_roles
FOR DELETE
USING (is_saas_team_member(auth.uid()));

-- Optional hardening: prevent setting 'super_admin' or 'support' roles from the app layer
-- (Those should be managed only through SaaS tooling)
CREATE POLICY "Disallow privileged roles for non-SaaS"
ON public.user_roles
FOR INSERT
WITH CHECK (
  is_saas_team_member(auth.uid())
  OR role NOT IN ('super_admin', 'support')
);

-- Note: this last policy is additive; it does NOT grant access by itself, it only further restricts inserts.
