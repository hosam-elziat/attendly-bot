-- Add leave settings to companies
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS annual_leave_days integer DEFAULT 21,
ADD COLUMN IF NOT EXISTS emergency_leave_days integer DEFAULT 7;

-- Add emergency leave balance to employees
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS emergency_leave_balance integer DEFAULT 7;

-- Update leave_type enum to include emergency and regular
ALTER TYPE public.leave_type ADD VALUE IF NOT EXISTS 'emergency';
ALTER TYPE public.leave_type ADD VALUE IF NOT EXISTS 'regular';