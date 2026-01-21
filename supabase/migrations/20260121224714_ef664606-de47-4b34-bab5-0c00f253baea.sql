-- Add freelancer fields to employees table
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS is_freelancer BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10,2) DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.employees.is_freelancer IS 'Freelancer employees are paid hourly and exempt from company attendance policies';
COMMENT ON COLUMN public.employees.hourly_rate IS 'Hourly rate for freelancer employees';