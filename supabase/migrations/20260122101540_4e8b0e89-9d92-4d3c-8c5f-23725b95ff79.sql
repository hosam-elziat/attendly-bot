-- Fix: Remove the policy that was incorrectly applied to the view
-- Views with security_invoker=true inherit RLS from base tables

-- The view was created successfully, but we tried to add RLS to it which isn't supported
-- The key protection is already in place:
-- 1. The base table has USING(false) policy blocking client access
-- 2. Edge functions using service role can still access bot_token
-- 3. Clients querying the view see data but bot_token is excluded from view definition

-- No additional action needed - the migration is complete