-- Fix: RLS enabled but no policies on public.registration_sessions
-- This table is intended for backend-only flows; deny direct access by default.
DROP POLICY IF EXISTS "No direct access to registration sessions" ON public.registration_sessions;
CREATE POLICY "No direct access to registration sessions"
ON public.registration_sessions
FOR ALL
USING (false)
WITH CHECK (false);

-- Allow internal SaaS team members to access for debugging/support.
DROP POLICY IF EXISTS "SaaS team can manage registration sessions" ON public.registration_sessions;
CREATE POLICY "SaaS team can manage registration sessions"
ON public.registration_sessions
FOR ALL
USING (is_saas_team_member(auth.uid()))
WITH CHECK (is_saas_team_member(auth.uid()));
