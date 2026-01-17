-- SECURITY FIX: remove overly permissive INSERT policy on user_roles
-- The policy "Disallow privileged roles for non-SaaS" unintentionally granted INSERT for most roles.

DROP POLICY IF EXISTS "Disallow privileged roles for non-SaaS" ON public.user_roles;

-- If SaaS team needs to seed roles, allow them explicitly
DROP POLICY IF EXISTS "SaaS team can insert all roles" ON public.user_roles;
CREATE POLICY "SaaS team can insert all roles"
ON public.user_roles
FOR INSERT
WITH CHECK (is_saas_team_member(auth.uid()));
