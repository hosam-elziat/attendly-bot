-- Fix security issue: Restrict employees table access to own record or admins only
-- This prevents regular employees from seeing other employees' sensitive data (national_id, salary, address, etc.)

-- First, drop the existing SELECT policy
DROP POLICY IF EXISTS "Company members can view employees" ON public.employees;

-- Create new policy: Employees can only view their own record, OR admins/owners can view all
CREATE POLICY "Employees can view own record or admins can view all"
ON public.employees
FOR SELECT
USING (
  -- User can see their own employee record (linked via user_id)
  (user_id = auth.uid())
  OR
  -- Admins/owners can see all employees in their company  
  (is_admin_or_owner(auth.uid()) AND company_id = get_user_company_id(auth.uid()))
  OR
  -- SaaS team members can view all (super admin access)
  is_saas_team_member(auth.uid())
);

-- Fix security issue: Restrict profiles table access to own profile or admins only
-- This prevents regular employees from seeing other users' email addresses

-- First, drop the existing overly permissive SELECT policy
DROP POLICY IF EXISTS "Users can view profiles in their company" ON public.profiles;

-- Create new policy: Users can only view their own profile, OR admins can view all
CREATE POLICY "Users can view own profile or admins can view all"
ON public.profiles
FOR SELECT
USING (
  -- User can see their own profile
  (user_id = auth.uid())
  OR
  -- Admins/owners can see all profiles in their company
  (is_admin_or_owner(auth.uid()) AND company_id = get_user_company_id(auth.uid()))
  OR
  -- SaaS team members can view all (super admin access)
  is_saas_team_member(auth.uid())
);