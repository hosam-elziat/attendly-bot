-- =====================================================
-- Security Fix: Add webhook_secret to ALL legacy bots
-- This ensures all bots have authentication enabled
-- =====================================================
UPDATE public.telegram_bots 
SET webhook_secret = gen_random_uuid()::text 
WHERE webhook_secret IS NULL;

-- =====================================================
-- Security Fix: Restrict telegram_messages SELECT access
-- Employees can only view their own messages
-- Admins/owners can view all company messages
-- =====================================================

-- Drop existing permissive policy
DROP POLICY IF EXISTS "Users can view messages from their company" ON public.telegram_messages;

-- Create new restricted policy with role-based access
CREATE POLICY "Employees view own messages or admins view all"
ON public.telegram_messages FOR SELECT
USING (
  company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
  AND (
    -- Employees can only see their own messages
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
    OR
    -- Admins/owners can see all company messages for audit
    is_admin_or_owner(auth.uid())
  )
);