-- Add overtime multiplier to companies
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS overtime_multiplier numeric DEFAULT 2;

-- Add country column to companies for public holidays
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS country_code text DEFAULT 'SA';