-- Add rewards_enabled field to companies table
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS rewards_enabled boolean DEFAULT false;

-- Add unique constraint for reward_rules to allow upsert
ALTER TABLE public.reward_rules 
DROP CONSTRAINT IF EXISTS reward_rules_company_event_unique;

ALTER TABLE public.reward_rules 
ADD CONSTRAINT reward_rules_company_event_unique UNIQUE (company_id, event_type);