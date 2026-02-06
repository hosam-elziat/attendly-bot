-- Add monthly permission hours limit to employees
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS monthly_permission_hours_limit numeric DEFAULT 4;

-- Add used permission hours for current month tracking
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS used_permission_hours_this_month numeric DEFAULT 0;

-- Add last permission reset month to know when to reset
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS permission_hours_reset_month text;

-- Update all existing employees to have the default value
UPDATE public.employees
SET monthly_permission_hours_limit = 4
WHERE monthly_permission_hours_limit IS NULL;

UPDATE public.employees
SET used_permission_hours_this_month = 0
WHERE used_permission_hours_this_month IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.employees.monthly_permission_hours_limit IS 'Maximum allowed permission hours per month (default 4 hours)';
COMMENT ON COLUMN public.employees.used_permission_hours_this_month IS 'Used permission hours in current month';
COMMENT ON COLUMN public.employees.permission_hours_reset_month IS 'Month when permission hours were last reset (YYYY-MM format)';