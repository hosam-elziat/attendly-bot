-- Fix RLS policies for signup flow
-- The issue is that during signup, the user creates a company BEFORE they have a profile
-- So we need to allow the owner_id to match auth.uid() for new company creation

-- Drop existing policies that are too restrictive
DROP POLICY IF EXISTS "Authenticated users can create companies" ON public.companies;
DROP POLICY IF EXISTS "Authenticated users can create their profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage roles in their company" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage employees" ON public.employees;

-- Fix companies INSERT policy - allow users to create companies where they are the owner
CREATE POLICY "Users can create companies they own"
  ON public.companies FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- Fix profiles INSERT policy - allow users to create their own profile
CREATE POLICY "Users can create their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Fix user_roles - allow users to insert their own role during signup
CREATE POLICY "Users can insert their own role"
  ON public.user_roles FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Keep the admin update/delete policy for roles
CREATE POLICY "Admins can update roles in their company"
  ON public.user_roles FOR UPDATE
  USING (
    public.is_admin_or_owner(auth.uid()) AND 
    company_id = public.get_user_company_id(auth.uid())
  );

CREATE POLICY "Admins can delete roles in their company"
  ON public.user_roles FOR DELETE
  USING (
    public.is_admin_or_owner(auth.uid()) AND 
    company_id = public.get_user_company_id(auth.uid())
  );

-- Fix employees policies - separate INSERT from UPDATE/DELETE
CREATE POLICY "Admins can insert employees"
  ON public.employees FOR INSERT
  WITH CHECK (
    public.is_admin_or_owner(auth.uid()) AND 
    company_id = public.get_user_company_id(auth.uid())
  );

CREATE POLICY "Admins can update employees"
  ON public.employees FOR UPDATE
  USING (
    public.is_admin_or_owner(auth.uid()) AND 
    company_id = public.get_user_company_id(auth.uid())
  );

CREATE POLICY "Admins can delete employees"
  ON public.employees FOR DELETE
  USING (
    public.is_admin_or_owner(auth.uid()) AND 
    company_id = public.get_user_company_id(auth.uid())
  );