-- Add default currency to companies table
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS default_currency text DEFAULT 'SAR';

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_companies_default_currency ON public.companies(default_currency);