-- Fix linter warning: RLS Policy Always True
-- telegram_messages had an INSERT policy WITH CHECK (true), which is overly permissive.
-- Inserts should be performed by backend/system (service role) only.

DROP POLICY IF EXISTS "System can insert messages" ON public.telegram_messages;

-- Disallow direct client inserts (backend/service-role bypasses RLS anyway)
CREATE POLICY "No direct inserts from clients"
ON public.telegram_messages
FOR INSERT
WITH CHECK (false);
