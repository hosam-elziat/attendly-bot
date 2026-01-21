-- Fix 1: Restrict subscription_plans to authenticated users only
-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Everyone can view active plans" ON public.subscription_plans;

-- Create new policy: Only authenticated users can view active plans
CREATE POLICY "Authenticated users can view active plans"
ON public.subscription_plans
FOR SELECT
TO authenticated
USING (is_active = true);

-- Fix 2: Restrict login_attempts INSERT to prevent flooding
-- Drop the overly permissive INSERT policy
DROP POLICY IF EXISTS "System can insert login attempts" ON public.login_attempts;

-- Create new policy: Only allow INSERT via service role (edge functions)
-- This prevents direct client-side inserts while allowing server-side logging
-- Note: RLS policies don't apply to service_role, so no explicit policy needed for service role
-- We create a restrictive policy that denies all direct inserts
CREATE POLICY "Deny direct login attempt inserts"
ON public.login_attempts
FOR INSERT
WITH CHECK (false);

-- Note: Edge functions using service_role key bypass RLS, so they can still insert
-- This effectively makes the table write-only from server-side code