-- Add early departure settings columns to companies table
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS early_departure_threshold_minutes integer DEFAULT 30,
ADD COLUMN IF NOT EXISTS early_departure_deduction numeric DEFAULT 0.5,
ADD COLUMN IF NOT EXISTS early_departure_grace_minutes integer DEFAULT 5;

-- Add comments
COMMENT ON COLUMN public.companies.early_departure_threshold_minutes IS 'Minimum early departure in minutes to trigger deduction';
COMMENT ON COLUMN public.companies.early_departure_deduction IS 'Deduction in days for early departure';
COMMENT ON COLUMN public.companies.early_departure_grace_minutes IS 'Grace period in minutes for early departure (deducted from balance)';