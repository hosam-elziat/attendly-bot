-- Add work schedule columns to employees table for per-employee control
ALTER TABLE public.employees 
ADD COLUMN work_start_time TIME DEFAULT '09:00:00',
ADD COLUMN work_end_time TIME DEFAULT '17:00:00',
ADD COLUMN break_duration_minutes INTEGER DEFAULT 60,
ADD COLUMN weekend_days TEXT[] DEFAULT ARRAY['friday', 'saturday'];

-- Add index for performance
CREATE INDEX idx_employees_is_active ON public.employees(is_active);