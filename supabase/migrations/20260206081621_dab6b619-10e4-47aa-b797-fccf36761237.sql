-- Add default monthly permission hours limit to companies table
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS default_monthly_permission_hours numeric DEFAULT 4;

-- Add comment
COMMENT ON COLUMN public.companies.default_monthly_permission_hours IS 'Default monthly permission hours limit for employees (in hours)';

-- Update existing companies to have the default value
UPDATE public.companies SET default_monthly_permission_hours = 4 WHERE default_monthly_permission_hours IS NULL;