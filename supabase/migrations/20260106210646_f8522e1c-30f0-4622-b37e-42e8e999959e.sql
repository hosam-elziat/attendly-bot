-- Add new fields to employees table
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS national_id text,
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS hire_date date,
ADD COLUMN IF NOT EXISTS currency text DEFAULT 'SAR',
ADD COLUMN IF NOT EXISTS notes text;

-- Add index for phone lookup
CREATE INDEX IF NOT EXISTS idx_employees_phone ON public.employees(phone);
CREATE INDEX IF NOT EXISTS idx_employees_national_id ON public.employees(national_id);